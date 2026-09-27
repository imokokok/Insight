/** @jest-environment node */
import { createHash } from 'node:crypto';

import { loadArchivedSnapshots } from '../snapshotArchives';

const point = {
  id: 1,
  snapshot_hour: '2026-09-10T00:00:00+00:00',
  provider: 'dia',
  symbol: 'ETH',
  chain_id: 1,
  price: 100,
  consensus_price: 100,
  deviation_pct: null,
  latency_ms: 12,
  data_age_seconds: null,
  confidence: null,
  is_success: false,
  error_message: '保留失败记录',
};
function chunk() {
  const payload = JSON.stringify([point]);
  return {
    archive_id: 1,
    kind: 'hourly',
    archive_day: '2026-09-10',
    provider: 'dia',
    symbol: 'ETH',
    chain_id: 1,
    row_count: 1,
    checksum: createHash('sha256').update(payload).digest('hex'),
    payload,
  };
}
function client(pages: unknown[][]) {
  const abortSignal = jest.fn();
  for (const data of pages) abortSignal.mockResolvedValueOnce({ data, error: null });
  const builder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    abortSignal,
  };
  return { db: { from: () => builder } as never, builder };
}
const start = '2026-09-10T00:00:00Z';
const end = '2026-09-11T00:00:00Z';
it('reads until an empty page, verifies evidence and preserves failed observations', async () => {
  const { db, builder } = client([[chunk()], []]);
  expect(await loadArchivedSnapshots(db, 'hourly', start, end)).toEqual([point]);
  expect(builder.gt.mock.calls).toEqual([
    ['archive_id', 0],
    ['archive_id', 1],
  ]);
  expect(builder.abortSignal).toHaveBeenCalledTimes(2);
});
it.each([
  { checksum: '0'.repeat(64) },
  { row_count: 2 },
  { provider: 'api3' },
  { archive_day: '2026-09-09' },
  { kind: 'price' },
])('rejects corrupt or misattributed chunks: %j', async (override) => {
  const { db } = client([[{ ...chunk(), ...override }]]);
  await expect(loadArchivedSnapshots(db, 'hourly', start, end)).rejects.toThrow();
});
it('fails closed when the archive cursor does not advance', async () => {
  const { db } = client([[chunk()], [chunk()]]);
  await expect(loadArchivedSnapshots(db, 'hourly', start, end)).rejects.toThrow('cursor');
});
