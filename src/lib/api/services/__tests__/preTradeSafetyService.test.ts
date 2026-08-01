import { getConsensusPrice } from '@/lib/api/services/consensusPriceService';
import { UnsupportedSymbolError } from '@/lib/errors';
import { scorePreTrade } from '@/lib/ml/inference';
import { getProtocolByIdWithDynamicData } from '@/lib/protocols/dynamicData';
import { calculateAllStablecoinSnapshots } from '@/lib/stablecoins/monitor';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Blockchain, OracleProvider } from '@/types/oracle';

import { preTradeSafetyCheck, type PreTradeSafetyInput } from '../preTradeSafetyService';

import type { ConsensusPriceResponse, ConsensusProviderPrice } from '../consensusPriceService';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/api/services/consensusPriceService', () => ({
  getConsensusPrice: jest.fn(),
}));

jest.mock('@/lib/stablecoins/monitor', () => ({
  calculateAllStablecoinSnapshots: jest.fn(),
}));

jest.mock('@/lib/protocols/dynamicData', () => ({
  getProtocolByIdWithDynamicData: jest.fn(),
}));

// The audit path (and the ML velocity fetch) dynamically import
// createServiceRoleClient. Mocking the module here intercepts those imports so
// no real Supabase client is built. The velocity query chains .select()/.eq()
// off the mocked { from: () => ({ insert }) }, which throws -> the service's
// fetchDeviationVelocity catches it and returns 0 (its documented fallback).
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

// Mock the ML scorer so service tests assert against the rule-based fallback
// (stable, model-independent) rather than the current baked-in model's scores.
// The ML math itself is covered by src/lib/ml/__tests__/inference.test.ts. By
// default scorePreTrade returns null (no model) -> rule fallback.
jest.mock('@/lib/ml/inference', () => ({
  scorePreTrade: jest.fn(),
  getModelStatus: jest.fn(() => ({ active: false, trainedAt: null, metrics: {} })),
}));

const mockedGetConsensusPrice = getConsensusPrice as jest.MockedFunction<typeof getConsensusPrice>;
const mockedSnapshots = calculateAllStablecoinSnapshots as jest.MockedFunction<
  typeof calculateAllStablecoinSnapshots
>;
const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;
const mockedGetProtocolByIdWithDynamicData = getProtocolByIdWithDynamicData as jest.MockedFunction<
  typeof getProtocolByIdWithDynamicData
>;
const mockedScorePreTrade = scorePreTrade as jest.MockedFunction<typeof scorePreTrade>;

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function makeProvider(overrides: Partial<ConsensusProviderPrice> = {}): ConsensusProviderPrice {
  return {
    provider: 'chainlink' as OracleProvider,
    symbol: 'ETH',
    chain: 'ethereum' as Blockchain,
    price: 1860,
    deviationPct: 0.1,
    isOutlier: false,
    confidence: 0.95,
    timestamp: Date.now(),
    dataAgeSeconds: 5,
    reputationScore: 90,
    status: 'success',
    ...overrides,
  };
}

function makeConsensus(
  providers: ConsensusProviderPrice[],
  overrides: Partial<ConsensusPriceResponse> = {}
): ConsensusPriceResponse {
  return {
    symbol: 'ETH',
    consensusPrice: 1860,
    method: 'median',
    recommendedMethod: 'median',
    confidence: 0.95,
    confidenceLevel: 'high',
    agreement: 0.99,
    participantCount: providers.length,
    excludedCount: 0,
    excludedProviders: [],
    priceRange: { min: 1859, max: 1861 },
    methodResults: {
      median: 1860,
      trimmed_mean: 1860,
      weighted_median: 1860,
      iqr_filtered: 1860,
    },
    providers,
    recommendedProvider: 'chainlink' as OracleProvider,
    ...overrides,
  };
}

function makeInput(overrides: Partial<PreTradeSafetyInput> = {}): PreTradeSafetyInput {
  return {
    asset: 'ETH',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd: 1000,
    ...overrides,
  };
}

/** A mock Aave V3 ethereum protocol with real published risk params for ETH.
 *  LT=1.2048 (=1/0.83), maxLtv=0.8 → critical deviation = (1 − 1.2048×0.8)×100 = 3.616%. */
