import { OracleProvider } from '@/types/oracle';

import { PerformanceMetricsCalculator } from './performanceMetricsCalculator';

describe('PerformanceMetricsCalculator', () => {
  it('counts repeated polls of one oracle timestamp as a single feed update', () => {
    const calculator = new PerformanceMetricsCalculator({
      minSampleSize: 1,
      updateFrequencyWindowMs: 60_000,
    });
    const now = Date.now();
    const firstTimestamp = now - 10_000;
    const secondTimestamp = now - 2_000;

    for (let index = 0; index < 6; index++) {
      calculator.addPriceData(
        OracleProvider.CHAINLINK,
        'ETH',
        {
          provider: OracleProvider.CHAINLINK,
          symbol: 'ETH',
          price: 2_000,
          timestamp: firstTimestamp,
        },
        100,
        true
      );
    }
    calculator.addPriceData(
      OracleProvider.CHAINLINK,
      'ETH',
      {
        provider: OracleProvider.CHAINLINK,
        symbol: 'ETH',
        price: 2_001,
        timestamp: secondTimestamp,
      },
      100,
      true
    );

    const metrics = calculator.calculateAllMetrics(OracleProvider.CHAINLINK, 'ETH', new Map());

    expect(metrics.updateFrequency).toBe(8);
  });
});
