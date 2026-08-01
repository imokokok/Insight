import { verifyCronSecret } from '@/lib/api/cronAuth';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { api3NetworkService } from '@/lib/oracles/services/api3NetworkService';
import { feedDiscoveryService } from '@/lib/oracles/services/feedDiscovery';
import { getAdminQueries, createServiceRoleClient } from '@/lib/supabase/server';
import { Blockchain, OracleProvider } from '@/types/oracle';

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
const mockedApi3GetPrice = api3NetworkService.getPrice as jest.MockedFunction<
  typeof api3NetworkService.getPrice
>;
const mockedDiscoverAll = feedDiscoveryService.discoverAll as jest.MockedFunction<
  typeof feedDiscoveryService.discoverAll
>;
const mockedGetAdminQueries = getAdminQueries as jest.MockedFunction<typeof getAdminQueries>;
const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

function makeFeed(provider: string, symbol: string, chainId: number, address?: string) {
  return {
    provider,
    symbol,
    chain_id: chainId,
    address,
    is_active: true,
    source: 'discover',
    decimals: 8,
    data_type: 'price',
    title: `${symbol} on ${chainId}`,
  } as never;
}

function mockDiscovery(provider: OracleProvider, feeds: ReturnType<typeof makeFeed>[]) {
  mockedDiscoverAll.mockResolvedValue([
    { provider, feeds, discovered: feeds.length, errors: [] },
  ] as never);
}

