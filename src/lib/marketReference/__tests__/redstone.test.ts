import { getDefaultFactory } from '@/lib/oracles/factory';
import { OracleProvider } from '@/types/oracle';

import { fetchRedStoneMarketReference } from '../redstone';

jest.mock('@/lib/oracles/factory', () => ({ getDefaultFactory: jest.fn() }));

const mockGetDefaultFactory = getDefaultFactory as jest.MockedFunction<typeof getDefaultFactory>;
const mockGetPrice = jest.fn();
const mockGetClient = jest.fn();
let validTimestamp: number;

describe('fetchRedStoneMarketReference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validTimestamp = Date.now() - 1_000;
    mockGetClient.mockReturnValue({ getPrice: mockGetPrice });
    mockGetDefaultFactory.mockReturnValue({ getClient: mockGetClient } as unknown as ReturnType<
      typeof getDefaultFactory
    >);
    mockGetPrice.mockResolvedValue({
      provider: OracleProvider.REDSTONE,
      symbol: 'ETH',
      price: 2000.25,
      timestamp: validTimestamp,
      source: '  RedStone API  ',
    });
  });

  it('normalizes the symbol and returns validated USD provenance', async () => {
    const controller = new AbortController();
    const result = await fetchRedStoneMarketReference({
      symbol: ' eth ',
      signal: controller.signal,
    });

    expect(mockGetClient).toHaveBeenCalledWith(OracleProvider.REDSTONE);
    expect(mockGetPrice).toHaveBeenCalledWith('ETH', undefined, { signal: controller.signal });
    expect(result).toEqual({
      provider: 'redstone-api',
      symbol: 'ETH',
      quote: 'USD',
      price: 2000.25,
      source: '  RedStone API  ',
      updatedAt: new Date(validTimestamp).toISOString(),
    });
  });

  it('rejects invalid input symbols before contacting the provider', async () => {
    await expect(fetchRedStoneMarketReference({ symbol: 'ETH/USD' })).rejects.toThrow(
      'Invalid RedStone reference symbol'
    );
    expect(mockGetClient).not.toHaveBeenCalled();
  });

  it.each([
    { provider: OracleProvider.CHAINLINK, symbol: 'ETH', price: 2000, timestamp: Date.now() },
    { provider: OracleProvider.REDSTONE, symbol: 'BTC', price: 2000, timestamp: Date.now() },
    { provider: OracleProvider.REDSTONE, symbol: 'ETH', price: Number.NaN, timestamp: Date.now() },
    { provider: OracleProvider.REDSTONE, symbol: 'ETH', price: 2000, timestamp: 0 },
    {
      provider: OracleProvider.REDSTONE,
      symbol: 'ETH',
      price: 2000,
      timestamp: Date.now() + 60_000,
    },
  ])('rejects invalid provider observations', async (observation) => {
    mockGetPrice.mockResolvedValue(observation);

    await expect(fetchRedStoneMarketReference({ symbol: 'ETH' })).rejects.toThrow(
      'RedStone returned invalid ETH/USD reference data'
    );
  });
});
