import type { ManipCostAdvisory } from '@/lib/manipCost/baseline';
import type { ChainlinkMarketReference } from '@/lib/marketReference/chainlink';
import type { MarketReference } from '@/lib/marketReference/client';
import type { RedStoneMarketReference } from '@/lib/marketReference/redstone';

import { assessDecisionInput, DecisionInputAssessmentSchema } from '../assessment';

const NOW = new Date('2026-10-13T06:30:00.000Z');

const request = {
  decisionPriceUsd: 2000,
  quotePriceUsd: 2000.5,
  quoteObservedAt: '2026-10-13T06:29:58.000Z',
  maxReferenceDeviationBps: 50,
  maxSlippageBps: 50,
  maxQuoteAgeSeconds: 30,
};

const chainlink: ChainlinkMarketReference = {
  provider: 'chainlink-data-feed',
  symbol: 'ETH',
  quote: 'USD',
  chainId: 1,
  feedAddress: '0x0000000000000000000000000000000000000001',
  feedPath: null,
  feedCategory: null,
  heartbeatSeconds: 3600,
  price: 2000.4,
  decimals: 8,
  updatedAt: '2026-10-13T06:29:00.000Z',
  ageSeconds: 60,
  isFresh: true,
  roundId: '123',
};

const cex: MarketReference = {
  symbol: 'ETH',
  refHour: '2026-10-13T06:00:00.000Z',
  refPrice: 2000.8,
  exchangeCount: 3,
  crossExchangeSpreadPct: 0.1,
  medianBidAskSpreadPct: 0.02,
  medianVolume: 1_000_000,
};

const dex: ManipCostAdvisory = {
  symbol: 'ETH',
  referenceChain: 'ethereum',
  advisoryOnly: true,
  pools: [
    {
      poolKey: 'uniswap-v3-eth-usdc-005',
      dex: 'uniswap-v3',
      feeTier: '0.0005',
      snapshotTs: '2026-10-13T06:29:00.000Z',
      blockNumber: 26_000_000,
      midPrice: 2000,
      tvlUsd: 1_000_000,
      curve: [],
    },
  ],
  cheapestMove1PctUsd: 500_000,
  freshestSnapshotTs: '2026-10-13T06:29:00.000Z',
  note: 'Advisory only',
};

function assess(
  overrides: {
    request?: Partial<typeof request>;
    chainlink?: ChainlinkMarketReference | null;
    redstone?: RedStoneMarketReference | null;
    cex?: MarketReference | null;
    dex?: ManipCostAdvisory | null;
    asset?: string;
    chainId?: number;
  } = {}
) {
  return assessDecisionInput({
    asset: overrides.asset ?? 'ETH',
    chainId: overrides.chainId ?? 1,
    action: 'swap',
    tradeAmountUsd: 10_000,
    request: { ...request, ...overrides.request },
    chainlink: overrides.chainlink === undefined ? chainlink : overrides.chainlink,
    redstone: overrides.redstone ?? null,
    cex: overrides.cex === undefined ? cex : overrides.cex,
    dex: overrides.dex === undefined ? dex : overrides.dex,
    now: NOW,
  });
}

describe('assessDecisionInput', () => {
  it('marks the supplied price and quote sufficient when all fresh evidence fits the explicit policy', () => {
    const routeQuote = { price: 0.0005, observedAt: '2026-10-13T06:29:59.000Z' };
    const result = assess({ request: { operationRouteQuote: routeQuote } });

    expect(result.status).toBe('SUFFICIENT');
    expect(result.eligibleToProceed).toBe(true);
    expect(result.operationRouteQuote).toEqual(routeQuote);
    expect(result.prices.chainlinkDeviationBps).toBeCloseTo(2, 3);
    expect(result.prices.cexDeviationBps).toBeCloseTo(4, 2);
    expect(result.evidence.dexManipulationCost?.tradeSizeTo1PctManipulationCostRatio).toBe(0.02);
  });

  it('blocks when the venue quote exceeds the caller-supplied slippage limit', () => {
    const result = assess({ request: { quotePriceUsd: 2015 } });

    expect(result.status).toBe('BLOCK');
    expect(result.eligibleToProceed).toBe(false);
    expect(result.reasons.map(({ code }) => code)).toContain('QUOTE_SLIPPAGE');
  });

  it('returns insufficient evidence when a required source is missing or the quote is stale', () => {
    const result = assess({
      cex: null,
      request: { quoteObservedAt: '2026-10-13T06:20:00.000Z' },
    });

    expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.eligibleToProceed).toBe(false);
    expect(result.reasons.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['MARKET_REFERENCE_UNAVAILABLE', 'QUOTE_STALE'])
    );
  });

  it('does not reuse Ethereum DEX evidence for another chain', () => {
    const result = assess({ chainId: 8453 });

    expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.evidence.dexManipulationCost).toBeNull();
    expect(result.reasons.map(({ code }) => code)).toContain('DEX_DEPTH_UNAVAILABLE');
  });

  it('includes a fresh RedStone reference in the signed assessment inputs', () => {
    const result = assess({
      redstone: {
        provider: 'redstone-api',
        symbol: 'ETH',
        quote: 'USD',
        price: 2000.2,
        source: 'RedStone',
        updatedAt: '2026-10-13T06:29:55.000Z',
      },
    });

    expect(result.status).toBe('SUFFICIENT');
    expect(result.prices.redstonePriceUsd).toBe(2000.2);
    expect(result.prices.redstoneDeviationBps).toBeCloseTo(1, 3);
    expect(result.evidence.redstone).toEqual(
      expect.objectContaining({ provider: 'redstone-api', fresh: true, priceUsd: 2000.2 })
    );
  });

  it('blocks when a fresh RedStone reference exceeds the explicit deviation limit', () => {
    const result = assess({
      redstone: {
        provider: 'redstone-api',
        symbol: 'ETH',
        quote: 'USD',
        price: 2020,
        source: 'RedStone',
        updatedAt: '2026-10-13T06:29:55.000Z',
      },
    });

    expect(result.status).toBe('BLOCK');
    expect(result.reasons.map(({ code }) => code)).toContain('REDSTONE_DIVERGENCE');
  });

  it('records stale RedStone evidence as optional without lowering sufficiency', () => {
    const result = assess({
      redstone: {
        provider: 'redstone-api',
        symbol: 'ETH',
        quote: 'USD',
        price: 2000.2,
        source: 'RedStone',
        updatedAt: '2026-10-13T06:20:00.000Z',
      },
    });

    expect(result.status).toBe('SUFFICIENT');
    expect(result.prices.redstonePriceUsd).toBeNull();
    expect(result.evidence.redstone?.fresh).toBe(false);
    expect(result.reasons.map(({ code }) => code)).not.toContain('REDSTONE_DIVERGENCE');
  });

  it('still accepts previously signed v1 assessments without the optional RedStone fields', () => {
    const assessment = assess();
    const legacyAssessment = {
      ...assessment,
      prices: { ...assessment.prices },
      evidence: { ...assessment.evidence },
    };
    delete legacyAssessment.prices.redstonePriceUsd;
    delete legacyAssessment.prices.redstoneDeviationBps;
    delete legacyAssessment.evidence.redstone;

    expect(DecisionInputAssessmentSchema.safeParse(legacyAssessment).success).toBe(true);
  });
});