function setupDefaultMocks() {
  mockedVerifyCronSecret.mockReturnValue(null);
  mockedFetchPrice.mockResolvedValue({ price: 1.0, timestamp: Date.now() } as never);
  mockedApi3GetPrice.mockResolvedValue({
    price: 1.0,
    timestamp: Date.now(),
    source: 'api3-dapi',
    decimals: 8,
    confidence: 0.98,
    dapiName: 'BTC/USD',
    proxyAddress: '0x0',
    dataAge: 0,
  } as never);
  mockedGetAdminQueries.mockReturnValue({
    getOracleFeeds: jest.fn().mockResolvedValue([]),
    deactivateOracleFeeds: jest.fn().mockResolvedValue(0),
    deactivateStaleFeeds: jest.fn().mockResolvedValue(0),
  } as never);
  mockedCreateServiceRoleClient.mockReturnValue({
    from: jest.fn().mockReturnValue({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  } as never);
}

describe('probeFeed — chain resolution (bug fix)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  it('probes API3 BSC feed (chain_id=56) by reading the dAPI proxy on BNB_CHAIN with the dAPI name', async () => {
    // Candidate carries the dAPI name ("USDC/USD") in `address`. Before the
    // fix, the probe went through fetchPriceWithDatabase whose checkSymbolActive
    // gate rejected dAPIs not yet in the DB (default chain Ethereum=1). Now it
    // reads the proxy contract directly on the feed's own chain.
    mockDiscovery(OracleProvider.API3, [makeFeed('api3', 'USDC', 56, 'USDC/USD')]);

    await GET(new Request('http://localhost/api/cron/sync-feeds?mode=discover&provider=api3'));

    expect(mockedApi3GetPrice).toHaveBeenCalledWith(
      'USDC',
      Blockchain.BNB_CHAIN,
      undefined,
      'USDC/USD'
    );
    // API3 probes must bypass the DB-gated fetchPriceWithDatabase path.
    expect(mockedFetchPrice).not.toHaveBeenCalled();
  });

  it('probes API3 Arbitrum feed (chain_id=42161) with Blockchain.ARBITRUM', async () => {
    mockDiscovery(OracleProvider.API3, [makeFeed('api3', 'ETH', 42161, 'ETH/USD')]);

    await GET(new Request('http://localhost/api/cron/sync-feeds?mode=discover&provider=api3'));

    expect(mockedApi3GetPrice).toHaveBeenCalledWith(
      'ETH',
      Blockchain.ARBITRUM,
      undefined,
      'ETH/USD'
    );
  });

  it('probes API3 Polygon feed (chain_id=137) with Blockchain.POLYGON', async () => {
    mockDiscovery(OracleProvider.API3, [makeFeed('api3', 'USDT', 137, 'USDT/USD')]);

    await GET(new Request('http://localhost/api/cron/sync-feeds?mode=discover&provider=api3'));

    expect(mockedApi3GetPrice).toHaveBeenCalledWith(
      'USDT',
      Blockchain.POLYGON,
      undefined,
      'USDT/USD'
    );
  });

  it('probes chain-agnostic feed (chain_id=0) with undefined via fetchPriceWithDatabase (unchanged)', async () => {
    mockDiscovery(OracleProvider.PYTH, [makeFeed('pyth', 'Crypto.ETH/USD', 0)]);

    await GET(new Request('http://localhost/api/cron/sync-feeds?mode=discover&provider=pyth'));

    expect(mockedFetchPrice).toHaveBeenCalledWith('pyth', 'Crypto.ETH/USD', undefined, false, true);
  });

  it('verifies all multi-chain API3 feeds that previously would have been dropped', async () => {
    // Before the fix, BSC(56) & Polygon(137) feeds failed checkSymbolActive
    // (default chain Ethereum=1) and were dropped before upsert.
    const feeds = [
      makeFeed('api3', 'USDC', 1, 'USDC/USD'),
      makeFeed('api3', 'USDC', 56, 'USDC/USD'),
      makeFeed('api3', 'USDC', 137, 'USDC/USD'),
    ];
    mockDiscovery(OracleProvider.API3, feeds);

    const response = await GET(
      new Request('http://localhost/api/cron/sync-feeds?mode=discover&provider=api3')
    );
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.results[0].verified).toBe(3);
    expect(json.results[0].verifiedFailed).toBe(0);
    // api3NetworkService.getPrice called once per feed, each with the correct chain
    expect(mockedApi3GetPrice).toHaveBeenCalledTimes(3);
    expect(mockedApi3GetPrice).toHaveBeenCalledWith(
      'USDC',
      Blockchain.ETHEREUM,
      undefined,
      'USDC/USD'
    );
    expect(mockedApi3GetPrice).toHaveBeenCalledWith(
      'USDC',
      Blockchain.BNB_CHAIN,
      undefined,
      'USDC/USD'
    );
    expect(mockedApi3GetPrice).toHaveBeenCalledWith(
      'USDC',
      Blockchain.POLYGON,
      undefined,
      'USDC/USD'
    );
  });

  it('marks API3 feed as failed when the proxy returns no price (inactive dAPI)', async () => {
    mockedApi3GetPrice.mockResolvedValue(null as never);
    mockDiscovery(OracleProvider.API3, [makeFeed('api3', 'DEAD', 1, 'DEAD/USD')]);

    const response = await GET(
      new Request('http://localhost/api/cron/sync-feeds?mode=discover&provider=api3')
    );
    const json = await response.json();

    expect(json.results[0].verified).toBe(0);
    expect(json.results[0].verifiedFailed).toBe(1);
  });

  it('rejects stale API3 dAPIs that still serve an expired last-written price', async () => {
    // A communal proxy returns the last-written price even after the dAPI's
    // subscription expires (e.g. BSC BTC/USD serving a price from months
    // ago). A non-zero price alone must NOT pass verification.
    mockedApi3GetPrice.mockResolvedValue({
      price: 80690.85,
      timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
      source: 'api3-dapi',
      decimals: 18,
      confidence: 0.98,
      dapiName: 'BTC/USD',
      proxyAddress: '0x0',
      dataAge: 7 * 24 * 60 * 60 * 1000, // 7 days — well past the 48h threshold
    } as never);
    mockDiscovery(OracleProvider.API3, [makeFeed('api3', 'BTC', 56, 'BTC/USD')]);

    const response = await GET(
      new Request('http://localhost/api/cron/sync-feeds?mode=discover&provider=api3')
    );
    const json = await response.json();

    expect(json.results[0].verified).toBe(0);
    expect(json.results[0].verifiedFailed).toBe(1);
  });

  it('accepts API3 dAPIs with a fresh on-chain timestamp (within 48h)', async () => {
    mockedApi3GetPrice.mockResolvedValue({
      price: 63325.8,
      timestamp: Date.now() - 16 * 60 * 60 * 1000,
      source: 'api3-dapi',
      decimals: 18,
      confidence: 0.98,
      dapiName: 'BTC/USD',
      proxyAddress: '0x0',
      dataAge: 16 * 60 * 60 * 1000, // 16h — within the 48h threshold
    } as never);
    mockDiscovery(OracleProvider.API3, [makeFeed('api3', 'BTC', 1, 'BTC/USD')]);

    const response = await GET(
      new Request('http://localhost/api/cron/sync-feeds?mode=discover&provider=api3')
    );
    const json = await response.json();

    expect(json.results[0].verified).toBe(1);
    expect(json.results[0].verifiedFailed).toBe(0);
  });
});
