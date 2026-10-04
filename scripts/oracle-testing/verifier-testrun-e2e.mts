/**
 * End-to-end check: sign scenario-test receipts with a throwaway key, verify
 * them with the PACKAGED verifier build, and confirm a v1 pre-trade receipt is
 * NOT diverted by the new test branch.
 *
 * Run: node --import tsx scripts/oracle-testing/verifier-testrun-e2e.mts
 */
import { privateKeyToAccount } from 'viem/accounts';
import { hashTypedData } from 'viem';

import {
  TEST_DOMAIN,
  TEST_PRIMARY_TYPE,
  TEST_TYPES,
  V1_DOMAIN,
  V1_PRIMARY_TYPE,
  V1_TYPES,
  verifyReceipt,
} from '../../verifier/dist/index.js';

type Field = { readonly name: string; readonly type: string };

function widen(types: readonly Field[], data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of types) {
    const v = data[f.name];
    out[f.name] = f.type === 'uint256' ? BigInt(v as number) : v;
  }
  return out;
}

const acct = privateKeyToAccount(`0x${'59'.repeat(32)}`);
const now = Math.floor(Date.now() / 1000);

let failures = 0;
function check(label: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}: ${String(actual)}${ok ? '' : ` (expected ${String(expected)})`}`
  );
}

// --- 1. A genuine scenario-test receipt verifies. -------------------------
const testData = {
  scenarioId: 'euler-stale-price',
  scenarioKind: 'stale_price',
  verdict: 'caught',
  harnessVersion: '1.0.0',
  stepCount: 12,
  caughtStepCount: 4,
  falsePositiveCount: 0,
  detectionRate: 10000,
  scenarioHash: `0x${'11'.repeat(32)}`,
  reasonCodesHash: `0x${'22'.repeat(32)}`,
  ranAt: now,
  validUntil: now + 3600,
  schemaVersion: 1,
};
const testArgs = {
  domain: TEST_DOMAIN,
  types: TEST_TYPES,
  primaryType: TEST_PRIMARY_TYPE,
  message: widen((TEST_TYPES as Record<string, readonly Field[]>)[TEST_PRIMARY_TYPE], testData),
};
const testReceipt = {
  uid: hashTypedData(testArgs as never),
  schemaVersion: 1,
  attester: acct.address,
  signature: await acct.signTypedData(testArgs as never),
  data: testData,
  eip712: { primaryType: TEST_PRIMARY_TYPE },
};

const r = await verifyReceipt(testReceipt as never);
check('testRun code', r.code, 'ok');
check('testRun valid', r.valid, true);
check('testRun kind', r.kind, 'test');
check('testRun checkedAt anchors ranAt', r.checkedAt, now);
check('testRun validUntil', r.validUntil, now + 3600);

// --- 2. A tampered payload is rejected, not accepted as a v1 receipt. -----
const tampered = { ...testReceipt, data: { ...testData, detectionRate: 9999 } };
const tr = await verifyReceipt(tampered as never);
check('tampered code', tr.code, 'uid_mismatch');
check('tampered valid', tr.valid, false);

// --- 3. Regression: v1 pre-trade still routes to v1, kind 'check'. -------
const v1Data = {
  verdict: 'PASS',
  asset: 'ETH',
  chainId: 1,
  action: 'swap',
  tradeAmountUsd: 1000,
  consensusPrice: 200000000000,
  maxDeviationBps: 15,
  manipulationRiskBps: 100,
  participantCount: 4,
  checkedAt: now,
  schemaVersion: 1,
};
const v1Args = {
  domain: V1_DOMAIN,
  types: V1_TYPES,
  primaryType: V1_PRIMARY_TYPE,
  message: widen((V1_TYPES as Record<string, readonly Field[]>)[V1_PRIMARY_TYPE], v1Data),
};
const v1Receipt = {
  uid: hashTypedData(v1Args as never),
  schemaVersion: 1,
  attester: acct.address,
  signature: await acct.signTypedData(v1Args as never),
  data: v1Data,
  eip712: { primaryType: V1_PRIMARY_TYPE },
};
const vr = await verifyReceipt(v1Receipt as never);
check('v1 pre-trade code', vr.code, 'ok');
check('v1 pre-trade kind (not diverted)', vr.kind, 'check');

// --- 4. A test receipt that ALSO carries a v1-looking shape is still test --
// (the discriminator is primaryType, not the field names).
const conflated = { ...testReceipt, data: { ...testData, verdict: 'PASS' } };
const cr = await verifyReceipt(conflated as never);
check('conformed shape still rejected', cr.code, 'uid_mismatch');

console.log('');
console.log(failures === 0 ? 'all checks passed' : `${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
