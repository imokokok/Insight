import type { SnapshotBatchPriceRequest } from '@/lib/oracles/utils/snapshotBatch';
import type { OracleFeed } from '@/lib/supabase/queries';
import { Blockchain, OracleProvider, type PriceData } from '@/types/oracle';

import { fetchDashboardInitialData } from '../dashboardData';

const mockGetSnapshotPricesBatch = jest.fn();
const mockFetchPriceWithDatabase = jest.fn();
const mockGetLatestPriceSnapshotFromDatabase = jest.fn();
const mockGetAllActiveFeedsByProviderWithStatus = jest.fn();
const mockGetReputations = jest.fn();
const mockClient = {
  getDefaultChain: jest.fn(() => Blockchain.ETHEREUM),
  getSupportedChainsForSymbol: jest.fn((symbol: string) =>
    symbol === 'SOL' ? [Blockchain.ARBITRUM] : [Blockchain.ETHEREUM]
  ),
  getSnapshotPricesBatch: mockGetSnapshotPricesBatch,
};

jest.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>) => fn,
}));

jest.mock('@/lib/config/oracles', () => ({
  getPriceOracleProvidersSortedByMarketCap: () => ['chainlink'],
}));

jest.mock('@/lib/oracles/base/databaseOperations', () => ({
  fetchPriceWithDatabase: (...args: unknown[]) => mockFetchPriceWithDatabase(...args),
}));

jest.mock('@/lib/oracles/factory', () => ({
  getDefaultFactory: () => ({ getClient: () => mockClient }),
}));

jest.mock('@/lib/oracles/services/reputationService', () => ({
  reputationService: { getReputations: (...args: unknown[]) => mockGetReputations(...args) },
}));

jest.mock('@/lib/oracles/utils/dynamicFeedResolver', () => ({
  getActiveProviders: async () => ['chainlink'],
  getAllActiveFeedsByProviderWithStatus: (...args: unknown[]) =>
    mockGetAllActiveFeedsByProviderWithStatus(...args),
}));

jest.mock('@/lib/oracles/utils/storage', () => ({
  getLatestPriceSnapshotFromDatabase: (...args: unknown[]) =>
    mockGetLatestPriceSnapshotFromDatabase(...args),
}));

const createFeed = (symbol: string, chainId: number, address: string): OracleFeed => ({
  provider: OracleProvider.CHAINLINK,
  symbol,
  chain_id: chainId,
  address,
  name: `${symbol} / USD`,
  decimals: 8,
  category: 'crypto',
  is_active: true,
  source: 'chainlink-catalog',
  metadata: null,
});

const createPrice = (
  symbol: string,
  chain: Blockchain,
  overrides: Partial<PriceData> = {}
): PriceData => ({
  provider: OracleProvider.CHAINLINK,
  symbol,
  chain,
  price: 100,
  timestamp: Date.now(),
  dataSource: 'real',
  ...overrides,
});

const activeFeeds = [
  createFeed('BTC', 1, '0x0000000000000000000000000000000000000001'),
  createFeed('ETH', 1, '0x0000000000000000000000000000000000000002'),
  createFeed('USDT', 1, '0x0000000000000000000000000000000000000003'),
  createFeed('SOL', 42161, '0x0000000000000000000000000000000000000004'),
];

describe('dashboard initial price fetching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.getDefaultChain.mockReturnValue(Blockchain.ETHEREUM);
    mockClient.getSupportedChainsForSymbol.mockImplementation((symbol: string) =>
      symbol === 'SOL' ? [Blockchain.ARBITRUM] : [Blockchain.ETHEREUM]
    );
    mockGetAllActiveFeedsByProviderWithStatus.mockResolvedValue({
      feeds: new Map([[OracleProvider.CHAINLINK, activeFeeds]]),
      errored: false,
    });
    mockGetReputations.mockResolvedValue([]);
    mockGetLatestPriceSnapshotFromDatabase.mockResolvedValue(null);
    mockFetchPriceWithDatabase.mockImplementation(
      async (provider: OracleProvider, symbol: string, chain: Blockchain) =>
        createPrice(symbol, chain, { provider })
    );
    mockGetSnapshotPricesBatch.mockImplementation(
      async (requests: readonly SnapshotBatchPriceRequest[]) =>
        requests.map((request) => ({
          id: request.id,
          price: createPrice(request.symbol, request.chain),
          error: null,
        }))
    );
  });

  it('keeps the existing per-price path when the active feed registry is unavailable', async () => {
    mockGetAllActiveFeedsByProviderWithStatus.mockResolvedValue({
      feeds: new Map(),
      errored: true,
    });

    const data = await fetchDashboardInitialData();

    expect(data.prices).toHaveLength(4);
    expect(mockGetSnapshotPricesBatch).not.toHaveBeenCalled();
    expect(mockFetchPriceWithDatabase).toHaveBeenCalledTimes(4);
  });

  it('groups active Chainlink feeds by chain and uses the existing batch reader', async () => {
    const data = await fetchDashboardInitialData();

    expect(data.prices).toHaveLength(4);
    expect(data.prices.every((item) => item.price !== null && item.error === null)).toBe(true);
    expect(mockGetSnapshotPricesBatch).toHaveBeenCalledTimes(2);
    expect(
      mockGetSnapshotPricesBatch.mock.calls.map(([requests]) =>
        (requests as SnapshotBatchPriceRequest[]).map((request) => request.symbol).sort()
      )
    ).toEqual([['BTC', 'ETH', 'USDT'], ['SOL']]);
    expect(mockFetchPriceWithDatabase).not.toHaveBeenCalled();
  });

  it('uses the latest durable snapshot after a batched Chainlink failure', async () => {
    mockGetSnapshotPricesBatch.mockImplementation(
      async (requests: readonly SnapshotBatchPriceRequest[]) =>
        requests.map((request) => ({
          id: request.id,
          price: request.symbol === 'BTC' ? null : createPrice(request.symbol, request.chain),
          error: request.symbol === 'BTC' ? new Error('RPC unavailable') : null,
        }))
    );
    const fallback = createPrice('BTC', Blockchain.ETHEREUM, {
      dataSource: 'fallback',
      timestamp: Date.now() - 60_000,
    });
    mockGetLatestPriceSnapshotFromDatabase.mockImplementation(
      async (_provider: OracleProvider, symbol: string) => (symbol === 'BTC' ? fallback : null)
    );

    const data = await fetchDashboardInitialData();
    const btc = data.prices.find(
      (item) => item.provider === OracleProvider.CHAINLINK && item.symbol === 'BTC'
    );

    expect(btc?.price).toBe(fallback);
    expect(btc?.error).toBeNull();
    expect(mockGetLatestPriceSnapshotFromDatabase).toHaveBeenCalledWith(
      OracleProvider.CHAINLINK,
      'BTC',
      Blockchain.ETHEREUM
    );
    expect(mockFetchPriceWithDatabase).not.toHaveBeenCalled();
  });
});
