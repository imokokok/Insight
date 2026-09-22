import { loadHourlySnapshotsForRange } from '../loadHourlySnapshots';

function makeClient(total: number) {
  const rows = Array.from({ length: total }, (_, index) => ({
    id: index + 1,
    snapshot_hour: '2026-09-21T00:00:00Z',
    provider: 'chainlink',
  }));
  const query = {
    gte: jest.fn(),
    lt: jest.fn(),
    order: jest.fn(),
    range: jest.fn(async (start: number, end: number) => ({
      data: rows.slice(start, end + 1),
      count: start === 0 ? total : null,
      error: null,
    })),
  };
  query.gte.mockReturnValue(query);
  query.lt.mockReturnValue(query);
  query.order.mockReturnValue(query);
  const select = jest.fn().mockReturnValue(query);
  const from = jest.fn().mockReturnValue({ select });
  return { client: { from } as never, query, select, from };
}

describe('loadHourlySnapshotsForRange', () => {
  const startAt = '2026-09-21T00:00:00Z';
  const endAt = '2026-09-22T00:00:00Z';

  it.each([0, 999, 1000, 1001, 5112])('loads all %i rows', async (total) => {
    const { client, query, select } = makeClient(total);
    const rows = await loadHourlySnapshotsForRange(client, startAt, endAt);

    expect(rows).toHaveLength(total);
    expect(query.range).toHaveBeenCalledTimes(Math.max(1, Math.ceil(total / 1000)));
    expect(query.range).toHaveBeenNthCalledWith(1, 0, 999);
    if (total > 1000) expect(query.range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(select).toHaveBeenNthCalledWith(1, expect.stringContaining('id,'), {
      count: 'exact',
    });
    expect(query.order).toHaveBeenCalledWith('id', { ascending: true });
  });

  it('fails closed when a later page errors', async () => {
    const { client, query } = makeClient(1001);
    const originalRange = query.range.getMockImplementation()!;
    query.range.mockImplementation(async (start: number, end: number) =>
      start === 1000
        ? { data: null as never, count: null, error: { message: 'network failed' } }
        : originalRange(start, end)
    );
    await expect(loadHourlySnapshotsForRange(client, startAt, endAt)).rejects.toThrow(
      'network failed'
    );
  });

  it('fails closed when the server silently caps a page below 1000', async () => {
    const { client, query } = makeClient(2000);
    query.range.mockResolvedValueOnce({
      data: Array.from({ length: 500 }, (_, index) => ({
        id: index,
        snapshot_hour: startAt,
        provider: 'chainlink',
      })),
      count: 2000,
      error: null,
    });
    await expect(loadHourlySnapshotsForRange(client, startAt, endAt)).rejects.toThrow(
      'Incomplete hourly snapshots'
    );
  });

  it('rejects duplicate rows caused by a moving page boundary', async () => {
    const { client, query } = makeClient(1001);
    query.range.mockResolvedValueOnce({
      data: Array.from({ length: 1000 }, () => ({
        id: 1,
        snapshot_hour: startAt,
        provider: 'chainlink',
      })),
      count: 1001,
      error: null,
    });
    await expect(loadHourlySnapshotsForRange(client, startAt, endAt)).rejects.toThrow(
      'duplicate ID'
    );
  });

  it('rejects a missing exact count', async () => {
    const { client, query } = makeClient(1);
    query.range.mockResolvedValueOnce({ data: [], count: null, error: null });
    await expect(loadHourlySnapshotsForRange(client, startAt, endAt)).rejects.toThrow(
      'valid exact count'
    );
  });
});
