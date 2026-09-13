import { oracleApiClient } from '@/lib/api/oracleApiClient';
import { Blockchain, OracleProvider } from '@/types/oracle';

describe('oracleApiClient.fetchBatchPrices', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('preserves successful chains while exposing item and missing-result errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        data: [
          {
            provider: OracleProvider.CHAINLINK,
            symbol: 'ETH',
            chain: Blockchain.ETHEREUM,
            price: {
              provider: OracleProvider.CHAINLINK,
              symbol: 'ETH',
              chain: Blockchain.ETHEREUM,
              price: 2_000,
              timestamp: Date.now(),
            },
            error: null,
          },
          {
            provider: OracleProvider.CHAINLINK,
            symbol: 'ETH',
            chain: Blockchain.ARBITRUM,
            price: null,
            error: 'RPC unavailable',
          },
        ],
      }),
      text: async () => '',
      status: 200,
    }) as jest.Mock;

    const result = await oracleApiClient.fetchBatchPrices({
      provider: OracleProvider.CHAINLINK,
      symbol: 'ETH',
      chains: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.BASE],
      forceRefresh: true,
    });

    expect(result.prices.get(Blockchain.ETHEREUM)?.price).toBe(2_000);
    expect(result.errors).toEqual([
      { chain: Blockchain.ARBITRUM, error: 'RPC unavailable' },
      { chain: Blockchain.BASE, error: 'No batch result returned for chain' },
    ]);
  });

  it('reports providers omitted by a malformed multi-oracle batch response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            provider: OracleProvider.CHAINLINK,
            symbol: 'ETH',
            price: {
              provider: OracleProvider.CHAINLINK,
              symbol: 'ETH',
              price: 2_000,
              timestamp: Date.now(),
            },
            error: null,
          },
        ],
      }),
      text: async () => '',
      status: 200,
    }) as jest.Mock;

    const result = await oracleApiClient.fetchMultiOraclePrices({
      providers: [OracleProvider.CHAINLINK, OracleProvider.DIA],
      symbol: 'ETH',
      forceRefresh: true,
    });

    expect(result.prices).toHaveLength(1);
    expect(result.errors).toEqual([
      { provider: OracleProvider.DIA, error: 'No batch result returned for provider' },
    ]);
  });
});
