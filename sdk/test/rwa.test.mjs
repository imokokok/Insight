import assert from 'node:assert/strict';
import test from 'node:test';

import { privateKeyToAccount } from 'viem/accounts';

import { rwaFixture, signRwaFixture } from '../../examples/rwa-v1/fixture.mjs';
import sdk from '../dist/index.js';

const key = privateKeyToAccount('0x' + '12'.repeat(32));
test('Chainlink on-chain round adapter preserves source timestamp and requires a complete positive round', () => {
  const f = rwaFixture(sdk),
    { priceE8: _p, observedAt: _o, ...identity } = f.input.prices[0];
  const raw = {
    roundId: '5',
    answer: '10000000000',
    decimals: 8,
    updatedAt: String(f.now - 10),
    answeredInRound: '5',
  };
  const result = sdk.normalizeRwaChainlinkRound(raw, identity);
  assert.equal(result.observedAt, f.now - 10);
  assert.equal(result.priceE8, '10000000000');
  assert.equal('halt' in result, false);
  assert.throws(() => sdk.normalizeRwaChainlinkRound({ ...raw, answeredInRound: '4' }, identity));
  assert.throws(() => sdk.normalizeRwaChainlinkRound({ ...raw, updatedAt: '0' }, identity));
  assert.throws(() => sdk.normalizeRwaChainlinkRound({ ...raw, answer: '-1' }, identity));
  assert.throws(() =>
    sdk.normalizeRwaChainlinkRound(
      { ...raw, answer: (2n ** 256n - 1n).toString(), decimals: 0 },
      identity
    )
  );
});
test('typed client sends explicit input and policy to unsigned diagnostic endpoint', async () => {
  const f = rwaFixture(sdk);
  const diagnostic = {
    mode: 'diagnostic',
    mayAuthorizeExecution: false,
    evidenceProvenance: 'caller-supplied-unverified',
    report: sdk.buildRwaReport(f.input, f.policy, f.now),
  };
  const client = new sdk.InsightClient({
    apiKey: 'test',
    fetch: async (url, init) => {
      assert.equal(new URL(url).pathname, '/api/v1/rwa/assessment');
      assert.equal(init.method, 'POST');
      assert.deepEqual(JSON.parse(init.body), { input: f.input, policy: f.policy });
      return new Response(JSON.stringify({ success: true, data: diagnostic }));
    },
  });
  assert.deepEqual(await client.rwaAssessment(f.input, f.policy), diagnostic);
});
test('simulation signs and verifies, preserving independent evidence chains', async () => {
  const f = rwaFixture(sdk),
    r = await signRwaFixture(sdk, key, f);
  assert.equal(r.proof.report.evaluation.verdict, 'ALLOW');
  assert.equal(r.proof.report.validUntil, f.now + 30);
  assert.equal(r.proof.report.input.request.call.chainId, 8453);
  assert.deepEqual(
    r.proof.report.input.prices.map((p) => p.evidenceChainId),
    [1, 56]
  );
  assert.equal((await sdk.verifyRwaReport(r.proof, r.trust, f.now)).valid, true);
});
const cases = {
  'one provider': (f) => f.input.prices.pop(),
  'same upstream': (f) => (f.policy.feeds['sim-feed-b'].group = 'sim-origin-a'),
  'derived quote': (f) => (f.policy.feeds['sim-feed-b'].derived = true),
  'duplicate provider': (f) => (f.input.prices[1] = { ...f.input.prices[0] }),
  stale: (f) => (f.input.prices[0].observedAt = f.now - 60),
  future: (f) => (f.input.prices[0].retrievedAt = f.now + 1),
  'underlying vs token': (f) => (f.input.prices[0].priceBasis = 'token-market'),
  'wrong currency': (f) => (f.input.prices[0].currency = 'EUR'),
  'wrong evidence chain': (f) => (f.input.prices[0].evidenceChainId = 8453),
  'wrong asset': (f) => (f.input.prices[0].instrumentId = '0x' + '00'.repeat(32)),
  'old corporate-action version': (f) => (f.input.prices[0].corporateActionVersion = 'sim-v0'),
  'large divergence': (f) => (f.input.prices[0].priceE8 = '9000000000'),
  'no market': (f) => (f.input.market = null),
  'unknown session': (f) => (f.input.market.session = 'UNKNOWN'),
  halted: (f) => (f.input.market.halt = 'HALTED'),
  'unknown halt': (f) => (f.input.market.halt = 'UNKNOWN'),
  'corporate action': (f) => (f.input.market.corporateAction = 'PENDING'),
  'stale market': (f) => (f.input.market.observedAt = f.now - 60),
  'wrong market venue': (f) => (f.input.market.mic = 'XNYS'),
  'untrusted market source': (f) => (f.input.market.source = 'attacker'),
  'closed market': (f) => (f.input.market.session = 'CLOSED'),
  'no reserve': (f) => (f.input.evidence = f.input.evidence.filter((e) => e.kind !== 'reserve')),
  'blocked reserve': (f) => (f.input.evidence[0].status = 'BLOCKED'),
  'expired eligibility': (f) => (f.input.evidence[1].validUntil = f.now),
  'wrong eligibility subject': (f) => (f.input.evidence[1].subject = '0x' + '99'.repeat(20)),
  'untrusted issuer': (f) => (f.input.evidence[0].source = 'attacker'),
  'duplicate eligibility': (f) => f.input.evidence.push({ ...f.input.evidence[1] }),
  'redemption paused': (f) => {
    f.input.request.action = 'redeem';
    f.input.evidence[2].status = 'BLOCKED';
  },
  'action disabled': (f) => delete f.policy.actions.buy,
};
for (const [name, mutate] of Object.entries(cases))
  test('fails closed: ' + name, async () => {
    const f = rwaFixture(sdk);
    mutate(f);
    const r = await signRwaFixture(sdk, key, f);
    assert.notEqual(r.proof.report.evaluation.verdict, 'ALLOW');
    assert.equal((await sdk.verifyRwaReport(r.proof, r.trust, f.now)).valid, false);
  });
