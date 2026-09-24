#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { getAddress, isAddress } from 'viem';
import { z } from 'zod';

import { computeRequestHash } from '@/lib/attestations/canonicalRequestHash';
import { verifyAttestationBySchema } from '@/lib/attestations/verifyAttestationBySchema';

const ORIGIN = 'https://www.oracleinsight.xyz';
const PRE_TRADE_URL = `${ORIGIN}/api/v1/safety/pre-trade`;
const REGISTRY_URL = `${ORIGIN}/.well-known/oracle-keys.json`;
const CURRENT_REGISTRY_URL = `${ORIGIN}/.well-known/oracle-registry/current.json`;
const CHAIN_ID = 84_532;
const DECLARED_AMOUNT_USD = 4;
const WETH = '0x4200000000000000000000000000000000000006';
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const WETH_ID = `eip155:${CHAIN_ID}/erc20:${WETH}`;
const USDC_ID = `eip155:${CHAIN_ID}/erc20:${USDC}`;
const WORKFLOW_TAG = 'interai.track1.executable-candidate.v1';
const WAK_WORKFLOW_TAG = 'wak.insight-priorseal.p1.v1';
const BYTES32 = /^0x[0-9a-fA-F]{64}$/;
const SIGNATURE = /^0x[0-9a-fA-F]{130}$/;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const EnvelopeSchema = z
  .object({
    uid: z.string().regex(BYTES32),
    schemaVersion: z.literal(3),
    attester: z.string().refine((value) => isAddress(value), 'attester must be an address'),
    signedAt: z.string().datetime({ offset: true }),
    validForSeconds: z.literal(600),
    validUntil: z.number().int().positive(),
    signature: z.string().regex(SIGNATURE),
    data: z
      .object({
        verdict: z.literal('PASS'),
        sourceAssetId: z.string(),
        destinationAssetId: z.string(),
        subjectChainId: z.literal(CHAIN_ID),
        action: z.literal('swap'),
        tradeAmountUsd: z.literal(DECLARED_AMOUNT_USD * 1_000_000),
        participantCount: z.number().int().nonnegative(),
        requiredParticipantCount: z.number().int().positive(),
        coverageStatus: z.string(),
        independenceStatus: z.string(),
        sourceGroupCount: z.number().int().nonnegative(),
        requiredSourceGroupCount: z.number().int().positive(),
        requestHash: z.string().regex(BYTES32),
        checkedAt: z.number().int().positive(),
        validUntil: z.number().int().positive(),
        schemaVersion: z.literal(3),
      })
      .passthrough(),
    eip712: z.object({ primaryType: z.literal('OracleSafetyCheck') }).passthrough(),
  })
  .passthrough();

type Envelope = z.infer<typeof EnvelopeSchema>;

const ApiResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ attestation: EnvelopeSchema }).passthrough(),
  meta: z.object({ requestId: z.string() }).passthrough(),
});

