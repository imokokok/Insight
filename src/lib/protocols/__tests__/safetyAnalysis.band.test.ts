import type { AssetDeviationResult, OracleWarning } from '@/lib/protocols/protocolHealthTypes';
import { analyzeSafetyBuffer, computeLiquidationPriceBand } from '@/lib/protocols/safetyAnalysis';
import type { OracleProvider } from '@/types/oracle';

function makeDeviation(overrides: Partial<AssetDeviationResult> = {}): AssetDeviationResult {
  return {
    symbol: 'ETH',
    currentPrice: 2000,
    criticalDeviationPercent: -20,
    criticalPrice: 1600,
    direction: 'down',
    description: '',
    ...overrides,
  };
}

function makeWarning(overrides: Partial<OracleWarning> = {}): OracleWarning {
  return {
    provider: 'chainlink' as OracleProvider,
    overallScore: 80,
    freshnessScore: 95,
    reliabilityScore: 90,
    avgDeviationPct: 1.5,
    level: 'fair',
    message: '',
    impact: '',
    affectedSymbols: ['ETH'],
    ...overrides,
  };
}

describe('analyzeSafetyBuffer — oracle uncertainty band', () => {
  it('flaw ①: missing oracle data → conservative 10% band, NOT zero', () => {
    const result = analyzeSafetyBuffer(makeDeviation(), 1.8, [makeDeviation()], []);

    expect(result.bandUnknown).toBe(true);
    // UNKNOWN_ORACLE_UNCERTAINTY = 10, no further contributions
    expect(result.bandHalfWidthPercent).toBe(10);
    // With no deviation/depeg/staleness, theoretical buffer 20% minus 10% band
    expect(result.bufferPercent).toBeCloseTo(10, 2);
    expect(result.overallLevel).not.toBe('dangerous');
  });

  it('flaw ① reverse check: oracle data present is NOT flagged unknown', () => {
    const result = analyzeSafetyBuffer(
      makeDeviation(),
      1.8,
      [makeDeviation()],
      [makeWarning({ avgDeviationPct: 2 })]
    );

    expect(result.bandUnknown).toBe(false);
    expect(result.bandHalfWidthPercent).toBeGreaterThan(0);
  });

  it('flaw ②: band FULLY tightens the effective buffer (not just decoration)', () => {
    const smallBand = analyzeSafetyBuffer(
      makeDeviation({ criticalDeviationPercent: -20 }),
      1.8,
      [makeDeviation({ criticalDeviationPercent: -20 })],
      [makeWarning({ avgDeviationPct: 2 })], // measured deviation → band ≈ 2.1%
      {}
    );
    const largeBand = analyzeSafetyBuffer(
      makeDeviation({ criticalDeviationPercent: -20 }),
      1.8,
      [makeDeviation({ criticalDeviationPercent: -20 })],
      [makeWarning({ avgDeviationPct: 8 })], // measured deviation → band ≈ 8.1%
      {}
    );

    // Theoretical buffer is 20% in both. Larger band must produce smaller buffer.
    expect(largeBand.bandHalfWidthPercent).toBeGreaterThan(smallBand.bandHalfWidthPercent);
    expect(largeBand.bufferPercent).toBeLessThan(smallBand.bufferPercent);
    // buffer = max(0, theoretical - band) → strictly consistent
    expect(largeBand.bufferPercent).toBeCloseTo(
      Math.max(0, 20 - largeBand.bandHalfWidthPercent),
      2
    );
    expect(smallBand.bufferPercent).toBeCloseTo(
      Math.max(0, 20 - smallBand.bandHalfWidthPercent),
      2
    );
  });

  it('combines consensus deviation + live depeg + staleness, capped at 50%', () => {
    const result = analyzeSafetyBuffer(
      makeDeviation({ criticalDeviationPercent: -80 }),
      1.8,
      [makeDeviation({ criticalDeviationPercent: -80 })],
      [makeWarning({ avgDeviationPct: 30, freshnessScore: 0 })],
      { USDC: 25 } // live depeg 25%
    );
    // 30 (deviation) + 25 (depeg) + 2 (staleness cap) = 57 → capped 50
    expect(result.bandHalfWidthPercent).toBe(50);
    expect(result.bufferPercent).toBeCloseTo(Math.max(0, 80 - 50), 2);
  });

  it('prefers the live cross-oracle consensus deviation over the reputation average', () => {
    // Reputation says 1.5% avg; the live on-demand consensus says 3.2% for the
    // position's worst asset. The live signal must win (it is current and
    // asset-specific) and be flagged as the 'live' source.
    const result = analyzeSafetyBuffer(
      makeDeviation({ criticalDeviationPercent: -20 }),
      1.8,
      [makeDeviation({ criticalDeviationPercent: -20 })],
      [makeWarning({ avgDeviationPct: 1.5 })],
      {},
      { ETH: 3.2, USDC: 0.1 }
    );

    expect(result.consensusSource).toBe('live');
    expect(result.liveConsensusDeviationPercent).toBeCloseTo(3.2, 2);
    // Per-asset map preserved for breakdown display
    expect(result.liveConsensusDeviations['ETH']).toBeCloseTo(3.2, 4);
    expect(result.bandUnknown).toBe(false);
    // Band at least the live deviation (plus depeg/staleness), buffer fully tightens
    expect(result.bandHalfWidthPercent).toBeGreaterThanOrEqual(3.2);
    expect(result.bufferPercent).toBeCloseTo(Math.max(0, 20 - result.bandHalfWidthPercent), 2);
  });

  it('falls back to the reputation average when no live consensus data exists', () => {
    const result = analyzeSafetyBuffer(
      makeDeviation({ criticalDeviationPercent: -20 }),
      1.8,
      [makeDeviation({ criticalDeviationPercent: -20 })],
      [makeWarning({ avgDeviationPct: 2 })]
    );

    expect(result.consensusSource).toBe('reputation');
    expect(result.liveConsensusDeviationPercent).toBe(0);
    expect(result.bandUnknown).toBe(false);
    expect(result.bandHalfWidthPercent).toBeGreaterThanOrEqual(2);
  });

  it('flags the band unknown (placeholder) when neither live nor reputation data exists', () => {
    const result = analyzeSafetyBuffer(
      makeDeviation({ criticalDeviationPercent: -20 }),
      1.8,
      [makeDeviation({ criticalDeviationPercent: -20 })],
      []
    );

    expect(result.consensusSource).toBe('none');
    expect(result.bandUnknown).toBe(true);
    expect(result.bandHalfWidthPercent).toBe(10);
  });
});

