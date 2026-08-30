import {
  computeMarketDivergencePct,
  getMarketReference,
  MAX_REF_AGE_HOURS,
  resetMarketReferenceCacheForTests,
} from '@/lib/marketReference/client';
import { createServiceRoleClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

type Result = { data: unknown; error: unknown };

function makeChain(result: Result) {
  const api: Record<string, (...args: unknown[]) => unknown> = {};
  const thenable = Promise.resolve(result);
  for (const m of ['select', 'eq', 'gt', 'lt', 'lte', 'is', 'not', 'gte', 'order', 'limit']) {
    api[m] = () => api;
  }
  api.then = (resolve: (v: Result) => void, reject?: (e: unknown) => void) =>
    thenable.then(resolve, reject);
  return api;
}

function refRow(symbol: string, refHourIso: string, refPrice: number, exchangeCount = 2) {
  return {
    symbol,
    ref_hour: refHourIso,
    ref_price: refPrice,
    exchange_count: exchangeCount,
    cross_exchange_spread_pct: 0.05,
  };
}

describe('marketReference client', () => {
  beforeEach(() => {
    resetMarketReferenceCacheForTests();
    jest.clearAllMocks();
  });

  it('returns the latest reference when fresh', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () =>
        makeChain({
          data: [refRow('ETH', new Date().toISOString(), 3000)],
          error: null,
        }),
    } as never);

    const ref = await getMarketReference('ETH');
    expect(ref).not.toBeNull();
    expect(ref!.refPrice).toBe(3000);
    expect(ref!.exchangeCount).toBe(2);
  });

  it('fail-closes a stale rollup row (>= MAX_REF_AGE_HOURS old) as absent', async () => {
    const staleHour = new Date(Date.now() - (MAX_REF_AGE_HOURS + 1) * 3600_000).toISOString();
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () => makeChain({ data: [refRow('ETH', staleHour, 3000)], error: null }),
    } as never);

    expect(await getMarketReference('ETH')).toBeNull();
  });

  it('returns null when the rollup is empty, errored, or has no usable price', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () => makeChain({ data: [], error: null }),
    } as never);
    expect(await getMarketReference('BTC')).toBeNull();

    mockedCreateServiceRoleClient.mockReturnValue({
      from: () => makeChain({ data: null, error: { message: 'boom' } }),
    } as never);
    expect(await getMarketReference('BTC')).toBeNull();
  });

  it('computes oracle-vs-market divergence in percent, null without a reference', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () =>
        makeChain({
          data: [refRow('ETH', new Date().toISOString(), 3000)],
          error: null,
        }),
    } as never);

    // consensus 3060 vs ref 3000 → 2%
    expect(await computeMarketDivergencePct('ETH', 3060)).toBeCloseTo(2, 4);
    // consensus exactly at reference → 0 (a real zero-divergence signal)
    expect(await computeMarketDivergencePct('ETH', 3000)).toBe(0);
    // unusable consensus → null, never a zero fill
    expect(await computeMarketDivergencePct('ETH', null)).toBeNull();
    expect(await computeMarketDivergencePct('ETH', 0)).toBeNull();
  });
});
