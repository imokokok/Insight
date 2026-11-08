import { assessProductOutcome, missingRejectedEvidenceItems } from '@/lib/billing/exemptions';
import type { AsterPerpMarketState } from '@/lib/dex/asterPerpMarket';

import {
  prepareBnbPerpOrderEnvelope,
  type BnbPerpOrderEnvelopeDependencies,
  type BnbPerpOrderEnvelopeRequest,
} from '../bnbPerpOrderEnvelope';

import type { BnbPerpGuardResult } from '../bnbPerpGuard';
import type { PerpOrderAdapterError } from '../perpOrderEnvelope';

const NOW = new Date('2026-11-08T00:00:00.000Z');

const COMPLETE_EVIDENCE = {
  reason_code: 'TEST',
  input_digest: `0x${'11'.repeat(32)}`,
  triggered_threshold: { rule: 'test', threshold: 1, observed: 2 },
  data_sources: [{ source: 'test' }],
  risk_ruleset_version: 'test-v1',
};

async function captureAdapterError(run: Promise<unknown>): Promise<PerpOrderAdapterError> {
  try {
    await run;
  } catch (error) {
    return error as PerpOrderAdapterError;
  }
  throw new Error('expected the adapter to reject');
}

const REQUEST: BnbPerpOrderEnvelopeRequest = {
  chain: 'eip155:56',
  market: 'ETH',
  side: 'long',
  quantity: '0.5',
  leverage: 3,
  maxSlippageBps: 50,
  orderType: 'market',
  clientOrderId: 'insight-order-001',
};

function venueState(overrides: Partial<AsterPerpMarketState> = {}): AsterPerpMarketState {
  return {
    symbol: 'ETHUSDT',
    marketStatus: 'TRADING',
    observedAt: NOW.toISOString(),
    sourceFreshnessSeconds: 1,
    markPrice: 3_000,
    indexPrice: 3_001,
    fundingRatePerInterval: 0.0001,
    nextFundingTimeMs: null,
    openInterestBase: null,
    dayNotionalVolume: null,
    liveMaxLeverage: 20,
    ...overrides,
  };
}

function guardResult(
  verdict: 'ALLOW' | 'CAUTION' | 'BLOCK',
  reasons: string[] = ['guard assessment reason']
): BnbPerpGuardResult {
  return {
    schema: 'insight.bnb-perp-guard.v1',
    verdict,
    protocolId: 'aster-perps-bnb-mainnet',
    action: 'open_long',
    evaluatedAt: NOW.toISOString(),
    scope: {
      venue: 'aster',
      network: 'eip155:56',
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
    },
    market: {
      assetSymbol: 'ETH',
      marginAssetSymbol: 'USDT',
      maxLeverage: 20,
      maxLeverageSource: 'reviewed-profile',
      parameterSource: 'reviewed-profile',
    },
    projected: {
      sizeUsd: 1_500,
      marginValueUsd: 500,
      effectiveLeverage: 3,
      liquidationBufferPct: 85,
      conservativeMaxSizeUsd: 9_000,
    },
    oracleChecks: {
      underlying: {
        verdict: 'PASS',
        consensusPrice: 3_000,
        maxDeviationPct: 0.1,
        staleDataRisk: false,
        participantCount: 3,
        attestationUid: null,
        attester: null,
      },
      margin: {
        verdict: 'PASS',
        consensusPrice: 1,
        maxDeviationPct: 0.1,
        staleDataRisk: false,
        participantCount: 3,
        attestationUid: null,
        attester: null,
      },
    },
    venue: {
      status: 'observed',
      observedAt: NOW.toISOString(),
      sourceFreshnessSeconds: 1,
      markPrice: 3_000,
      indexPrice: 3_001,
      markIndexDeviationBps: 3.33,
      displayedTopDepthNotionalUsd: null,
      fundingRatePerInterval: 0.0001,
      nextFundingTimeMs: null,
      openInterestBase: null,
      dayNotionalVolume: null,
      liveMaxLeverage: 20,
      consensusVenueDeviationPct: null,
      aster: { symbol: 'ETHUSDT', marketStatus: 'TRADING', unavailableReason: null },
    },
    reasons,
    next: {
      execution: 'not_performed',
      priorSeal: 'Bind this decision to one exact, user-authorized Aster order before execution.',
    },
  };
}

function dependencies(
  overrides: Partial<BnbPerpOrderEnvelopeDependencies> = {}
): BnbPerpOrderEnvelopeDependencies {
  return {
    fetchVenueState: jest.fn(async () => venueState()),
    getBlockNumber: jest.fn(async () => 45_678_901),
    assessGuard: jest.fn(async () => guardResult('ALLOW')) as never,
    now: () => NOW,
    ...overrides,
  };
}

