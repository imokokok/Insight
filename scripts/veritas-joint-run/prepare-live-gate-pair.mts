#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { concat, getAddress, isAddress, keccak256 } from 'viem';
import { z } from 'zod';

import { verifyAttestationBySchema } from '@/lib/attestations/verifyAttestationBySchema';

const RUN_ID = 'insight-veritas-2026-09-18';
const WINDOW_START_MS = Date.parse('2026-09-26T02:00:00Z');
const LAST_GATE_REQUEST_MS = Date.parse('2026-09-26T02:44:00Z');
const WINDOW_END_MS = Date.parse('2026-09-26T03:00:00Z');
const EXPECTED_SELECTION_RULE_HASH =
  '0x545ede509529b6d8716be4f74e3e6715d92d821d18493dbc7f32e15156d2fc7a';
const API_BASE_URL = 'https://www.oracleinsight.xyz';
const ACTIVE_VERITAS_SET_ID = '0xc83feebc5fe8722129a27c015192e6583cd166e0cd149dd6a7d99564474728db';
const REGISTRY_URL = `${API_BASE_URL}/.well-known/oracle-keys.json`;
const INTEGRATIONS_URL = `${API_BASE_URL}/.well-known/oracle-registry/integrations/current.json`;
const PRE_TRADE_URL = `${API_BASE_URL}/api/v1/safety/pre-trade`;
const EXECUTION_ISSUER_METADATA_PATH = '/api/v1/execution/attestation/verify';
const DEFAULT_OUTPUT_ROOT = '/private/tmp/insight-veritas-2026-09-26-window-a';

const BYTES32 = /^0x[0-9a-f]{64}$/;
const SIGNATURE = /^0x[0-9a-f]{130}$/;
const AUTHORIZATIONS = ['VERITAS_READY', 'VERITAS_RETRY_REQUEST'] as const;

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

const EnvelopeSchema = z
  .object({
    uid: z.string().regex(BYTES32),
    schemaVersion: z.literal(3),
    attester: z.string().refine((value) => isAddress(value), 'attester must be an EVM address'),
    signedAt: z.string().datetime({ offset: true }),
    validForSeconds: z.literal(600),
    validUntil: z.number().int().positive(),
    signature: z.string().regex(SIGNATURE),
    data: z
      .object({
        verdict: z.string(),
        sourceAssetId: z.string(),
        destinationAssetId: z.string(),
        subjectChainId: z.literal(1),
        action: z.literal('swap'),
        tradeAmountUsd: z.literal(50_000_000_000),
        participantCount: z.number().int().nonnegative(),
        requiredParticipantCount: z.number().int().positive(),
        sourceGroupCount: z.number().int().nonnegative(),
        requiredSourceGroupCount: z.number().int().positive(),
        checkedAt: z.number().int().positive(),
        validUntil: z.number().int().positive(),
        schemaVersion: z.literal(3),
      })
      .passthrough(),
    eip712: z
      .object({
        primaryType: z.literal('OracleSafetyCheck'),
      })
      .passthrough(),
  })
  .passthrough();

type Envelope = z.infer<typeof EnvelopeSchema>;

const ApiResponseSchema = z.object({
  success: z.literal(true),
  data: z
    .object({
      attestation: EnvelopeSchema,
    })
    .passthrough(),
});

const RegistrySchema = z.object({
  issuer: z.literal(API_BASE_URL),
  attestation_enabled: z.literal(true),
  public_keys: z.array(
    z.object({
      key_id: z.string(),
      public_key: z.string().refine((value) => isAddress(value), 'public_key must be an address'),
      validFrom: z.string(),
      validUntil: z.string().nullable(),
      revoked: z.boolean(),
      role: z.string().optional(),
    })
  ),
});

const ExecutionIssuerSchema = z.object({
  success: z.literal(true),
  data: z
    .object({
      attester: z.string().refine((value) => isAddress(value), 'attester must be an EVM address'),
      schemaVersion: z.number().int().positive(),
      supportedSchemaVersions: z.array(z.number().int().positive()),
    })
    .passthrough(),
});

