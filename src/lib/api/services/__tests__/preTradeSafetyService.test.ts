import { getConsensusPrice } from '@/lib/api/services/consensusPriceService';
import { signAttestationV2 } from '@/lib/attestations/oracleSafetyAttestationV2';
import { signAttestationV3 } from '@/lib/attestations/oracleSafetyAttestationV3';
import { UnsupportedSymbolError } from '@/lib/errors';
import { computeMarketDivergencePct } from '@/lib/marketReference/client';
import { getModelStatus, scorePreTradeMultiHorizon } from '@/lib/ml/inference';
import { getFeedStalenessBaselineMap } from '@/lib/oracles/feedCadence';
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

// Mock only the baseline LOOKUP; keep isCadenceStale (and the K/floor constants)
// real so the service tests exercise the actual cadence-relative logic. Default
// to an empty map (no baselines -> no staleness) so unrelated tests don't crash;
// individual staleness tests override with mockResolvedValue.
jest.mock('@/lib/oracles/feedCadence', () => ({
  ...jest.requireActual('@/lib/oracles/feedCadence'),
  getFeedStalenessBaselineMap: jest.fn(() => Promise.resolve(new Map())),
}));

// The cadence-relative CAUTION path is opt-in via ENABLE_CADENCE_CAUTION (default
// OFF until every provider reports a trustworthy oracle age). These service
// tests exercise that path, so enable it for the whole file. resolveOracleAgeSeconds
// still returns null for off-chain aggregators without a reliable signal, so the
// REDSTONE rows above never fabricate staleness — only on-chain feeds with a real
// age + baseline reach the CAUTION/BLOCK thresholds.
process.env.ENABLE_CADENCE_CAUTION = 'true';

// Mock the ML scorer so service tests assert against the rule-based fallback
// (stable, model-independent) rather than the current baked-in model's scores.
// The ML math itself is covered by src/lib/ml/__tests__/inference.test.ts. By
// default scorePreTradeMultiHorizon returns null (no model) -> rule fallback.
jest.mock('@/lib/ml/inference', () => ({
  scorePreTradeMultiHorizon: jest.fn(),
  getModelStatus: jest.fn(() => ({ active: false, trainedAt: null, metrics: {} })),
}));

// The v4 oracle-vs-market divergence feature is fetched only when a model is
// active; mock the reference client so a model-active test can assert the
// feature passes through without hitting Supabase.
jest.mock('@/lib/marketReference/client', () => ({
  computeMarketDivergencePct: jest.fn(),
}));

// Mock the v2/v3 signers so v2/v3 service tests assert the ROUTING/PLUMBING
// (CAIP-19 ids, provider observations, quorum gate) without a live attester
// key. Everything else in the modules stays real — the gate constants drive the
// quorum/independence gates, and v3 builds its type layout from v2's field
// list, so a hand-rolled partial mock would break the plumbing under test.
jest.mock('@/lib/attestations/oracleSafetyAttestationV2', () => ({
  ...jest.requireActual('@/lib/attestations/oracleSafetyAttestationV2'),
  signAttestationV2: jest.fn(),
}));

