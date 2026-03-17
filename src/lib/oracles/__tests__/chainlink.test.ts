import { ChainlinkClient } from '../chainlink';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { PriceData, OracleProvider, Blockchain } from '@/types/oracle';
import * as storage from '../storage';

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data) => ({ json: () => Promise.resolve(data) })),
  },
}));

jest.mock('../storage', () => ({
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

describe('ChainlinkClient', () => {
  let client: ChainlinkClient;

  beforeEach(() => {
    client = new ChainlinkClient();
    jest.clearAllMocks();
  });

  describe('客户端初始化和配置', () => {
    it('应该正确初始化客户端', () => {
      expect(client).toBeInstanceOf(ChainlinkClient);
      expect(client.name).toBe(OracleProvider.CHAINLINK);
    });

    it('应该使用默认配置初始化', () => {
      const defaultClient = new ChainlinkClient();
      expect(defaultClient['config']).toEqual({
        useDatabase: true,
        fallbackToMock: true,
      });
    });

    it('应该接受自定义配置', () => {
      const customClient = new ChainlinkClient({
        useDatabase: false,
        fallbackToMock: false,
      });
      expect(customClient['config']).toEqual({
        useDatabase: false,
        fallbackToMock: false,
      });
    });

    it('应该合并默认配置和自定义配置', () => {
      const partialClient = new ChainlinkClient({
        useDatabase: false,
      });
      expect(partialClient['config']).toEqual({
        useDatabase: false,
        fallbackToMock: true,
      });
    });
  });

  describe('支持的链列表', () => {
    it('应该包含正确的支持链列表', () => {
      const expectedChains = [
        Blockchain.ETHEREUM,
        Blockchain.ARBITRUM,
        Blockchain.OPTIMISM,
        Blockchain.POLYGON,
        Blockchain.AVALANCHE,
        Blockchain.BNB_CHAIN,
        Blockchain.BASE,
        Blockchain.SOLANA,
      ];

      expect(client.supportedChains).toEqual(expectedChains);
      expect(client.supportedChains.length).toBe(8);
    });

    it('应该支持以太坊主网', () => {
      expect(client.supportedChains).toContain(Blockchain.ETHEREUM);
    });

    it('应该支持 L2 网络', () => {
      expect(client.supportedChains).toContain(Blockchain.ARBITRUM);
      expect(client.supportedChains).toContain(Blockchain.OPTIMISM);
      expect(client.supportedChains).toContain(Blockchain.BASE);
    });

    it('应该支持 Solana', () => {
      expect(client.supportedChains).toContain(Blockchain.SOLANA);
    });
  });

  describe('getPrice() 方法', () => {
    beforeEach(() => {
      (storage.shouldUseDatabase as jest.Mock).mockReturnValue(false);
    });

    it('应该返回正确的价格数据结构', async () => {
      const price = await client.getPrice('BTC');

      expect(price).toHaveProperty('provider', OracleProvider.CHAINLINK);
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
      expect(typeof price.change24h).toBe('number');
      expect(typeof price.change24hPercent).toBe('number');
    });

    it('应该使用 UNIFIED_BASE_PRICES 中的基准价格', async () => {
      const btcPrice = await client.getPrice('BTC');
      const basePrice = UNIFIED_BASE_PRICES.BTC;
      const maxDeviation = basePrice * 0.04;

      expect(btcPrice.price).toBeGreaterThan(basePrice - maxDeviation);
      expect(btcPrice.price).toBeLessThan(basePrice + maxDeviation);
    });

    it('应该处理未知 symbol 并使用默认价格', async () => {
      const price = await client.getPrice('UNKNOWN_TOKEN');

      expect(price).toHaveProperty('symbol', 'UNKNOWN_TOKEN');
      expect(price.price).toBeGreaterThan(0);
      expect(price.price).toBeLessThan(200);
    });

    it('应该支持指定链参数', async () => {
      const price = await client.getPrice('ETH', Blockchain.ETHEREUM);

      expect(price.chain).toBe(Blockchain.ETHEREUM);
      expect(price.symbol).toBe('ETH');
    });

    it('应该支持不同链的价格查询', async () => {
      const ethPrice = await client.getPrice('ETH', Blockchain.ETHEREUM);
      const arbPrice = await client.getPrice('ETH', Blockchain.ARBITRUM);

      expect(ethPrice.chain).toBe(Blockchain.ETHEREUM);
      expect(arbPrice.chain).toBe(Blockchain.ARBITRUM);
    });

    it('应该返回有效的 confidence 值', async () => {
      const price = await client.getPrice('BTC');

      expect(price.confidence).toBeGreaterThanOrEqual(0.95);
      expect(price.confidence).toBeLessThanOrEqual(1);
    });

    it('应该返回正确的时间戳', async () => {
      const beforeTime = Date.now();
      const price = await client.getPrice('BTC');
      const afterTime = Date.now();

      expect(price.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(price.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('应该正确处理 symbol 大小写', async () => {
      const upperPrice = await client.getPrice('BTC');
      const lowerPrice = await client.getPrice('btc');

      expect(upperPrice.symbol).toBe('BTC');
      expect(lowerPrice.symbol).toBe('btc');
    });
  });

  describe('getHistoricalPrices() 方法', () => {
    beforeEach(() => {
      (storage.shouldUseDatabase as jest.Mock).mockReturnValue(false);
    });

    it('应该返回历史价格数组', async () => {
      const prices = await client.getHistoricalPrices('BTC');

      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);
    });

    it('应该返回默认 24 小时的历史数据', async () => {
      const prices = await client.getHistoricalPrices('ETH');

      expect(prices.length).toBe(96);
    });

    it('应该返回指定时间段的历史数据', async () => {
      const prices12h = await client.getHistoricalPrices('BTC', undefined, 12);
      const prices48h = await client.getHistoricalPrices('BTC', undefined, 48);

      expect(prices12h.length).toBe(48);
      expect(prices48h.length).toBe(192);
    });

    it('应该按时间顺序排列价格数据', async () => {
      const prices = await client.getHistoricalPrices('BTC');

      for (let i = 1; i < prices.length; i++) {
        expect(prices[i].timestamp).toBeGreaterThan(prices[i - 1].timestamp);
      }
    });

    it('应该返回正确的时间间隔', async () => {
      const period = 24;
      const prices = await client.getHistoricalPrices('BTC', undefined, period);
      const expectedInterval = (period * 60 * 60 * 1000) / prices.length;

      for (let i = 1; i < prices.length; i++) {
        const interval = prices[i].timestamp - prices[i - 1].timestamp;
        expect(Math.abs(interval - expectedInterval)).toBeLessThan(100);
      }
    });

    it('应该返回包含正确 symbol 的价格数据', async () => {
      const prices = await client.getHistoricalPrices('SOL');

      prices.forEach((price) => {
        expect(price.symbol).toBe('SOL');
      });
    });

    it('应该返回包含正确 provider 的价格数据', async () => {
      const prices = await client.getHistoricalPrices('BTC');

      prices.forEach((price) => {
        expect(price.provider).toBe(OracleProvider.CHAINLINK);
      });
    });

    it('应该支持指定链参数', async () => {
      const prices = await client.getHistoricalPrices('ETH', Blockchain.POLYGON);

      prices.forEach((price) => {
        expect(price.chain).toBe(Blockchain.POLYGON);
      });
    });

    it('应该返回价格在合理范围内', async () => {
      const basePrice = UNIFIED_BASE_PRICES.BTC;
      const prices = await client.getHistoricalPrices('BTC');

      prices.forEach((price) => {
        expect(price.price).toBeGreaterThan(basePrice * 0.8);
        expect(price.price).toBeLessThan(basePrice * 1.2);
      });
    });

    it('应该返回包含 24h 变化的历史价格数据', async () => {
      const prices = await client.getHistoricalPrices('ETH');

      prices.forEach((price) => {
        expect(price).toHaveProperty('change24h');
        expect(price).toHaveProperty('change24hPercent');
      });
    });
  });

  describe('数据库集成', () => {
    it('当数据库启用时应该尝试从数据库获取价格', async () => {
      (storage.shouldUseDatabase as jest.Mock).mockReturnValue(true);
      (storage.getPriceFromDatabase as jest.Mock).mockResolvedValue(null);
      (storage.savePriceToDatabase as jest.Mock).mockResolvedValue(true);

      await client.getPrice('BTC');

      expect(storage.getPriceFromDatabase).toHaveBeenCalledWith(
        OracleProvider.CHAINLINK,
        'BTC',
        undefined
      );
    });

    it('当数据库有缓存数据时应该返回缓存价格', async () => {
      const cachedPrice: PriceData = {
        provider: OracleProvider.CHAINLINK,
        symbol: 'BTC',
        price: 67500,
        timestamp: Date.now() - 1000,
        decimals: 8,
        confidence: 0.98,
      };

      (storage.shouldUseDatabase as jest.Mock).mockReturnValue(true);
      (storage.getPriceFromDatabase as jest.Mock).mockResolvedValue(cachedPrice);

      const price = await client.getPrice('BTC');

      expect(price).toEqual(cachedPrice);
      expect(storage.savePriceToDatabase).not.toHaveBeenCalled();
    });

    it('当数据库无缓存数据时应该保存新生成的价格', async () => {
      (storage.shouldUseDatabase as jest.Mock).mockReturnValue(true);
      (storage.getPriceFromDatabase as jest.Mock).mockResolvedValue(null);
      (storage.savePriceToDatabase as jest.Mock).mockResolvedValue(true);

      await client.getPrice('BTC');

      expect(storage.savePriceToDatabase).toHaveBeenCalled();
    });

    it('当 useDatabase 为 false 时不应访问数据库', async () => {
      const noDbClient = new ChainlinkClient({ useDatabase: false });

      await noDbClient.getPrice('BTC');

      expect(storage.getPriceFromDatabase).not.toHaveBeenCalled();
      expect(storage.savePriceToDatabase).not.toHaveBeenCalled();
    });

    it('应该尝试从数据库获取历史价格', async () => {
      (storage.shouldUseDatabase as jest.Mock).mockReturnValue(true);
      (storage.getHistoricalPricesFromDatabase as jest.Mock).mockResolvedValue(null);
      (storage.savePricesToDatabase as jest.Mock).mockResolvedValue(96);

      await client.getHistoricalPrices('BTC');

      expect(storage.getHistoricalPricesFromDatabase).toHaveBeenCalledWith(
        OracleProvider.CHAINLINK,
        'BTC',
        undefined,
        24
      );
    });

    it('当数据库有历史价格缓存时应该返回缓存数据', async () => {
      const cachedPrices: PriceData[] = [
        {
          provider: OracleProvider.CHAINLINK,
          symbol: 'BTC',
          price: 67000,
          timestamp: Date.now() - 3600000,
          decimals: 8,
        },
      ];

      (storage.shouldUseDatabase as jest.Mock).mockReturnValue(true);
      (storage.getHistoricalPricesFromDatabase as jest.Mock).mockResolvedValue(cachedPrices);

      const prices = await client.getHistoricalPrices('BTC');

      expect(prices).toEqual(cachedPrices);
      expect(storage.savePricesToDatabase).not.toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该正确创建错误对象', () => {
      const error = client['createError']('Test error', 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.provider).toBe(OracleProvider.CHAINLINK);
      expect(error.code).toBe('TEST_CODE');
    });

    it('应该创建不带 code 的错误对象', () => {
      const error = client['createError']('Test error');

      expect(error.message).toBe('Test error');
      expect(error.provider).toBe(OracleProvider.CHAINLINK);
      expect(error.code).toBeUndefined();
    });

    it('数据库错误时应该抛出 PriceFetchError', async () => {
      (storage.shouldUseDatabase as jest.Mock).mockReturnValue(true);
      (storage.getPriceFromDatabase as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(client.getPrice('BTC')).rejects.toThrow(
        'Failed to fetch price for BTC from chainlink'
      );
    });

    it('数据库保存失败时应该仍然返回价格数据', async () => {
      (storage.shouldUseDatabase as jest.Mock).mockReturnValue(true);
      (storage.getPriceFromDatabase as jest.Mock).mockResolvedValue(null);
      (storage.savePriceToDatabase as jest.Mock).mockResolvedValue(false);

      const price = await client.getPrice('ETH');

      expect(price).toHaveProperty('symbol', 'ETH');
      expect(price.price).toBeGreaterThan(0);
    });
  });

  describe('Mock 数据生成', () => {
    it('应该生成价格在合理波动范围内', async () => {
      const basePrice = UNIFIED_BASE_PRICES.ETH;
      const prices: number[] = [];

      for (let i = 0; i < 100; i++) {
        const price = await client.getPrice('ETH');
        prices.push(price.price);
      }

      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const deviation = Math.abs(avgPrice - basePrice) / basePrice;

      expect(deviation).toBeLessThan(0.05);
    });

    it('应该为不同链生成不同的波动率', async () => {
      const ethPrices: number[] = [];
      const solPrices: number[] = [];

      for (let i = 0; i < 50; i++) {
        const ethPrice = await client.getPrice('ETH', Blockchain.ETHEREUM);
        const solPrice = await client.getPrice('SOL', Blockchain.SOLANA);
        ethPrices.push(ethPrice.price);
        solPrices.push(solPrice.price);
      }

      const ethCV = calculateCoefficientOfVariation(ethPrices);
      const solCV = calculateCoefficientOfVariation(solPrices);

      expect(solCV).toBeGreaterThan(ethCV);
    });

    it('应该生成随机但连续的历史价格', async () => {
      const prices = await client.getHistoricalPrices('BTC');

      let maxJump = 0;
      for (let i = 1; i < prices.length; i++) {
        const jump = Math.abs(prices[i].price - prices[i - 1].price) / prices[i - 1].price;
        maxJump = Math.max(maxJump, jump);
      }

      expect(maxJump).toBeLessThan(0.02);
    });

    it('应该生成有效的 confidence 值范围', async () => {
      const prices = await client.getHistoricalPrices('ETH');

      prices.forEach((price) => {
        if (price.confidence !== undefined) {
          expect(price.confidence).toBeGreaterThanOrEqual(0.95);
          expect(price.confidence).toBeLessThanOrEqual(1);
        }
      });
    });

    it('应该生成有效的 24h 变化数据', async () => {
      const price = await client.getPrice('BTC');

      expect(price.change24hPercent).toBeGreaterThanOrEqual(-5);
      expect(price.change24hPercent).toBeLessThanOrEqual(5);
    });
  });
});

function calculateCoefficientOfVariation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return stdDev / mean;
}