function makeMockProtocol(overrides: Record<string, unknown> = {}): never {
  return {
    id: 'aave-v3-ethereum',
    name: 'Aave V3',
    chain: 'ethereum',
    protocolType: 'lending',
    assets: [
      {
        symbol: 'ETH',
        category: 'major',
        oracleProvider: 'chainlink',
        collateralFactor: 0.8,
        liquidationThreshold: 1.2048,
        maxLtv: 0.8,
        exchangeRate: 1,
        liquidationCollateralRatio: 1.2048,
      },
    ],
    dynamicData: { assets: {} },
    ...overrides,
  } as never;
}

/** Wire up a default audit client that resolves successfully. */
function stubAuditClient() {
  const insert = jest.fn().mockResolvedValue({ error: null });
  const from = jest.fn().mockReturnValue({ insert });
  mockedCreateServiceRoleClient.mockReturnValue({ from } as never);
  return { insert, from };
}

/** Flush microtasks so the fire-and-forget audit log (dynamic import + insert)
 *  has a chance to settle before we assert on it. */
const flushAudit = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  jest.clearAllMocks();
  stubAuditClient();
  // By default no stablecoin depeg.
  mockedSnapshots.mockResolvedValue([]);
  // By default no ML model -> rule-based fallback for manipulationRiskScore.
  mockedScorePreTrade.mockReturnValue(null);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('preTradeSafetyCheck — verdict engine', () => {
  it('returns PASS when all oracles agree, data is fresh, and no depeg', async () => {
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, price: 1860, deviationPct: 0.05 }),
      makeProvider({ provider: 'pyth' as OracleProvider, price: 1860.5, deviationPct: 0.03 }),
      makeProvider({ provider: 'api3' as OracleProvider, price: 1859.8, deviationPct: 0.02 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('PASS');
    expect(result.staleDataRisk).toBe(false);
    expect(result.crossProviderAgreement).toBeCloseTo(0.99, 2);
    expect(result.manipulationRiskScore).toBeLessThan(0.1);
    expect(result.participantCount).toBe(3);
    expect(result.warnings).toEqual(['No oracle risk signals detected.']);
    expect(result.contributingFactors).toHaveLength(0);
  });

  it('returns BLOCK when the asset has no oracle coverage (UnsupportedSymbolError)', async () => {
    mockedGetConsensusPrice.mockRejectedValue(
      new UnsupportedSymbolError('No active feeds for WIDGET on ethereum')
    );

    const result = await preTradeSafetyCheck(makeInput({ asset: 'WIDGET', tradeAmountUsd: 500 }));

    expect(result.verdict).toBe('BLOCK');
    expect(result.consensusPrice).toBe(0);
    expect(result.manipulationRiskScore).toBe(1);
    expect(result.recommendedMaxPositionUsd).toBe(0);
    expect(result.participantCount).toBe(0);
    expect(result.contributingFactors[0].rule).toBe('oracle_coverage');
  });

  it('rethrows unexpected (non-UnsupportedSymbol) errors from consensus', async () => {
    mockedGetConsensusPrice.mockRejectedValue(new Error('RPC down'));

    await expect(preTradeSafetyCheck(makeInput())).rejects.toThrow('RPC down');
  });

  it('returns CAUTION when max provider deviation is between 1.0% and 3.0%', async () => {
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, price: 1860, deviationPct: 1.5 }),
      makeProvider({ provider: 'pyth' as OracleProvider, price: 1860, deviationPct: 0.1 }),
      makeProvider({ provider: 'api3' as OracleProvider, price: 1860, deviationPct: 0.1 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('CAUTION');
    expect(result.maxDeviationPct).toBeCloseTo(1.5, 1);
    const factor = result.contributingFactors.find((f) => f.rule === 'max_provider_deviation_pct');
    expect(factor?.triggeredVerdict).toBe('CAUTION');
  });

  it('returns DANGER when max provider deviation is between 3.0% and 8.0%', async () => {
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, deviationPct: 4.2 }),
      makeProvider({ provider: 'pyth' as OracleProvider, deviationPct: 0.1 }),
      makeProvider({ provider: 'api3' as OracleProvider, deviationPct: 0.1 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('DANGER');
  });

  it('returns BLOCK when max provider deviation >= 8.0%', async () => {
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, deviationPct: 9.5 }),
      makeProvider({ provider: 'pyth' as OracleProvider, deviationPct: 0.1 }),
      makeProvider({ provider: 'api3' as OracleProvider, deviationPct: 0.1 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('BLOCK');
  });
});