const CurrentIntegrationsSchema = z.object({
  activationSetId: z.literal(ACTIVE_VERITAS_SET_ID),
  activationVersion: z.literal(3),
});

interface Options {
  attempt: number;
  authorization: (typeof AUTHORIZATIONS)[number];
  authorizationReceivedAt: string;
  confirmRunId: string;
  executionReceiptBaseUrl: string;
  outputRoot: string;
}

function normalizeHttpsOrigin(value: string): string {
  const url = new URL(value);
  assert(url.protocol === 'https:', '--execution-receipt-base-url must use https');
  assert(
    url.pathname === '/' && !url.search && !url.hash,
    '--execution-receipt-base-url must be an origin with no path, query, or fragment'
  );
  return url.origin;
}

function parseArgs(argv: string[]): Options {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    assert(name?.startsWith('--') && value, `invalid argument near ${name ?? '<end>'}`);
    assert(!values.has(name), `duplicate argument: ${name}`);
    values.set(name, value);
  }

  const attempt = Number(values.get('--attempt'));
  const authorization = values.get('--authorization');
  const authorizationReceivedAt = values.get('--authorization-received-at');
  const confirmRunId = values.get('--confirm-run-id');
  const executionReceiptBaseUrl = normalizeHttpsOrigin(
    values.get('--execution-receipt-base-url') ?? API_BASE_URL
  );
  assert(
    executionReceiptBaseUrl === API_BASE_URL,
    'this window requires the active Insight production v5 issuer'
  );
  const outputRoot = values.get('--output-root') ?? DEFAULT_OUTPUT_ROOT;
  const allowed = new Set([
    '--attempt',
    '--authorization',
    '--authorization-received-at',
    '--confirm-run-id',
    '--execution-receipt-base-url',
    '--output-root',
  ]);

  for (const name of values.keys()) assert(allowed.has(name), `unknown argument: ${name}`);
  assert(
    Number.isInteger(attempt) && attempt >= 3 && attempt <= 7,
    'attempt must be 3, 4, 5, 6, or 7'
  );
  assert(
    AUTHORIZATIONS.includes(authorization as (typeof AUTHORIZATIONS)[number]),
    `authorization must be one of ${AUTHORIZATIONS.join(', ')}`
  );
  assert(authorizationReceivedAt, '--authorization-received-at is required');
  assert(
    Number.isFinite(Date.parse(authorizationReceivedAt)),
    'authorization receipt time must be ISO-8601'
  );
  assert(confirmRunId === RUN_ID, `--confirm-run-id must equal ${RUN_ID} byte for byte`);

  const expectedAuthorization = attempt === 3 ? 'VERITAS_READY' : 'VERITAS_RETRY_REQUEST';
  assert(
    authorization === expectedAuthorization,
    `attempt ${attempt} requires ${expectedAuthorization}, not ${authorization}`
  );

  return {
    attempt,
    authorization: authorization as Options['authorization'],
    authorizationReceivedAt,
    confirmRunId,
    executionReceiptBaseUrl,
    outputRoot: path.resolve(outputRoot),
  };
}

function validateActivation(options: Options, nowMs: number): void {
  assert(nowMs >= WINDOW_START_MS, 'REFUSE TO SIGN: the 02:00 UTC window has not opened');
  assert(nowMs < LAST_GATE_REQUEST_MS, 'REFUSE TO SIGN: the minute-44 last-gate cutoff has passed');
  assert(nowMs < WINDOW_END_MS, 'REFUSE TO SIGN: the joint-run window has ended');

  const receivedAtMs = Date.parse(options.authorizationReceivedAt);
  assert(
    receivedAtMs >= Date.parse('2026-09-26T01:00:00Z'),
    'authorization predates run-day fresh checks'
  );
  assert(receivedAtMs <= nowMs + 5_000, 'authorization receipt time is in the future');
  if (options.attempt > 3) {
    assert(nowMs - receivedAtMs <= 5 * 60_000, 'retry request is more than five minutes old');
  }
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(45_000) });
  const bodyText = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error(`${url} returned non-JSON HTTP ${response.status}`);
  }
  if (!response.ok) {
    const errorCode =
      typeof body === 'object' && body !== null && 'error' in body
        ? JSON.stringify((body as { error: unknown }).error)
        : `HTTP ${response.status}`;
    throw new Error(`${url} refused the request: ${errorCode}`);
  }
  return body;
}