jest.mock('@/lib/attestations/oracleSafetyAttestationV3', () => ({
  ...jest.requireActual('@/lib/attestations/oracleSafetyAttestationV3'),
  signAttestationV3: jest.fn(),
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
const mockedScorePreTradeMultiHorizon = scorePreTradeMultiHorizon as jest.MockedFunction<
  typeof scorePreTradeMultiHorizon
>;
const mockedGetModelStatus = getModelStatus as jest.MockedFunction<typeof getModelStatus>;
const mockedDivergence = computeMarketDivergencePct as jest.MockedFunction<
  typeof computeMarketDivergencePct
>;
const mockedSignAttestationV2 = signAttestationV2 as jest.MockedFunction<typeof signAttestationV2>;
const mockedSignAttestationV3 = signAttestationV3 as jest.MockedFunction<typeof signAttestationV3>;
const mockedGetFeedStalenessBaselineMap = getFeedStalenessBaselineMap as jest.MockedFunction<
  typeof getFeedStalenessBaselineMap
>;

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
  mockedScorePreTradeMultiHorizon.mockReturnValue(null);
  // resetMocks wipes the factory default; re-establish so getModelStatus()
  // returns a valid object (mlModelVersion = null) instead of undefined.
  mockedGetModelStatus.mockReturnValue({ active: false, trainedAt: null, metrics: {} });
  // Default: v2 signer returns a stub so result.attestation is non-null when
  // schemaVersion=2 is exercised. The stub echoes the resolved CAIP-19 ids and
  // derives coverageStatus from the quorum participant count (mirroring the real
  // attestation) so provenance assertions can target realistic values. Individual
  // tests override as needed.
  mockedSignAttestationV2.mockImplementation(
    (input: { participantCount?: number; sourceAssetId?: string; destinationAssetId?: string }) =>
      ({
        uid: '0xV2STUB',
        schemaVersion: 2,
        attester: '0xV2ATTESTER',
        data: {
          coverageStatus: (input.participantCount ?? 0) >= 3 ? 'SUFFICIENT' : 'INSUFFICIENT',
          sourceAssetId: input.sourceAssetId,
          destinationAssetId: input.destinationAssetId,
        },
      }) as never
  );
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('preTradeSafetyCheck — verdict engine', () => {
  it('returns PASS when all oracles agree, data is fresh, and no depeg', async () => {
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, price: 1860, deviationPct: 0.05 }),
      makeProvider({ provider: 'redstone' as OracleProvider, price: 1860.5, deviationPct: 0.03 }),
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
      makeProvider({ provider: 'redstone' as OracleProvider, price: 1860, deviationPct: 0.1 }),
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
      makeProvider({ provider: 'redstone' as OracleProvider, deviationPct: 0.1 }),
      makeProvider({ provider: 'api3' as OracleProvider, deviationPct: 0.1 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('DANGER');
  });

  it('returns BLOCK when max provider deviation >= 8.0%', async () => {
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, deviationPct: 9.5 }),
      makeProvider({ provider: 'redstone' as OracleProvider, deviationPct: 0.1 }),
      makeProvider({ provider: 'api3' as OracleProvider, deviationPct: 0.1 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('BLOCK');
  });
});

describe('preTradeSafetyCheck — staleness rule (cadence-relative)', () => {
  it('does NOT flag staleness when no observed cadence baseline exists', async () => {
    // Absence of evidence is not staleness: without a baseline we never block.
    mockedGetFeedStalenessBaselineMap.mockResolvedValue(new Map());
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, dataAgeSeconds: 650 }),
      makeProvider({ provider: 'redstone' as OracleProvider, dataAgeSeconds: 5 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).not.toBe('BLOCK');
    expect(result.staleDataRisk).toBe(false);
    expect(result.contributingFactors.find((f) => f.rule === 'data_stale_seconds')).toBeUndefined();
  });

  it('does NOT flag a slow-but-healthy source within its own cadence', async () => {
    // API3-like ~24h cadence; a normal 24h-old reading is well within rhythm.
    mockedGetFeedStalenessBaselineMap.mockResolvedValue(
      new Map<string, number | null>([['api3', 86_400]])
    );
    const providers = [
      makeProvider({ provider: 'api3' as OracleProvider, dataAgeSeconds: 86_400 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).not.toBe('BLOCK');
    expect(result.staleDataRisk).toBe(false);
  });

  it('returns a soft CAUTION when a feed falls ~8x behind its own cadence', async () => {
    // Chainlink-like ~15min cadence; 8000s is ~9x the p90 -> stale.
    mockedGetFeedStalenessBaselineMap.mockResolvedValue(
      new Map<string, number | null>([['chainlink', 900]])
    );
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, dataAgeSeconds: 8000 }),
      makeProvider({ provider: 'redstone' as OracleProvider, dataAgeSeconds: 5 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('CAUTION');
    expect(result.staleDataRisk).toBe(true);
    expect(result.contributingFactors.find((f) => f.rule === 'data_stale_seconds')).toBeDefined();
  });

  it('returns BLOCK only when data age is >= 7 days AND the price diverges from consensus (genuinely dead)', async () => {
    // The 7d hard backstop is fail-closed for genuinely dead data: the feed is
    // both >=7d old AND its price is well off the fresh consensus.
    mockedGetFeedStalenessBaselineMap.mockResolvedValue(
      new Map<string, number | null>([['chainlink', 900]])
    );
    const providers = [
      makeProvider({
        provider: 'chainlink' as OracleProvider,
        dataAgeSeconds: 700_000,
        price: 1900,
      }),
      makeProvider({ provider: 'redstone' as OracleProvider, dataAgeSeconds: 5, price: 1860 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('BLOCK');
    expect(result.staleDataRisk).toBe(true);
    expect(
      result.contributingFactors.find(
        (f) => f.rule === 'data_stale_seconds' && f.triggeredVerdict === 'BLOCK'
      )
    ).toBeDefined();
  });

  it('does NOT hard-block a 7d-stale timestamp when the price agrees with consensus (timestamp anomaly)', async () => {
    // Mirrors the real API3 communal-dAPI behavior: the dAPI reports a 7-120d-old
    // `updatedAt` while serving a current price within <1% of fresh providers.
    // Such a stale timestamp must surface as a soft CAUTION, never a BLOCK —
    // otherwise BTC/ETH/USDC/SOL would falsely block on every chain API3 covers.
    mockedGetFeedStalenessBaselineMap.mockResolvedValue(new Map());
    const providers = [
      makeProvider({ provider: 'api3' as OracleProvider, dataAgeSeconds: 700_000, price: 1860 }),
      makeProvider({ provider: 'chainlink' as OracleProvider, dataAgeSeconds: 5, price: 1860 }),
      makeProvider({ provider: 'redstone' as OracleProvider, dataAgeSeconds: 5, price: 1860 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).not.toBe('BLOCK');
    expect(result.verdict).toBe('CAUTION');
    expect(
      result.contributingFactors.find((f) => f.rule === 'data_stale_timestamp_anomaly')
    ).toBeDefined();
  });
});

describe('preTradeSafetyCheck — agreement & depeg rules', () => {
  it('returns BLOCK when cross-provider agreement <= 0.7', async () => {
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider }),
      makeProvider({ provider: 'redstone' as OracleProvider }),
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
    // deviation 9.5% -> BLOCK; chainlink 8000s vs 900s cadence -> CAUTION (soft)
    mockedGetFeedStalenessBaselineMap.mockResolvedValue(
      new Map<string, number | null>([['chainlink', 900]])
    );
    const providers = [
      makeProvider({
        provider: 'chainlink' as OracleProvider,
        deviationPct: 9.5,
        dataAgeSeconds: 8000,
      }),
      makeProvider({
        provider: 'redstone' as OracleProvider,
        deviationPct: 0.1,
        dataAgeSeconds: 5,
      }),
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
    // redstone deviates 5% but is excluded via targetProviders -> should NOT trigger.
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, price: 1860, deviationPct: 0.1 }),
      makeProvider({ provider: 'redstone' as OracleProvider, price: 1860, deviationPct: 5.0 }),
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
      makeProvider({ provider: 'redstone' as OracleProvider, price: 1860, deviationPct: 0.1 }),
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
      makeProvider({ provider: 'redstone' as OracleProvider, price: 1860, deviationPct: 0.1 }),
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
  it('uses the ML combined score as manipulationRiskScore and exposes both horizons', async () => {
    mockedGetConsensusPrice.mockResolvedValue(
      makeConsensus([
        makeProvider(),
        makeProvider({ provider: 'pyth' as OracleProvider, isOutlier: true, reputationScore: 70 }),
      ])
    );
    mockedScorePreTradeMultiHorizon.mockReturnValue({
      combined: 0.42,
      score1h: 0.31,
      score6h: 0.42,
    });

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.mlScore).toBe(0.42);
    expect(result.mlScore1h).toBe(0.31);
    expect(result.mlScore6h).toBe(0.42);
    expect(result.manipulationRiskScore).toBe(0.42);
    // getModelStatus is mocked to return trainedAt: null.
    expect(result.mlModelVersion).toBeNull();
    // The scorer received the 11-feature set (incl. the v2 temporal features).
    expect(mockedScorePreTradeMultiHorizon).toHaveBeenCalledTimes(1);
    const [features, opts] = mockedScorePreTradeMultiHorizon.mock.calls[0];
    expect(features).toEqual(
      expect.objectContaining({
        meanDeviationPct: expect.any(Number),
        staleRatio: expect.any(Number),
        deviationVelocity1h: expect.any(Number),
        rollingVolatility6h: expect.any(Number),
        deviationVelocity3h: expect.any(Number),
        participantCountDelta1h: expect.any(Number),
        maxDeviationZscore24h: expect.any(Number),
      })
    );
    // v3 governance features must carry REAL live values (train/serve skew
    // guard): the model was trained on them, so scoring at the neutral prior
    // would silently degrade pre-trade relative to Oracle Watch.
    expect(features.agreement).toEqual(expect.any(Number));
    expect(features.outlierCount).toBe(1); // pyth flagged outlier
    expect(features.minReputation).toBeCloseTo(0.7, 5); // min(90,70)/100
    expect(features.avgReputation).toBeCloseTo(0.8, 5); // mean(90,70)/100
    // Asset class routing: the input asset flows through for calibration.
    expect(opts).toEqual({ assetClass: 'ETH' });
  });

  it('passes the v4 oracle-vs-market divergence feature when a model is active', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));
    mockedGetModelStatus.mockReturnValue({
      active: true,
      trainedAt: '2026-08-30T00:00:00Z',
      metrics: {},
    });
    mockedDivergence.mockResolvedValue(2.5);
    mockedScorePreTradeMultiHorizon.mockReturnValue({
      combined: 0.5,
      score1h: 0.4,
      score6h: 0.5,
    });

    await preTradeSafetyCheck(makeInput());

    // The external-truth feature is only fetched when the model is active
    // (hot path unchanged under the rules-only fallback) and flows through.
    expect(mockedDivergence).toHaveBeenCalledWith('ETH', expect.any(Number));
    const [features] = mockedScorePreTradeMultiHorizon.mock.calls[0];
    expect(features.oracleVsMarketDeviationPct).toBe(2.5);
  });

  it('falls back to the rule-based score when no ML model is active (multi-horizon null)', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));
    mockedScorePreTradeMultiHorizon.mockReturnValue(null);

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.mlScore).toBeNull();
    expect(result.mlScore1h).toBeNull();
    expect(result.mlScore6h).toBeNull();
    // Rule-based fallback still produces a valid score in [0, 0.1] for a clean case.
    expect(result.manipulationRiskScore).toBeLessThan(0.1);
    expect(result.manipulationRiskScore).toBeGreaterThanOrEqual(0);
    // No 24h history available (supabase mocked) -> anomaly layer degrades to 0.
    expect(result.anomalyScore).toBe(0);
  });
});

