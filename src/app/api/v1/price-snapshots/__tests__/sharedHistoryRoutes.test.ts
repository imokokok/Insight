/** @jest-environment node */
import { NextRequest } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { loadSnapshotHistoryPage } from '@/lib/supabase/snapshotHistory';

import { GET as getHourlySnapshots } from '../../hourly-snapshots/route';
import { GET as getPriceSnapshots } from '../route';

jest.mock('@/lib/api/handler', () => {
  const actual = jest.requireActual('@/lib/api/handler');
  return {
    ...actual,
    createApiHandler: (handler: unknown) => handler,
    createOptionsHandler: () => () => new Response(null, { status: 204 }),
  };
});
jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));
jest.mock('@/lib/supabase/snapshotHistory', () => ({ loadSnapshotHistoryPage: jest.fn() }));

const mockClient = createServiceRoleClient as jest.MockedFunction<typeof createServiceRoleClient>;
const mockPage = loadSnapshotHistoryPage as jest.MockedFunction<typeof loadSnapshotHistoryPage>;
const query = {
  symbol: 'ETH',
  provider: 'chainlink',
  chainId: 1,
  from: '2026-09-01',
  to: '2026-09-02',
  limit: 25,
  offset: 5,
};

async function callRoute(get: typeof getPriceSnapshots) {
  return (get as unknown as (request: NextRequest, context: unknown) => Promise<Response>)(
    new NextRequest('https://test/api/v1/price-snapshots'),
    { requestId: 'snapshot-test', validated: { query } }
  );
}

beforeEach(() => {
  mockClient.mockReturnValue({} as never);
  mockPage.mockResolvedValue([{ snapshot_hour: '2026-09-01T00:00:00Z' }] as never);
});

it.each([
  ['price', getPriceSnapshots, '15min', true],
  ['hourly', getHourlySnapshots, undefined, false],
] as const)(
  '%s retains its historical response and query grain',
  async (kind, route, grain, ts) => {
    const response = await callRoute(route);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      from: query.from,
      to: query.to,
      count: 1,
      snapshots: [{ snapshot_hour: '2026-09-01T00:00:00Z' }],
    });
    expect(body.data.grain).toBe(grain);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=300');
    expect(mockPage).toHaveBeenCalledWith(
      expect.anything(),
      kind,
      '2026-09-01',
      '2026-09-03',
      expect.arrayContaining(ts ? ['snapshot_ts'] : ['snapshot_hour']),
      { providers: ['chainlink'], symbol: 'ETH', chainId: 1, limit: 25, offset: 5 }
    );
    if (!ts) expect(mockPage.mock.calls[0][4]).not.toContain('snapshot_ts');
  }
);

it.each([
  ['price', getPriceSnapshots, 'Failed to fetch price snapshots'],
  ['hourly', getHourlySnapshots, 'Failed to fetch hourly snapshots'],
] as const)('%s keeps its endpoint-specific failure message', async (_kind, route, message) => {
  mockPage.mockRejectedValue(new Error('database down'));
  const response = await callRoute(route);
  const body = await response.json();

  expect(response.status).toBe(500);
  expect(body.error.code).toBe('INTERNAL_ERROR');
  expect(body.error.message).toBe(message);
});
