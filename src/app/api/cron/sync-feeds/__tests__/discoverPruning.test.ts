import { verifyCronSecret } from '@/lib/api/cronAuth';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { api3NetworkService } from '@/lib/oracles/services/api3NetworkService';
import { feedDiscoveryService } from '@/lib/oracles/services/feedDiscovery';
import { invalidateAllFeedsCache } from '@/lib/oracles/utils/dynamicFeedResolver';
import { getAdminQueries, createServiceRoleClient } from '@/lib/supabase/server';

import { GET } from '../route';

jest.mock('@/lib/api/cronAuth');
jest.mock('@/lib/oracles/base/databaseOperations');
jest.mock('@/lib/oracles/services/api3NetworkService');
jest.mock('@/lib/oracles/services/feedDiscovery');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/oracles/utils/dynamicFeedResolver');

const mockedVerifyCronSecret = verifyCronSecret as jest.MockedFunction<typeof verifyCronSecret>;
const mockedFetchPrice = fetchPriceWithDatabase as jest.MockedFunction<
  typeof fetchPriceWithDatabase
>;
const mockedDiscoverAll = feedDiscoveryService.discoverAll as jest.MockedFunction<
  typeof feedDiscoveryService.discoverAll
>;
const mockedGetAdminQueries = getAdminQueries as jest.MockedFunction<typeof getAdminQueries>;
const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

interface Scenario {
  // Whether the absent feed's re-verification probe returns a valid price.
  btcProbeOk: boolean;
  // Value returned by incrementAbsentDiscoveryRuns (simulates current count + 1).
  incrementReturns: number;
  // last_success_at on the absent feed (null = never).
  lastSuccessAt: string | null;
}

function makeFeed(provider: string, symbol: string, chainId: number, lastSuccessAt: string | null) {
  return {
    provider,
    symbol,
    chain_id: chainId,
    address: `0x${symbol}`,
    is_active: true,
    source: 'discover',
    decimals: 8,
    name: `${symbol} on ${chainId}`,
    last_success_at: lastSuccessAt,
    absent_discovery_runs: 0,
  } as never;
}

function setupMocks(scenario: Scenario) {
  jest.clearAllMocks();
  mockedVerifyCronSecret.mockReturnValue(null);
  invalidateAllFeedsCache.mockReturnValue(undefined);

  // discovered = only ETH/1 (so BTC/1 is "absent" and gets reconciled)
  mockedDiscoverAll.mockResolvedValue([
    {
      provider: 'redstone' as never,
      feeds: [makeFeed('redstone', 'ETH', 1, null)],
      discovered: 1,
      errors: [],
    },
  ] as never);

  // present (ETH/1) stays; absent (BTC/1) is reconciled
  const present = makeFeed('redstone', 'ETH', 1, null);
  const absent = makeFeed('redstone', 'BTC', 1, scenario.lastSuccessAt);
  mockedGetAdminQueries.mockReturnValue({
    getOracleFeeds: jest.fn().mockResolvedValue([present, absent]),
    deactivateOracleFeeds: jest.fn().mockResolvedValue(true),
    recordFeedDiscovered: jest.fn().mockResolvedValue(true),
    incrementAbsentDiscoveryRuns: jest.fn().mockResolvedValue(scenario.incrementReturns),
    deactivateStaleFeeds: jest.fn().mockResolvedValue(0),
    getInactiveFeeds: jest.fn().mockResolvedValue([]),
  } as never);

  mockedCreateServiceRoleClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  } as never);

  // Probe path: BTC honours the scenario, everything else succeeds.
  mockedFetchPrice.mockImplementation(((_p: unknown, symbol: string) =>
    symbol === 'BTC'
      ? scenario.btcProbeOk
        ? Promise.resolve({ price: 1, timestamp: Date.now() } as never)
        : Promise.resolve(null)
      : Promise.resolve({ price: 1, timestamp: Date.now() } as never)) as never);
  mockedApi3GetPriceOk();
}

const mockedApi3GetPrice = api3NetworkService.getPrice as jest.MockedFunction<
  typeof api3NetworkService.getPrice
>;
function mockedApi3GetPriceOk() {
  mockedApi3GetPrice.mockResolvedValue({
    price: 1,
    timestamp: Date.now(),
    source: 'api3-dapi',
    decimals: 8,
    confidence: 0.98,
    dapiName: 'X/USD',
    proxyAddress: '0x0',
    dataAge: 0,
  } as never);
}

async function runDiscover() {
  const response = await GET(
    new Request('http://localhost/api/cron/sync-feeds?mode=discover&provider=redstone')
  );
  return response.json();
}

describe('discover — graceful pruning (migration 0025)', () => {
  it('keeps a feed that was merely absent but still re-verifies OK', async () => {
    setupMocks({ btcProbeOk: true, incrementReturns: 1, lastSuccessAt: null });
    const json = await runDiscover();

    const deactivate = mockedGetAdminQueries.mock.results[0]?.value.deactivateOracleFeeds;
    const recordDiscovered = mockedGetAdminQueries.mock.results[0]?.value.recordFeedDiscovered;
    const increment = mockedGetAdminQueries.mock.results[0]?.value.incrementAbsentDiscoveryRuns;

    expect(deactivate).not.toHaveBeenCalled();
    expect(increment).not.toHaveBeenCalled();
    expect(recordDiscovered).toHaveBeenCalledWith('redstone', 'BTC', 1);
    expect(json.results[0].pruned).toBe(0);
  });

  it('does NOT prune when re-verify fails but the absent counter is below threshold', async () => {
    // incrementAbsentDiscoveryRuns returns 1 (< ABSENT_PRUNE_THRESHOLD=2)
    setupMocks({ btcProbeOk: false, incrementReturns: 1, lastSuccessAt: null });
    const json = await runDiscover();

    const deactivate = mockedGetAdminQueries.mock.results[0]?.value.deactivateOracleFeeds;
    const increment = mockedGetAdminQueries.mock.results[0]?.value.incrementAbsentDiscoveryRuns;

    expect(increment).toHaveBeenCalledWith('redstone', 'BTC', 1);
    expect(deactivate).not.toHaveBeenCalled();
    expect(json.results[0].pruned).toBe(0);
  });

  it('prunes only once the absent counter reaches the threshold', async () => {
    // incrementAbsentDiscoveryRuns returns 2 (>= ABSENT_PRUNE_THRESHOLD=2)
    setupMocks({ btcProbeOk: false, incrementReturns: 2, lastSuccessAt: null });
    const json = await runDiscover();

    const deactivate = mockedGetAdminQueries.mock.results[0]?.value.deactivateOracleFeeds;
    expect(deactivate).toHaveBeenCalledWith('redstone', 'BTC', 1);
    expect(json.results[0].pruned).toBe(1);
  });

  it('never prunes a feed that succeeded within the 48h cooling window', async () => {
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago
    setupMocks({ btcProbeOk: false, incrementReturns: 2, lastSuccessAt: recent });
    const json = await runDiscover();

    const deactivate = mockedGetAdminQueries.mock.results[0]?.value.deactivateOracleFeeds;
    const increment = mockedGetAdminQueries.mock.results[0]?.value.incrementAbsentDiscoveryRuns;
    const recordDiscovered = mockedGetAdminQueries.mock.results[0]?.value.recordFeedDiscovered;

    expect(increment).not.toHaveBeenCalled();
    expect(deactivate).not.toHaveBeenCalled();
    // cooling path treats it as rediscovered
    expect(recordDiscovered).toHaveBeenCalledWith('redstone', 'BTC', 1);
    expect(json.results[0].pruned).toBe(0);
  });
});