describe('preTradeSafetyCheck — v2 schema', () => {
  it('quorum gate: <3 providers escalates to BLOCK + INSUFFICIENT_COVERAGE (v2 only)', async () => {
    // 1 provider — would PASS under v1, but v2's quorum gate forces BLOCK.
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));

    const result = await preTradeSafetyCheck(makeInput({ schemaVersion: 2 }));

    expect(result.verdict).toBe('BLOCK');
    const factor = result.contributingFactors.find((f) => f.rule === 'oracle_coverage');
    expect(factor).toBeDefined();
    expect(factor?.triggeredVerdict).toBe('BLOCK');
    expect(factor?.value).toBe(1);
    expect(factor?.threshold).toBe(3);
  });

  it('quorum gate: ≥3 providers stays PASS (no INSUFFICIENT_COVERAGE factor)', async () => {
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider }),
      makeProvider({ provider: 'redstone' as OracleProvider }),
      makeProvider({ provider: 'api3' as OracleProvider }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput({ schemaVersion: 2 }));

    expect(result.verdict).toBe('PASS');
    expect(result.contributingFactors.find((f) => f.rule === 'oracle_coverage')).toBeUndefined();
  });

  it('v1 (default) does NOT apply the quorum gate — 1 provider still PASS', async () => {
    // Proves the gate is v2-only: same 1-provider input, no schemaVersion → PASS.
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('PASS');
    expect(mockedSignAttestationV2).not.toHaveBeenCalled();
  });

  it('v2 routes to signAttestationV2 with CAIP-19 source/destination ids + observations', async () => {
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider, price: 1860 }),
      makeProvider({ provider: 'redstone' as OracleProvider, price: 1860.5 }),
      makeProvider({ provider: 'api3' as OracleProvider, price: 1859.8 }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(
      makeInput({ schemaVersion: 2, destinationAsset: 'USDC' })
    );

    expect(mockedSignAttestationV2).toHaveBeenCalledTimes(1);
    const arg = mockedSignAttestationV2.mock.calls[0][0];
    // CAIP-19 pair binding (real resolution, not mocked).
    expect(arg.sourceAssetId).toBe('eip155:1/slip44:60'); // ETH native
    expect(arg.destinationAssetId).toBe(
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    ); // USDC
    expect(arg.subjectChainId).toBe(1);
    expect(arg.participantCount).toBe(3);
    // Provider observations are built from consensus.providers.
    expect(arg.providerObservations).toHaveLength(3);
    expect(arg.providerObservations[0].provider).toBe('chainlink');
    // Stubbed v2 attestation flows into the result.
    expect(result.attestation?.schemaVersion).toBe(2);
  });

  it('v2 destinationAsset defaults to the source asset when omitted (degenerate pair)', async () => {
    mockedGetConsensusPrice.mockResolvedValue(
      makeConsensus([
        makeProvider({ provider: 'chainlink' as OracleProvider }),
        makeProvider({ provider: 'redstone' as OracleProvider }),
        makeProvider({ provider: 'api3' as OracleProvider }),
      ])
    );

    await preTradeSafetyCheck(makeInput({ schemaVersion: 2 }));

    const arg = mockedSignAttestationV2.mock.calls[0][0];
    expect(arg.sourceAssetId).toBe(arg.destinationAssetId);
    expect(arg.sourceAssetId).toBe('eip155:1/slip44:60');
  });

  it('v2 independence gate: a fake quorum (3 same-operator participants) BLOCKs with INSUFFICIENT_INDEPENDENCE', async () => {
    // Quorum clears (3 providers) but all chainlink → 1 distinct non-derived
    // group → independence gate must BLOCK (v2 only).
    mockedGetConsensusPrice.mockResolvedValue(
      makeConsensus([
        makeProvider({ provider: 'chainlink' as OracleProvider }),
        makeProvider({ provider: 'chainlink' as OracleProvider }),
        makeProvider({ provider: 'chainlink' as OracleProvider }),
      ])
    );

    const result = await preTradeSafetyCheck(makeInput({ schemaVersion: 2 }));

    expect(result.verdict).toBe('BLOCK');
    const factor = result.contributingFactors.find((f) => f.rule === 'oracle_independence');
    expect(factor).toBeDefined();
    expect(factor?.triggeredVerdict).toBe('BLOCK');
    expect(factor?.value).toBe(1);
    expect(factor?.threshold).toBe(2);
  });

  it('v2 independence gate: ≥2 distinct non-derived groups passes (no oracle_independence factor)', async () => {
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider }),
      makeProvider({ provider: 'redstone' as OracleProvider }),
      makeProvider({ provider: 'api3' as OracleProvider }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput({ schemaVersion: 2 }));

    expect(result.verdict).toBe('PASS');
    expect(
      result.contributingFactors.find((f) => f.rule === 'oracle_independence')
    ).toBeUndefined();
  });

  it('v2 independence gate: a derived source (TWAP) does NOT satisfy the group count', async () => {
    // chainlink + TWAP + switchboard → 2 non-derived groups → ASSESSED (passes).
    // Proves TWAP is excluded from the independence count (Raul 16:09).
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider }),
      makeProvider({ provider: 'twap' as OracleProvider }),
      makeProvider({ provider: 'switchboard' as OracleProvider }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput({ schemaVersion: 2 }));

    expect(result.verdict).toBe('PASS');
    expect(
      result.contributingFactors.find((f) => f.rule === 'oracle_independence')
    ).toBeUndefined();
  });

  it('v2: a 2-group asset (VVV-like) is stopped by the quorum gate, NOT independence', async () => {
    // 2 distinct non-derived groups (dia + switchboard) clear independence, but
    // the participant count (2) fails the quorum → BLOCK via INSUFFICIENT_COVERAGE.
    // Independence must NOT fire (it would be a false INSUFFICIENT_INDEPENDENCE).
    const providers = [
      makeProvider({ provider: 'dia' as OracleProvider }),
      makeProvider({ provider: 'switchboard' as OracleProvider }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput({ schemaVersion: 2 }));

    expect(result.verdict).toBe('BLOCK');
    expect(result.contributingFactors.find((f) => f.rule === 'oracle_coverage')).toBeDefined();
    expect(
      result.contributingFactors.find((f) => f.rule === 'oracle_independence')
    ).toBeUndefined();
  });

  it('v3 routes the same evidence to the v3 signer (not v2)', async () => {
    // v3 is v2's evidence + the signed independence threshold. The gates are
    // identical; only the signer differs, and it must be the v3 one.
    mockedGetConsensusPrice.mockResolvedValue(
      makeConsensus([
        makeProvider({ provider: 'chainlink' as OracleProvider }),
        makeProvider({ provider: 'api3' as OracleProvider }),
        makeProvider({ provider: 'redstone' as OracleProvider }),
      ])
    );

    const result = await preTradeSafetyCheck(makeInput({ schemaVersion: 3 }));

    expect(mockedSignAttestationV3).toHaveBeenCalledTimes(1);
    expect(mockedSignAttestationV2).not.toHaveBeenCalled();

    // The input handed to the signer carries the same evidence v2 would get.
    const input = mockedSignAttestationV3.mock.calls[0][0];
    expect(input.verdict).toBe(result.verdict);
    expect(input.participantCount).toBe(3);
  });

  it('v3 applies both gates exactly as v2 does', async () => {
    // 2 distinct groups (dia + switchboard) clear independence; 2 participants
    // fail the quorum → BLOCK via INSUFFICIENT_COVERAGE, independence silent.
    // This is the same shape as the VVV production record.
    const providers = [
      makeProvider({ provider: 'dia' as OracleProvider }),
      makeProvider({ provider: 'switchboard' as OracleProvider }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));

    const result = await preTradeSafetyCheck(makeInput({ schemaVersion: 3 }));

    expect(result.verdict).toBe('BLOCK');
    expect(result.contributingFactors.find((f) => f.rule === 'oracle_coverage')).toBeDefined();
    expect(
      result.contributingFactors.find((f) => f.rule === 'oracle_independence')
    ).toBeUndefined();
  });

  it('v1 (default) does NOT apply the independence gate', async () => {
    // Same 3 chainlink participants, no schemaVersion → v1 passes (no gate).
    mockedGetConsensusPrice.mockResolvedValue(
      makeConsensus([
        makeProvider({ provider: 'chainlink' as OracleProvider }),
        makeProvider({ provider: 'chainlink' as OracleProvider }),
        makeProvider({ provider: 'chainlink' as OracleProvider }),
      ])
    );

    const result = await preTradeSafetyCheck(makeInput());

    expect(result.verdict).toBe('PASS');
  });

  it('v2 signs the attestation with an explicit unresolved marker when the source asset is unresolvable to CAIP-19 (rule #10)', async () => {
    // Exotic symbol with oracle coverage but no token-registry entry → CAIP-19
    // null. Per Raul's rule #10 (every BLOCK / verdict path must be signed), we
    // do NOT skip the signature — we sign with an explicit
    // `unresolved:<symbol>@<chain>` marker so the binding gap is visible inside
    // the signed artifact instead of silently dropping the signature (which
    // would leave it fail-open downstream). This removes the unsigned-BLOCK
    // residual at the structural level.
    mockedGetConsensusPrice.mockResolvedValue(
      makeConsensus(
        [
          makeProvider({ provider: 'chainlink' as OracleProvider }),
          makeProvider({ provider: 'redstone' as OracleProvider }),
          makeProvider({ provider: 'api3' as OracleProvider }),
        ],
        { symbol: 'EXOTIC' }
      )
    );

    const result = await preTradeSafetyCheck(makeInput({ asset: 'EXOTIC', schemaVersion: 2 }));

    // The v2 attestation IS issued (never skipped), carrying the unresolved marker.
    expect(mockedSignAttestationV2).toHaveBeenCalledTimes(1);
    const arg = mockedSignAttestationV2.mock.calls[0][0];
    expect(arg.sourceAssetId).toBe('unresolved:EXOTIC@1');
    // destinationAsset omitted → falls back to the source symbol → same marker.
    expect(arg.destinationAssetId).toBe('unresolved:EXOTIC@1');
    expect(result.attestation?.schemaVersion).toBe(2);
    // Verdict still computed normally (quorum passes with 3 providers).
    expect(result.verdict).toBe('PASS');
  });
});

