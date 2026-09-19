import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { Blockchain, OracleProvider } from '@/types/oracle';

import { ReflectorClient } from '../clients/reflector';
import { getBlockchainByChainId } from '../constants/chainMapping';

const mockFetchLatestPrice = jest.fn();
const mockSavePriceToDatabase = jest.fn();

jest.mock('../services/reflectorDataService', () => ({
  getReflectorDataService: () => ({ fetchLatestPrice: mockFetchLatestPrice }),
}));

jest.mock('../factory', () => ({
  getDefaultFactory: () => ({ getClient: () => new ReflectorClient() }),
}));

jest.mock('../utils/dynamicFeedResolver', () => ({
  getActiveFeedsMap: async () =>
    new Map([['BTC', { provider: 'reflector', symbol: 'BTC', chain_id: 0 }]]),
  matchesChainId: (feed: { chain_id: number }, chainId: number) =>
    feed.chain_id === 0 || feed.chain_id === chainId,
}));

jest.mock('../utils/storage', () => ({
  savePriceToDatabase: (...args: unknown[]) => mockSavePriceToDatabase(...args),
}));

jest.mock('@/lib/supabase/server', () => ({ getAdminQueries: jest.fn() }));

describe('Reflector default chain in snapshot collection', () => {
  beforeEach(() => {
    mockSavePriceToDatabase.mockResolvedValue(true);
    mockFetchLatestPrice.mockResolvedValue({
      provider: OracleProvider.REFLECTOR,
      symbol: 'BTC',
      price: 75000,
      timestamp: Date.now(),
      decimals: 14,
      confidence: 0.99,
      source: 'reflector',
    });
  });

  it('fetches a chain_id=0 registry feed on Stellar through the snapshot fetch path', async () => {
    const price = await fetchPriceWithDatabase(
      OracleProvider.REFLECTOR,
      'BTC',
      getBlockchainByChainId(0),
      true,
      true,
      undefined,
      'BTC'
    );

    expect(mockFetchLatestPrice).toHaveBeenCalledWith('BTC', undefined);
    expect(price).toMatchObject({
      provider: OracleProvider.REFLECTOR,
      symbol: 'BTC',
      chain: Blockchain.STELLAR,
      price: 75000,
    });
    expect(mockSavePriceToDatabase).toHaveBeenCalledWith(price);
  });

  it('still rejects an explicitly unsupported chain before querying the oracle', async () => {
    const client = new ReflectorClient();

    await expect(client.getPrice('BTC', Blockchain.ETHEREUM)).rejects.toMatchObject({
      code: 'SYMBOL_NOT_SUPPORTED',
    });
    expect(mockFetchLatestPrice).not.toHaveBeenCalled();
  });
});