const RegistrySchema = z.object({
  issuer: z.literal(ORIGIN),
  attestation_enabled: z.literal(true),
  registryRelease: z.object({ releaseId: z.string().regex(BYTES32) }),
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

const CurrentRegistrySchema = z.object({
  releaseId: z.string().regex(BYTES32),
  release: z.string().url(),
});

interface Options {
  output: string;
  trustRootDir: string;
  profile: 'interai' | 'wak-p1';
}

interface TemporaryApiKey {
  id: string;
  plainKey: string;
  expiresAt: string;
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
  const output = values.get('--output');
  const trustRootDir = values.get('--trust-root-dir');
  const profile = values.get('--profile') ?? 'interai';
  assert(output, '--output is required');
  assert(trustRootDir, '--trust-root-dir is required');
  assert(profile === 'interai' || profile === 'wak-p1', 'unsupported profile');
  assert(
    values.size === 2 || (values.size === 3 && values.has('--profile')),
    'unsupported arguments'
  );
  return { output: path.resolve(output), trustRootDir: path.resolve(trustRootDir), profile };
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const normalizedHeaders = new Headers(init?.headers);
  normalizedHeaders.set('Accept', 'application/json');
  normalizedHeaders.set('Cache-Control', 'no-store');
  const headers = Object.fromEntries(normalizedHeaders.entries());
  let status = 200;
  let text: string;
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(45_000),
      headers,
    });
    status = response.status;
    text = await response.text();
  } catch {
    try {
      text = curlWithPrivateConfig('GET', url, headers);
    } catch {
      throw new Error(`${url} was unreachable through fetch and curl`);
    }
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${url} returned non-JSON HTTP ${status}`);
  }
  if (status < 200 || status >= 300)
    throw new Error(`${url} returned HTTP ${status}: ${text.slice(0, 500)}`);
  return body;
}

function curlWithPrivateConfig(
  method: 'GET' | 'POST' | 'PATCH',
  url: string,
  headers: Record<string, string>,
  body?: unknown
): string {
  const lines = [
    'http1.1',
    'tlsv1.2',
    'ipv4',
    'fail-with-body',
    'silent',
    'show-error',
    'retry = 4',
    'retry-all-errors',
    'connect-timeout = 15',
    'max-time = 45',
    `request = ${JSON.stringify(method)}`,
    `url = ${JSON.stringify(url)}`,
  ];
  for (const [name, value] of Object.entries(headers))
    lines.push(`header = ${JSON.stringify(`${name}: ${value}`)}`);
  if (body !== undefined) lines.push(`data = ${JSON.stringify(JSON.stringify(body))}`);
  return execFileSync('curl', ['--config', '-'], {
    input: `${lines.join('\n')}\n`,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 240_000,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function supabaseConfig(): { origin: string; serviceKey: string } {
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(origin, 'NEXT_PUBLIC_SUPABASE_URL is required');
  assert(serviceKey, 'SUPABASE_SERVICE_ROLE_KEY is required');
  return { origin: origin.replace(/\/$/, ''), serviceKey };
}

function supabaseRestJson(
  method: 'GET' | 'POST' | 'PATCH',
  resource: string,
  body?: unknown,
  prefer = 'return=representation'
): unknown {
  const { origin, serviceKey } = supabaseConfig();
  let text: string;
  try {
    text = curlWithPrivateConfig(
      method,
      `${origin}/rest/v1/${resource}`,
      {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: prefer,
      },
      body
    );
  } catch {
    throw new Error(`Supabase REST ${method} failed for ${resource.split('?')[0]}`);
  }
  if (!text.trim()) return null;
  return JSON.parse(text) as unknown;
}

function createTemporaryApiKey(
  ownerId: string,
  expiresAt: string,
  profile: Options['profile']
): TemporaryApiKey {
  const plainKey = `ins_${randomBytes(32).toString('hex')}`;
  const keyHash = createHash('sha256').update(plainKey).digest('hex');
  const rows = z.array(z.object({ id: z.string() })).parse(
    supabaseRestJson('POST', 'api_keys', {
      user_id: ownerId,
      name: profile === 'wak-p1' ? 'WAK P1 gate capture' : 'InterAI Track 1 gate capture',
      key_hash: keyHash,
      key_prefix: plainKey.slice(0, 8),
      plan: 'enterprise',
      rate_limit: -1,
      expires_at: expiresAt,
    })
  );
  assert(rows.length === 1, `expected one temporary API-key row, received ${rows.length}`);
  return { id: rows[0].id, plainKey, expiresAt };
}

function revokeTemporaryApiKey(keyId: string, ownerId: string): void {
  supabaseRestJson(
    'PATCH',
    `api_keys?id=eq.${encodeURIComponent(keyId)}&user_id=eq.${encodeURIComponent(ownerId)}`,
    { is_active: false, updated_at: new Date().toISOString() },
    'return=minimal'
  );
}

async function issueGate(
  apiKey: string,
  asset: 'WETH' | 'USDC',
  destinationAsset: 'WETH' | 'USDC',
  profile: Options['profile']
): Promise<{ envelope: Envelope; requestId: string }> {
  const url = new URL(PRE_TRADE_URL);
  url.search = new URLSearchParams({
    asset,
    chainId: String(CHAIN_ID),
    action: 'swap',
    tradeAmountUsd: String(DECLARED_AMOUNT_USD),
    schemaVersion: '3',
    destinationAsset,
    workflowTag: profile === 'wak-p1' ? WAK_WORKFLOW_TAG : WORKFLOW_TAG,
    baselineVerdict: 'allow',
    baselineVersion: profile === 'wak-p1' ? 'wak-insight-priorseal-p1' : 'interai-track1-v2.1',
  }).toString();
  const response = ApiResponseSchema.parse(
    await fetchJson(url.toString(), { headers: { 'X-API-Key': apiKey } })
  );
  return { envelope: response.data.attestation, requestId: response.meta.requestId };
}

function assertRegistryAuthorization(
  envelope: Envelope,
  registry: z.infer<typeof RegistrySchema>
): void {
  const key = registry.public_keys.find(
    (candidate) => getAddress(candidate.public_key) === getAddress(envelope.attester)
  );
  assert(key, `attester ${envelope.attester} is absent from the current registry`);
  assert(!key.revoked, `attester ${envelope.attester} is revoked`);
  assert(key.role !== 'sample', `attester ${envelope.attester} is sample-only`);
  const signedAt = Date.parse(envelope.signedAt);
  assert(signedAt >= Date.parse(key.validFrom), 'attestation predates signer validity');
  assert(key.validUntil === null || signedAt <= Date.parse(key.validUntil), 'attester is expired');
}

async function validateGate(
  label: 'source' | 'destination',
  envelope: Envelope,
  expectedSource: string,
  expectedDestination: string,
  registry: z.infer<typeof RegistrySchema>
): Promise<void> {
  assert(envelope.data.sourceAssetId === expectedSource, `${label} sourceAssetId mismatch`);
  assert(
    envelope.data.destinationAssetId === expectedDestination,
    `${label} destinationAssetId mismatch`
  );
  assert(envelope.validUntil === envelope.data.validUntil, `${label} validUntil mismatch`);
  assert(
    envelope.validUntil === envelope.data.checkedAt + envelope.validForSeconds,
    `${label} validity interval is not 600 seconds`
  );
  assert(
    envelope.data.participantCount >= envelope.data.requiredParticipantCount,
    `${label} quorum failed`
  );
  assert(
    envelope.data.sourceGroupCount >= envelope.data.requiredSourceGroupCount,
    `${label} independence failed`
  );
  const expectedRequestHash = computeRequestHash({
    subjectChainId: CHAIN_ID,
    sourceAssetId: expectedSource,
    destinationAssetId: expectedDestination,
    action: 'swap',
    tradeAmountUsd: DECLARED_AMOUNT_USD,
  });
  assert(envelope.data.requestHash === expectedRequestHash, `${label} requestHash mismatch`);
  assertRegistryAuthorization(envelope, registry);
  const verification = await verifyAttestationBySchema(envelope);
  assert(
    verification.valid && !verification.expired,
    `${label} signature verification failed: ${verification.reason ?? 'unknown'}`
  );
}

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
}

async function fetchOrReadJson(url: string, fallbackPath: string): Promise<unknown> {
  try {
    return await fetchJson(url);
  } catch {
    return JSON.parse(readFileSync(fallbackPath, 'utf8')) as unknown;
  }
}

async function main(): Promise<void> {
  const { output, trustRootDir, profile } = parseArgs(process.argv.slice(2));
  mkdirSync(output, { recursive: false, mode: 0o700 });

  // InterAI's live candidate must use the current registry head. The WAK P1
  // profile retains its existing local trust-root fallback for offline runs.
  const readTrustRoot =
    profile === 'interai'
      ? (url: string, _fallbackPath: string) => fetchJson(url)
      : fetchOrReadJson;

  const ownerId = (process.env.OPS_OWNER_USER_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .find(Boolean);
  assert(ownerId, 'OPS_OWNER_USER_IDS must contain the owner id');

  const [registryRaw, currentRaw] = await Promise.all([
    readTrustRoot(REGISTRY_URL, path.join(trustRootDir, 'oracle-keys.json')),
    readTrustRoot(CURRENT_REGISTRY_URL, path.join(trustRootDir, 'oracle-registry-current.json')),
  ]);
  const registry = RegistrySchema.parse(registryRaw);
  const current = CurrentRegistrySchema.parse(currentRaw);
  assert(registry.registryRelease.releaseId === current.releaseId, 'registry release ids differ');
  assert(
    current.release === `${ORIGIN}/.well-known/oracle-registry/releases/${current.releaseId}`,
    'registry release URL is not the pinned Insight origin/path'
  );

  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const temporary = createTemporaryApiKey(ownerId, expiresAt, profile);
  let revokedAt: string | null = null;
  try {
    const [source, destination] = await Promise.all([
      issueGate(temporary.plainKey, 'WETH', 'USDC', profile),
      issueGate(temporary.plainKey, 'USDC', 'WETH', profile),
    ]);
    await Promise.all([
      validateGate('source', source.envelope, WETH_ID, USDC_ID, registry),
      validateGate('destination', destination.envelope, USDC_ID, WETH_ID, registry),
    ]);
    assert(
      getAddress(source.envelope.attester) === getAddress(destination.envelope.attester),
      'source and destination attestations use different signers'
    );

    const audits = z
      .array(
        z
          .object({
            id: z.string(),
            created_at: z.string(),
            request_id: z.string(),
            workflow_tag: z.string(),
            asset: z.string(),
            chain_id: z.number(),
            action: z.string(),
            trade_amount_usd: z.number(),
            verdict: z.string(),
            signed: z.boolean(),
            attestation_uid: z.string(),
            attester: z.string(),
            schema_version: z.number(),
            coverage_status: z.string(),
            api_key_id: z.string(),
          })
          .passthrough()
      )
      .parse(
        supabaseRestJson(
          'GET',
          `pre_trade_checks?select=id,created_at,request_id,workflow_tag,asset,chain_id,action,trade_amount_usd,verdict,signed,attestation_uid,attester,schema_version,coverage_status,api_key_id&api_key_id=eq.${encodeURIComponent(temporary.id)}`
        )
      )
      .filter((row) =>
        [source.envelope.uid, destination.envelope.uid].includes(row.attestation_uid)
      );
    assert(
      audits?.length === 2,
      `expected two persisted audit rows, received ${audits?.length ?? 0}`
    );
    for (const audit of audits) {
      assert(
        audit.workflow_tag === (profile === 'wak-p1' ? WAK_WORKFLOW_TAG : WORKFLOW_TAG),
        `audit ${audit.id} workflow mismatch`
      );
      assert(audit.api_key_id === temporary.id, `audit ${audit.id} API key mismatch`);
      assert(audit.signed === true, `audit ${audit.id} is not marked signed`);
      assert(audit.verdict === 'PASS', `audit ${audit.id} verdict is not PASS`);
      assert(audit.schema_version === 3, `audit ${audit.id} schema is not v3`);
      assert(audit.chain_id === CHAIN_ID, `audit ${audit.id} chain mismatch`);
      assert(
        Number(audit.trade_amount_usd) === DECLARED_AMOUNT_USD,
        `audit ${audit.id} amount mismatch`
      );
    }

    const releaseFilename = `oracle-registry-release-${current.releaseId}.json`;
    const releaseRaw = await readTrustRoot(
      current.release,
      path.join(trustRootDir, releaseFilename)
    );
    assert(
      z.object({ releaseId: z.string().regex(BYTES32) }).parse(releaseRaw).releaseId ===
        current.releaseId,
      'registry release body does not match current pointer'
    );
    const capturedAt = new Date().toISOString();
    writeJson(path.join(output, 'source-oracle-safety-check-v3.json'), source.envelope);
    writeJson(path.join(output, 'destination-oracle-safety-check-v3.json'), destination.envelope);
    writeJson(path.join(output, 'oracle-keys.json'), registryRaw);
    writeJson(path.join(output, 'oracle-registry-current.json'), currentRaw);
    writeJson(path.join(output, releaseFilename), releaseRaw);
    writeJson(path.join(output, 'audit-persistence-proof.json'), {
      schema:
        profile === 'wak-p1'
          ? 'insight.wak-p1.audit-persistence-proof.v1'
          : 'insight.interai-track1.audit-persistence-proof.v1',
      capturedAt,
      workflowTag: profile === 'wak-p1' ? WAK_WORKFLOW_TAG : WORKFLOW_TAG,
      expectedProductionSigner: source.envelope.attester,
      sourceRequestId: source.requestId,
      destinationRequestId: destination.requestId,
      sourceAttestationUid: source.envelope.uid,
      destinationAttestationUid: destination.envelope.uid,
      persistedRows: audits,
      temporaryInsightApiCredential: {
        keyId: temporary.id,
        expiresAt,
        secretIncluded: false,
      },
      note:
        profile === 'wak-p1'
          ? 'The temporary Insight API key was revoked after this bounded WAK P1 capture.'
          : 'This temporary Insight API key is unrelated to the unexchanged InterAI pilot credential.',
    });
  } finally {
    revokeTemporaryApiKey(temporary.id, ownerId);
    revokedAt = new Date().toISOString();
  }

  const files = [
    'source-oracle-safety-check-v3.json',
    'destination-oracle-safety-check-v3.json',
    'oracle-keys.json',
    'oracle-registry-current.json',
    `oracle-registry-release-${current.releaseId}.json`,
    'audit-persistence-proof.json',
  ];
  const resolved = files.map((name) => {
    const bytes = readFileSync(path.join(output, name));
    return {
      name,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      byteLength: bytes.length,
    };
  });
  writeJson(path.join(output, 'capture-summary.json'), {
    status: 'PASS',
    profile,
    chainId: CHAIN_ID,
    declaredAmountUsd: DECLARED_AMOUNT_USD,
    sourceAssetId: WETH_ID,
    destinationAssetId: USDC_ID,
    registryReleaseId: current.releaseId,
    temporaryInsightApiCredentialRevokedAt: revokedAt,
    files: resolved,
  });
  process.stdout.write(`${JSON.stringify({ status: 'PASS', output, revokedAt }, null, 2)}\n`);
}

await main();