describe('preTradeSafetyCheck — staleness rule', () => {
  it('returns CAUTION when max data age is between 60s and 180s', async () => {
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, dataAgeSeconds: 90 }),
      makeProvider({ provider: 'pyth' as OracleProvider, dataAgeSeconds: 10 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('CAUTION');
    expect(result.staleDataRisk).toBe(true);
    expect(result.contributingFactors.find((f) => f.rule === 'data_stale_seconds')).toBeDefined();
  });

  it('returns BLOCK when max data age >= 600s', async () => {
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, dataAgeSeconds: 650 }),
      makeProvider({ provider: 'pyth' as OracleProvider, dataAgeSeconds: 5 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('BLOCK');
    expect(result.staleDataRisk).toBe(true);
  });
});

describe('preTradeSafetyCheck — agreement & depeg rules', () => {
  it('returns BLOCK when cross-provider agreement <= 0.7', async () => {
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider }),
      makeProvider({ provider: 'pyth' as OracleProvider }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers, { agreement: 0.65 }));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('BLOCK');
    expect(result.crossProviderAgreement).toBeCloseTo(0.65, 2);
    expect(
      result.contributingFactors.find((f) => f.rule === 'cross_provider_agreement')
    ).toBeDefined();
  });

  it('returns BLOCK when a stablecoin depeg >= 3.0% is active', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));
    mockedSnapshots.mockResolvedValue([
      {
        symbol: 'USDT',
        maxDeviationPercent: 3.5,
        riskLevel: 'critical',
      } as never,
    ]);

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('BLOCK');
    expect(result.depegWarnings).toHaveLength(1);
    expect(result.contributingFactors.find((f) => f.rule === 'stablecoin_depeg_pct')).toBeDefined();
  });

  it('ignores depeg deviations below the 0.3% caution threshold', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));
    mockedSnapshots.mockResolvedValue([
      {
        symbol: 'USDC',
        maxDeviationPercent: 0.1,
        riskLevel: 'normal',
      } as never,
    ]);

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.depegWarnings).toHaveLength(0);
    expect(result.verdict).toBe('PASS');
  });
});

describe('preTradeSafetyCheck — position size ratio', () => {
  it('returns CAUTION when trade size exceeds recommended max by 1.5x', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));

    const result = await preTradeSafetyCheck(makeInput({ tradeAmountUsd: 1_700_000 }));

    const factor = result.contributingFactors.find((f) => f.rule === 'position_to_liquidity_ratio');
    expect(factor?.triggeredVerdict).toBe('CAUTION');
    expect(result.verdict).toBe('CAUTION');
  });

  it('returns DANGER when trade size far exceeds recommended max (3x)', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));

    const result = await preTradeSafetyCheck(makeInput({ tradeAmountUsd: 3_500_000 }));

    const factor = result.contributingFactors.find((f) => f.rule === 'position_to_liquidity_ratio');
    expect(factor?.triggeredVerdict).toBe('DANGER');
    expect(result.verdict).toBe('DANGER');
  });
});

