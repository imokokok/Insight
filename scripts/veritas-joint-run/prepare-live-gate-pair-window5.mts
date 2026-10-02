#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { concat, getAddress, isAddress, keccak256 } from 'viem';
import { z } from 'zod';

import { verifyAttestationBySchema } from '@/lib/attestations/verifyAttestationBySchema';

const RUN_ID = 'insight-veritas-2026-09-18';
const WINDOW_START_MS = Date.parse('2026-10-02T14:00:00Z');
const PREFLIGHT_START_MS = Date.parse('2026-10-02T13:00:00Z');
const READY_START_MS = Date.parse('2026-10-02T13:55:00Z');
const LAST_GATE_REQUEST_MS = Date.parse('2026-10-02T14:50:00Z');
const LAST_SIGNATURE_MS = Date.parse('2026-10-02T14:55:00Z');
const WINDOW_END_MS = Date.parse('2026-10-02T15:30:00Z');
const EXPECTED_SELECTION_RULE_HASH =
  '0xb1071d6929d1dc13812d9aa19bf28a74dca4d90c07d47e9b2052f9f9c3c52465';
const EXPECTED_POLICY_ID = '0xad711736aa60459299c94f0b6cdc7fd51d5ace20024f9fbd23344e4e03de47da';
const EXPECTED_ATTESTER = '0x6506F789Edd43338A416f59822A63F309f97E8ce';
const API_BASE_URL = 'https://www.oracleinsight.xyz';
const REGISTRY_URL = `${API_BASE_URL}/.well-known/oracle-keys.json`;
const INTEGRATIONS_URL = `${API_BASE_URL}/.well-known/oracle-registry/integrations/current.json`;
const PRE_TRADE_URL = `${API_BASE_URL}/api/v1/partners/veritas/safety/pre-trade`;
const EXECUTION_ISSUER_METADATA_PATH = '/api/v1/execution/attestation/verify';
const DEFAULT_OUTPUT_ROOT = '/private/tmp/insight-veritas-2026-10-02-window-five';

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
    validForSeconds: z.literal(1800),
    validUntil: z.number().int().positive(),
    signature: z.string().regex(SIGNATURE),
    data: z
      .object({
        verdict: z.literal('PASS'),
        sourceAssetId: z.string(),
        destinationAssetId: z.string(),
        subjectChainId: z.literal(1),
        action: z.literal('swap'),
        tradeAmountUsd: z.literal(50_000_000_000),
        evaluationScope: z.literal('SOURCE_ASSET_ONLY'),
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
  activationSetId: z.string().regex(BYTES32),
  immutable: z.string().url(),
});
const ActivationSetSchema = z.object({
  activationSetId: z.string().regex(BYTES32),
  activationSet: z.object({
    partners: z.object({ veritas: z.literal(EXPECTED_POLICY_ID) }),
  }),
});
const PolicyReadbackSchema = z.object({
  policyId: z.literal(EXPECTED_POLICY_ID),
  policy: z.object({ productionReachability: z.literal('enabled') }),
});

