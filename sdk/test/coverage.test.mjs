import assert from 'node:assert/strict';
import test from 'node:test';

import { privateKeyToAccount } from 'viem/accounts';

import {
  buildCoverageReport,
  STRICT_COVERAGE_POLICY as policy,
  coveragePolicyId,
  coverageReportDigest,
  coverageSigningData,
  evaluateCoverage,
  verifyCoverageReport,
  withVerifiedCoverage,
  InsightClient,
} from '../dist/index.js';

const key = privateKeyToAccount(`0x${'12'.repeat(32)}`);
const now = 1800000000;
const observations = () =>
  ['chainlink', 'api3', 'twap'].map((provider) => ({
    provider,
    evidenceChainId: 1,
    price: 1,
    status: 'success',
    observedAt: now - 10,
    retrievedAt: now,
    timestampProvenance: 'provider_timestamp',
    excluded: false,
  }));
const trust = {
  policy,
  policyId: coveragePolicyId(policy),
  asset: 'USDC',
  evidenceChainId: 1,
  keys: [{ address: key.address, validFrom: now - 1000, validUntil: now + 1000, revoked: false }],
};
async function signed(rows = observations(), p = policy) {
  const report = buildCoverageReport(
    { asset: 'USDC', evidenceChainId: 1, evaluatedAt: now, observations: rows },
    p
  );
  return {
    report,
    digest: coverageReportDigest(report),
    signer: key.address,
    signature: await key.signTypedData(coverageSigningData(report)),
  };
}
test('real signature, independent groups and client request round-trip', async () => {
  const proof = await signed();
  assert.equal((await verifyCoverageReport(proof, trust, now)).valid, true);
  assert.equal(proof.report.evaluation.independentGroups, 2);
  const client = new InsightClient({
    apiKey: 'test',
    fetch: async (url) => {
      assert.match(String(url), /coverage\/assessment/);
      assert.equal(new URL(url).searchParams.get('policyId'), trust.policyId);
      return new Response(JSON.stringify({ success: true, data: proof }));
    },
  });
  assert.deepEqual(
    await client.coverageAssessment({ asset: 'USDC', chainId: 1, policyId: trust.policyId }),
    proof
  );
});
for (const [name, mutate, reason] of [
  ['two of three', (rows) => rows.pop(), 'INSUFFICIENT_COVERAGE'],
  ['stale', (rows) => (rows[0].observedAt = now - 301), 'SOURCE_TOO_OLD'],
  ['unknown age', (rows) => (rows[0].observedAt = null), 'SOURCE_AGE_UNKNOWN'],
  ['future source', (rows) => (rows[0].observedAt = now + 1), 'SOURCE_TIME_INVALID'],
  ['future retrieval', (rows) => (rows[0].retrievedAt = now + 1), 'SOURCE_TIME_INVALID'],
  ['unclassified', (rows) => (rows[0].provider = 'wrapper'), 'UNCLASSIFIED_PROVIDER'],
  ['duplicate provider', (rows) => rows.push({ ...rows[0] }), 'DUPLICATE_PROVIDER'],
  ['wrong evidence chain', (rows) => (rows[0].evidenceChainId = 8453), 'CHAIN_MISMATCH'],
  ['excluded', (rows) => (rows[0].excluded = true), 'CONSENSUS_EXCLUDED'],
  ['provider error', (rows) => (rows[0].status = 'error'), 'PROVIDER_UNAVAILABLE'],
  ['non-finite price', (rows) => (rows[0].price = Infinity), 'PROVIDER_UNAVAILABLE'],
  ['disagreement', (rows) => (rows[0].price = 1.02), 'PRICE_DISAGREEMENT'],
])
  test(`fails closed: ${name}`, () => {
    const rows = observations();
    mutate(rows);
    const result = evaluateCoverage(rows, policy, 1, now);
    assert.equal(result.status, 'INSUFFICIENT_COVERAGE');
    assert.ok([...result.reasons, ...result.providers.flatMap((p) => p.reasons)].includes(reason));
  });
test('operator aliases do not manufacture independence; TWAP never adds an independent group', () => {
  const p = structuredClone(policy);
  p.sources.api3.group = 'chainlink';
  const result = evaluateCoverage(observations(), p, 1, now);
  assert.equal(result.eligibleProviders, 3);
  assert.equal(result.independentGroups, 1);
  assert.deepEqual(result.reasons, ['INSUFFICIENT_INDEPENDENCE']);
});
test('report expiry is capped by oldest eligible source, age advances, boundary fails closed', async () => {
  const rows = observations();
  rows[0].observedAt = now - 299;
  const proof = await signed(rows);
  assert.equal(proof.report.validUntil, now + 1);
  assert.equal((await verifyCoverageReport(proof, trust, now + 1)).valid, false);
});
for (const name of [
  'tamper',
  'expired',
  'future',
  'revoked',
  'wrong-signer',
  'wrong-policy',
  'wrong-asset',
  'wrong-chain',
  'unsigned',
  'duplicate-key',
  'short-key-window',
])
  test(`rejects ${name}`, async () => {
    const proof = await signed(),
      pin = structuredClone(trust);
    let at = now;
    if (name === 'tamper') proof.report.observations[0].price = 1.01;
    if (name === 'expired') at += 60;
    if (name === 'future') at--;
    if (name === 'revoked') pin.keys[0].revoked = true;
    if (name === 'wrong-signer') pin.keys[0].address = `0x${'11'.repeat(20)}`;
    if (name === 'wrong-policy') pin.policy.maxSourceAgeSeconds++;
    if (name === 'wrong-asset') pin.asset = 'ETH';
    if (name === 'wrong-chain') pin.evidenceChainId = 8453;
    if (name === 'unsigned') proof.signature = null;
    if (name === 'duplicate-key') pin.keys.push({ ...pin.keys[0] });
    if (name === 'short-key-window') pin.keys[0].validUntil = now + 1;
    assert.equal((await verifyCoverageReport(proof, pin, at)).valid, false);
  });
test('correctly signed but fabricated evaluation is rejected', async () => {
  const proof = await signed(observations().slice(0, 2));
  proof.report.evaluation.status = 'PASS';
  proof.digest = coverageReportDigest(proof.report);
  proof.signature = await key.signTypedData(coverageSigningData(proof.report));
  assert.equal((await verifyCoverageReport(proof, trust, now)).valid, false);
});
test('consumer callback is never entered on insufficient coverage or time crossing', async () => {
  let called = 0;
  const action = async () => ++called;
  await assert.rejects(
    withVerifiedCoverage(await signed(observations().slice(0, 2)), trust, action, () => now)
  );
  let ticks = 0;
  await assert.rejects(
    withVerifiedCoverage(await signed(), trust, action, () => (ticks++ ? now + 60 : now))
  );
  assert.equal(called, 0);
  assert.equal(await withVerifiedCoverage(await signed(), trust, action, () => now), 1);
});
