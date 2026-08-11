import { WRAPPED_ASSETS } from '@/lib/wrapped-assets/config';

import { getSeverity, scoreProvider } from '../helpers';
import {
  calculateAnomalySummary,
  calculateAssetStats,
  calculateCoverageMatrix,
  calculateFailureBreakdown,
  calculateMetrics,
  calculateProviderRankings,
  calculateStablecoinDepegSummary,
  calculateWrappedAssetPegSummary,
  extractDeviationEvents,
} from '../reportCalculations';

import type { SnapshotRow } from '../types';

function snap(
  partial: Partial<SnapshotRow> & Pick<SnapshotRow, 'provider' | 'symbol'>
): SnapshotRow {
  return {
    snapshot_hour: '2026-08-11T14:00:00.000Z',
    chain_id: 1,
    price: 100,
    consensus_price: 100,
    deviation_pct: null,
    latency_ms: 100,
    data_age_seconds: null,
    confidence: null,
    is_success: true,
    error_message: null,
    ...partial,
  };
}

describe('calculateMetrics', () => {
  it('returns all zeros for an empty input', () => {
    const m = calculateMetrics([]);
    expect(m.totalSnapshots).toBe(0);
    expect(m.successfulSnapshots).toBe(0);
    expect(m.failedSnapshots).toBe(0);
    expect(m.overallSuccessRate).toBe(0);
    expect(m.avgDeviationPct).toBe(0);
  });

  it('splits success/failure and derives deviation/latency stats from successful rows only', () => {
    const rows = [
      snap({ provider: 'chainlink', symbol: 'BTC', deviation_pct: 1, latency_ms: 200 }),
      snap({ provider: 'chainlink', symbol: 'ETH', deviation_pct: 3, latency_ms: 400 }),
      snap({ provider: 'chainlink', symbol: 'SOL', is_success: false, deviation_pct: 9 }),
    ];
    const m = calculateMetrics(rows);

    expect(m.totalSnapshots).toBe(3);
    expect(m.successfulSnapshots).toBe(2);
    expect(m.failedSnapshots).toBe(1);
    expect(m.overallSuccessRate).toBe(66.67);
    expect(m.avgDeviationPct).toBe(2); // mean(1, 3)
    expect(m.maxDeviationPct).toBe(3);
    expect(m.avgLatencyMs).toBe(300); // mean(200, 400)
  });

  it('counts distinct active hourly windows via the 13-char snapshot_hour prefix', () => {
    const rows = [
      snap({ snapshot_hour: '2026-08-11T14:00:00.000Z' }),
      snap({ snapshot_hour: '2026-08-11T14:30:00.000Z' }), // same hour bucket
      snap({ snapshot_hour: '2026-08-11T15:00:00.000Z' }),
    ];
    expect(calculateMetrics(rows).activeHours).toBe(2);
  });
});

describe('calculateAssetStats', () => {
  it('aggregates prices per symbol and ranks by volatility descending', () => {
    const rows = [
      snap({ symbol: 'BTC', price: 100, consensus_price: 100 }),
      snap({ symbol: 'BTC', price: 120, consensus_price: 100 }),
      snap({ symbol: 'ETH', price: 200, consensus_price: 200 }),
      snap({ symbol: 'ETH', price: 204, consensus_price: 200 }),
    ];
    const stats = calculateAssetStats(rows);
    expect(stats).toHaveLength(2);
    // ETH swings (204-200)/200 = 2% > BTC (120-100)/100 = 20%? No: BTC = 20%, ETH = 2%
    // BTC is more volatile, so it sorts first.
    expect(stats[0].symbol).toBe('BTC');
    expect(stats[0].volatilityPct).toBeCloseTo(20, 2);
    expect(stats[1].symbol).toBe('ETH');
    expect(stats[1].volatilityPct).toBeCloseTo(2, 2);
  });

  it('skips a symbol that has no positive price', () => {
    const rows = [snap({ symbol: 'BAD', price: 0, consensus_price: 0 })];
    expect(calculateAssetStats(rows)).toHaveLength(0);
  });
});

describe('calculateProviderRankings', () => {
  it('computes success rate, anomaly count and a descending score order', () => {
    const rows = [
      snap({ provider: 'good', symbol: 'BTC', deviation_pct: 0.1, latency_ms: 50 }),
      snap({ provider: 'good', symbol: 'ETH', deviation_pct: 0.2, latency_ms: 60 }),
      snap({ provider: 'bad', symbol: 'BTC', deviation_pct: 1.2, latency_ms: 900 }), // anomaly >=0.5
      snap({ provider: 'bad', symbol: 'ETH', is_success: false, latency_ms: null }),
    ];
    const rankings = calculateProviderRankings(rows);
    expect(rankings).toHaveLength(2);

    const good = rankings.find((r) => r.provider === 'good')!;
    const bad = rankings.find((r) => r.provider === 'bad')!;
    expect(good.successRate).toBe(100);
    expect(good.anomalyCount).toBe(0);
    expect(bad.successRate).toBe(50);
    expect(bad.anomalyCount).toBe(1);

    // Higher score must sort first.
    expect(rankings[0].score).toBeGreaterThanOrEqual(rankings[1].score);
    expect(rankings[0].provider).toBe('good');
  });
});