interface Options {
  attempt: number;
  authorization: (typeof AUTHORIZATIONS)[number];
  authorizationReceivedAt: string;
  readyReceivedAt: string;
  readyMessagePath: string;
  hostReportPath: string;
  agreementMessageId: string;
  agreementEvidencePath: string;
  previousAbortPath?: string;
  retryRequestPath?: string;
  expectedActivationSetId: string;
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
  const readyReceivedAt = values.get('--ready-received-at');
  const readyMessagePath = values.get('--ready-message-path');
  const hostReportPath = values.get('--host-report-path');
  const agreementMessageId = values.get('--agreement-message-id');
  const agreementEvidencePath = values.get('--agreement-evidence-path');
  const previousAbortPath = values.get('--previous-abort-path');
  const retryRequestPath = values.get('--retry-request-path');
  const expectedActivationSetId = values.get('--expected-activation-set-id');
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
    '--ready-received-at',
    '--ready-message-path',
    '--host-report-path',
    '--agreement-message-id',
    '--agreement-evidence-path',
    '--previous-abort-path',
    '--retry-request-path',
    '--expected-activation-set-id',
    '--confirm-run-id',
    '--execution-receipt-base-url',
    '--output-root',
  ]);

  for (const name of values.keys()) assert(allowed.has(name), `unknown argument: ${name}`);
  assert(Number.isInteger(attempt) && attempt >= 6 && attempt <= 8, 'attempt must be 6, 7, or 8');
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
  assert(
    readyReceivedAt && Number.isFinite(Date.parse(readyReceivedAt)),
    'fresh READY timestamp required'
  );
  assert(readyMessagePath && fs.existsSync(readyMessagePath), 'fresh READY message file required');
  assert(hostReportPath && fs.existsSync(hostReportPath), 'fresh operator-host report required');
  assert(
    agreementMessageId && /^<[^<>\s]+>$/.test(agreementMessageId),
    'written agreement Message-ID required'
  );
  assert(
    agreementEvidencePath && fs.existsSync(agreementEvidencePath),
    'bilateral written agreement file required'
  );
  assert(
    expectedActivationSetId && BYTES32.test(expectedActivationSetId),
    'production activation set id required'
  );

  const expectedAuthorization = attempt === 6 ? 'VERITAS_READY' : 'VERITAS_RETRY_REQUEST';
  assert(
    authorization === expectedAuthorization,
    `attempt ${attempt} requires ${expectedAuthorization}, not ${authorization}`
  );
  assert(
    attempt === 6 || (previousAbortPath && fs.existsSync(previousAbortPath)),
    'retry requires previous ATTEMPT_ABORT file'
  );
  assert(
    attempt === 6 || (retryRequestPath && fs.existsSync(retryRequestPath)),
    'retry requires fresh VERITAS_RETRY_REQUEST file'
  );

  return {
    attempt,
    authorization: authorization as Options['authorization'],
    authorizationReceivedAt,
    readyReceivedAt,
    readyMessagePath: path.resolve(readyMessagePath),
    hostReportPath: path.resolve(hostReportPath),
    agreementMessageId,
    agreementEvidencePath: path.resolve(agreementEvidencePath),
    previousAbortPath: previousAbortPath ? path.resolve(previousAbortPath) : undefined,
    retryRequestPath: retryRequestPath ? path.resolve(retryRequestPath) : undefined,
    expectedActivationSetId,
    confirmRunId,
    executionReceiptBaseUrl,
    outputRoot: path.resolve(outputRoot),
  };
}

function validateActivation(options: Options, nowMs: number): void {
  assert(nowMs >= WINDOW_START_MS, 'REFUSE TO SIGN: the 14:00 UTC window has not opened');
  assert(nowMs < LAST_GATE_REQUEST_MS, 'REFUSE TO SIGN: the 14:50 UTC last-gate cutoff has passed');
  assert(nowMs < LAST_SIGNATURE_MS, 'REFUSE TO SIGN: the 14:55 UTC signature cutoff has passed');
  assert(nowMs < WINDOW_END_MS, 'REFUSE TO SIGN: the joint-run window has ended');

  const receivedAtMs = Date.parse(options.authorizationReceivedAt);
  const readyAtMs = Date.parse(options.readyReceivedAt);
  assert(
    readyAtMs >= READY_START_MS && readyAtMs < WINDOW_START_MS,
    'READY must arrive during 13:55–14:00 UTC'
  );
  assert(receivedAtMs >= READY_START_MS, 'authorization predates fresh READY');
  assert(receivedAtMs <= nowMs + 5_000, 'authorization receipt time is in the future');
  if (options.attempt === 6) {
    assert(receivedAtMs === readyAtMs, 'attempt 6 authorization must be the fresh READY');
  } else {
    assert(nowMs - receivedAtMs <= 5 * 60_000, 'retry request is more than five minutes old');
  }
}

function messageFields(filePath: string, heading: string): Map<string, string> {
  const message = fs.readFileSync(filePath, 'utf8');
  assert(message.trimStart().startsWith(heading), `${heading} heading is missing`);
  const fields = new Map<string, string>();
  for (const line of message.split(/\r?\n/)) {
    const match = /^([A-Za-z][A-Za-z0-9]*):\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    assert(!fields.has(match[1]), `${heading} repeats ${match[1]}`);
    fields.set(match[1], match[2]);
  }
  return fields;
}

