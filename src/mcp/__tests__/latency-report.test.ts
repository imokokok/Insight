import { getLatencyStatistics } from '@/lib/api/services/latencyService';

import { getLatencyTool } from '../tools/analysisTools';

jest.mock('@/lib/api/services/latencyService', () => ({ getLatencyStatistics: jest.fn() }));
jest.mock('@/lib/api/services/correlationService', () => ({ getCorrelationAnalysis: jest.fn() }));
jest.mock('@/lib/oracles/services/reputationService', () => ({ reputationService: {} }));
jest.mock('@/lib/oracles/utils/dynamicFeedResolver', () => ({
  getAllActiveFeedsByProvider: jest.fn(),
}));
jest.mock('@/lib/reports/anomalyAggregation', () => ({ aggregateAnomalies: jest.fn() }));

it('renders observation percentiles and warns about incomplete history instead of recomputing group means', async () => {
  (getLatencyStatistics as jest.Mock).mockResolvedValue({
    entries: [
      {
        provider: 'chainlink',
        symbol: 'ETH',
        mean: 700,
        p95: 900,
        p99: 950,
        successRate: 100,
        sampleSize: 10000,
      },
    ],
    overall: { p50: 25, p90: 50, p95: 80, p99: 900 },
    sampleSize: 10000,
    rowsExamined: 10000,
    truncated: true,
  });
  const report = await getLatencyTool.handler({ from: '2026-09-01', to: '2026-09-19' });
  expect(report).toContain('p50 25ms');
  expect(report).toContain('p95 80ms');
  expect(report).toContain('Valid latency samples: 10000');
  expect(report).toContain('truncated at 10,000 rows');
  expect(report).not.toContain('p50 700ms');
});
