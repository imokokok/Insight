import { createServiceRoleClient } from '@/lib/supabase/server';
import { loadSnapshotHistoryPage } from '@/lib/supabase/snapshotHistory';

import { getLatencyStatistics } from '../latencyService';

jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));
jest.mock('@/lib/supabase/snapshotHistory', () => ({ loadSnapshotHistoryPage: jest.fn() }));

const abortSignal = jest.fn();
const rpc = jest.fn(() => ({ abortSignal }));

beforeEach(() => {
  jest.clearAllMocks();
  rpc.mockImplementation(() => ({ abortSignal }));
  jest.mocked(createServiceRoleClient).mockReturnValue({ rpc } as never);
});

it('requests one complete database aggregate with UTC-inclusive calendar dates', async () => {
  abortSignal.mockResolvedValue({
    data: {
      rowsExamined: 5,
      sampleSize: 4,
      overall: { p50: 10, p90: 900, p95: 900, p99: 900 },
      entries: [
        {
          provider: 'chainlink',
          symbol: 'ETH',
          sampleSize: 4,
          successRate: 80,
          min: 10,
          max: 900,
          mean: 233,
          p50: 10,
          p90: 900,
          p95: 900,
          p99: 900,
        },
      ],
    },
    error: null,
  });

  const result = await getLatencyStatistics({
    from: '2026-09-18',
    to: '2026-09-19',
    provider: 'chainlink',
    symbol: 'ETH',
  });
  expect(rpc).toHaveBeenCalledWith('get_oracle_latency_statistics', {
    p_from: '2026-09-18T00:00:00.000Z',
    p_before: '2026-09-20T00:00:00.000Z',
    p_provider: 'chainlink',
    p_symbol: 'ETH',
  });
  expect(result).toMatchObject({
    sampleSize: 4,
    rowsExamined: 5,
    observationSource: 'price_snapshots',
    truncated: false,
    latencyDataAvailable: true,
    overall: { p95: 900 },
    entries: [{ successRate: 80 }],
  });
});

it('preserves an empty aggregate and rejects storage errors', async () => {
  abortSignal.mockResolvedValueOnce({
    data: { rowsExamined: 0, sampleSize: 0, overall: null, entries: [] },
    error: null,
  });
  expect(await getLatencyStatistics({ from: '2026-09-18', to: '2026-09-18' })).toMatchObject({
    latencyDataAvailable: false,
    truncated: false,
    overall: null,
  });

  abortSignal.mockResolvedValueOnce({ data: null, error: { message: 'unavailable' } });
  await expect(getLatencyStatistics({ from: '2026-09-18', to: '2026-09-18' })).rejects.toThrow(
    'Latency statistics read failed: unavailable'
  );
});

it('rejects a malformed aggregate instead of reporting incomplete statistics', async () => {
  abortSignal.mockResolvedValue({
    data: { rowsExamined: 10001, sampleSize: 10000, overall: null, entries: [] },
    error: null,
  });
  await expect(getLatencyStatistics({ from: '2026-09-18', to: '2026-09-18' })).rejects.toThrow();
});

it('keeps the old bounded hourly response when the new SQL function is not installed', async () => {
  abortSignal.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
  jest.mocked(loadSnapshotHistoryPage).mockResolvedValue([
    { provider: 'chainlink', symbol: 'ETH', latency_ms: 10, is_success: true },
    { provider: 'chainlink', symbol: 'ETH', latency_ms: 900, is_success: false },
  ] as never);
  const result = await getLatencyStatistics({ from: '2026-09-18', to: '2026-09-18' });
  expect(result).toMatchObject({
    observationSource: 'hourly_price_snapshots',
    sampleSize: 2,
    rowsExamined: 2,
    truncated: false,
    overall: { p50: 10, p95: 900 },
    entries: [{ successRate: 50 }],
  });
  expect(loadSnapshotHistoryPage).toHaveBeenCalledWith(
    expect.anything(),
    'hourly',
    '2026-09-18',
    '2026-09-19',
    expect.any(Array),
    expect.objectContaining({ limit: 10001 })
  );
});
