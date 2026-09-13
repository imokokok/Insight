import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { getActiveFeedsMap } from '@/lib/oracles/utils/dynamicFeedResolver';
import { Blockchain, OracleProvider, type PriceData } from '@/types/oracle';

import { getCrossChainSpreads } from '../crossChainSpreadService';

jest.mock('@/lib/oracles/base/databaseOperations', () => ({
  fetchPriceWithDatabase: jest.fn(),
}));
jest.mock('@/lib/oracles/factory', () => ({ getDefaultFactory: jest.fn() }));
jest.mock('@/lib/oracles/utils/dynamicFeedResolver', () => ({ getActiveFeedsMap: jest.fn() }));

const mockedFetchPrice = fetchPriceWithDatabase as jest.MockedFunction<
  typeof fetchPriceWithDatabase
>;
const mockedGetDefaultFactory = getDefaultFactory as jest.MockedFunction<typeof getDefaultFactory>;
const mockedGetActiveFeedsMap = getActiveFeedsMap as jest.MockedFunction<typeof getActiveFeedsMap>;

function price(chain: Blockchain, overrides: Partial<PriceData> = {}): PriceData {
  return {
    provider: OracleProvider.CHAINLINK,
    symbol: 'ETH',
    chain,
    price: 2_000,
    timestamp: Date.now() - 5_000,
    ingestionTimestamp: Date.now(),
    ...overrides,
  };
}

describe('getCrossChainSpreads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDefaultFactory.mockReturnValue({
      getClient: () => ({
        supportedChains: [Blockchain.ETHEREUM, Blockchain.ARBITRUM],
      }),
    } as unknown as ReturnType<typeof getDefaultFactory>);
    mockedGetActiveFeedsMap.mockResolvedValue(new Map());
    mockedFetchPrice.mockImplementation(async (_provider, _symbol, chain) =>
      price(chain as Blockchain)
    );
  });

  it('reports the oracle age rather than the ingestion age', async () => {
    mockedFetchPrice.mockImplementation(async (_provider, _symbol, chain) =>
      price(chain as Blockchain, { dataAge: 180 })
    );

    const result = await getCrossChainSpreads(OracleProvider.CHAINLINK, 'ETH');

    expect(result.prices.map((item) => item.dataAgeSeconds)).toEqual([180, 180]);
  });

  it('fails explicitly when the requested base chain has no usable price', async () => {
    await expect(
      getCrossChainSpreads(OracleProvider.CHAINLINK, 'ETH', Blockchain.BASE)
    ).rejects.toThrow('BASE_CHAIN_UNAVAILABLE');
  });
});
