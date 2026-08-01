import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { fetchPricesForPosition } from '../priceQueries';

jest.mock('@/lib/oracles/base/databaseOperations');

const mockedFetchPrice = fetchPriceWithDatabase as jest.MockedFunction<
  typeof fetchPriceWithDatabase
>;

describe('fetchPricesForPosition — chain passthrough (bug fix)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchPrice.mockResolvedValue({
      price: 1.0,
      timestamp: Date.now(),
    } as never);
  });

  it('passes query.chain to fetchPriceWithDatabase instead of undefined', async () => {
    // Before the fix, the 3rd arg was hard-coded to `undefined`, causing
    // multi-chain feeds (e.g. API3 on BSC) to be rejected by checkSymbolActive.
    await fetchPricesForPosition([
      { provider: OracleProvider.API3, symbol: 'USDC', chain: Blockchain.BNB_CHAIN },
    ]);

    expect(mockedFetchPrice).toHaveBeenCalledWith(
      OracleProvider.API3,
      'USDC',
      Blockchain.BNB_CHAIN,
      true,
      false
    );
  });

  it('passes chain for an Arbitrum feed', async () => {
    await fetchPricesForPosition([
      { provider: OracleProvider.API3, symbol: 'ETH', chain: Blockchain.ARBITRUM },
    ]);

    expect(mockedFetchPrice).toHaveBeenCalledWith(
      OracleProvider.API3,
      'ETH',
      Blockchain.ARBITRUM,
      true,
      false
    );
  });

  it('passes undefined when chain is omitted (backward compatible)', async () => {
    await fetchPricesForPosition([{ provider: OracleProvider.API3, symbol: 'USDC' }]);

    expect(mockedFetchPrice).toHaveBeenCalledWith(
      OracleProvider.API3,
      'USDC',
      undefined,
      true,
      false
    );
  });

  it('throws when a price cannot be fetched, surfacing provider/symbol', async () => {
    mockedFetchPrice.mockRejectedValueOnce(new Error('upstream timeout'));

    await expect(
      fetchPricesForPosition([
        { provider: OracleProvider.API3, symbol: 'USDC', chain: Blockchain.BNB_CHAIN },
      ])
    ).rejects.toThrow('Failed to fetch prices for: api3/USDC');
  });
});
