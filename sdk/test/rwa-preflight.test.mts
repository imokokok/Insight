import assert from 'node:assert/strict';
import test from 'node:test';

import { rwaV2Fixture } from '../../examples/rwa-v2/fixture.mjs';
import * as sdk from '../dist/index.js';

import type { RwaEvidence, RwaInput, RwaPolicy } from '../src/rwa';
import type { RwaCallProfile, RwaTransaction } from '../src/rwa-call';
import type {
  RwaActionEvidenceProvider,
  RwaActionPreflightContext,
  RwaActionPreflightRequest,
} from '../src/rwa-preflight';
import type { RobinhoodRwaSessionResolverInput } from '../src/rwa-robinhood-session';

const NOW = 1_800_000_000;

type Fixture = {
  now: number;
  input: RwaInput;
  policy: RwaPolicy;
  transaction: RwaTransaction;
  callProfile: RwaCallProfile;
  receiverEvidence: RwaEvidence;
};

function preflightFixture() {
  return rwaV2Fixture(sdk, NOW) as unknown as Fixture;
}

function providersFor(fixture: Fixture): RwaActionEvidenceProvider[] {
  const evidence = fixture.input.evidence;
  return [
    ...Object.keys(fixture.policy.feeds).map((sourceId) => ({
      sourceId,
      async collect() {
        return { prices: fixture.input.prices.filter((price) => price.feedId === sourceId) };
      },
    })),
    {
      sourceId: 'sim-market',
      async collect() {
        return { market: fixture.input.market };
      },
    },
    {
      sourceId: 'sim-issuer',
      async collect() {
        return { evidence: evidence.filter((item) => item.source === 'sim-issuer') };
      },
    },
    {
      sourceId: 'sim-eligibility',
      async collect() {
        return {
          evidence: evidence.filter((item) => item.source === 'sim-eligibility'),
          receiverEvidence: fixture.receiverEvidence,
        };
      },
    },
  ];
}

function requestFor(
  fixture: Fixture,
  providers = providersFor(fixture)
): RwaActionPreflightRequest {
  return {
    instrument: fixture.input.instrument,
    action: fixture.input.request.action as 'buy' | 'sell',
    amount: fixture.input.request.amount,
    transaction: fixture.transaction,
    callProfile: fixture.callProfile,
    policy: fixture.policy,
    providers,
    sequence: '0',
    previousDigest: null,
    nowSeconds: fixture.now,
  };
}

test('RWA action preflight binds the exact call and never grants execution authority', async () => {
  const fixture = preflightFixture();
  const result = await sdk.preflightRwaAction(requestFor(fixture));

  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.mode, 'diagnostic');
  assert.equal(result.mayAuthorizeExecution, false);
  assert.equal(result.evidenceProvenance, 'adapter-asserted-unverified');
  assert.equal(result.report.transaction.data, fixture.transaction.data);
  assert.equal(result.report.semantics.receiver, fixture.receiverEvidence.subject);
  assert.ok(result.sources.every((source) => source.status === 'COLLECTED'));
});

test('RWA action preflight fails closed on malformed provider output', async () => {
  const fixture = preflightFixture();
  const providers = providersFor(fixture);
  const feed = providers.find((provider) => provider.sourceId === 'sim-feed-a');
  assert.ok(feed);
  feed.collect = async () => ({
    prices: fixture.input.prices
      .filter((price) => price.feedId === 'sim-feed-a')
      .map((price) => ({ ...price, feedId: 'untrusted-feed' })),
  });

  const result = await sdk.preflightRwaAction(requestFor(fixture, providers));

  assert.equal(result.decision, 'UNKNOWN');
  assert.ok(result.issues.includes('SOURCE_OUTPUT_INVALID'));
  assert.equal(
    result.sources.find((source) => source.sourceId === 'sim-feed-a')?.status,
    'INVALID'
  );
});

test('RWA action preflight rejects an unadmitted production instrument before source calls', async () => {
  const fixture = preflightFixture();
  fixture.policy.environment = 'production';
  let called = false;
  const providers = providersFor(fixture).map((provider) => ({
    ...provider,
    async collect() {
      called = true;
      return {};
    },
  }));

  await assert.rejects(
    sdk.preflightRwaAction(requestFor(fixture, providers)),
    (error: unknown) =>
      error instanceof Error &&
      'code' in error &&
      error.code === 'RWA_INSTRUMENT_ADMISSION_REQUIRED'
  );
  assert.equal(called, false);
});

test('IsOpenNow session adapter validates, normalizes, and caches its read-only source', async () => {
  let fetchCalls = 0;
  const resolver = sdk.createIsOpenNowRwaSessionResolver({
    sourceId: 'isopennow-us-equity-session',
    fetchImpl: async () => {
      fetchCalls += 1;
      return new Response(
        JSON.stringify({
          id: 'nasdaq',
          mic: 'XNAS',
          timezone: 'America/New_York',
          state: 'open',
          isOpen: true,
          suspended: false,
          label: 'Open',
          reason: null,
          disclaimer: 'Secondary source for test.',
          nextChange: new Date((NOW + 3_600) * 1_000).toISOString(),
        }),
        { status: 200 }
      );
    },
  });
  const request = {};
  const input: RobinhoodRwaSessionResolverInput = {
    symbol: 'AAPL',
    mic: 'XNAS',
    context: {
      instrument: {} as never,
      request,
      policy: {} as never,
      transaction: {} as never,
      callProfile: {} as never,
      nowSeconds: NOW,
    } as unknown as RwaActionPreflightContext,
  };

  const [first, second] = await Promise.all([resolver.resolve(input), resolver.resolve(input)]);

  assert.equal(first.session, 'REGULAR');
  assert.equal(first.observedAt, NOW - 30);
  assert.equal(first.validUntil, NOW + 60);
  assert.deepEqual(second, first);
  assert.equal(fetchCalls, 1);
});
