import { assessSolanaPerpGuard } from '../solanaPerpGuard';

import type { SolanaPerpGuardVenueEvidence } from '../solanaPerpGuard';

const NOW = new Date('2026-11-04T00:00:00.000Z');

const BASE_INPUT = {
  protocolId: 'drift-v2-mainnet' as const,
  action: 'open_long' as const,
  assetSymbol: 'BTC',
  marginAssetSymbol: 'USDC',
  sizeUsd: 25_000,
  marginValueUsd: 2_500,
};

const CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

function oracleMock(verdict: 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK', consensusPrice: number) {
  return jest.fn(async () => ({
    verdict,
    consensusPrice,
    maxDeviationPct: 0.1,
    staleDataRisk: false,
    participantCount: 3,
    attestation: { uid: 'uid-1', attester: '0xattester' },
  })) as never;
}

function venueState(
  overrides: {
    markPrice?: number | null;
    oraclePrice?: number | null;
    markOracleDeviationBps?: number | null;
    liveMaxLeverage?: number | null;
    marketStatus?: string | null;
    openInterestUtilizationPct?: number | null;
  } = {}
): SolanaPerpGuardVenueEvidence {
  const mark = overrides.markPrice !== undefined ? overrides.markPrice : 68_000;
  const oraclePrice = overrides.oraclePrice !== undefined ? overrides.oraclePrice : 68_000;
  const deviationBps =
    overrides.markOracleDeviationBps !== undefined
      ? overrides.markOracleDeviationBps
      : oraclePrice !== null && oraclePrice > 0
        ? ((mark - oraclePrice) / oraclePrice) * 10_000
        : null;
  return {
    status: 'observed',
    observedAt: NOW.toISOString(),
    sourceFreshnessSeconds: 2,
    markPrice: mark,
    oraclePrice,
    markOracleDeviationBps: deviationBps,
    displayedTopDepthNotionalUsd: null,
    fundingRate: 0.000_012_5,
    openInterestCoin: 1_234.5,
    dayNotionalVolume: null,
    liveMaxLeverage: overrides.liveMaxLeverage !== undefined ? overrides.liveMaxLeverage : 20,
    consensusVenueDeviationPct: null,
    drift: {
      marketIndex: 1,
      marketAccountAddress: 'DriftBtcPerpMarketPdaOnSolanaMainnet0000000',
      oracleSource: 'pythLazer',
      oracleSourceSupported: true,
      oracleConfidence: 12.3,
      markPriceTwap: 68_001,
      last24hAvgFundingRatePerHourPercent: 0.001_25,
      fundingPeriodSeconds: 3_600,
      openInterestNotionalUsd: 83_946_000,
      maxOpenInterestBase: 1_000_000,
      openInterestUtilizationPct: overrides.openInterestUtilizationPct ?? 12.35,
      netBaseAssetAmount: 111.1,
      marginRatioMaintenance: 0.025,
      contractTier: 'A',
      marketStatus: overrides.marketStatus ?? 'active',
      pausedOperationsMask: 0,
      ammLastUpdateSlot: 123_456_789,
      unavailableReason: null,
    },
  };
}

function unavailableVenueState(reason: string): SolanaPerpGuardVenueEvidence {
  return {
    status: 'unavailable',
    observedAt: NOW.toISOString(),
    sourceFreshnessSeconds: null,
    markPrice: null,
    oraclePrice: null,
    markOracleDeviationBps: null,
    displayedTopDepthNotionalUsd: null,
    fundingRate: null,
    openInterestCoin: null,
    dayNotionalVolume: null,
    liveMaxLeverage: null,
    consensusVenueDeviationPct: null,
    drift: {
      marketIndex: null,
      marketAccountAddress: null,
      oracleSource: null,
      oracleSourceSupported: null,
      oracleConfidence: null,
      markPriceTwap: null,
      last24hAvgFundingRatePerHourPercent: null,
      fundingPeriodSeconds: null,
      openInterestNotionalUsd: null,
      maxOpenInterestBase: null,
      openInterestUtilizationPct: null,
      netBaseAssetAmount: null,
      marginRatioMaintenance: null,
      contractTier: null,
      marketStatus: null,
      pausedOperationsMask: null,
      ammLastUpdateSlot: null,
      unavailableReason: reason,
    },
  };
}