describe('prepareBnbPerpOrderEnvelope', () => {
  it('builds the exact Aster order payload on the reviewed market', async () => {
    const result = await prepareBnbPerpOrderEnvelope(REQUEST, dependencies());

    expect(result.verdict).toBe('READY_TO_SIGN');
    expect(result.market.venueSymbol).toBe('ETHUSDT');
    expect(result.observation.blockNumber).toBe(45_678_901);
    expect(result.quote.referencePriceUsd).toBe(3_000);
    expect(result.quote.acceptablePrice).toBe('3015');
    expect(result.quote.validUntil).toBe(Math.floor(NOW.getTime() / 1000) + 30);
    expect(result.risk.verdict).toBe('ALLOW');
    expect(result.unsignedOrderEnvelope).not.toBeNull();

    const envelope = result.unsignedOrderEnvelope!;
    expect(envelope.endpoint.path).toBe('/fapi/v1/order');
    expect(envelope.payload).toEqual({
      symbol: 'ETHUSDT',
      side: 'BUY',
      type: 'MARKET',
      quantity: '0.5',
      reduceOnly: false,
      newClientOrderId: 'insight-order-001',
    });
    expect(envelope.provesOnchainExecution).toBe(false);
  });

  it('builds an IOC limit payload and accepts a limit inside the slippage cap', async () => {
    const result = await prepareBnbPerpOrderEnvelope(
      { ...REQUEST, orderType: 'limit', limitPrice: '3010' },
      dependencies()
    );

    expect(result.unsignedOrderEnvelope?.payload).toMatchObject({
      type: 'LIMIT',
      price: '3010',
      timeInForce: 'IOC',
    });
    expect(result.quote.acceptablePrice).toBe('3010');
  });

  it('fails with UNSUPPORTED_MARKET for a market outside the reviewed set', async () => {
    await expect(
      prepareBnbPerpOrderEnvelope({ ...REQUEST, market: 'SOL' }, dependencies())
    ).rejects.toMatchObject({
      code: 'UNSUPPORTED_MARKET',
      outcome: 'unavailable',
      evidence: null,
    });
  });

  it('fails with UPSTREAM_UNAVAILABLE when venue evidence times out', async () => {
    await expect(
      prepareBnbPerpOrderEnvelope(
        REQUEST,
        dependencies({
          fetchVenueState: () => new Promise(() => {}),
          queryTimeoutMs: 20,
        })
      )
    ).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
      outcome: 'unavailable',
      evidence: null,
    });
  });

  it('rejects a limit price outside the caller slippage cap with complete evidence', async () => {
    const error = await captureAdapterError(
      prepareBnbPerpOrderEnvelope(
        { ...REQUEST, orderType: 'limit', limitPrice: '3200' },
        dependencies()
      )
    );

    expect(error.code).toBe('SLIPPAGE_EXCEEDED');
    expect(error.outcome).toBe('rejected');
    expect(missingRejectedEvidenceItems(error.evidence)).toEqual([]);
    const assessment = assessProductOutcome(
      JSON.stringify({ productOutcome: error.outcome, evidence: error.evidence })
    );
    expect(assessment.outcome).toBe('rejected');
    expect(assessment.downgradedFromRejected).toBe(false);
  });

  it('keeps an invalid parameter failure unavailable even though the venue is covered', async () => {
    const error = await captureAdapterError(
      prepareBnbPerpOrderEnvelope(
        { ...REQUEST, orderType: 'limit', limitPrice: '0' },
        dependencies()
      )
    );

    expect(error.code).toBe('INVALID_INPUT');
    expect(error.outcome).toBe('unavailable');
    expect(error.evidence).toBeNull();
    const assessment = assessProductOutcome(
      JSON.stringify({ productOutcome: error.outcome, evidence: COMPLETE_EVIDENCE })
    );
    expect(assessment.outcome).toBe('unavailable');
  });

  it('carries a guard BLOCK conclusion and withholds the venue payload', async () => {
    const result = await prepareBnbPerpOrderEnvelope(
      REQUEST,
      dependencies({
        assessGuard: jest.fn(async () => guardResult('BLOCK', ['venue integrity BLOCK'])) as never,
      })
    );

    expect(result.verdict).toBe('BLOCK');
    expect(result.unsignedOrderEnvelope).toBeNull();
    expect(result.risk.verdict).toBe('BLOCK');
    expect(result.blockingReasons.join(' ')).toContain('venue integrity BLOCK');
  });
});
