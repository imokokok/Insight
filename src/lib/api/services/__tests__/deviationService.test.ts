import { aggregateDeviationProviders } from '../deviationService';

it('aggregates signed deviations by absolute size while counting failed snapshots', () => {
  const rows = [
    { provider: 'chainlink', deviation_pct: -2, latency_ms: 100, is_success: true },
    { provider: 'chainlink', deviation_pct: 1, latency_ms: 101, is_success: true },
    { provider: 'chainlink', deviation_pct: null, latency_ms: null, is_success: false },
    { provider: 'pyth', deviation_pct: 0.5, latency_ms: 33, is_success: true },
  ];
  expect(aggregateDeviationProviders(rows as never)).toEqual([
    {
      provider: 'chainlink',
      snapshots: 3,
      avgDeviationPct: 1.5,
      maxDeviationPct: 2,
      avgLatencyMs: 101,
      successRate: (2 / 3) * 100,
    },
    {
      provider: 'pyth',
      snapshots: 1,
      avgDeviationPct: 0.5,
      maxDeviationPct: 0.5,
      avgLatencyMs: 33,
      successRate: 100,
    },
  ]);
});