test('explicit repayment does not inherit price-based trading restrictions', async () => {
  const f = rwaFixture(sdk);
  f.input.request.action = 'repay';
  f.input.prices = [];
  f.input.market = null;
  const r = await signRwaFixture(sdk, key, f);
  assert.equal((await sdk.verifyRwaReport(r.proof, r.trust, f.now)).valid, true);
  f.input.evidence[1].status = 'BLOCKED';
  assert.equal(sdk.buildRwaReport(f.input, f.policy, f.now).evaluation.verdict, 'BLOCK');
});
test('closed underlying rejected even when session allowed; separately identified token-market can be admitted', () => {
  const f = rwaFixture(sdk);
  f.policy.actions.buy.allowedSessions = ['CLOSED'];
  f.input.market.session = 'CLOSED';
  f.input.prices.forEach((p) => (p.session = 'CLOSED'));
  assert.equal(sdk.buildRwaReport(f.input, f.policy, f.now).evaluation.verdict, 'BLOCK');
  f.input.instrument.priceBasis = 'token-market';
  const id = sdk.rwaInstrumentId(f.input.instrument);
  f.policy.instrumentId = f.input.request.instrumentId = f.input.market.instrumentId = id;
  f.input.prices.forEach((p) => {
    p.instrumentId = id;
    p.priceBasis = 'token-market';
  });
  f.input.evidence.forEach((e) => {
    e.instrumentId = id;
    if (e.kind !== 'eligibility') e.subject = id;
  });
  assert.equal(sdk.buildRwaReport(f.input, f.policy, f.now).evaluation.verdict, 'ALLOW');
});
const proofCases = {
  'revoked key': (r) => (r.trust.keys[0].revoked = true),
  'unknown key': (r) => (r.trust.keys[0].address = '0x' + '99'.repeat(20)),
  'duplicate key': (r) => r.trust.keys.push({ ...r.trust.keys[0] }),
  'not yet valid key': (r, f) => (r.trust.keys[0].validFrom = f.now + 1),
  'short key lifetime': (r, f) => (r.trust.keys[0].validUntil = f.now + 1),
  'policy replacement': (r) => r.trust.policy.maxSpreadBps++,
  'production rejects simulation': (r) => (r.trust.environment = 'production'),
  'nonce replay': (r) => (r.trust.request.call.nonce = '8'),
  'calldata substitution': (r) => (r.trust.request.call.calldataHash = '0x' + '00'.repeat(32)),
  'changed verdict': (r) => (r.proof.report.evaluation.consensusPriceE8 = '1'),
  'extended expiry': (r) => r.proof.report.validUntil++,
  'digest substitution': (r) => (r.proof.digest = '0x' + '00'.repeat(32)),
  'signature substitution': (r) => (r.proof.signature = '0x' + '00'.repeat(65)),
};
for (const [name, mutate] of Object.entries(proofCases))
  test('proof rejects: ' + name, async () => {
    const f = rwaFixture(sdk),
      r = await signRwaFixture(sdk, key, f);
    mutate(r, f);
    assert.equal((await sdk.verifyRwaReport(r.proof, r.trust, f.now)).valid, false);
  });