describe('preTradeSafetyCheck — worst verdict aggregation', () => {
  it('picks the worst verdict across multiple triggered rules', async () => {
    // deviation 1.5% -> CAUTION, stale 650s -> BLOCK
    const providers = [
      makeProvider({
        provider: 'chainlink' as OracleProvider,
        deviationPct: 1.5,
        dataAgeSeconds: 650,
      }),
      makeProvider({ provider: 'pyth' as OracleProvider, deviationPct: 0.1, dataAgeSeconds: 5 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('BLOCK');
    const rules = result.contributingFactors.map((f) => f.rule);
    expect(rules).toContain('max_provider_deviation_pct');
    expect(rules).toContain('data_stale_seconds');
  });
});

describe('preTradeSafetyCheck — targetProviders filter', () => {
  it('only considers targetProviders when computing deviation & spread', async () => {
    // pyth deviates 5% but is excluded via targetProviders -> should NOT trigger.
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, price: 1860, deviationPct: 0.1 }),
      makeProvider({ provider: 'pyth' as OracleProvider, price: 1860, deviationPct: 5.0 }),
      makeProvider({ provider: 'api3' as OracleProvider, price: 1860, deviationPct: 0.1 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput({ targetProviders: ['chainlink', 'api3'] }));

    expect(result.maxDeviationPct).toBeCloseTo(0.1, 1);
    expect(result.verdict).toBe('PASS');
  });
});

describe('preTradeSafetyCheck — resilience (non-blocking paths)', () => {
  it('does not fail the check when the audit log write rejects', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));
    // Audit insert rejects.
    const insert = jest.fn().mockRejectedValue(new Error('DB down'));
    mockedCreateServiceRoleClient.mockReturnValue({
      from: jest.fn().mockReturnValue({ insert }),
    } as never);

    const result = await preTradeSafetyCheck(makeInput());

    // Check still returns normally.
    expect(result.verdict).toBe('PASS');
    await flushAudit();
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('does not fail the check when stablecoin snapshot fetch rejects', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));
    mockedSnapshots.mockRejectedValue(new Error('snapshot service down'));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('PASS');
    expect(result.depegWarnings).toEqual([]);
  });
});

describe('preTradeSafetyCheck — output invariants', () => {
  it('always clamps manipulationRiskScore to [0, 1] and floors position at $10k', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.manipulationRiskScore).toBeGreaterThanOrEqual(0);
    expect(result.manipulationRiskScore).toBeLessThanOrEqual(1);
    expect(result.recommendedMaxPositionUsd).toBeGreaterThanOrEqual(10_000);
  });

  it('records latency and an ISO timestamp', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(() => new Date(result.evaluatedAt).toISOString()).not.toThrow();
  });

  it('writes an audit row with the verdict and asset', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));
    const { insert } = stubAuditClient();

    await preTradeSafetyCheck(makeInput({ asset: 'ETH', action: 'borrow' }));
    await flushAudit();

    expect(insert).toHaveBeenCalledTimes(1);
    const payload = insert.mock.calls[0][0];
    expect(payload.asset).toBe('ETH');
    expect(payload.action).toBe('borrow');
    expect(payload.verdict).toBe('PASS');
    expect(payload.chain_id).toBe(1);
  });
});