describe('computeLiquidationPriceBand — asymmetric direction', () => {
  it('flaw ③: direction "down" → adverse (full) on the LOWER side, favorable (half) on UPPER', () => {
    const band = computeLiquidationPriceBand(1600, 'down', 10);

    expect(band.adversePercent).toBe(10);
    expect(band.favorablePercent).toBeCloseTo(5, 4);
    // lower = 1600 * (1 - 10/100) = 1440 (adverse, liquidation earlier)
    expect(band.lower).toBeCloseTo(1440, 2);
    // upper = 1600 * (1 + 5/100) = 1680 (favorable, liquidation later)
    expect(band.upper).toBeCloseTo(1680, 2);
    expect(band.center).toBe(1600);
  });

  it('flaw ③: direction "up" → adverse (full) on the UPPER side, favorable (half) on LOWER', () => {
    const band = computeLiquidationPriceBand(1600, 'up', 10);

    // upper = 1600 * (1 + 10/100) = 1760 (adverse, liquidation earlier)
    expect(band.upper).toBeCloseTo(1760, 2);
    // lower = 1600 * (1 - 5/100) = 1520 (favorable, liquidation later)
    expect(band.lower).toBeCloseTo(1520, 2);
  });

  it('passes the unknown flag through', () => {
    const band = computeLiquidationPriceBand(1600, 'down', 10, true);
    expect(band.unknown).toBe(true);
  });
});