async function issueGate(
  apiKey: string,
  asset: 'WETH' | 'USDC',
  destinationAsset: 'WETH' | 'USDC'
): Promise<Envelope> {
  const url = new URL(PRE_TRADE_URL);
  url.search = new URLSearchParams({
    asset,
    chainId: '1',
    action: 'swap',
    tradeAmountUsd: '50000',
    schemaVersion: '3',
    destinationAsset,
  }).toString();
  const raw = await fetchJson(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-store',
      'X-API-Key': apiKey,
    },
  });
  return ApiResponseSchema.parse(raw).data.attestation;
}

function validateRole(
  name: 'source' | 'destination',
  envelope: Envelope,
  expectedSource: string,
  expectedDestination: string
): void {
  assert(envelope.data.sourceAssetId === expectedSource, `${name} sourceAssetId mismatch`);
  assert(
    envelope.data.destinationAssetId === expectedDestination,
    `${name} destinationAssetId mismatch`
  );
  assert(envelope.data.validUntil === envelope.validUntil, `${name} validUntil mismatch`);
  assert(
    envelope.validUntil === envelope.data.checkedAt + envelope.validForSeconds,
    `${name} validity interval is not exactly 600 seconds`
  );
}

function assertRegistryAddressAuthorization(
  address: string,
  effectiveAtMs: number,
  registry: z.infer<typeof RegistrySchema>,
  label: string
): void {
  const key = registry.public_keys.find(
    (candidate) => candidate.public_key.toLowerCase() === address.toLowerCase()
  );
  assert(key, `${label} ${address} is absent from the current public registry`);
  assert(!key.revoked, `${label} ${address} is revoked`);
  assert(key.role !== 'sample', `${label} ${address} is a sample-only key`);
  assert(effectiveAtMs >= Date.parse(key.validFrom), `${label} ${address} is not yet valid`);
  assert(
    key.validUntil === null || effectiveAtMs <= Date.parse(key.validUntil),
    `${label} ${address} is outside its registry validity window`
  );
}

function assertRegistryAuthorization(
  envelope: Envelope,
  registry: z.infer<typeof RegistrySchema>
): void {
  assertRegistryAddressAuthorization(
    envelope.attester,
    Date.parse(envelope.signedAt),
    registry,
    'attester'
  );
}

