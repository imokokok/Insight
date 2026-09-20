/** Offline lifecycle regressions: real collectors and clients, simulated upstream and DB. */
import { runFeedSync } from '@/app/api/cron/sync-feeds/runner';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { API3Client } from '@/lib/oracles/clients/api3';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { api3NetworkService } from '@/lib/oracles/services/api3NetworkService';
import { feedDiscoveryService } from '@/lib/oracles/services/feedDiscovery';
import {
  getActiveFeedsMap,
  getAllActiveFeedsByProvider,
} from '@/lib/oracles/utils/dynamicFeedResolver';
import { type OracleFeed, DatabaseQueries } from '@/lib/supabase/queries';
import { createServiceRoleClient, getAdminQueries } from '@/lib/supabase/server';

import { collectSnapshot } from '../snapshotCollector';

jest.mock('@/lib/oracles/factory');
jest.mock('@/lib/oracles/services/api3NetworkService');
jest.mock('@/lib/oracles/services/feedDiscovery');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/oracles/utils/dynamicFeedResolver', () => ({
  getActiveFeedsMap: jest.fn(),
  getAllActiveFeedsByProvider: jest.fn(),
  invalidateAllFeedsCache: jest.fn(),
  matchesChainId: (feed: { chain_id: number }, chainId: number) =>
    feed.chain_id === 0 || feed.chain_id === chainId,
}));
jest.mock('@/lib/oracles/utils/storage', () => ({
  shouldUseDatabase: () => false,
  savePriceToDatabase: () => Promise.resolve(true),
}));
jest.mock('@/lib/reports/reportService', () => ({
  ...jest.requireActual('@/lib/reports/constants'),
  reportService: { upsertHourlySnapshots: () => Promise.resolve(1) },
}));

const feed = (symbol: string): OracleFeed => ({
  id: symbol,
  provider: 'redstone',
  symbol,
  chain_id: 0,
  address: symbol,
  name: symbol,
  decimals: 8,
  category: 'crypto',
  metadata: null,
  is_active: true,
  source: 'redstone-api',
});
const price = (symbol: string) => ({
  provider: 'redstone',
  symbol,
  price: 100,
  timestamp: Date.now(),
  chain: 'ethereum',
});

function setup(feeds = [feed('ETH')]) {
  const getPrice = jest.fn();
  (getDefaultFactory as jest.Mock).mockReturnValue({
    getClient: () => ({
      getPrice,
      isSymbolSupported: () => false,
      getDefaultChain: () => 'ethereum',
      getSupportedSymbols: () => [],
    }),
  });
  (getActiveFeedsMap as jest.Mock).mockResolvedValue(new Map(feeds.map((f) => [f.symbol, f])));
  (getAllActiveFeedsByProvider as jest.Mock).mockResolvedValue(new Map([['redstone', feeds]]));
  const admin = {
    updateFeedHealth: jest.fn().mockResolvedValue(undefined),
    batchUpdateFeedHealth: jest.fn().mockResolvedValue({ updated: 1 }),
    deactivateStaleFeeds: jest.fn().mockResolvedValue(0),
    getOracleFeeds: jest.fn().mockResolvedValue([]),
    markFeedReactivationAttempts: jest.fn().mockResolvedValue(undefined),
  };
  (getAdminQueries as jest.Mock).mockReturnValue(admin);
  return { getPrice, admin };
}

it('health-checks non-report feeds on each selected round without adding report rows', async () => {
  const { getPrice, admin } = setup([feed('ETH'), feed('HYPE')]);
  getPrice.mockRejectedValue(new Error('upstream unavailable'));
  for (let i = 0; i < 3; i++) {
    const result = await collectSnapshot();
    expect(result.inputs.map((r) => r.symbol)).toEqual(['ETH']);
  }
  expect(getPrice.mock.calls.map((c) => c[0])).toEqual([
    'ETH',
    'HYPE',
    'ETH',
    'HYPE',
    'ETH',
    'HYPE',
  ]);
  expect(
    admin.batchUpdateFeedHealth.mock.calls.every(([updates]) =>
      updates.some(
        (u: { symbol: string; isSuccess: boolean }) => u.symbol === 'HYPE' && !u.isSuccess
      )
    )
  ).toBe(true);
});

it('resets live failure streaks on successful upstream reads', async () => {
  const { getPrice, admin } = setup([feed('HYPE')]);
  let failures = 0;
  admin.updateFeedHealth.mockImplementation(async (_p, _s, _c, success) => {
    failures = success ? 0 : failures + 1;
  });
  for (const ok of [false, true, false, true, false]) {
    if (ok) getPrice.mockResolvedValue(price('HYPE'));
    else getPrice.mockRejectedValue(new Error('transient failure'));
    await fetchPriceWithDatabase('redstone', 'HYPE', undefined, false).catch(() => undefined);
    await Promise.resolve();
  }
  expect(failures).toBe(1);
  expect(admin.updateFeedHealth.mock.calls.map((c) => c[3])).toEqual([
    false,
    true,
    false,
    true,
    false,
  ]);
});