function validateControlMessages(options: Options): void {
  const agreement = fs.readFileSync(options.agreementEvidencePath, 'utf8');
  assert(
    agreement.includes(RUN_ID) && agreement.includes('2026-10-02') && agreement.includes('1800'),
    'bilateral agreement evidence lacks the run, window date or TTL'
  );
  assert(
    new RegExp(
      `^Message-ID:\\s*${options.agreementMessageId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
      'im'
    ).test(agreement),
    'agreement evidence does not match the supplied sent Message-ID'
  );
  assert(
    /^From:.*imokokok123@gmail\.com/im.test(agreement) && /\bAGREED\b/.test(agreement),
    'agreement evidence must be YuTao’s sent AGREED email'
  );
  const ready = messageFields(options.readyMessagePath, 'VERITAS_READY');
  assert(ready.get('runId') === RUN_ID, 'fresh READY runId mismatch');
  assert(ready.get('attempt') === '6', 'fresh READY must start with Attempt 6');
  assert(
    ready.get('operationalClosurePackageReceived') === 'yes',
    'closure package not acknowledged'
  );
  assert(ready.get('gateValiditySeconds') === '1800', 'fresh READY TTL mismatch');
  assert(
    ready.get('selectionRuleHash') === EXPECTED_SELECTION_RULE_HASH,
    'fresh READY rule hash mismatch'
  );
  for (const field of ['bitcoinFundingCheck', 'ethereumFundingCheck', 'ethereumFeeCheck']) {
    assert(ready.get(field) === 'PASS', `fresh READY ${field} is not PASS`);
  }
  assert(
    ready.get('ethereumSender') === '0xBdaC9fe3E7c610665b5DdB09041A7DEA1241C2C0',
    'fresh READY sender mismatch'
  );
  assert(ready.get('ethereumChainId') === '1', 'fresh READY chain mismatch');
  assert(
    ready.get('liveHandoffChannel') === 'this email thread',
    'fresh READY handoff channel mismatch'
  );
  const expectedCutoffs = new Map([
    ['cutoffLastGateRequested', '14:50 UTC'],
    ['cutoffLastGateSigned', '14:55 UTC'],
    ['cutoffNoBitcoinBroadcastAfter', '15:00 UTC'],
    ['cutoffAttemptsConcluded', '15:25 UTC'],
    ['cutoffRecordsPublished', '15:30 UTC'],
  ]);
  for (const [field, expected] of expectedCutoffs) {
    assert(ready.get(field) === expected, `fresh READY ${field} mismatch`);
  }
  const freshReadsAt = ready.get('freshReadsAt');
  assert(freshReadsAt && Number.isFinite(Date.parse(freshReadsAt)), 'READY lacks freshReadsAt');
  assert(
    Date.parse(freshReadsAt) >= PREFLIGHT_START_MS &&
      Date.parse(freshReadsAt) <= Date.parse(options.readyReceivedAt) &&
      Date.parse(options.readyReceivedAt) - Date.parse(freshReadsAt) < 15 * 60_000,
    'READY source reads are not fresh for this window'
  );
  const report = fs.readFileSync(options.hostReportPath, 'utf8');
  assert(
    /31 of 31 byte-identical/.test(report),
    'fresh operator-host report does not confirm 31/31 bytes'
  );
  const captured = /^captured\s+(\S+)/m.exec(report)?.[1];
  assert(
    captured && Number.isFinite(Date.parse(captured)),
    'host report lacks a captured timestamp'
  );
  assert(
    Date.parse(captured) >= PREFLIGHT_START_MS && Date.parse(captured) < WINDOW_START_MS,
    'host report is not fresh for this READY window'
  );
  assert(
    Date.parse(captured) <= Date.parse(options.readyReceivedAt),
    'host report was captured after READY'
  );
  if (options.attempt === 6) return;
  const abort = messageFields(options.previousAbortPath!, 'ATTEMPT_ABORT');
  assert(abort.get('runId') === RUN_ID, 'previous abort runId mismatch');
  assert(abort.get('attempt') === String(options.attempt - 1), 'previous abort attempt mismatch');
  const reason = abort.get('reasonCode');
  assert(
    reason && reason !== 'STOPPED_ON_REQUEST' && reason !== 'CUTOFF_REACHED',
    'run is stopped; retry forbidden'
  );
  assert(
    abort.has('bitcoinTransactionIds') && abort.has('ethereumTransactionIds'),
    'abort transaction ids missing'
  );
  const request = messageFields(options.retryRequestPath!, 'VERITAS_RETRY_REQUEST');
  assert(request.get('runId') === RUN_ID, 'retry runId mismatch');
  assert(request.get('nextAttempt') === String(options.attempt), 'retry attempt mismatch');
  assert(
    request.get('previousAttempt') === String(options.attempt - 1),
    'retry previous attempt mismatch'
  );
  assert(
    request.get('previousAbortReason') === reason,
    'retry reason differs from published abort'
  );
}

async function fetchJson(url: string, init?: RequestInit, evidencePath?: string): Promise<unknown> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(45_000) });
  const bodyText = await response.text();
  if (evidencePath) {
    writePrivate(
      evidencePath,
      `${JSON.stringify({ receivedAt: new Date().toISOString(), status: response.status, url, bodyText }, null, 2)}\n`
    );
  }
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
  destinationAsset: 'WETH' | 'USDC',
  evidencePath: string
): Promise<Envelope> {
  const url = new URL(PRE_TRADE_URL);
  url.search = new URLSearchParams({
    policyId: EXPECTED_POLICY_ID,
    asset,
    chainId: '1',
    action: 'swap',
    tradeAmountUsd: '50000',
    schemaVersion: '3',
    destinationAsset,
  }).toString();
  const raw = await fetchJson(
    url.toString(),
    {
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-store',
        'X-API-Key': apiKey,
      },
    },
    evidencePath
  );
  return ApiResponseSchema.parse(raw).data.attestation;
}

function validateRole(
  name: 'source' | 'destination',
  envelope: Envelope,
  expectedSource: string,
  expectedDestination: string
): void {
  assert(envelope.data.verdict === 'PASS', `${name} gate verdict is ${envelope.data.verdict}`);
  assert(
    envelope.data.participantCount >= envelope.data.requiredParticipantCount,
    `${name} gate lacks required participants`
  );
  assert(
    envelope.data.sourceGroupCount >= envelope.data.requiredSourceGroupCount,
    `${name} gate lacks required source groups`
  );
  assert(envelope.data.sourceAssetId === expectedSource, `${name} sourceAssetId mismatch`);
  assert(
    envelope.data.destinationAssetId === expectedDestination,
    `${name} destinationAssetId mismatch`
  );
  assert(envelope.data.validUntil === envelope.validUntil, `${name} validUntil mismatch`);
  assert(
    envelope.validUntil === envelope.data.checkedAt + envelope.validForSeconds,
    `${name} validity interval is not exactly 1800 seconds`
  );
}

async function issueFreshGatePair(
  options: Options,
  outputDir: string
): Promise<[Envelope, Envelope]> {
  const configuredKey = process.env.INSIGHT_API_KEY;
  assert(configuredKey?.startsWith('ins_'), 'a pre-approved dedicated INSIGHT_API_KEY is required');
  validateActivation(options, Date.now());
  const results = await Promise.allSettled([
    issueGate(configuredKey, 'WETH', 'USDC', path.join(outputDir, 'source-http-response.json')),
    issueGate(
      configuredKey,
      'USDC',
      'WETH',
      path.join(outputDir, 'destination-http-response.json')
    ),
  ]);
  const failures = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [`${index === 0 ? 'source' : 'destination'}: ${String(result.reason)}`]
      : []
  );
  assert(
    failures.length === 0,
    `gate issuance did not return a complete pair: ${failures.join('; ')}`
  );
  return [
    (results[0] as PromiseFulfilledResult<Envelope>).value,
    (results[1] as PromiseFulfilledResult<Envelope>).value,
  ];
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
  return execFileSync(process.execPath, ['--import', 'tsx', scriptPath, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const startedAtMs = Date.now();
  validateActivation(options, startedAtMs);
  validateControlMessages(options);

  const [registry, currentIntegrations] = await Promise.all([
    fetchJson(REGISTRY_URL, { headers: { Accept: 'application/json' } }).then((value) =>
      RegistrySchema.parse(value)
    ),
    fetchJson(INTEGRATIONS_URL, {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-store' },
    }).then((value) => CurrentIntegrationsSchema.parse(value)),
  ]);
  assert(
    currentIntegrations.activationSetId === options.expectedActivationSetId,
    'REFUSE TO SIGN: VERITAS activation set changed'
  );
  const [activation, policy] = await Promise.all([
    fetchJson(currentIntegrations.immutable).then((value) => ActivationSetSchema.parse(value)),
    fetchJson(
      `${API_BASE_URL}/.well-known/oracle-registry/integrations/${EXPECTED_POLICY_ID}`
    ).then((value) => PolicyReadbackSchema.parse(value)),
  ]);
  assert(
    activation.activationSetId === options.expectedActivationSetId,
    'immutable activation set mismatch'
  );
  assert(
    activation.activationSet.partners.veritas === policy.policyId,
    'production VERITAS policy mismatch'
  );

  // This attempt uses the explicitly activated one-time v3 policy. Check the production
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

  // Both HTTP calls begin together so the two 1800-second clocks are as close as possible.
  // The selection rule is explicitly WETH -> USDC in the Uniswap V3 ERC-20
  // pool. Native ETH is a different CAIP-19 asset and cannot be substituted:
  // the execution collector must be able to attribute the same signed legs.
  fs.mkdirSync(options.outputRoot, { recursive: true, mode: 0o700 });
  const lockPath = path.join(options.outputRoot, `attempt-${options.attempt}.lock`);
  writePrivate(
    lockPath,
    `${JSON.stringify({ startedAt: new Date(startedAtMs).toISOString(), agreementMessageId: options.agreementMessageId })}\n`
  );
  const timestamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '');
  const outputDir = path.join(options.outputRoot, `attempt-${options.attempt}-${timestamp}`);
  fs.mkdirSync(outputDir, { recursive: false, mode: 0o700 });
  // Retain this lock even if one HTTP response is lost: an unknown signing outcome is not a fresh attempt.
  const [sourceEnvelope, destinationEnvelope] = await issueFreshGatePair(options, outputDir);

  const WETH = 'eip155:1/erc20:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const USDC = 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  validateRole('source', sourceEnvelope, WETH, USDC);
  validateRole('destination', destinationEnvelope, USDC, WETH);
  assert(
    sourceEnvelope.uid !== destinationEnvelope.uid,
    'source and destination gate UIDs must differ'
  );
  assert(
    getAddress(sourceEnvelope.attester) === getAddress(destinationEnvelope.attester),
    'source and destination gates were signed by different attesters'
  );
  assert(
    getAddress(sourceEnvelope.attester) === EXPECTED_ATTESTER,
    'gate attester differs from written pin'
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
    remainingSeconds >= 1740,
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

  const message = runNodeScript(path.join(here, 'render-insight-gate-pair-1800.mts'), [
    '--input',
    pairPath,
  ]);
  const commitment = runNodeScript(path.join(here, 'build-joint-run-commitments.mjs'), [
    '--input',
    commitmentInputPath,
    '--rule',
    path.join(here, 'anchored-settlement-selection-rule-v3.json'),
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
        readyReceivedAt: options.readyReceivedAt,
        agreementMessageId: options.agreementMessageId,
        agreementEvidenceSha256: createHash('sha256')
          .update(fs.readFileSync(options.agreementEvidencePath))
          .digest('hex'),
        readyMessageSha256: createHash('sha256')
          .update(fs.readFileSync(options.readyMessagePath))
          .digest('hex'),
        hostReportSha256: createHash('sha256')
          .update(fs.readFileSync(options.hostReportPath))
          .digest('hex'),
        activationSetId: options.expectedActivationSetId,
        policyId: EXPECTED_POLICY_ID,
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