function writePrivate(filePath: string, contents: string): void {
  fs.writeFileSync(filePath, contents, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
}

function runNodeScript(scriptPath: string, args: string[]): string {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const startedAtMs = Date.now();
  validateActivation(options, startedAtMs);

  const apiKey = process.env.INSIGHT_API_KEY;
  assert(
    apiKey?.startsWith('ins_'),
    'INSIGHT_API_KEY must be set in the environment, never in arguments'
  );

  const [registry, currentIntegrations] = await Promise.all([
    fetchJson(REGISTRY_URL, { headers: { Accept: 'application/json' } }).then((value) =>
      RegistrySchema.parse(value)
    ),
    fetchJson(INTEGRATIONS_URL, {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-store' },
    }).then((value) => CurrentIntegrationsSchema.parse(value)),
  ]);
  assert(
    currentIntegrations.activationSetId === ACTIVE_VERITAS_SET_ID,
    'REFUSE TO SIGN: VERITAS activation set changed'
  );

  // Window A uses the explicitly activated v5 policy. Check the production
  // issuer and the current registry before creating any live authorisation.
  const executionIssuer = ExecutionIssuerSchema.parse(
    await fetchJson(
      new URL(EXECUTION_ISSUER_METADATA_PATH, options.executionReceiptBaseUrl).toString(),
      { headers: { Accept: 'application/json', 'Cache-Control': 'no-store' } }
    )
  ).data;
  assert(
    executionIssuer.schemaVersion === 5,
    `REFUSE TO SIGN: the active VERITAS policy requires ExecutionReceipt v5, but ${options.executionReceiptBaseUrl} currently issues v${executionIssuer.schemaVersion}`
  );
  assert(
    executionIssuer.supportedSchemaVersions.includes(5),
    'REFUSE TO SIGN: the production Execution Receipt issuer does not publish v5 support'
  );
  assertRegistryAddressAuthorization(
    executionIssuer.attester,
    startedAtMs,
    registry,
    'Execution Receipt issuer'
  );

  // Both HTTP calls begin together so the two 600-second clocks are as close as possible.
  // The selection rule is explicitly WETH -> USDC in the Uniswap V3 ERC-20
  // pool. Native ETH is a different CAIP-19 asset and cannot be substituted:
  // the execution collector must be able to attribute the same signed legs.
  const [sourceEnvelope, destinationEnvelope] = await Promise.all([
    issueGate(apiKey, 'WETH', 'USDC'),
    issueGate(apiKey, 'USDC', 'WETH'),
  ]);

  const WETH = 'eip155:1/erc20:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const USDC = 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  validateRole('source', sourceEnvelope, WETH, USDC);
  validateRole('destination', destinationEnvelope, USDC, WETH);
  assert(
    getAddress(sourceEnvelope.attester) === getAddress(destinationEnvelope.attester),
    'source and destination gates were signed by different attesters'
  );
  assertRegistryAuthorization(sourceEnvelope, registry);
  assertRegistryAuthorization(destinationEnvelope, registry);

  const [sourceVerification, destinationVerification] = await Promise.all([
    verifyAttestationBySchema(sourceEnvelope),
    verifyAttestationBySchema(destinationEnvelope),
  ]);
  assert(
    sourceVerification.valid,
    `source EIP-712 verification failed: ${sourceVerification.reason ?? 'unknown'}`
  );
  assert(
    destinationVerification.valid,
    `destination EIP-712 verification failed: ${destinationVerification.reason ?? 'unknown'}`
  );

  const attemptExpiry = Math.min(sourceEnvelope.validUntil, destinationEnvelope.validUntil);
  const remainingSeconds = attemptExpiry - Math.floor(Date.now() / 1000);
  assert(
    remainingSeconds >= 540,
    `only ${remainingSeconds}s remain; refuse a gate pair that lost more than 60s locally`
  );

  const sourceGateUid = sourceEnvelope.uid;
  const destinationGateUid = destinationEnvelope.uid;
  const preTradeUidsHash = keccak256(concat([sourceGateUid, destinationGateUid]));
  const pair = {
    messageType: 'INSIGHT_GATE_PAIR',
    runId: RUN_ID,
    attempt: options.attempt,
    sourceEnvelope,
    destinationEnvelope,
    sourceGateUid,
    destinationGateUid,
    preTradeUidsHash,
  };

  const here = path.dirname(fileURLToPath(import.meta.url));
  const timestamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '');
  const outputDir = path.join(options.outputRoot, `attempt-${options.attempt}-${timestamp}`);
  fs.mkdirSync(options.outputRoot, { recursive: true, mode: 0o700 });
  fs.mkdirSync(outputDir, { recursive: false, mode: 0o700 });

  const pairPath = path.join(outputDir, `signed-pair-attempt-${options.attempt}.json`);
  const commitmentInputPath = path.join(
    outputDir,
    `commitment-input-attempt-${options.attempt}.json`
  );
  const messagePath = path.join(outputDir, `INSIGHT_GATE_PAIR-attempt-${options.attempt}.txt`);
  const commitmentPath = path.join(outputDir, `bitcoin-commitment-attempt-${options.attempt}.json`);
  const auditPath = path.join(outputDir, `operator-audit-attempt-${options.attempt}.json`);

  writePrivate(pairPath, `${JSON.stringify(pair, null, 2)}\n`);
  writePrivate(
    commitmentInputPath,
    `${JSON.stringify(
      {
        sourceGateUid,
        destinationGateUid,
        preTradeUidsHash,
        selectionRuleHash: EXPECTED_SELECTION_RULE_HASH,
      },
      null,
      2
    )}\n`
  );

  const message = runNodeScript(path.join(here, 'render-insight-gate-pair.mjs'), [
    '--input',
    pairPath,
  ]);
  const commitment = runNodeScript(path.join(here, 'build-joint-run-commitments.mjs'), [
    '--input',
    commitmentInputPath,
  ]);
  const commitmentObject = JSON.parse(commitment) as {
    selectionRuleHash: string;
    bitcoinAnchor: { canonicalPreimageBytes: number; anchorLeafHash: string };
  };
  assert(
    commitmentObject.selectionRuleHash === EXPECTED_SELECTION_RULE_HASH,
    'deterministic builder returned the wrong selectionRuleHash'
  );
  assert(
    commitmentObject.bitcoinAnchor.canonicalPreimageBytes === 409,
    'Bitcoin commitment preimage must be exactly 409 bytes'
  );

  writePrivate(messagePath, message);
  writePrivate(commitmentPath, commitment);
  writePrivate(
    auditPath,
    `${JSON.stringify(
      {
        runId: RUN_ID,
        attempt: options.attempt,
        authorization: options.authorization,
        authorizationReceivedAt: options.authorizationReceivedAt,
        operatorStartedAt: new Date(startedAtMs).toISOString(),
        completedAt: new Date().toISOString(),
        sourceGateUid,
        destinationGateUid,
        preTradeUidsHash,
        attester: sourceEnvelope.attester,
        attemptExpiry,
        remainingSecondsAtCompletion: attemptExpiry - Math.floor(Date.now() / 1000),
        executionReceiptIssuer: {
          baseUrl: options.executionReceiptBaseUrl,
          schemaVersion: executionIssuer.schemaVersion,
          attester: executionIssuer.attester,
        },
        selectionRuleHash: commitmentObject.selectionRuleHash,
        bitcoinCanonicalPreimageBytes: commitmentObject.bitcoinAnchor.canonicalPreimageBytes,
        bitcoinAnchorLeaf: commitmentObject.bitcoinAnchor.anchorLeafHash,
        files: { pairPath, messagePath, commitmentInputPath, commitmentPath },
      },
      null,
      2
    )}\n`
  );

  process.stdout.write(
    [
      'LIVE GATE PAIR READY FOR IMMEDIATE DELIVERY',
      `runId=${RUN_ID}`,
      `attempt=${options.attempt}`,
      `attester=${sourceEnvelope.attester}`,
      `executionReceiptIssuer=${options.executionReceiptBaseUrl}`,
      `executionReceiptSchema=${executionIssuer.schemaVersion}`,
      `source=${sourceEnvelope.data.verdict} ${sourceGateUid}`,
      `destination=${destinationEnvelope.data.verdict} ${destinationGateUid}`,
      `preTradeUidsHash=${preTradeUidsHash}`,
      `attemptExpiry=${attemptExpiry}`,
      `remainingSeconds=${attemptExpiry - Math.floor(Date.now() / 1000)}`,
      `bitcoinAnchorLeaf=${commitmentObject.bitcoinAnchor.anchorLeafHash}`,
      `message=${messagePath}`,
      `audit=${auditPath}`,
      'ACTION: paste the complete message file into the existing authoritative email thread now.',
      '',
    ].join('\n')
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `REFUSE TO ISSUE LIVE GATE PAIR: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exitCode = 1;
});