describe('preTradeSafetyCheck — attestation provenance audit (0026)', () => {
  it('writes signed=true + uid + attester + schema_version=2 + coverage_status to the audit row on a v2 PASS', async () => {
    const providers = [
      makeProvider({ provider: 'chainlink' as OracleProvider }),
      makeProvider({ provider: 'redstone' as OracleProvider }),
      makeProvider({ provider: 'api3' as OracleProvider }),
    ];
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus(providers));
    const { insert } = stubAuditClient();

    await preTradeSafetyCheck(makeInput({ schemaVersion: 2 }));
    await flushAudit();

    expect(insert).toHaveBeenCalledTimes(1);
    const payload = insert.mock.calls[0][0];
    expect(payload.signed).toBe(true);
    expect(payload.attestation_uid).toBe('0xV2STUB');
    expect(payload.attester).toBe('0xV2ATTESTER');
    expect(payload.schema_version).toBe(2);
    expect(payload.coverage_status).toBe('SUFFICIENT');
    expect(payload.unresolved_asset).toBeNull();
  });

  it('records coverage_status=INSUFFICIENT for a v2 quorum-gated BLOCK', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));
    const { insert } = stubAuditClient();

    await preTradeSafetyCheck(makeInput({ schemaVersion: 2 }));
    await flushAudit();

    const payload = insert.mock.calls[0][0];
    expect(payload.signed).toBe(true);
    expect(payload.verdict).toBe('BLOCK');
    expect(payload.coverage_status).toBe('INSUFFICIENT');
  });

  it('captures the unresolved:<symbol>@<chain> marker in unresolved_asset (v2 registry gap)', async () => {
    mockedGetConsensusPrice.mockResolvedValue(
      makeConsensus(
        [
          makeProvider({ provider: 'chainlink' as OracleProvider }),
          makeProvider({ provider: 'redstone' as OracleProvider }),
          makeProvider({ provider: 'api3' as OracleProvider }),
        ],
        { symbol: 'EXOTIC' }
      )
    );
    const { insert } = stubAuditClient();

    await preTradeSafetyCheck(makeInput({ asset: 'EXOTIC', schemaVersion: 2 }));
    await flushAudit();

    const payload = insert.mock.calls[0][0];
    expect(payload.signed).toBe(true);
    expect(payload.unresolved_asset).toBe('unresolved:EXOTIC@1');
  });

  it('writes signed=false + null uid + schema_version=1 when no attester key is configured (v1 default)', async () => {
    mockedGetConsensusPrice.mockResolvedValue(makeConsensus([makeProvider()]));
    const { insert } = stubAuditClient();

    await preTradeSafetyCheck(makeInput());
    await flushAudit();

    const payload = insert.mock.calls[0][0];
    expect(payload.signed).toBe(false);
    expect(payload.attestation_uid).toBeNull();
    expect(payload.attester).toBeNull();
    expect(payload.schema_version).toBe(1);
    expect(payload.coverage_status).toBeNull();
    expect(payload.unresolved_asset).toBeNull();
  });
});
