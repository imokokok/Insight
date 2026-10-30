/** @jest-environment node */
import {
  getTursoPriceClient,
  readTursoPriceReadCutoverMs,
  readTursoPriceWriteMode,
} from '@/lib/turso/price/client';
import { loadTursoPriceHistoryPage } from '@/lib/turso/price/historyRepository';

jest.mock('@/lib/turso/price/client', () => ({
  getTursoPriceClient: jest.fn(),
  readTursoPriceReadCutoverMs: jest.fn(),
  readTursoPriceWriteMode: jest.fn(),
}));
jest.mock('@/lib/turso/price/historyRepository', () => ({
  loadTursoPriceHistoryPage: jest.fn(),
}));

import { loadSnapshotHistoryPage } from '../snapshotHistory';

const mockedMode = jest.mocked(readTursoPriceWriteMode);
const mockedCutover = jest.mocked(readTursoPriceReadCutoverMs);
const mockedClient = jest.mocked(getTursoPriceClient);
const mockedTursoHistory = jest.mocked(loadTursoPriceHistoryPage);

const from = '2026-09-01T00:00:00.000Z';
const cutover = '2026-09-02T00:00:00.000Z';
const before = '2026-09-03T00:00:00.000Z';

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
