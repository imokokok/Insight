import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { findAffectedProtocols } from '@/lib/risk/findAffectedProtocols';
import { getStablecoinConfig } from '@/lib/stablecoins/config';
import {
  calculateStablecoinDepegSnapshot,
  resetStablecoinSnapshotCacheForTests,
} from '@/lib/stablecoins/monitor';
import { Blockchain, OracleProvider } from '@/types/oracle';

jest.mock('@/lib/oracles/base/databaseOperations', () => ({
  fetchPriceWithDatabase: jest.fn(),
}));

jest.mock('@/lib/risk/findAffectedProtocols', () => ({
  findAffectedProtocols: jest.fn(),
}));

jest.mock('@/lib/stablecoins/config', () => ({
  getStablecoinConfig: jest.fn(),
}));

const mockedFetchPrice = jest.mocked(fetchPriceWithDatabase);
const mockedFindAffectedProtocols = jest.mocked(findAffectedProtocols);
const mockedGetStablecoinConfig = jest.mocked(getStablecoinConfig);

describe('stablecoin snapshots', () => {
  beforeEach(() => {
    resetStablecoinSnapshotCacheForTests();
    jest.clearAllMocks();
    mockedGetStablecoinConfig.mockReturnValue({
      symbol: 'USDC',
      displayName: 'USD Coin',
      targetPeg: 1,
      sources: [
        {
          provider: OracleProvider.CHAINLINK,
          chain: Blockchain.ETHEREUM,
          displayName: 'Chainlink',
          symbol: 'USDC',
        },
      ],
      dexPools: [],
    } as never);
    mockedFindAffectedProtocols.mockResolvedValue([]);
  });

  it('coalesces signal-free concurrent cache misses before fan-out starts', async () => {
    let resolvePrice!: (value: unknown) => void;
    mockedFetchPrice.mockReturnValue(
      new Promise((resolve) => {
        resolvePrice = resolve;
      }) as ReturnType<typeof fetchPriceWithDatabase>
    );

    const first = calculateStablecoinDepegSnapshot('USDC');
    const second = calculateStablecoinDepegSnapshot('USDC');

    expect(mockedFetchPrice).toHaveBeenCalledTimes(1);
    resolvePrice({
      provider: OracleProvider.CHAINLINK,
      chain: Blockchain.ETHEREUM,
      price: 1,
      timestamp: Date.now(),
    });

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(mockedFetchPrice).toHaveBeenCalledTimes(1);
    expect(mockedFindAffectedProtocols).toHaveBeenCalledTimes(1);
  });
});