function dependencies(
  mockOracle: ReturnType<typeof oracleMock>,
  venue: SolanaPerpGuardVenueEvidence
) {
  return {
    checkOracle: mockOracle,
    fetchVenueState: jest.fn(async () => venue),
    now: () => NOW,
  };
}

describe('assessSolanaPerpGuard', () => {
  it('returns a scoped ALLOW with the reviewed profile when leverage is inside the band', async () => {
    const result = await assessSolanaPerpGuard(
      BASE_INPUT,
      dependencies(oracleMock('PASS', 68_000), venueState())
    );

    expect(result.verdict).toBe('ALLOW');
    expect(result.schema).toBe('insight.solana-perp-guard.v1');
    expect(result.protocolId).toBe('drift-v2-mainnet');
    expect(result.scope).toEqual({
      venue: 'drift',
      network: CAIP2,
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
    });
    expect(result.market).toEqual({
      assetSymbol: 'BTC',
      marginAssetSymbol: 'USDC',
      maxLeverage: 20,
      maxLeverageSource: 'reviewed-profile',
      parameterSource: 'reviewed-profile',
    });
    expect(result.projected.effectiveLeverage).toBeCloseTo(10, 6);
    expect(result.venue.status).toBe('observed');
    expect(result.oracleChecks.underlying.verdict).toBe('PASS');
    expect(result.oracleChecks.margin.verdict).toBe('PASS');
    expect(result.next.execution).toBe('not_performed');
    expect(result.reasons.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects inputs outside the reviewed market, margin, or schema shape', async () => {
    await expect(
      assessSolanaPerpGuard(
        { ...BASE_INPUT, assetSymbol: 'DOGE' },
        dependencies(oracleMock('PASS', 68_000), venueState())
      )
    ).rejects.toThrow(/not in the reviewed Solana perp guard market set/);
    await expect(
      assessSolanaPerpGuard({ ...BASE_INPUT, marginAssetSymbol: 'USDT' } as never)
    ).rejects.toThrow();
    await expect(assessSolanaPerpGuard({ ...BASE_INPUT, sizeUsd: 0 } as never)).rejects.toThrow();
  });

  it('blocks at or above the effective leverage cap', async () => {
    const result = await assessSolanaPerpGuard(
      { ...BASE_INPUT, sizeUsd: 50_000 },
      dependencies(oracleMock('PASS', 68_000), venueState())
    );

    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/leverage/i);
  });

  it('caps the reviewed profile with the live on-chain margin ratio and blocks over it', async () => {
    const result = await assessSolanaPerpGuard(
      { ...BASE_INPUT, sizeUsd: 30_000 },
      dependencies(oracleMock('PASS', 68_000), venueState({ liveMaxLeverage: 10 }))
    );

    expect(result.market.maxLeverage).toBe(10);
    expect(result.market.maxLeverageSource).toBe('reviewed-profile-capped-by-live-venue');
    expect(result.verdict).toBe('BLOCK');
  });

  it('discloses when the live venue leverage is unavailable and keeps the reviewed cap', async () => {
    const result = await assessSolanaPerpGuard(
      BASE_INPUT,
      dependencies(oracleMock('PASS', 68_000), venueState({ liveMaxLeverage: null }))
    );

    expect(result.market.maxLeverageSource).toBe('reviewed-profile-live-unavailable');
  });

  it('cautions at ninety percent of the effective leverage cap', async () => {
    const result = await assessSolanaPerpGuard(
      { ...BASE_INPUT, sizeUsd: 45_000 },
      dependencies(oracleMock('PASS', 68_000), venueState())
    );

    expect(result.verdict).toBe('CAUTION');
    expect(result.projected.effectiveLeverage).toBeCloseTo(18, 6);
  });

  it('blocks when the underlying oracle check is blocking', async () => {
    const result = await assessSolanaPerpGuard(
      BASE_INPUT,
      dependencies(oracleMock('DANGER', 68_000), venueState())
    );

    expect(result.verdict).toBe('BLOCK');
    expect(result.oracleChecks.underlying.verdict).toBe('DANGER');
  });

  it('cautions when the Drift mark price diverges at least 100 bps from the oracle', async () => {
    const result = await assessSolanaPerpGuard(
      BASE_INPUT,
      dependencies(oracleMock('PASS', 68_000), venueState({ markPrice: 68_700 }))
    );

    expect(result.verdict).toBe('CAUTION');
    expect(result.venue.markOracleDeviationBps).toBeGreaterThanOrEqual(100);
  });

  it('blocks when the Drift mark price diverges at least 1000 bps from the oracle', async () => {
    const result = await assessSolanaPerpGuard(
      BASE_INPUT,
      dependencies(oracleMock('PASS', 68_000), venueState({ markPrice: 75_000 }))
    );

    expect(result.verdict).toBe('BLOCK');
  });

  it('blocks when Insight consensus diverges at least 5% from the Drift oracle price', async () => {
    const result = await assessSolanaPerpGuard(
      BASE_INPUT,
      dependencies(oracleMock('PASS', 64_600), venueState())
    );

    expect(result.verdict).toBe('BLOCK');
    expect(result.venue.consensusVenueDeviationPct).toBeGreaterThanOrEqual(5);
  });

  it('cautions when Insight consensus diverges at least 1% from the Drift oracle price', async () => {
    const result = await assessSolanaPerpGuard(
      BASE_INPUT,
      dependencies(oracleMock('PASS', 67_200), venueState())
    );

    expect(result.verdict).toBe('CAUTION');
    expect(result.venue.consensusVenueDeviationPct).toBeGreaterThanOrEqual(1);
  });

  it('fails closed when the on-chain oracle price cannot be read', async () => {
    const result = await assessSolanaPerpGuard(
      BASE_INPUT,
      dependencies(
        oracleMock('PASS', 68_000),
        venueState({ oraclePrice: null, markOracleDeviationBps: null })
      )
    );

    expect(result.verdict).toBe('BLOCK');
  });

  it('discloses venue unavailability instead of blocking on it', async () => {
    const result = await assessSolanaPerpGuard(
      BASE_INPUT,
      dependencies(oracleMock('PASS', 68_000), unavailableVenueState('RPC unreachable'))
    );

    expect(result.verdict).toBe('ALLOW');
    expect(result.venue.status).toBe('unavailable');
    expect(result.venue.drift.unavailableReason).toBe('RPC unreachable');
    expect(result.reasons.join(' ')).toMatch(/venue evidence was unavailable/);
  });

  it('blocks when the Drift market is not in the active operating state', async () => {
    const result = await assessSolanaPerpGuard(
      BASE_INPUT,
      dependencies(oracleMock('PASS', 68_000), venueState({ marketStatus: 'settlement' }))
    );

    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/settlement/);
  });

  it('cautions near the on-chain open-interest cap and blocks at it', async () => {
    const caution = await assessSolanaPerpGuard(
      BASE_INPUT,
      dependencies(oracleMock('PASS', 68_000), venueState({ openInterestUtilizationPct: 86 }))
    );
    const block = await assessSolanaPerpGuard(
      BASE_INPUT,
      dependencies(oracleMock('PASS', 68_000), venueState({ openInterestUtilizationPct: 99 }))
    );

    expect(caution.verdict).toBe('CAUTION');
    expect(block.verdict).toBe('BLOCK');
  });
});