describe('extractDeviationEvents', () => {
  it('keeps only successful rows with deviation >= 0.5 and a consensus price, sorted by severity desc', () => {
    const rows = [
      snap({ symbol: 'BTC', deviation_pct: 2.5, consensus_price: 100 }), // critical
      snap({ symbol: 'ETH', deviation_pct: 0.3, consensus_price: 100 }), // below 0.5 -> dropped
      snap({ symbol: 'SOL', deviation_pct: 1.2, consensus_price: 100 }), // high
      snap({ symbol: 'AVAX', deviation_pct: 0.8, consensus_price: null }), // no consensus -> dropped
      snap({ symbol: 'LINK', deviation_pct: 0.9, is_success: false, consensus_price: 100 }), // failed -> dropped
    ];
    const events = extractDeviationEvents(rows);
    expect(events.map((e) => e.symbol)).toEqual(['BTC', 'SOL']);
    expect(events[0].severity).toBe('critical');
    expect(events[1].severity).toBe('high');
  });
});

describe('calculateAnomalySummary', () => {
  it('tallies counts by severity, provider and asset', () => {
    const events = extractDeviationEvents([
      snap({ provider: 'chainlink', symbol: 'BTC', deviation_pct: 2.5, consensus_price: 100 }),
      snap({ provider: 'chainlink', symbol: 'BTC', deviation_pct: 1.2, consensus_price: 100 }),
      snap({ provider: 'supra', symbol: 'ETH', deviation_pct: 0.9, consensus_price: 100 }),
    ]);
    const summary = calculateAnomalySummary([], events);
    expect(summary.total).toBe(3);
    expect(summary.bySeverity).toEqual({ low: 0, medium: 1, high: 1, critical: 1 });
    expect(summary.byProvider['chainlink']).toBe(2);
    expect(summary.byProvider['supra']).toBe(1);
    expect(summary.byAsset['BTC']).toBe(2);
  });
});

describe('calculateCoverageMatrix', () => {
  it('builds one cell per provider:symbol with success/failed counts', () => {
    const rows = [
      snap({ provider: 'chainlink', symbol: 'BTC', is_success: true }),
      snap({ provider: 'chainlink', symbol: 'BTC', is_success: false }),
      snap({ provider: 'chainlink', symbol: 'ETH', is_success: true }),
    ];
    const cells = calculateCoverageMatrix(rows);
    expect(cells).toHaveLength(2);
    const btc = cells.find((c) => c.symbol === 'BTC')!;
    expect(btc.total).toBe(2);
    expect(btc.success).toBe(1);
    expect(btc.failed).toBe(1);
  });
});

describe('calculateFailureBreakdown', () => {
  it('reports the most frequent error message per provider:symbol group', () => {
    const rows = [
      snap({ provider: 'chainlink', symbol: 'BTC', is_success: false, error_message: 'timeout' }),
      snap({ provider: 'chainlink', symbol: 'BTC', is_success: false, error_message: 'timeout' }),
      snap({ provider: 'chainlink', symbol: 'BTC', is_success: false, error_message: 'NaN' }),
    ];
    const breakdown = calculateFailureBreakdown(rows);
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].failureCount).toBe(3);
    expect(breakdown[0].topError).toBe('timeout');
  });
});

describe('calculateStablecoinDepegSummary', () => {
  it('classifies USDC deviation >= 1% as critical and excludes normal-level deviations', () => {
    const rows = [
      snap({ symbol: 'USDC', deviation_pct: 1.2 }),
      snap({ symbol: 'USDC', deviation_pct: 0.2 }), // normal -> filtered out
      snap({ symbol: 'BTC', deviation_pct: 5 }), // not a stablecoin -> ignored
    ];
    const summary = calculateStablecoinDepegSummary(rows);
    expect(summary).toHaveLength(1);
    expect(summary[0].symbol).toBe('USDC');
    expect(summary[0].maxDeviationPercent).toBe(1.2);
    expect(summary[0].riskLevel).toBe('critical');
  });
});

describe('calculateWrappedAssetPegSummary', () => {
  it('classifies a wrapped asset deviation >= 2% as critical', () => {
    const wrappedSymbol = WRAPPED_ASSETS[0].symbol.toUpperCase();
    const rows = [snap({ symbol: wrappedSymbol, deviation_pct: 3 })];
    const summary = calculateWrappedAssetPegSummary(rows);
    expect(summary).toHaveLength(1);
    expect(summary[0].symbol).toBe(wrappedSymbol);
    expect(summary[0].riskLevel).toBe('critical');
  });

  it('returns nothing for a non-wrapped symbol', () => {
    expect(
      calculateWrappedAssetPegSummary([snap({ symbol: 'BTC', deviation_pct: 9 })])
    ).toHaveLength(0);
  });
});

describe('helpers', () => {
  it('getSeverity maps boundaries correctly', () => {
    expect(getSeverity(0.4)).toBe('low');
    expect(getSeverity(0.5)).toBe('medium');
    expect(getSeverity(0.99)).toBe('medium');
    expect(getSeverity(1)).toBe('high');
    expect(getSeverity(1.99)).toBe('high');
    expect(getSeverity(2)).toBe('critical');
  });

  it('scoreProvider weights sum to 100 (proper weighted average)', () => {
    const perfect = scoreProvider({
      provider: 'p',
      totalQueries: 24,
      successQueries: 24,
      successRate: 100,
      avgLatencyMs: 0,
      avgDeviationPct: 0,
      anomalyCount: 0,
    });
    expect(perfect).toBe(100);

    const zero = scoreProvider({
      provider: 'p',
      totalQueries: 0,
      successQueries: 0,
      successRate: 0,
      avgLatencyMs: 100000,
      avgDeviationPct: 100,
      anomalyCount: 100,
    });
    expect(zero).toBe(0);
  });
});
