import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { concat, hashTypedData, keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { KeyRegistry, RoutableAttestation, ExecutionReceipt } from '../../verifier/src/index';

// Compiled into an isolated consumer directory by check-verifier-release.mts.
// Every runtime verifier import resolves to the PACKED package, never workspace source.
const api =
  (await import('verify-insight-receipt')) as unknown as typeof import('../../verifier/src/index');
const cjs = createRequire(import.meta.url)('verify-insight-receipt') as typeof api;
globalThis.fetch = async () => {
  throw new Error('Network forbidden in offline verifier conformance');
};
assert.equal(typeof cjs.parsePinnedKeyRegistry, 'function');
assert.deepEqual(cjs.EXECUTION_TYPES_V5, api.EXECUTION_TYPES_V5);
const account = privateKeyToAccount(`0x${'12'.repeat(32)}`),
  now = Math.floor(Date.now() / 1000);
const zero = `0x${'00'.repeat(32)}`,
  requestHash = `0x${'ab'.repeat(32)}`;
const registry: KeyRegistry = {
  keys: [
    {
      key_id: 'synthetic-conformance',
      public_key: account.address,
      validFrom: new Date((now - 100) * 1000).toISOString(),
      validUntil: new Date((now + 2000) * 1000).toISOString(),
      revoked: false,
      role: 'attester',
    },
  ],
  revoked: [],
};
const bytes = Buffer.from(JSON.stringify(registry, null, 2) + '\n'),
  pin = createHash('sha256').update(bytes).digest('hex');
assert.equal(api.parsePinnedKeyRegistry(bytes, pin).byteLength, bytes.length);
assert.throws(() => api.parsePinnedKeyRegistry(bytes, '00'.repeat(32)), /HASH_MISMATCH/);
assert.throws(
  () => api.parsePinnedKeyRegistry(Buffer.concat([bytes, Buffer.from(' ')]), pin),
  /HASH_MISMATCH/
);
for (const change of [
  'invalid-date',
  'duplicate-key',
  'invalid-role',
  'sample-role-array',
  'attester-role-array',
]) {
  const bad = structuredClone(registry);
  if (change === 'invalid-date') bad.keys![0].validFrom = 'invalid';
  if (change === 'duplicate-key') bad.keys!.push({ ...bad.keys![0] });
  if (change === 'invalid-role')
    (bad.keys![0] as unknown as Record<string, unknown>).role = 'anything';
  if (change.endsWith('-role-array'))
    (bad.keys![0] as unknown as Record<string, unknown>).role = [change.split('-')[0]];
  const data = Buffer.from(JSON.stringify(bad));
  assert.throws(
    () => api.parsePinnedKeyRegistry(data, createHash('sha256').update(data).digest('hex')),
    /Invalid/
  );
}
const base = {
  verdict: 'PASS',
  asset: 'USDC',
  chainId: 1,
  subjectChainId: 1,
  sourceAssetId: 'eip155:1/erc20:0x' + '11'.repeat(20),
  destinationAssetId: 'eip155:1/erc20:0x' + '22'.repeat(20),
  action: 'swap',
  tradeAmountUsd: 100,
  consensusPrice: 1,
  maxDeviationBps: 0,
  manipulationRiskBps: 0,
  participantCount: 3,
  requiredParticipantCount: 3,
  coverageStatus: 'COVERED',
  independenceStatus: 'INDEPENDENT',
  sourceGroupCount: 2,
  requiredSourceGroupCount: 2,
  crossProviderAgreementBps: 0,
  maxStablecoinDepegBps: 0,
  maxDataAgeSeconds: 5,
  recommendedMaxPositionUsd: 100,
  reasonCodesHash: zero,
  requestHash,
  evaluationScope: 'SOURCE_ONLY',
  evaluatedAssetIdsHash: zero,
  providerObservationsHash: zero,
  validUntil: now + 600,
  checkedAt: now - 3,
};
async function sign(
  domain: object,
  types: object,
  primaryType: string,
  data: Record<string, unknown>,
  message: object
): Promise<RoutableAttestation> {
  const args = { domain, types, primaryType, message } as Parameters<
    typeof account.signTypedData
  >[0];
  return {
    uid: hashTypedData(args),
    schemaVersion: Number(data.schemaVersion),
    attester: account.address,
    data,
    signature: await account.signTypedData(args),
    eip712: { primaryType },
  };
}
let source: RoutableAttestation | undefined;
for (const version of [1, 2, 3] as const) {
  const data = { ...base, schemaVersion: version };
  const schema = version === 1 ? 'v1' : version === 2 ? 'v2' : 'v3';
  const receipt = await sign(
    api.DOMAIN_BY_SCHEMA[schema],
    api.TYPES_BY_SCHEMA[schema],
    api.PRIMARY_TYPE_BY_SCHEMA[schema],
    data,
    version === 1
      ? api.toV1Message(data)
      : version === 2
        ? api.toV2Message(data)
        : api.toV3Message(data)
  );
  const result = await api.verifyReceipt(receipt, { keyRegistry: registry });
  assert.equal(result.code, 'ok');
  assert.equal(result.keyStatus, 'valid');
  assert.equal((await cjs.verifyReceipt(receipt, { keyRegistry: registry })).code, 'ok');
  if (version === 3) source = receipt;
  if (version !== 1) {
    const recheck = { ...data, originalUid: receipt.uid, originalRequestHash: requestHash };
    const r = await sign(
      version === 2 ? api.RECHECK_DOMAIN : api.RECHECK_V3_DOMAIN,
      version === 2 ? api.RECHECK_TYPES : api.RECHECK_V3_TYPES,
      api.RECHECK_PRIMARY_TYPE,
      recheck,
      version === 2 ? api.toRecheckMessage(recheck) : api.toRecheckV3Message(recheck)
    );
    assert.equal((await api.verifyReceipt(r, { keyRegistry: registry })).code, 'ok');
  }
}
assert.ok(source);
async function execution(
  version: number,
  overrides: Record<string, unknown> = {}
): Promise<ExecutionReceipt> {
  const types = api.executionTypesForSchemaVersion(version)!;
  const data: Record<string, unknown> = {};
  for (const field of types.ExecutionReceipt)
    data[field.name] =
      field.type === 'bool'
        ? false
        : field.type === 'bytes32'
          ? zero
          : field.type === 'address'
            ? account.address
            : field.type === 'string'
              ? ''
              : 0;
  Object.assign(data, {
    schemaVersion: version,
    bindingMode: 'VERIFIED',
    claimRole: 'THIRD_PARTY_OBSERVATION',
    preTradeUid: source!.uid,
    destinationPreTradeUid: zero,
    preTradeUidsHash: keccak256(concat([source!.uid as `0x${string}`])),
    requestHash,
    sourceAssetId: base.sourceAssetId,
    destinationAssetId: base.destinationAssetId,
    subjectChainId: 1,
    settlementChainId: 1,
    action: 'swap',
    executedAt: now,
    preTradeSignedAt: now - 3,
    validUntil: now + 600,
    executionStatus: 'FAITHFUL',
    priceExecutionStatus: 'FAITHFUL',
    environment: 'synthetic-conformance',
    profileId: api.EXECUTION_PROFILE_V1_ID,
    ...overrides,
  });
  const message = Object.fromEntries(
    types.ExecutionReceipt.map((f) => [
      f.name,
      f.type.startsWith('uint') || f.type.startsWith('int')
        ? BigInt(data[f.name] as number)
        : data[f.name],
    ])
  );
  return sign(
    api.EXECUTION_DOMAIN,
    types,
    api.EXECUTION_PRIMARY_TYPE,
    data,
    message
  ) as Promise<ExecutionReceipt>;
}
let current: ExecutionReceipt | undefined;
for (const version of [1, 2, 3, 4, 5]) {
  const receipt = await execution(version);
  const result = await api.verifyExecutionReceipt(receipt, { keyRegistry: registry });
  assert.equal(result.valid, true, JSON.stringify(result));
  if (version >= 2)
    assert.equal(
      (await api.verifyExecutionPair(source, receipt, null, { keyRegistry: registry })).pairedValid,
      true
    );
  if (version === 5) current = receipt;
}
assert.ok(current);
const unknown = await execution(5, { profileId: `0x${'ff'.repeat(32)}` });
const unsupported = await api.verifyExecutionReceipt(unknown, { keyRegistry: registry });
assert.equal(unsupported.cryptographicValid, true);
assert.equal(unsupported.code, 'unsupported_profile');
assert.equal(unsupported.valid, false);
const tampered = structuredClone(current);
tampered.data.maxSlippageBps = 999;
assert.equal(
  (await api.verifyExecutionReceipt(tampered, { keyRegistry: registry })).code,
  'uid_mismatch'
);
for (const change of ['revoked', 'sample', 'outside-window', 'unknown-key']) {
  const bad = structuredClone(registry);
  if (change === 'revoked') bad.keys![0].revoked = true;
  if (change === 'sample') bad.keys![0].role = 'sample';
  if (change === 'outside-window')
    bad.keys![0].validFrom = new Date((now + 1) * 1000).toISOString();
  if (change === 'unknown-key') bad.keys![0].public_key = `0x${'ff'.repeat(20)}`;
  assert.equal(
    (await api.verifyExecutionPair(source, current, null, { keyRegistry: bad })).pairedValid,
    false,
    change
  );
}
assert.equal(
  (
    await api.verifyExecutionPair(
      { ...source, uid: 'invalid' },
      { ...current, data: { ...current.data, preTradeUid: 'invalid' } },
      null,
      { keyRegistry: registry }
    )
  ).pairedValid,
  false
);
const clock = Date.now;
try {
  Date.now = () => (now + 600) * 1000;
  assert.equal(
    (await api.verifyExecutionReceipt(current, { keyRegistry: registry })).code,
    'expired'
  );
  assert.equal(
    (await api.verifyExecutionPair(source, current, null, { keyRegistry: registry })).pairedValid,
    true
  );
} finally {
  Date.now = clock;
}
await writeFile('registry.json', bytes);
await writeFile('source.json', JSON.stringify(source));
await writeFile('execution.json', JSON.stringify(current));
const cli = join(process.cwd(), 'node_modules/verify-insight-receipt/dist/offline.mjs');
const args = [
  '--registry',
  'registry.json',
  '--registry-sha256',
  pin,
  '--pre-trade',
  'source.json',
  '--execution',
  'execution.json',
];
const good = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
assert.equal(good.status, 0, good.stderr);
assert.equal(JSON.parse(good.stdout).accepted, true);
const bad = spawnSync(
  process.execPath,
  [cli, ...args.map((v) => (v === pin ? '00'.repeat(32) : v))],
  { encoding: 'utf8' }
);
assert.equal(bad.status, 1);
assert.match(bad.stderr, /HASH_MISMATCH/);
// OracleScenarioRun v1 must work in the PACKED build, not just in workspace
// source. It shares schemaVersion 1 with the v1 pre-trade receipt, so this also
// pins that the two families stay distinguishable after packaging.
{
  const z = `0x${'00'.repeat(32)}`,
    ranAt = Math.floor(Date.now() / 1000);
  const data = {
    scenarioId: 'synthetic-conformance-scenario',
    scenarioKind: 'stale_price',
    verdict: 'caught',
    harnessVersion: '1.0.0',
    stepCount: 4,
    caughtStepCount: 2,
    falsePositiveCount: 0,
    detectionRate: 10_000,
    scenarioHash: z,
    reasonCodesHash: z,
    ranAt,
    validUntil: ranAt + 3600,
    schemaVersion: 1,
  };
  const types = (cjs.TEST_TYPES as Record<string, Array<{ name: string; type: string }>>)[
    cjs.TEST_PRIMARY_TYPE
  ];
  assert.equal(types.length, 13, 'TEST_TYPES must carry the 13 signed fields');
  assert.deepEqual(cjs.TEST_DOMAIN, { name: 'Insight Oracle Test', version: '1', chainId: 1 });
  const message: Record<string, unknown> = {};
  for (const field of types) {
    const v = data[field.name as keyof typeof data];
    message[field.name] = field.type === 'uint256' ? BigInt(v as number) : v;
  }
  const args = {
    domain: cjs.TEST_DOMAIN,
    types: cjs.TEST_TYPES,
    primaryType: cjs.TEST_PRIMARY_TYPE,
    message,
  };
  const receipt = {
    uid: hashTypedData(args as never),
    schemaVersion: 1,
    attester: account.address,
    signature: await account.signTypedData(args as never),
    data,
    eip712: { primaryType: cjs.TEST_PRIMARY_TYPE },
  };

  const verified = await api.verifyReceipt(receipt as RoutableAttestation, {
    keyRegistry: registry,
  });
  assert.equal(verified.code, 'ok');
  assert.equal(verified.valid, true);
  assert.equal(verified.kind, 'test');
  assert.equal(verified.checkedAt, ranAt, 'ranAt must anchor checkedAt for this family');

  // A tampered payload must fail, proving the packed layout actually binds.
  const tampered = await api.verifyReceipt(
    { ...receipt, data: { ...data, detectionRate: 9999 } } as RoutableAttestation,
    { keyRegistry: registry }
  );
  assert.equal(tampered.code, 'uid_mismatch');
  assert.equal(tampered.valid, false);
}
const pkg = JSON.parse(await readFile('node_modules/verify-insight-receipt/package.json', 'utf8'));
assert.equal(pkg.version, '0.4.0');
process.stdout.write(
  JSON.stringify({
    version: pkg.version,
    checks: {
      cjs: true,
      esm: true,
      preTradeSchemas: [1, 2, 3],
      scenarioTestRunSchema: 1,
      recheckSchemas: [2, 3],
      executionSchemas: [1, 2, 3, 4, 5],
      pinnedSnapshot: true,
      typedRolesRejected: true,
      unknownProfileRejected: true,
      tamperRejected: true,
      trustFailuresRejected: true,
      malformedPairRejected: true,
      historicalPairVerified: true,
      offlineCli: true,
    },
    browserFixture: { source, execution: current, registry, pin },
  })
);
