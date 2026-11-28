import { fetchRedStoneFeedCatalogue } from '@/lib/oracles/services/redstoneGateway';

import { discoverRedStoneFeeds } from '../providerDiscoverers';

jest.mock('@/lib/oracles/services/redstoneGateway', () => ({
  fetchRedStoneFeedCatalogue: jest.fn(),
  REDSTONE_DATA_SERVICE_ID: 'redstone-primary-prod',
}));

const mockFetchCatalogue = jest.mocked(fetchRedStoneFeedCatalogue);

jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('discoverRedStoneFeeds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('discovers only fresh, signer-verified USD feeds from the authenticated catalogue', async () => {
    mockFetchCatalogue.mockResolvedValue([
      { dataFeedId: 'BTC', value: 67_000, timestampMilliseconds: Date.now() },
      { dataFeedId: 'ETH', value: 3_500, timestampMilliseconds: Date.now() },
      { dataFeedId: 'ETH/USD', value: 3_500, timestampMilliseconds: Date.now() },
      { dataFeedId: 'WBTC/BTC', value: 0.999, timestampMilliseconds: Date.now() },
      { dataFeedId: 'USDC/BRL', value: 5.2, timestampMilliseconds: Date.now() },
    ]);

    const result = await discoverRedStoneFeeds();

    expect(mockFetchCatalogue).toHaveBeenCalledTimes(1);
    expect(result.errors).toHaveLength(0);
    expect(result.discovered).toBe(3);
    expect(result.feeds.map((feed) => feed.symbol).sort()).toEqual(['BTC', 'ETH', 'ETH/USD']);
    expect(result.feeds.every((feed) => feed.chain_id === 0)).toBe(true);
    expect(result.feeds.every((feed) => feed.source === 'redstone-authenticated-gateway')).toBe(
      true
    );
    expect(result.feeds[0].metadata).toMatchObject({
      preverified: true,
      dataServiceId: 'redstone-primary-prod',
    });
  });

  it('returns an error and no candidate feeds when authenticated discovery fails', async () => {
    mockFetchCatalogue.mockRejectedValue(
      new Error('REDSTONE_GATEWAY_ADMIN_API_KEY is required for the authenticated RedStone gateway')
    );

    const result = await discoverRedStoneFeeds();

    expect(result.discovered).toBe(0);
    expect(result.feeds).toHaveLength(0);
    expect(result.errors).toEqual([
      'REDSTONE_GATEWAY_ADMIN_API_KEY is required for the authenticated RedStone gateway',
    ]);
  });
});