it('keeps rediscovered recovered feeds active and clears prior health failures', async () => {
  const { admin } = setup();
  const row = {
    ...feed('ETH'),
    is_active: false,
    consecutive_failures: 3,
    deactivated_reason: 'health_failed',
  };
  (feedDiscoveryService.discoverAll as jest.Mock).mockResolvedValue([
    {
      provider: 'redstone',
      discovered: 1,
      errors: [],
      feeds: [{ ...feed('ETH'), metadata: { preverified: true, discoveredTimestamp: Date.now() } }],
    },
  ]);
  (createServiceRoleClient as jest.Mock).mockReturnValue({
    from: () => ({
      upsert: (rows: object[]) => {
        Object.assign(row, rows[0]);
        return { select: async () => ({ data: [row], error: null }) };
      },
    }),
  });
  admin.deactivateStaleFeeds.mockImplementation(async (threshold) => {
    if (row.is_active && row.consecutive_failures >= threshold) {
      row.is_active = false;
      return 1;
    }
    return 0;
  });
  const result = await runFeedSync('discover', 'redstone');
  expect(result.status).toBe(200);
  expect(row.is_active).toBe(true);
  expect(row.consecutive_failures).toBe(0);
  expect(row.deactivated_reason).toBeNull();
  expect(
    (result.body.results as Array<{ verified: number; healthDeactivated: number }>)[0]
  ).toMatchObject({ verified: 1, healthDeactivated: 0 });
});

it('records an expired API3 price as failed, consistently with discovery', async () => {
  const { admin } = setup();
  const api3Feed = { ...feed('ETH/USD'), provider: 'api3', chain_id: 1, address: 'ETH/USD' };
  (getActiveFeedsMap as jest.Mock).mockResolvedValue(new Map([['ETH/USD', api3Feed]]));
  (getAllActiveFeedsByProvider as jest.Mock).mockResolvedValue(new Map([['api3', [api3Feed]]]));
  (api3NetworkService.getPrice as jest.Mock).mockResolvedValue({
    price: 100,
    timestamp: Date.now() - 90 * 86400000,
    dataAge: 90 * 86400,
    confidence: 0.98,
    decimals: 18,
    dapiName: 'ETH/USD',
    source: 'api3-dapi-ethereum',
  });
  const api3 = new API3Client();
  (getDefaultFactory as jest.Mock).mockReturnValue({
    getClient: (p: string) => (p === 'api3' ? api3 : { isSymbolSupported: () => false }),
  });
  const result = await collectSnapshot();
  expect(result.inputs[0].isSuccess).toBe(false);
  expect(admin.batchUpdateFeedHealth.mock.calls[0][0][0].isSuccess).toBe(false);
  // Weekly discovery rejects this same stale response but does not apply its
  // failed verification to an existing row, since its key is still discovered.
  admin.getOracleFeeds.mockResolvedValue([api3Feed]);
  (feedDiscoveryService.discoverAll as jest.Mock).mockResolvedValue([
    { provider: 'api3', discovered: 1, errors: [], feeds: [api3Feed] },
  ]);
  const discovery = await runFeedSync('discover', 'api3');
  expect((discovery.body.results as object[])[0]).toMatchObject({
    verified: 0,
    verifiedFailed: 1,
    pruned: 0,
  });
  expect(admin.updateFeedHealth).not.toHaveBeenCalled();
});

it('rotates bounded health batches through all non-report feeds', async () => {
  const feeds = Array.from({ length: 205 }, (_, i) => feed(`ASSET${i}`));
  const { getPrice, admin } = setup(feeds);
  getPrice.mockRejectedValue(new Error('upstream unavailable'));
  admin.batchUpdateFeedHealth.mockImplementation(async (updates: Array<{ symbol: string }>) => {
    for (const update of updates) {
      const row = feeds.find((f) => f.symbol === update.symbol)!;
      row.last_failure_at = new Date().toISOString();
    }
    return { updated: updates.length };
  });
  for (let i = 0; i < 3; i++) {
    getPrice.mockClear();
    const result = await collectSnapshot();
    expect(getPrice.mock.calls.length).toBeLessThanOrEqual(100);
    expect(result.inputs).toEqual([]);
  }
  expect(feeds.every((f) => f.last_failure_at)).toBe(true);
});

