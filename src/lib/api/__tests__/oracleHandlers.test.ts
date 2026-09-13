import { fetchHistoricalPricesWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { Blockchain, OracleProvider } from '@/types/oracle';

import { handleGetHistoricalPrices } from '../oracleHandlers';

jest.mock('@/lib/oracles/base/databaseOperations');

const mockedFetchHistorical = fetchHistoricalPricesWithDatabase as jest.MockedFunction<
  typeof fetchHistoricalPricesWithDatabase
>;

describe('handleGetHistoricalPrices', () => {
  beforeEach(() => jest.clearAllMocks());

  it('bypasses database history and disables response caching on force refresh', async () => {
    mockedFetchHistorical.mockResolvedValue([]);

    const response = await handleGetHistoricalPrices({
      provider: OracleProvider.CHAINLINK,
      symbol: 'ETH/USD',
      chain: Blockchain.ETHEREUM,
      period: 24,
      forceRefresh: true,
    });

    expect(mockedFetchHistorical).toHaveBeenCalledWith(
      OracleProvider.CHAINLINK,
      'ETH',
      Blockchain.ETHEREUM,
      24,
      false,
      true,
      undefined
    );
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
  });

  it('uses database history when force refresh is not requested', async () => {
    mockedFetchHistorical.mockResolvedValue([]);

    await handleGetHistoricalPrices({
      provider: OracleProvider.CHAINLINK,
      symbol: 'ETH',
      period: 24,
    });

    expect(mockedFetchHistorical).toHaveBeenCalledWith(
      OracleProvider.CHAINLINK,
      'ETH',
      undefined,
      24,
      true,
      undefined,
      undefined
    );
  });
});
