/** @jest-environment node */
import {
  loadSnapshotHistoryPage,
  loadSnapshotHistoryRange,
  loadSnapshotUptime,
} from '../snapshotHistory';

const from = '2026-09-01T00:00:00Z';
const before = '2026-09-03T00:00:00Z';
const point = {
  id: 1,
  snapshot_hour: '2026-09-02T00:00:00Z',
  provider: 'dia',
  symbol: 'ETH',
  chain_id: 1,
  price: 100,
  is_success: false,
};
function client(pages: unknown[], error: unknown = null) {
  const abortSignal = jest.fn();
  for (const data of pages) abortSignal.mockResolvedValueOnce({ data, error });
  const rpc = jest.fn(() => ({ abortSignal }));
  return { db: { rpc } as never, rpc };
}
it('preserves failed evidence and verifies mandatory identity without adding response fields', async () => {
  const { db, rpc } = client([[point]]);
  expect(
    await loadSnapshotHistoryPage(db, 'hourly', from, before, ['price', 'is_success'], {
      limit: 2000,
    })
  ).toEqual([{ price: 100, is_success: false }]);
  expect(rpc).toHaveBeenCalledWith(
    'get_snapshot_history_page',
    expect.objectContaining({
      p_limit: 2000,
      p_columns: expect.arrayContaining(['id', 'snapshot_hour', 'provider', 'symbol', 'chain_id']),
    })
  );
});
it.each([
  [{ ...point, price: '100' }],
  [{ ...point, snapshot_hour: before }],
  [{ ...point, id: '1' }],
  [{ ...point, snapshot_hour: 'bad' }],
  [point, point],
  [point, { ...point, id: 2 }],
])('fails closed on invalid or duplicated evidence: %j', async (rows) => {
  const { db } = client([rows]);
  await expect(loadSnapshotHistoryPage(db, 'hourly', from, before, ['price'])).rejects.toThrow();
});
it('does not treat a null response or database failure as empty history', async () => {
  await expect(
    loadSnapshotHistoryPage(client([null]).db, 'hourly', from, before, ['price'])
  ).rejects.toThrow();
  await expect(
    loadSnapshotHistoryPage(client([[]], { message: 'unavailable' }).db, 'hourly', from, before, [
      'price',
    ])
  ).rejects.toThrow('unavailable');
});
it('reads a genuine 10,000-row scalar page before continuing and honors an explicit endpoint', async () => {
  const first = Array.from({ length: 10000 }, (_, i) => ({ ...point, id: 10001 - i }));
  const { db, rpc } = client([first, [point]]);
  expect(await loadSnapshotHistoryRange(db, 'hourly', from, before, ['price'])).toHaveLength(10001);
  expect(rpc.mock.calls[1]).toEqual([
    'get_snapshot_history_page',
    expect.objectContaining({ p_offset: 10000 }),
  ]);
  const endpoint = client([[{ ...point, snapshot_hour: before }]]);
  expect(
    await loadSnapshotHistoryPage(endpoint.db, 'hourly', from, before, ['price'], {
      inclusiveBefore: true,
    })
  ).toEqual([{ price: 100 }]);
});
it('rejects wrong feed identity, chain or successful-only evidence', async () => {
  for (const options of [
    { providers: ['pyth'] },
    { symbol: 'BTC' },
    { chainId: 0 },
    { successOnly: true },
  ]) {
    await expect(
      loadSnapshotHistoryPage(client([[point]]).db, 'hourly', from, before, ['price'], options)
    ).rejects.toThrow();
  }
});
it('validates uptime counts and rejects inconsistent or duplicated groups', async () => {
  const group = { provider: 'dia', symbol: 'ETH', snapshots: 2000, successes: 1900, hours: 48 };
  expect(await loadSnapshotUptime(client([[group]]).db, from, before, 'dia', 'ETH')).toEqual([
    group,
  ]);
  for (const rows of [
    [{ ...group, successes: 2001 }],
    [group, group],
    [{ ...group, provider: 'pyth' }],
  ]) {
    await expect(loadSnapshotUptime(client([rows]).db, from, before, 'dia')).rejects.toThrow();
  }
});
