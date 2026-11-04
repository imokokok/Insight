import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { findAffectedProtocols } from '@/lib/risk/findAffectedProtocols';
import { getWrappedAssetConfig } from '@/lib/wrapped-assets/config';
import {
  calculateWrappedAssetSnapshot,
  resetWrappedAssetSnapshotCacheForTests,
} from '@/lib/wrapped-assets/monitor';
import { Blockchain, OracleProvider } from '@/types/oracle';

jest.mock('@/lib/oracles/base/databaseOperations', () => ({
  fetchPriceWithDatabase: jest.fn(),
}));

jest.mock('@/lib/risk/findAffectedProtocols', () => ({
  findAffectedProtocols: jest.fn(),
}));

jest.mock('@/lib/wrapped-assets/config', () => ({
  getWrappedAssetConfig: jest.fn(),
}));

const mockedFetchPrice = jest.mocked(fetchPriceWithDatabase);
const mockedFindAffectedProtocols = jest.mocked(findAffectedProtocols);
const mockedGetWrappedAssetConfig = jest.mocked(getWrappedAssetConfig);

describe('wrapped-asset snapshots', () => {
  beforeEach(() => {
    resetWrappedAssetSnapshotCacheForTests();
    jest.clearAllMocks();
    mockedGetWrappedAssetConfig.mockReturnValue({
      symbol: 'WBTC',
      displayName: 'Wrapped Bitcoin',
      type: 'wrapped-btc',
      underlyingSymbol: 'BTC',
      priceSources: [
        {
          provider: OracleProvider.CHAINLINK,
          chain: Blockchain.ETHEREUM,
          displayName: 'Chainlink',
          symbol: 'WBTC',
        },
      ],
    } as never);
    mockedFindAffectedProtocols.mockResolvedValue([]);
  });

  it('coalesces concurrent cache misses before duplicate oracle reads', async () => {
    let resolveWrappedPrice!: (value: unknown) => void;
    mockedFetchPrice.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveWrappedPrice = resolve;
        }) as ReturnType<typeof fetchPriceWithDatabase>
    );
    mockedFetchPrice.mockResolvedValue({
      provider: OracleProvider.CHAINLINK,
      chain: Blockchain.ETHEREUM,
      price: 100_000,
      timestamp: Date.now(),
    } as never);

    const first = calculateWrappedAssetSnapshot('WBTC');
    const second = calculateWrappedAssetSnapshot('WBTC');

    expect(mockedFetchPrice).toHaveBeenCalledTimes(1);
    resolveWrappedPrice({
      provider: OracleProvider.CHAINLINK,
      chain: Blockchain.ETHEREUM,
      price: 100_000,
      timestamp: Date.now(),
    });

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(mockedFetchPrice).toHaveBeenCalledTimes(2);
    expect(mockedFindAffectedProtocols).toHaveBeenCalledTimes(1);
  });
});