test('expiry is exclusive; future reports and overflowing uint256 rejected', async () => {
  const f = rwaFixture(sdk),
    r = await signRwaFixture(sdk, key, f);
  assert.equal((await sdk.verifyRwaReport(r.proof, r.trust, f.now + 30)).valid, false);
  assert.equal((await sdk.verifyRwaReport(r.proof, r.trust, f.now - 1)).valid, false);
  f.input.request.amount = (2n ** 256n).toString();
  assert.throws(() => sdk.buildRwaReport(f.input, f.policy, f.now));
});
test('minimum evidence lifetime caps report and input snapshot is immutable', () => {
  const f = rwaFixture(sdk);
  f.input.evidence[1].validUntil = f.now + 2;
  const r = sdk.buildRwaReport(f.input, f.policy, f.now);
  f.input.prices[0].priceE8 = '1';
  assert.equal(r.validUntil, f.now + 2);
  assert.equal(r.input.prices[0].priceE8, '10000000000');
});
test('verification snapshots the report and trust before asynchronous verification', async () => {
  const f = rwaFixture(sdk),
    r = await signRwaFixture(sdk, key, f);
  const verifying = sdk.verifyRwaReport(r.proof, r.trust, f.now);
  r.proof.report.input.market.halt = 'HALTED';
  r.trust.policy.actions.buy.priceRequired = false;
  assert.equal((await verifying).valid, true);
});
test('v11 adapter respects nanoseconds and decimals; does not invent halt evidence', () => {
  const f = rwaFixture(sdk),
    { priceE8: _p, observedAt: _o, session: _s, ...identity } = f.input.prices[0];
  const raw = {
    mid: '100000000000000000000',
    decimals: 18,
    lastSeenTimestampNs: String(BigInt(f.now) * 1000000000n),
    marketStatus: 2,
  };
  const p = sdk.normalizeRwaChainlinkV11(raw, identity);
  assert.equal(p.priceE8, '10000000000');
  assert.equal(p.observedAt, f.now);
  assert.equal(p.session, 'REGULAR');
  assert.equal('halt' in p, false);
  assert.equal(
    sdk.normalizeRwaChainlinkV11({ ...raw, marketStatus: 5 }, identity).session,
    'CLOSED'
  );
  assert.throws(() =>
    sdk.normalizeRwaChainlinkV11({ ...raw, mid: '100000000000000000001' }, identity)
  );
  assert.throws(() => sdk.normalizeRwaChainlinkV11({ ...raw, marketStatus: 6 }, identity));
});
