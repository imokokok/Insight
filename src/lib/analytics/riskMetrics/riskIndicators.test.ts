import { calculateFreshnessRisk } from './riskIndicators';

describe('calculateFreshnessRisk', () => {
  it('uses provider-reported data age instead of local ingestion time', () => {
    const now = Date.now();
    const result = calculateFreshnessRisk({
      currentTime: now,
      oracleTimestamps: [
        {
          name: 'chainlink',
          timestamp: now,
          dataAgeSeconds: 180,
        },
      ],
    });

    expect(result.staleOracleCount).toBe(1);
    expect(result.maxStalenessSeconds).toBe(180);
    expect(result.level).toBe('critical');
  });

  it('treats a missing source timestamp as stale rather than fresh', () => {
    const now = 1_800_000_000_000;
    const result = calculateFreshnessRisk({
      currentTime: now,
      oracleTimestamps: [{ name: 'unknown', timestamp: 0 }],
    });

    expect(result.staleOracleCount).toBe(1);
    expect(result.maxStalenessSeconds).toBe(now / 1000);
    expect(result.score).toBe(100);
  });
});
