/** @jest-environment node */
import { getTursoOpsClient } from '@/lib/turso/ops/client';
import {
  loadTursoHourlyHistoryPage,
  readTursoHourlyHistoryReadCutoverMs,
  readTursoPriceProjectionMode,
} from '@/lib/turso/ops/hourlyPriceProjectionRepository';
import {
  getTursoPriceClient,
  readTursoPriceReadCutoverMs,
  readTursoPriceWriteMode,
} from '@/lib/turso/price/client';
import { loadTursoPriceHistoryPage } from '@/lib/turso/price/historyRepository';

import { loadSnapshotHistoryPage } from '../snapshotHistory';

jest.mock('@/lib/turso/price/client', () => ({
  getTursoPriceClient: jest.fn(),
  readTursoPriceReadCutoverMs: jest.fn(),
  readTursoPriceWriteMode: jest.fn(),
}));
jest.mock('@/lib/turso/price/historyRepository', () => ({
  loadTursoPriceHistoryPage: jest.fn(),
}));
jest.mock('@/lib/turso/ops/hourlyPriceProjectionRepository', () => ({
  loadTursoHourlyHistoryPage: jest.fn(),
  readTursoHourlyHistoryReadCutoverMs: jest.fn(),
  readTursoPriceProjectionMode: jest.fn(),
}));
jest.mock('@/lib/turso/ops/client', () => ({ getTursoOpsClient: jest.fn(() => ({})) }));
jest.mock('@/lib/turso/ops/schema', () => ({ ensureTursoOpsSchema: jest.fn() }));

const mockedMode = jest.mocked(readTursoPriceWriteMode);
const mockedCutover = jest.mocked(readTursoPriceReadCutoverMs);
const mockedClient = jest.mocked(getTursoPriceClient);
const mockedTursoHistory = jest.mocked(loadTursoPriceHistoryPage);
const mockedHourlyCutover = jest.mocked(readTursoHourlyHistoryReadCutoverMs);
const mockedProjectionMode = jest.mocked(readTursoPriceProjectionMode);
const mockedTursoHourlyHistory = jest.mocked(loadTursoHourlyHistoryPage);
const mockedOpsClient = jest.mocked(getTursoOpsClient);

const from = '2026-09-01T00:00:00.000Z';
const cutover = '2026-09-02T00:00:00.000Z';
const before = '2026-09-03T00:00:00.000Z';
const hourlyCutover = Date.parse('2026-11-10T00:00:00.000Z');

const legacyRow = {
  id: 7,
  snapshot_ts: '2026-09-01T23:45:00.000Z',
  provider: 'dia',
  symbol: 'ETH',
  chain_id: 1,
  price: 2_000,
};
const tursoRow = {
  ...legacyRow,
  id: 1_800_000_000_000_001,
  snapshot_ts: '2026-09-02T00:00:00.000Z',
  price: 2_001,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedMode.mockReturnValue('primary');
  mockedCutover.mockReturnValue(Date.parse(cutover));
  mockedClient.mockReturnValue({} as never);
  mockedTursoHistory.mockResolvedValue([tursoRow]);
  mockedProjectionMode.mockReturnValue('turso');
  mockedHourlyCutover.mockReturnValue(hourlyCutover);
  mockedOpsClient.mockReturnValue({} as never);
  mockedTursoHourlyHistory.mockResolvedValue([
    {
      ...legacyRow,
      id: 18,
      snapshot_hour: '2026-11-10T00:00:00.000Z',
      is_success: true,
    },
  ] as never);
});

it('routes hourly history after the archived cutover to Turso', async () => {
  const rpc = jest.fn(() => ({ abortSignal: jest.fn() }));
  const rows = await loadSnapshotHistoryPage(
    { rpc } as never,
    'hourly',
    '2026-11-10T00:00:00.000Z',
    '2026-11-11T00:00:00.000Z',
    ['price'],
    { ascending: true }
  );

  expect(rows).toEqual([{ price: 2_000 }]);
  expect(rpc).not.toHaveBeenCalled();
  expect(mockedTursoHourlyHistory).toHaveBeenCalledWith(
    expect.anything(),
    hourlyCutover,
    Date.parse('2026-11-11T00:00:00.000Z'),
    expect.arrayContaining(['snapshot_hour', 'price']),
    expect.objectContaining({ ascending: true, offset: 0 })
  );
});

it('keeps hourly archive reads in Supabase and combines the cutover in order', async () => {
  const archiveRow = {
    ...legacyRow,
    snapshot_hour: '2026-11-09T23:00:00.000Z',
    is_success: true,
  };
  const abortSignal = jest.fn().mockResolvedValue({ data: [archiveRow], error: null });
  const rpc = jest.fn(() => ({ abortSignal }));
  const rows = await loadSnapshotHistoryPage(
    { rpc } as never,
    'hourly',
    '2026-11-09T00:00:00.000Z',
    '2026-11-11T00:00:00.000Z',
    ['price'],
    { ascending: true }
  );

  expect(rows).toEqual([{ price: 2_000 }, { price: 2_000 }]);
  expect(rpc).toHaveBeenCalledWith(
    'get_snapshot_history_page',
    expect.objectContaining({ p_kind: 'hourly', p_before: '2026-11-10T00:00:00.000Z' })
  );
  expect(mockedTursoHourlyHistory).toHaveBeenCalledWith(
    expect.anything(),
    hourlyCutover,
    Date.parse('2026-11-11T00:00:00.000Z'),
    expect.arrayContaining(['snapshot_hour', 'price']),
    expect.objectContaining({ ascending: true })
  );
});

it('falls back to Supabase when the hourly cutover is absent or malformed', async () => {
  mockedHourlyCutover.mockReturnValue(undefined);
  const abortSignal = jest.fn().mockResolvedValue({ data: [], error: null });
  const rpc = jest.fn(() => ({ abortSignal }));
  await loadSnapshotHistoryPage({ rpc } as never, 'hourly', from, before, ['price']);
  expect(rpc).toHaveBeenCalled();
  expect(mockedTursoHourlyHistory).not.toHaveBeenCalled();
});

it('merges legacy and Turso price ranges at the recorded cutover', async () => {
  const abortSignal = jest.fn().mockResolvedValue({ data: [legacyRow], error: null });
  const rpc = jest.fn(() => ({ abortSignal }));
  const rows = await loadSnapshotHistoryPage({ rpc } as never, 'price', from, before, ['price'], {
    ascending: true,
  });

  expect(rows).toEqual([{ price: 2_000 }, { price: 2_001 }]);
  expect(rpc).toHaveBeenCalledWith(
    'get_snapshot_history_page',
    expect.objectContaining({ p_before: cutover, p_inclusive_before: false })
  );
  expect(mockedTursoHistory).toHaveBeenCalledWith(
    expect.anything(),
    Date.parse(cutover),
    Date.parse(before),
    expect.objectContaining({ ascending: true })
  );
});
