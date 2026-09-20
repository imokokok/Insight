import assert from 'node:assert/strict';
import test from 'node:test';

import { encodeFunctionData, keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { rwaV2Fixture, signRwaV2Fixture } from '../../examples/rwa-v2/fixture.mjs';
import * as sdk from '../dist/index.js';

const key = privateKeyToAccount('0x' + '12'.repeat(32));
test('v2 signed ALLOW, sequence and trusted call profile', async () => {
  const f = rwaV2Fixture(sdk),
    a = await signRwaV2Fixture(sdk, key, f);
  assert.equal((await sdk.verifyRwaReportV2(a.proof, a.trust, f.now)).valid, true);
  const next = await signRwaV2Fixture(sdk, key, f, '1', a.proof.digest);
  assert.notEqual(a.proof.digest, next.proof.digest);
  assert.equal((await sdk.verifyRwaReportV2(next.proof, next.trust, f.now)).valid, true);
});
for (const mode of [
  'blocked-receiver',
  'unknown-receiver',
  'future-receiver',
  'untrusted-receiver',
  'revoked-signer',
  'wrong-profile',
  'expiry',
  'tamper',
])
  test('v2 rejects ' + mode, async () => {
    const f = rwaV2Fixture(sdk);
    if (mode === 'blocked-receiver') f.receiverEvidence.status = 'BLOCKED';
    if (mode === 'unknown-receiver') f.receiverEvidence.status = 'UNKNOWN';
    if (mode === 'future-receiver') f.receiverEvidence.observedAt = f.now + 1;
    if (mode === 'untrusted-receiver') f.receiverEvidence.source = 'untrusted';
    const a = await signRwaV2Fixture(sdk, key, f);
    if (mode === 'revoked-signer') a.trust.keys[0].revoked = true;
    if (mode === 'wrong-profile') a.trust.callProfile.target = '0x' + '99'.repeat(20);
    if (mode === 'tamper') a.proof.report.semantics.receiver = '0x' + '99'.repeat(20);
    const detail = await sdk.inspectRwaReportV2(
      a.proof,
      a.trust,
      mode === 'expiry' ? a.proof.report.validUntil : f.now
    );
    assert.equal(detail.admissible, false);
    assert.equal(detail.integrity, mode === 'tamper' ? 'FAIL' : 'PASS');
    if (mode === 'blocked-receiver') assert.equal(detail.decision, 'BLOCK');
    if (mode === 'expiry') {
      assert.equal(detail.trust, 'PASS');
      assert.equal(detail.time, 'FAIL');
    }
  });
for (const mode of [
  'recipient',
  'tokenIn',
  'tokenOut',
  'amountIn',
  'minimum',
  'fee',
  'deadline',
  'native',
  'trailing',
  'unsupported',
  'nonce',
])
  test('semantic profile blocks ' + mode, () => {
    const f = rwaV2Fixture(sdk),
      params = {
        tokenIn: f.callProfile.quoteToken,
        tokenOut: f.input.instrument.tokenAddress,
        fee: 3000,
        recipient: f.receiverEvidence.subject,
        deadline: BigInt(f.now + 120),
        amountIn: 1000000n,
        amountOutMinimum: 900000n,
        sqrtPriceLimitX96: 0n,
      };
    if (mode === 'recipient') params.recipient = '0x' + '00'.repeat(20);
    if (mode === 'tokenIn') params.tokenIn = '0x' + '99'.repeat(20);
    if (mode === 'tokenOut') params.tokenOut = '0x' + '99'.repeat(20);
    if (mode === 'amountIn') params.amountIn = 1n;
    if (mode === 'minimum') params.amountOutMinimum = 0n;
    if (mode === 'fee') params.fee = 500;
    if (mode === 'deadline') params.deadline = BigInt(f.now);
    f.transaction.data = encodeFunctionData({
      abi: sdk.RWA_SWAP_ABI,
      functionName: 'exactInputSingle',
      args: [params],
    });
    if (mode === 'trailing') f.transaction.data += '00';
    if (mode === 'unsupported') f.transaction.data = '0x12345678';
    f.input.request.call.calldataHash = keccak256(f.transaction.data);
    if (mode === 'native') f.transaction.value = '1';
    if (mode === 'nonce') f.transaction.nonce = '8';
    assert.throws(() =>
      sdk.decodeRwaCall(f.transaction, f.input.request, f.input.instrument, f.callProfile, f.now)
    );
  });
test('uint256 pattern agrees with BigInt oracle across boundaries and seeded inputs', () => {
  const max = 2n ** 256n - 1n;
  const values = [0n, 1n, max - 1n, max, max + 1n, max + 100n, 10n ** 78n];
  let seed = 719n;
  for (let n = 0; n < 300; n++) {
    seed = (seed * 6364136223846793005n + 1n) % 2n ** 258n;
    values.push(seed);
  }
  for (const n of values) assert.equal(sdk.rwaIsUint256(n.toString()), n <= max, n.toString());
  for (const s of ['', '-1', '01', ' 1', '1.0', '1e9', '0x1'])
    assert.equal(sdk.rwaIsUint256(s), false);
  const f = rwaV2Fixture(sdk);
  f.input.request.amount = (max + 1n).toString();
  assert.throws(
    () => sdk.rwaRequestHash(f.input.request),
    (e) =>
      e.code === 'RWA_UINT256_OUT_OF_RANGE' &&
      e.fieldPath === 'input.request.amount' &&
      e.retryable === false
  );
});
test('signed observed output constraints: net output, input, duplicate log and extra asset', () => {
  const f = rwaV2Fixture(sdk),
    s = sdk.decodeRwaCall(f.transaction, f.input.request, f.input.instrument, f.callProfile, f.now);
  const transfers = [
    {
      token: s.inputToken,
      from: f.transaction.from,
      to: f.transaction.to,
      amount: s.inputAmount,
      logIndex: 1,
    },
    {
      token: s.outputToken,
      from: f.transaction.to,
      to: s.receiver,
      amount: s.minimumOutput,
      logIndex: 2,
    },
  ];
  assert.equal(sdk.assessRwaCallOutcome(s, f.transaction.from, transfers).satisfied, true);
  const bad = structuredClone(transfers);
  bad[1].amount = '899999';
  assert.equal(sdk.assessRwaCallOutcome(s, f.transaction.from, bad).satisfied, false);
  assert.equal(
    sdk.assessRwaCallOutcome(s, f.transaction.from, [...transfers, transfers[0]]).satisfied,
    false
  );
  assert.equal(
    sdk.assessRwaCallOutcome(s, f.transaction.from, [
      ...transfers,
      {
        token: '0x' + '99'.repeat(20),
        from: f.transaction.from,
        to: f.transaction.to,
        amount: '1',
        logIndex: 3,
      },
    ]).satisfied,
    false
  );
});
