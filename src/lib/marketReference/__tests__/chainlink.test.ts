import { getAllCatalogFeeds } from '@/lib/oracles/constants/chainlinkCatalogLoader';
import type { ChainlinkPriceData } from '@/lib/oracles/services/chainlinkOnChainService';

import { fetchChainlinkMarketReference } from '../chainlink';

jest.mock('@/lib/oracles/services/chainlinkOnChainService', () => ({
  chainlinkOnChainService: { getPrice: jest.fn() },
}));

const baseEthFeed = getAllCatalogFeeds().find(
  ({ symbol, chainId, entry }) => symbol === 'ETH' && chainId === 8453 && entry.quote === 'USD'
);

function priceData(overrides: Partial<ChainlinkPriceData> = {}): ChainlinkPriceData {
  return {
    symbol: 'ETH',
    price: 2500,
    decimals: 8,
    decimalsIsFallback: false,
    timestamp: Date.parse('2026-10-13T00:00:00.000Z'),
    roundId: 123n,
    answeredInRound: 123n,
    chainId: 8453,
    description: 'ETH / USD',
    version: 4n,
    startedAt: Date.parse('2026-10-13T00:00:00.000Z'),
    ...overrides,
  };
}

describe('fetchChainlinkMarketReference', () => {
  it('reads the catalog feed and marks the observation fresh using its heartbeat', async () => {
    expect(baseEthFeed).toBeDefined();
    const getPrice = jest.fn(async () => priceData());

    const result = await fetchChainlinkMarketReference({
      symbol: ' eth ',
      chainId: 8453,
      getPrice,
      now: () => Date.parse('2026-10-13T00:01:00.000Z'),
    });

    expect(getPrice).toHaveBeenCalledWith('ETH', 8453, undefined, baseEthFeed?.entry.proxyAddress);
    expect(result).toMatchObject({
      provider: 'chainlink-data-feed',
      symbol: 'ETH',
      quote: 'USD',
      chainId: 8453,
      price: 2500,
      ageSeconds: 60,
      isFresh: true,
      roundId: '123',
    });
    expect(result.heartbeatSeconds).toBe(baseEthFeed?.entry.heartbeat);
  });

  it('preserves a stale observation but fails freshness closed', async () => {
    const getPrice = jest.fn(async () => priceData());

    const result = await fetchChainlinkMarketReference({
      symbol: 'ETH',
      chainId: 8453,
      getPrice,
      now: () =>
        Date.parse('2026-10-13T00:00:00.000Z') + ((baseEthFeed?.entry.heartbeat ?? 1) + 1) * 1000,
    });

    expect(result.isFresh).toBe(false);
    expect(result.ageSeconds).toBe((baseEthFeed?.entry.heartbeat ?? 1) + 1);
  });

  it('rejects missing feeds and malformed prices', async () => {
    const getPrice = jest.fn(async () => priceData({ price: Number.NaN }));
    await expect(
      fetchChainlinkMarketReference({ symbol: 'NOTREAL', chainId: 8453, getPrice })
    ).rejects.toThrow('No catalogued Chainlink NOTREAL/USD feed');

    await expect(
      fetchChainlinkMarketReference({ symbol: 'ETH', chainId: 8453, getPrice })
    ).rejects.toThrow('invalid ETH/USD feed data');
  });
});
