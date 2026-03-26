import { BandProtocolClient, calculateMovingAverage, calculateStandardDeviation, calculateTechnicalIndicators } from '../bandProtocol';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { PriceData, OracleProvider, Blockchain } from '@/types/oracle';
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

describe('BandProtocolClient', () => {
  let client: BandProtocolClient;

  beforeEach(() => {
    client = new BandProtocolClient();
    jest.clearAllMocks();
    (storage.shouldUseDatabase as jest.Mock).mockReturnValue(false);
  });

  describe('客户端初始化和配置', () => {
    it('应该正确初始化客户端', () => {
      expect(client).toBeInstanceOf(BandProtocolClient);
      expect(client.name).toBe(OracleProvider.BAND_PROTOCOL);
    });

    it('应该使用默认配置初始化', () => {
      const defaultClient = new BandProtocolClient();
      expect(defaultClient['config']).toEqual({
        useDatabase: true,
        fallbackToMock: true,
      });
    });

    it('应该接受自定义配置', () => {
      const customClient = new BandProtocolClient({
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
        Blockchain.POLYGON,
        Blockchain.AVALANCHE,
        Blockchain.BNB_CHAIN,
        Blockchain.COSMOS,
        Blockchain.OSMOSIS,
        Blockchain.JUNO,
      ];

      expect(client.supportedChains).toEqual(expectedChains);
      expect(client.supportedChains.length).toBe(7);
    });

    it('应该支持 Cosmos 生态', () => {
      expect(client.supportedChains).toContain(Blockchain.COSMOS);
      expect(client.supportedChains).toContain(Blockchain.OSMOSIS);
      expect(client.supportedChains).toContain(Blockchain.JUNO);
    });
  });

  describe('getPrice() 方法', () => {
    it('应该返回正确的价格数据结构', async () => {
      const price = await client.getPrice('BTC');

      expect(price).toHaveProperty('provider', OracleProvider.BAND_PROTOCOL);
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
      const price = await client.getPrice('ETH', Blockchain.COSMOS);

      expect(price.chain).toBe(Blockchain.COSMOS);
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

  describe('getBandMarketData() 方法', () => {
    it('应该返回 BAND 代币市场数据', async () => {
      const marketData = await client.getBandMarketData();

      expect(marketData).toHaveProperty('symbol', 'BAND');
      expect(marketData).toHaveProperty('price');
      expect(marketData).toHaveProperty('marketCap');
      expect(marketData).toHaveProperty('volume24h');
      expect(marketData).toHaveProperty('stakingRatio');
      expect(marketData).toHaveProperty('stakingApr');
    });

    it('应该返回有效的价格数据', async () => {
      const marketData = await client.getBandMarketData();

      expect(marketData.price).toBeGreaterThan(0);
      expect(marketData.marketCap).toBeGreaterThan(0);
      expect(marketData.volume24h).toBeGreaterThan(0);
    });
  });

  describe('getValidators() 方法', () => {
    it('应该返回验证者列表', async () => {
      const validators = await client.getValidators();

      expect(Array.isArray(validators)).toBe(true);
      expect(validators.length).toBeGreaterThan(0);
    });

    it('应该返回指定数量的验证者', async () => {
      const validators = await client.getValidators(10);

      expect(validators.length).toBe(10);
    });

    it('应该返回验证者的必要属性', async () => {
      const validators = await client.getValidators(1);
      const validator = validators[0];

      expect(validator).toHaveProperty('operatorAddress');
      expect(validator).toHaveProperty('moniker');
      expect(validator).toHaveProperty('tokens');
      expect(validator).toHaveProperty('commissionRate');
      expect(validator).toHaveProperty('uptime');
      expect(validator).toHaveProperty('jailed');
    });
  });

  describe('getNetworkStats() 方法', () => {
    it('应该返回网络统计数据', async () => {
      const stats = await client.getNetworkStats();

      expect(stats).toHaveProperty('activeValidators');
      expect(stats).toHaveProperty('totalValidators');
      expect(stats).toHaveProperty('bondedTokens');
      expect(stats).toHaveProperty('stakingRatio');
      expect(stats).toHaveProperty('blockTime');
      expect(stats).toHaveProperty('inflationRate');
    });
  });

  describe('getCrossChainStats() 方法', () => {
    it('应该返回跨链统计数据', async () => {
      const stats = await client.getCrossChainStats();

      expect(stats).toHaveProperty('totalRequests24h');
      expect(stats).toHaveProperty('totalRequests7d');
      expect(stats).toHaveProperty('totalRequests30d');
      expect(stats).toHaveProperty('chains');
      expect(Array.isArray(stats.chains)).toBe(true);
    });

    it('应该返回链数据', async () => {
      const stats = await client.getCrossChainStats();

      expect(stats.chains.length).toBeGreaterThan(0);
      expect(stats.chains[0]).toHaveProperty('chainName');
      expect(stats.chains[0]).toHaveProperty('chainId');
      expect(stats.chains[0]).toHaveProperty('requestCount24h');
    });
  });

  describe('getHistoricalBandPrices() 方法', () => {
    it('应该返回历史价格数据', async () => {
      const prices = await client.getHistoricalBandPrices('30d');

      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);
    });

    it('应该返回不同周期的数据', async () => {
      const prices1d = await client.getHistoricalBandPrices('1d');
      const prices7d = await client.getHistoricalBandPrices('7d');

      expect(prices1d.length).toBe(24);
      expect(prices7d.length).toBe(84);
    });

    it('应该包含技术指标', async () => {
      const prices = await client.getHistoricalBandPrices('30d');

      expect(prices[0]).toHaveProperty('ma7');
      expect(prices[0]).toHaveProperty('ma20');
      expect(prices[0]).toHaveProperty('stdDev1Upper');
      expect(prices[0]).toHaveProperty('stdDev1Lower');
    });
  });

  describe('getValidatorHistory() 方法', () => {
    it('应该返回验证者历史数据', async () => {
      const history = await client.getValidatorHistory('bandvaloper1test', 30);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(30);
    });

    it('应该返回历史数据点', async () => {
      const history = await client.getValidatorHistory('bandvaloper1test', 7);
      const dataPoint = history[0];

      expect(dataPoint).toHaveProperty('timestamp');
      expect(dataPoint).toHaveProperty('uptime');
      expect(dataPoint).toHaveProperty('stakedAmount');
      expect(dataPoint).toHaveProperty('commissionRate');
    });
  });

  describe('getChainEvents() 方法', () => {
    it('应该返回链事件列表', async () => {
      const events = await client.getChainEvents(10);

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(10);
    });

    it('应该返回事件详情', async () => {
      const events = await client.getChainEvents(1);
      const event = events[0];

      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('validator');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('description');
    });

    it('应该按时间倒序排列', async () => {
      const events = await client.getChainEvents(10);

      for (let i = 1; i < events.length; i++) {
        expect(events[i].timestamp).toBeLessThanOrEqual(events[i - 1].timestamp);
      }
    });
  });
});

describe('Technical Indicator Functions', () => {
  describe('calculateMovingAverage', () => {
    it('should calculate moving average correctly', () => {
      const prices = [10, 20, 30, 40, 50];
      const ma = calculateMovingAverage(prices, 3);

      expect(ma.length).toBe(prices.length);
      expect(ma[2]).toBe(20); // (10 + 20 + 30) / 3
      expect(ma[3]).toBe(30); // (20 + 30 + 40) / 3
      expect(ma[4]).toBe(40); // (30 + 40 + 50) / 3
    });

    it('should return original prices for early values', () => {
      const prices = [10, 20, 30];
      const ma = calculateMovingAverage(prices, 5);

      expect(ma[0]).toBe(10);
      expect(ma[1]).toBe(20);
      expect(ma[2]).toBe(30);
    });
  });

  describe('calculateStandardDeviation', () => {
    it('should calculate standard deviation correctly', () => {
      const prices = [10, 20, 30, 40, 50];
      const result = calculateStandardDeviation(prices);

      expect(result).toHaveProperty('mean');
      expect(result).toHaveProperty('stdDev');
      expect(result).toHaveProperty('upper1');
      expect(result).toHaveProperty('lower1');
      expect(result).toHaveProperty('upper2');
      expect(result).toHaveProperty('lower2');

      expect(result.mean).toBe(30);
      expect(result.upper1).toBe(result.mean + result.stdDev);
      expect(result.lower1).toBe(result.mean - result.stdDev);
    });
  });

  describe('calculateTechnicalIndicators', () => {
    it('should calculate all indicators', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 10 + i);
      const indicators = calculateTechnicalIndicators(prices);

      expect(indicators).toHaveProperty('ma7');
      expect(indicators).toHaveProperty('ma20');
      expect(indicators).toHaveProperty('stdDev1Upper');
      expect(indicators).toHaveProperty('stdDev1Lower');
      expect(indicators).toHaveProperty('stdDev2Upper');
      expect(indicators).toHaveProperty('stdDev2Lower');

      expect(indicators.ma7.length).toBe(prices.length);
      expect(indicators.ma20.length).toBe(prices.length);
    });
  });
});