it('leaves forced snapshot outcomes to the batch updater without double-counting', async () => {
  const { getPrice, admin } = setup();
  getPrice.mockRejectedValue(new Error('failed probe'));
  await fetchPriceWithDatabase('redstone', 'ETH', undefined, false, true).catch(() => undefined);
  getPrice.mockResolvedValue(price('ETH'));
  await fetchPriceWithDatabase('redstone', 'ETH', undefined, false, true);
  expect(admin.updateFeedHealth).not.toHaveBeenCalled();
});

it('rotates failed recovery probes so a recovered row beyond the first 200 is reached', async () => {
  const { getPrice, admin } = setup();
  const rows: OracleFeed[] = Array.from({ length: 201 }, (_, i) => ({
    ...feed(i === 200 ? 'RECOVERED' : `DEAD${i}`),
    is_active: false,
    consecutive_failures: 3,
    updated_at: new Date(Date.now() - (201 - i) * 1000).toISOString(),
    last_failure_at: new Date(Date.now() - i * 1000).toISOString(),
  }));
  // Execute the real query methods against a stateful Supabase-shaped store.
  const client = {
    from: () => {
      const filters: Array<(row: OracleFeed) => boolean> = [];
      const orders: Array<{ key: keyof OracleFeed; ascending: boolean }> = [];
      let count = Infinity;
      let update: Partial<OracleFeed> | undefined;
      const chain = {
        select() {
          return chain;
        },
        update(payload: Partial<OracleFeed>) {
          update = payload;
          return chain;
        },
        eq(key: keyof OracleFeed, value: unknown) {
          filters.push((row) => row[key] === value);
          return chain;
        },
        in(key: keyof OracleFeed, values: unknown[]) {
          filters.push((row) => values.includes(row[key]));
          return chain;
        },
        order(key: keyof OracleFeed, options: { ascending: boolean }) {
          orders.push({ key, ...options });
          return chain;
        },
        limit(n: number) {
          count = n;
          return chain;
        },
        then(resolve: (value: { data: OracleFeed[]; error: null }) => void) {
          const selected = rows
            .filter((row) => filters.every((filter) => filter(row)))
            .sort((a, b) => {
              for (const { key, ascending } of orders) {
                const comparison = String(a[key]).localeCompare(String(b[key]));
                if (comparison) return ascending ? comparison : -comparison;
              }
              return 0;
            })
            .slice(0, count);
          if (update) selected.forEach((row) => Object.assign(row, update));
          resolve({ data: selected, error: null });
        },
      };
      return chain;
    },
  };
  const queries = new DatabaseQueries(client as never);
  (getAdminQueries as jest.Mock).mockReturnValue({
    ...admin,
    getInactiveFeeds: queries.getInactiveFeeds.bind(queries),
    markFeedReactivationAttempts: queries.markFeedReactivationAttempts.bind(queries),
    reactivateOracleFeed: queries.reactivateOracleFeed.bind(queries),
  });
  getPrice.mockImplementation(async (symbol: string) => {
    if (symbol === 'RECOVERED') return price(symbol);
    throw new Error('permanently dead');
  });
  const originalFailures = rows.map((row) => row.last_failure_at);
  const first = await runFeedSync('reactivate', '');
  expect((first.body.results as object[])[0]).toMatchObject({ probed: 200, reactivated: 0 });
  const second = await runFeedSync('reactivate', '');
  expect((second.body.results as object[])[0]).toMatchObject({ probed: 200, reactivated: 1 });
  expect(rows[200]).toMatchObject({ is_active: true, consecutive_failures: 0 });
  expect(rows.map((row) => row.last_failure_at)).toEqual(originalFailures);
});

it('preserves the smaller HTTP fallback sampling budget', async () => {
  const { getPrice, admin } = setup([feed('ETH'), feed('HYPE')]);
  getPrice.mockResolvedValue(price('ETH'));
  await collectSnapshot(undefined, { includeAdditionalHealthChecks: false });
  expect(getPrice.mock.calls.map((c) => c[0])).toEqual(['ETH']);
  expect(admin.batchUpdateFeedHealth.mock.calls[0][0]).toHaveLength(1);
});

it('accepts API3 prices inside the established 48-hour grace period', async () => {
  setup();
  (api3NetworkService.getPrice as jest.Mock).mockResolvedValue({
    price: 100,
    timestamp: Date.now() - 48 * 3600000,
    dataAge: 48 * 3600,
    confidence: 0.98,
    decimals: 18,
    dapiName: 'ETH/USD',
    source: 'api3-dapi-ethereum',
  });
  const api3 = new API3Client();
  await expect(api3.getPrice('ETH')).resolves.toMatchObject({ price: 100 });
});