describe('preTradeSafetyCheck — protocol safety context', () => {
  it('leaves protocolSafety null when no protocolId is provided (backward compat)', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.protocolSafety).toBeNull();
  });

  it('returns null protocolSafety and does not fail when protocolId is unknown', async () => {
    mockedGetProtocolByIdWithDynamicData.mockResolvedValue(undefined);
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));

    const result = await preTradeSafetyCheck(makeInput({ protocolId: 'nope' }));

    expect(result.protocolSafety).toBeNull();
    expect(result.verdict).toBe('PASS');
    expect(
      result.contributingFactors.find((f) => f.rule === 'protocol_buffer_consumed')
    ).toBeUndefined();
  });

  it('returns null protocolSafety when the asset is not in the protocol', async () => {
    mockedGetProtocolByIdWithDynamicData.mockResolvedValue(
      makeMockProtocol({
        assets: [
          {
            symbol: 'WBTC',
            liquidationThreshold: 1.2821,
            maxLtv: 0.73,
            collateralFactor: 0.73,
            exchangeRate: 1,
            liquidationCollateralRatio: 1.2821,
          },
        ],
      })
    );
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));

    const result = await preTradeSafetyCheck(makeInput({ protocolId: 'aave-v3-ethereum' }));

    expect(result.protocolSafety).toBeNull();
  });

  it('escalates to DANGER on a borrow when oracle deviation consumes >=80% of the protocol buffer', async () => {
    // Aave ETH critical deviation = 3.616%. deviation 2.9% → buffer 80.2% → DANGER.
    // The deviation rule alone (2.9% < 3.0%) would only yield CAUTION, so a DANGER
    // verdict proves the protocol rule escalated it.
    mockedGetProtocolByIdWithDynamicData.mockResolvedValue(makeMockProtocol());
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, price: 1860, deviationPct: 2.9 }),
      makeProvider({ provider: 'pyth' as OracleProvider, price: 1860, deviationPct: 0.1 }),
      makeProvider({ provider: 'api3' as OracleProvider, price: 1860, deviationPct: 0.1 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(
      makeInput({ action: 'borrow', protocolId: 'aave-v3-ethereum' })
    );

    expect(result.protocolSafety).not.toBeNull();
    expect(result.protocolSafety?.criticalDeviationPct).toBeCloseTo(3.62, 1);
    expect(result.protocolSafety?.bufferConsumedPct).toBeGreaterThanOrEqual(80);
    const factor = result.contributingFactors.find((f) => f.rule === 'protocol_buffer_consumed');
    expect(factor?.triggeredVerdict).toBe('DANGER');
    expect(result.verdict).toBe('DANGER');
  });

  it('keeps protocol context informational for swaps (no verdict escalation)', async () => {
    // Same 2.9% deviation on a swap: protocol buffer is consumed but the rule
    // does NOT escalate (swap is not a lending action). Verdict stays CAUTION.
    mockedGetProtocolByIdWithDynamicData.mockResolvedValue(makeMockProtocol());
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, price: 1860, deviationPct: 2.9 }),
      makeProvider({ provider: 'pyth' as OracleProvider, price: 1860, deviationPct: 0.1 }),
      makeProvider({ provider: 'api3' as OracleProvider, price: 1860, deviationPct: 0.1 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(
      makeInput({ action: 'swap', protocolId: 'aave-v3-ethereum' })
    );

    expect(result.protocolSafety).not.toBeNull();
    expect(result.protocolSafety?.bufferConsumedPct).toBeGreaterThanOrEqual(80);
    expect(
      result.contributingFactors.find((f) => f.rule === 'protocol_buffer_consumed')
    ).toBeUndefined();
    expect(result.verdict).toBe('CAUTION');
  });

  it('writes protocol_id and protocol_safety to the audit row when protocolId is provided', async () => {
    mockedGetProtocolByIdWithDynamicData.mockResolvedValue(makeMockProtocol());
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));
    const { insert } = stubAuditClient();

    await preTradeSafetyCheck(makeInput({ protocolId: 'aave-v3-ethereum' }));
    await flushAudit();

    const payload = insert.mock.calls[0][0];
    expect(payload.protocol_id).toBe('aave-v3-ethereum');
    expect(payload.protocol_safety).not.toBeNull();
    expect(payload.protocol_safety.protocolName).toBe('Aave V3');
  });
});

describe('preTradeSafetyCheck — ML score plumbing', () => {
  it('uses the ML score as manipulationRiskScore and stamps mlModelVersion when a model is active', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));
    mockedScorePreTrade.mockReturnValue(0.42);

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.mlScore).toBe(0.42);
    expect(result.manipulationRiskScore).toBe(0.42);
    // getModelStatus is mocked to return trainedAt: null.
    expect(result.mlModelVersion).toBeNull();
    // The scorer received the enriched feature set (7 features incl. the new ones).
    expect(mockedScorePreTrade).toHaveBeenCalledTimes(1);
    const features = mockedScorePreTrade.mock.calls[0][0];
    expect(features).toEqual(
      expect.objectContaining({
        meanDeviationPct: expect.any(Number),
        staleRatio: expect.any(Number),
        deviationVelocity1h: expect.any(Number),
      })
    );
  });

  it('falls back to the rule-based score when no ML model is active (scorePreTrade null)', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));
    mockedScorePreTrade.mockReturnValue(null);

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.mlScore).toBeNull();
    // Rule-based fallback still produces a valid score in [0, 0.1] for a clean case.
    expect(result.manipulationRiskScore).toBeLessThan(0.1);
    expect(result.manipulationRiskScore).toBeGreaterThanOrEqual(0);
  });
});
