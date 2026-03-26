import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { PriceData, OracleProvider, Blockchain } from '@/types/oracle';

import { DIAClient } from '../dia';
import * as storage from '../storage';

jest.mock('@/lib/oracles/storage', () => ({
  shouldUseDatabase: jest.fn(),
  savePriceToDatabase: jest.fn(),
  savePricesToDatabase: jest.fn(),
  getPriceFromDatabase: jest.fn(),
  getHistoricalPricesFromDatabase: jest.fn(),
  configureStorage: jest.fn(),
  getStorageConfig: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  getServerQueries: jest.fn(),
}));

describe('DIAClient', () => {
  let client: DIAClient;

  beforeEach(() => {
    client = new DIAClient();
    jest.clearAllMocks();
    (storage.shouldUseDatabase as jest.Mock).mockReturnValue(false);
  });

  describe('客户端初始化和配置', () => {
    it('应该正确初始化客户端', () => {
      expect(client).toBeInstanceOf(DIAClient);
      expect(client.name).toBe(OracleProvider.DIA);
    });

    it('应该使用默认配置初始化', () => {
      const defaultClient = new DIAClient();
      expect(defaultClient['config']).toEqual({
        useDatabase: true,
        fallbackToMock: true,
      });
    });

    it('应该接受自定义配置', () => {
      const customClient = new DIAClient({
        useDatabase: false,
        fallbackToMock: false,
      });
      expect(customClient['config']).toEqual({
        useDatabase: false,
        fallbackToMock: false,
      });
    });
  });

  describe('支持的链列表', () => {
    it('应该包含正确的支持链列表', () => {
      const expectedChains = [
        Blockchain.ETHEREUM,
        Blockchain.ARBITRUM,
        Blockchain.POLYGON,
        Blockchain.AVALANCHE,
        Blockchain.BNB_CHAIN,
        Blockchain.BASE,
      ];

      expect(client.supportedChains).toEqual(expectedChains);
      expect(client.supportedChains.length).toBe(6);
    });
  });

  describe('getPrice() 方法', () => {
    it('应该返回正确的价格数据结构', async () => {
      const price = await client.getPrice('BTC');

      expect(price).toHaveProperty('provider', OracleProvider.DIA);
      expect(price).toHaveProperty('symbol', 'BTC');
      expect(price).toHaveProperty('price');
      expect(price).toHaveProperty('timestamp');
      expect(price).toHaveProperty('decimals', 8);
      expect(price).toHaveProperty('confidence');
    });

    it('应该返回包含 24h 变化的价格数据', async () => {
      const price = await client.getPrice('ETH');

      expect(price).toHaveProperty('change24h');
      expect(price).toHaveProperty('change24hPercent');
    });

    it('应该支持指定链参数', async () => {
      const price = await client.getPrice('ETH', Blockchain.ETHEREUM);

      expect(price.chain).toBe(Blockchain.ETHEREUM);
    });
  });

  describe('getHistoricalPrices() 方法', () => {
    it('应该返回历史价格数组', async () => {
      const prices = await client.getHistoricalPrices('BTC');

      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);
    });

    it('应该按时间顺序排列价格数据', async () => {
      const prices = await client.getHistoricalPrices('BTC');

      for (let i = 1; i < prices.length; i++) {
        expect(prices[i].timestamp).toBeGreaterThan(prices[i - 1].timestamp);
      }
    });
  });

  describe('getDataTransparency() 方法', () => {
    it('应该返回数据源透明度数据', async () => {
      const sources = await client.getDataTransparency();

      expect(Array.isArray(sources)).toBe(true);
      expect(sources.length).toBeGreaterThan(0);
    });

    it('应该返回数据源详情', async () => {
      const sources = await client.getDataTransparency();
      const source = sources[0];

      expect(source).toHaveProperty('sourceId');
      expect(source).toHaveProperty('name');
      expect(source).toHaveProperty('type');
      expect(source).toHaveProperty('credibilityScore');
      expect(source).toHaveProperty('status');
      expect(source).toHaveProperty('verificationMethod');
    });
  });

  describe('getCrossChainCoverage() 方法', () => {
    it('应该返回跨链覆盖数据', async () => {
      const coverage = await client.getCrossChainCoverage();

      expect(coverage).toHaveProperty('totalAssets');
      expect(coverage).toHaveProperty('byChain');
      expect(coverage).toHaveProperty('byAssetType');
      expect(coverage).toHaveProperty('assets');
    });

    it('应该返回资产列表', async () => {
      const coverage = await client.getCrossChainCoverage();

      expect(Array.isArray(coverage.assets)).toBe(true);
      expect(coverage.assets.length).toBeGreaterThan(0);
    });

    it('应该返回资产详情', async () => {
      const coverage = await client.getCrossChainCoverage();
      const asset = coverage.assets[0];

      expect(asset).toHaveProperty('symbol');
      expect(asset).toHaveProperty('name');
      expect(asset).toHaveProperty('chains');
      expect(asset).toHaveProperty('coverageStatus');
    });
  });

  describe('getDataSourceVerification() 方法', () => {
    it('应该返回数据源验证数据', async () => {
      const verifications = await client.getDataSourceVerification();

      expect(Array.isArray(verifications)).toBe(true);
      expect(verifications.length).toBeGreaterThan(0);
    });

    it('应该返回验证详情', async () => {
      const verifications = await client.getDataSourceVerification();
      const verification = verifications[0];

      expect(verification).toHaveProperty('verificationId');
      expect(verification).toHaveProperty('sourceId');
      expect(verification).toHaveProperty('status');
      expect(verification).toHaveProperty('method');
    });
  });

  describe('getNetworkStats() 方法', () => {
    it('应该返回网络统计数据', async () => {
      const stats = await client.getNetworkStats();

      expect(stats).toHaveProperty('activeDataSources');
      expect(stats).toHaveProperty('nodeUptime');
      expect(stats).toHaveProperty('avgResponseTime');
      expect(stats).toHaveProperty('dataFeeds');
      expect(stats).toHaveProperty('status');
    });
  });

  describe('getStakingData() 方法', () => {
    it('应该返回质押数据', async () => {
      const staking = await client.getStakingData();

      expect(staking).toHaveProperty('totalStaked');
      expect(staking).toHaveProperty('stakingApr');
      expect(staking).toHaveProperty('stakerCount');
      expect(staking).toHaveProperty('rewardPool');
    });
  });

  describe('getNFTData() 方法', () => {
    it('应该返回 NFT 数据', async () => {
      const nftData = await client.getNFTData();

      expect(nftData).toHaveProperty('collections');
      expect(nftData).toHaveProperty('totalCollections');
      expect(nftData).toHaveProperty('byChain');
      expect(nftData).toHaveProperty('trending');
    });

    it('应该返回 NFT 集合列表', async () => {
      const nftData = await client.getNFTData();

      expect(Array.isArray(nftData.collections)).toBe(true);
      expect(nftData.collections.length).toBeGreaterThan(0);
    });

    it('应该返回集合详情', async () => {
      const nftData = await client.getNFTData();
      const collection = nftData.collections[0];

      expect(collection).toHaveProperty('id');
      expect(collection).toHaveProperty('name');
      expect(collection).toHaveProperty('symbol');
      expect(collection).toHaveProperty('floorPrice');
    });
  });

  describe('getStakingDetails() 方法', () => {
    it('应该返回质押详情', async () => {
      const details = await client.getStakingDetails();

      expect(details).toHaveProperty('totalStaked');
      expect(details).toHaveProperty('stakingApr');
      expect(details).toHaveProperty('stakerCount');
      expect(details).toHaveProperty('minStakeAmount');
      expect(details).toHaveProperty('lockPeriods');
      expect(details).toHaveProperty('aprByPeriod');
    });

    it('应该返回锁定期和 APR', async () => {
      const details = await client.getStakingDetails();

      expect(details.lockPeriods).toContain(30);
      expect(details.lockPeriods).toContain(90);
      expect(details.lockPeriods).toContain(180);
      expect(details.lockPeriods).toContain(365);
    });
  });

  describe('getCustomFeeds() 方法', () => {
    it('应该返回自定义喂价列表', async () => {
      const feeds = await client.getCustomFeeds();

      expect(Array.isArray(feeds)).toBe(true);
      expect(feeds.length).toBeGreaterThan(0);
    });

    it('应该返回喂价详情', async () => {
      const feeds = await client.getCustomFeeds();
      const feed = feeds[0];

      expect(feed).toHaveProperty('feedId');
      expect(feed).toHaveProperty('name');
      expect(feed).toHaveProperty('assetType');
      expect(feed).toHaveProperty('chains');
      expect(feed).toHaveProperty('status');
    });
  });

  describe('getEcosystemIntegrations() 方法', () => {
    it('应该返回生态集成列表', async () => {
      const integrations = await client.getEcosystemIntegrations();

      expect(Array.isArray(integrations)).toBe(true);
      expect(integrations.length).toBeGreaterThan(0);
    });

    it('应该返回集成详情', async () => {
      const integrations = await client.getEcosystemIntegrations();
      const integration = integrations[0];

      expect(integration).toHaveProperty('protocolId');
      expect(integration).toHaveProperty('name');
      expect(integration).toHaveProperty('category');
      expect(integration).toHaveProperty('tvl');
    });
  });
});
