import { loadSnapshotHistoryPage } from '@/lib/supabase/snapshotHistory';

import { getLatencyStatistics } from '../latencyService';

jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));
jest.mock('@/lib/supabase/snapshotHistory', () => ({ loadSnapshotHistoryPage: jest.fn() }));

function database(rows: Array<Record<string, unknown>>) {
  jest.mocked(loadSnapshotHistoryPage).mockResolvedValue(rows as never);
}

const row = (latency: number | null, provider = 'chainlink') => ({
  provider,
  symbol: 'ETH',
  latency_ms: latency,
  is_success: true,
  snapshot_hour: '2026-09-19',
});

it('weights each observation rather than each provider mean and reports real sample counts', async () => {
  database([...Array.from({ length: 99 }, () => row(10)), row(10000, 'api3'), row(null)]);
  const result = await getLatencyStatistics({ from: '2026-09-18', to: '2026-09-19' });
  expect(result.overall).toEqual({ p50: 10, p90: 10, p95: 10, p99: 10 });
  expect(result.sampleSize).toBe(100);
  expect(result.rowsExamined).toBe(101);
  expect(result.truncated).toBe(false);
});

it('reads past the default database page and includes slow observations in later pages', async () => {
  database([
    ...Array.from({ length: 1000 }, () => row(10)),
    ...Array.from({ length: 100 }, () => row(9000)),
  ]);
  const result = await getLatencyStatistics({ from: '2026-09-18', to: '2026-09-19' });
  expect(loadSnapshotHistoryPage).toHaveBeenLastCalledWith(
    undefined,
    'hourly',
    '2026-09-18',
    '2026-09-20',
    expect.any(Array),
    expect.objectContaining({ limit: 10001, ascending: true })
  );
  expect(result.overall?.p95).toBe(9000);
  expect(result.sampleSize).toBe(1100);
});

it('marks capped results as incomplete and ignores invalid latency values', async () => {
  database(Array.from({ length: 10001 }, () => row(10)));
  expect((await getLatencyStatistics({ from: '2026-09-18', to: '2026-09-19' })).truncated).toBe(
    true
  );
  database([row(-1), row(Number.NaN), row(null)]);
  const result = await getLatencyStatistics({ from: '2026-09-18', to: '2026-09-19' });
  expect(result.overall).toBeNull();
  expect(result.sampleSize).toBe(0);
});
