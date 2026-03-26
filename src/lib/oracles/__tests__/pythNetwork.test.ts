import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { OracleProvider, Blockchain } from '@/types/oracle/enums';
import { type ConfidenceInterval } from '@/types/oracle/price';

import { PythClient } from '../pythNetwork';

jest.mock('../storage', () => ({
  shouldUseDatabase: jest.fn().mockReturnValue(false),
  savePriceToDatabase: jest.fn().mockResolvedValue(undefined),
  savePricesToDatabase: jest.fn().mockResolvedValue(undefined),
  getPriceFromDatabase: jest.fn().mockResolvedValue(null),
  getHistoricalPricesFromDatabase: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/errors', () => ({
  PriceFetchError: class PriceFetchError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PriceFetchError';
    }
  },
  OracleClientError: class OracleClientError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'OracleClientError';
    }
  },
  NotImplementedError: class NotImplementedError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotImplementedError';
    }
  },
}));

describe('PythClient', () => {
  let client: PythClient;

  beforeEach(() => {
    client = new PythClient();
    jest.clearAllMocks();
  });

  describe('客户端初始化', () => {
    it('应该正确初始化客户端', () => {
      expect(client).toBeDefined();
      expect(client.name).toBe(OracleProvider.PYTH);
    });

    it('应该使用默认配置初始化', () => {
      const defaultClient = new PythClient();
      expect(defaultClient).toBeDefined();
    });

    it('应该接受自定义配置', () => {
      const customClient = new PythClient({
        useDatabase: false,
        fallbackToMock: true,
      });
      expect(customClient).toBeDefined();
    });

    it('应该正确设置 provider 名称', () => {
      expect(client.name).toBe('pyth');
    });
  });

  describe('支持的链', () => {
    it('应该支持正确的区块链列表', () => {
      const expectedChains = [
        Blockchain.ETHEREUM,
        Blockchain.ARBITRUM,
        Blockchain.OPTIMISM,
        Blockchain.POLYGON,
        Blockchain.SOLANA,
        Blockchain.AVALANCHE,
        Blockchain.BNB_CHAIN,
        Blockchain.APTOS,
        Blockchain.SUI,
      ];

      expect(client.supportedChains).toEqual(expectedChains);
    });

    it('应该支持 Ethereum', () => {
      expect(client.supportedChains).toContain(Blockchain.ETHEREUM);
    });

    it('应该支持 Solana', () => {
      expect(client.supportedChains).toContain(Blockchain.SOLANA);
    });

    it('应该支持 Aptos', () => {
      expect(client.supportedChains).toContain(Blockchain.APTOS);
    });

    it('应该支持 SUI', () => {
      expect(client.supportedChains).toContain(Blockchain.SUI);
    });

    it('应该支持 Arbitrum', () => {
      expect(client.supportedChains).toContain(Blockchain.ARBITRUM);
    });

    it('应该支持 Optimism', () => {
      expect(client.supportedChains).toContain(Blockchain.OPTIMISM);
    });

    it('应该支持 Polygon', () => {
      expect(client.supportedChains).toContain(Blockchain.POLYGON);
    });

    it('应该支持 Avalanche', () => {
      expect(client.supportedChains).toContain(Blockchain.AVALANCHE);
    });

    it('应该支持 BNB Chain', () => {
      expect(client.supportedChains).toContain(Blockchain.BNB_CHAIN);
    });

    it('应该返回正确数量的支持链', () => {
      expect(client.supportedChains.length).toBe(9);
    });
  });

  describe('getPrice()', () => {
    it('应该返回有效的价格数据', async () => {
      const priceData = await client.getPrice('BTC');

      expect(priceData).toBeDefined();
      expect(priceData.symbol).toBe('BTC');
      expect(priceData.price).toBeGreaterThan(0);
      expect(priceData.provider).toBe(OracleProvider.PYTH);
      expect(priceData.timestamp).toBeDefined();
    });

    it('应该返回包含置信区间的价格数据', async () => {
      const priceData = await client.getPrice('ETH');

      expect(priceData.confidenceInterval).toBeDefined();
      expect(priceData.confidenceInterval?.bid).toBeDefined();
      expect(priceData.confidenceInterval?.ask).toBeDefined();
      expect(priceData.confidenceInterval?.widthPercentage).toBeDefined();
    });

    it('应该返回有效的 bid/ask 价格', async () => {
      const priceData = await client.getPrice('BTC');
      const { confidenceInterval } = priceData;

      expect(confidenceInterval?.bid).toBeLessThan(priceData.price);
      expect(confidenceInterval?.ask).toBeGreaterThan(priceData.price);
    });

    it('应该为不同代币生成不同的价差', async () => {
      const btcPrice = await client.getPrice('BTC');
      const usdcPrice = await client.getPrice('USDC');

      expect(btcPrice.confidenceInterval?.widthPercentage).toBeDefined();
      expect(usdcPrice.confidenceInterval?.widthPercentage).toBeDefined();
    });

    it('应该支持指定链获取价格', async () => {
      const priceData = await client.getPrice('ETH', Blockchain.ETHEREUM);

      expect(priceData.chain).toBe(Blockchain.ETHEREUM);
      expect(priceData.symbol).toBe('ETH');
    });

    it('应该支持 Solana 链', async () => {
      const priceData = await client.getPrice('SOL', Blockchain.SOLANA);

      expect(priceData.chain).toBe(Blockchain.SOLANA);
    });

    it('应该为未知代币使用默认基础价格', async () => {
      const priceData = await client.getPrice('UNKNOWN_TOKEN');

      expect(priceData).toBeDefined();
      expect(priceData.price).toBeGreaterThan(0);
    });

    it('应该返回正确的 decimals', async () => {
      const priceData = await client.getPrice('BTC');

      expect(priceData.decimals).toBe(8);
    });

    it('应该返回有效的 confidence 值', async () => {
      const priceData = await client.getPrice('ETH');

      expect(priceData.confidence).toBeGreaterThanOrEqual(0.95);
      expect(priceData.confidence).toBeLessThanOrEqual(1);
    });

    it('应该返回 24h 变化数据', async () => {
      const priceData = await client.getPrice('BTC');

      expect(priceData.change24h).toBeDefined();
      expect(priceData.change24hPercent).toBeDefined();
    });

    it('应该正确处理大小写不敏感的符号', async () => {
      const lowerCasePrice = await client.getPrice('btc');
      const upperCasePrice = await client.getPrice('BTC');

      expect(lowerCasePrice.price).toBeGreaterThan(0);
      expect(upperCasePrice.price).toBeGreaterThan(0);
    });
  });

  describe('getHistoricalPrices()', () => {
    it('应该返回历史价格数组', async () => {
      const prices = await client.getHistoricalPrices('BTC');

      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);
    });

    it('应该返回指定时间段的价格数据', async () => {
      const period = 24;
      const prices = await client.getHistoricalPrices('ETH', undefined, period);

      expect(prices.length).toBe(period * 4);
    });

    it('应该返回按时间排序的价格数据', async () => {
      const prices = await client.getHistoricalPrices('BTC');

      for (let i = 1; i < prices.length; i++) {
        expect(prices[i].timestamp).toBeGreaterThan(prices[i - 1].timestamp);
      }
    });

    it('应该返回正确的时间戳', async () => {
      const period = 12;
      const prices = await client.getHistoricalPrices('ETH', undefined, period);
      const now = Date.now();
      const oldestTimestamp = prices[0].timestamp;
      const expectedOldest = now - period * 60 * 60 * 1000;

      expect(oldestTimestamp).toBeGreaterThanOrEqual(expectedOldest - 60000);
    });

    it('应该为每个价格点包含正确的 symbol', async () => {
      const prices = await client.getHistoricalPrices('SOL');

      prices.forEach((price) => {
        expect(price.symbol).toBe('SOL');
      });
    });

    it('应该为每个价格点包含正确的 provider', async () => {
      const prices = await client.getHistoricalPrices('BTC');

      prices.forEach((price) => {
        expect(price.provider).toBe(OracleProvider.PYTH);
      });
    });

    it('应该支持指定链获取历史价格', async () => {
      const prices = await client.getHistoricalPrices('ETH', Blockchain.ETHEREUM, 6);

      expect(prices.length).toBe(6 * 4);
      prices.forEach((price) => {
        expect(price.chain).toBe(Blockchain.ETHEREUM);
      });
    });

    it('应该使用默认时间段（24小时）', async () => {
      const prices = await client.getHistoricalPrices('BTC');

      expect(prices.length).toBe(96);
    });

    it('应该返回有效的价格范围', async () => {
      const basePrice = UNIFIED_BASE_PRICES.BTC;
      const prices = await client.getHistoricalPrices('BTC');

      prices.forEach((price) => {
        expect(price.price).toBeGreaterThan(basePrice * 0.8);
        expect(price.price).toBeLessThan(basePrice * 1.2);
      });
    });
  });

  describe('Pyth 特有的置信区间处理', () => {
    it('应该生成有效的置信区间', async () => {
      const priceData = await client.getPrice('BTC');
      const interval = priceData.confidenceInterval;

      expect(interval).toBeDefined();
      expect(interval?.bid).toBeLessThan(interval!.ask);
      expect(interval?.widthPercentage).toBeGreaterThan(0);
    });

    it('bid 应该小于价格，ask 应该大于价格', async () => {
      const priceData = await client.getPrice('ETH');
      const { price, confidenceInterval } = priceData;

      expect(confidenceInterval?.bid).toBeLessThan(price);
      expect(confidenceInterval?.ask).toBeGreaterThan(price);
    });

    it('应该为 BTC 生成较小的价差', async () => {
      const btcPrice = await client.getPrice('BTC');
      const btcWidth = btcPrice.confidenceInterval?.widthPercentage;

      expect(btcWidth).toBeLessThan(0.1);
    });

    it('应该为 USDC 生成最小的价差', async () => {
      const usdcPrice = await client.getPrice('USDC');
      const usdcWidth = usdcPrice.confidenceInterval?.widthPercentage;

      expect(usdcWidth).toBeLessThan(0.05);
    });

    it('应该为 PYTH 生成较大的价差', async () => {
      const pythPrice = await client.getPrice('PYTH');
      const pythWidth = pythPrice.confidenceInterval?.widthPercentage;

      expect(pythWidth).toBeGreaterThan(0);
    });

    it('应该为未知代币使用默认价差', async () => {
      const unknownPrice = await client.getPrice('RANDO');
      const width = unknownPrice.confidenceInterval?.widthPercentage;

      expect(width).toBeGreaterThan(0);
      expect(width).toBeLessThan(0.2);
    });

    it('置信区间价差应该对称', async () => {
      const priceData = await client.getPrice('BTC');
      const { price, confidenceInterval } = priceData;

      if (confidenceInterval) {
        const bidDiff = price - confidenceInterval.bid;
        const askDiff = confidenceInterval.ask - price;

        expect(Math.abs(bidDiff - askDiff)).toBeLessThan(0.01);
      }
    });

    it('widthPercentage 应该正确计算', async () => {
      const priceData = await client.getPrice('ETH');
      const { price, confidenceInterval } = priceData;

      if (confidenceInterval) {
        const spread = confidenceInterval.ask - confidenceInterval.bid;
        const expectedWidth = (spread / price) * 100;

        expect(Math.abs(confidenceInterval.widthPercentage - expectedWidth)).toBeLessThan(0.01);
      }
    });

    it('多次调用应该生成不同的置信区间（随机性）', async () => {
      const price1 = await client.getPrice('BTC');
      const price2 = await client.getPrice('BTC');

      expect(price1.confidenceInterval?.widthPercentage).not.toEqual(
        price2.confidenceInterval?.widthPercentage
      );
    });
  });

  describe('错误处理', () => {
    it('应该正确处理空符号', async () => {
      const priceData = await client.getPrice('');

      expect(priceData).toBeDefined();
      expect(priceData.price).toBeGreaterThan(0);
    });

    it('应该正确处理特殊字符符号', async () => {
      const priceData = await client.getPrice('BTC-USD');

      expect(priceData).toBeDefined();
    });

    it('getHistoricalPrices 应该处理无效时间段', async () => {
      const prices = await client.getHistoricalPrices('BTC', undefined, 0);

      expect(prices).toBeDefined();
    });

    it('getHistoricalPrices 应该处理负数时间段', async () => {
      const prices = await client.getHistoricalPrices('BTC', undefined, -1);

      expect(prices).toBeDefined();
    });

    it('应该处理不支持的链', async () => {
      const priceData = await client.getPrice('BTC', Blockchain.FANTOM);

      expect(priceData).toBeDefined();
      expect(priceData.chain).toBe(Blockchain.FANTOM);
    });

    it('应该正确格式化错误信息', async () => {
      const error = client['createError']('Test error', 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.provider).toBe(OracleProvider.PYTH);
      expect(error.code).toBe('TEST_CODE');
    });

    it('应该处理数据库错误并返回 mock 数据', async () => {
      const { getPriceFromDatabase } = require('../storage');
      getPriceFromDatabase.mockRejectedValueOnce(new Error('Database error'));

      const priceData = await client.getPrice('BTC');

      expect(priceData).toBeDefined();
      expect(priceData.symbol).toBe('BTC');
    });

    it('应该处理历史价格数据库错误', async () => {
      const { getHistoricalPricesFromDatabase } = require('../storage');
      getHistoricalPricesFromDatabase.mockRejectedValueOnce(new Error('Database error'));

      const prices = await client.getHistoricalPrices('ETH');

      expect(prices).toBeDefined();
      expect(prices.length).toBeGreaterThan(0);
    });
  });

  describe('价差百分比配置', () => {
    it('应该为 BTC 配置正确的价差', async () => {
      const price = await client.getPrice('BTC');
      const width = price.confidenceInterval?.widthPercentage;

      expect(width).toBeLessThanOrEqual(0.04);
    });

    it('应该为 ETH 配置正确的价差', async () => {
      const price = await client.getPrice('ETH');
      const width = price.confidenceInterval?.widthPercentage;

      expect(width).toBeLessThanOrEqual(0.06);
    });

    it('应该为 SOL 配置正确的价差', async () => {
      const price = await client.getPrice('SOL');
      const width = price.confidenceInterval?.widthPercentage;

      expect(width).toBeLessThanOrEqual(0.1);
    });

    it('应该为 PYTH 配置正确的价差', async () => {
      const price = await client.getPrice('PYTH');
      const width = price.confidenceInterval?.widthPercentage;

      expect(width).toBeLessThanOrEqual(0.2);
    });

    it('应该为 USDC 配置正确的价差', async () => {
      const price = await client.getPrice('USDC');
      const width = price.confidenceInterval?.widthPercentage;

      expect(width).toBeLessThanOrEqual(0.02);
    });
  });

  describe('价格生成逻辑', () => {
    it('应该在基础价格附近生成价格', async () => {
      const basePrice = UNIFIED_BASE_PRICES.BTC;
      const priceData = await client.getPrice('BTC');
      const maxDeviation = basePrice * 0.04;

      expect(priceData.price).toBeGreaterThan(basePrice - maxDeviation);
      expect(priceData.price).toBeLessThan(basePrice + maxDeviation);
    });

    it('应该为稳定币生成接近 1 的价格', async () => {
      const priceData = await client.getPrice('USDC');

      expect(priceData.price).toBeGreaterThan(0.96);
      expect(priceData.price).toBeLessThan(1.04);
    });

    it('应该生成有效的 24h 变化百分比', async () => {
      const priceData = await client.getPrice('ETH');

      expect(priceData.change24hPercent).toBeGreaterThanOrEqual(-5);
      expect(priceData.change24hPercent).toBeLessThanOrEqual(5);
    });

    it('历史价格应该展示随机游走特性', async () => {
      const prices = await client.getHistoricalPrices('BTC', undefined, 24);

      let hasUpMovement = false;
      let hasDownMovement = false;

      for (let i = 1; i < prices.length; i++) {
        if (prices[i].price > prices[i - 1].price) hasUpMovement = true;
        if (prices[i].price < prices[i - 1].price) hasDownMovement = true;
      }

      expect(hasUpMovement).toBe(true);
      expect(hasDownMovement).toBe(true);
    });
  });

  describe('类型和接口验证', () => {
    it('返回的价格数据应该符合 PriceData 接口', async () => {
      const priceData = await client.getPrice('BTC');

      expect(typeof priceData.provider).toBe('string');
      expect(typeof priceData.symbol).toBe('string');
      expect(typeof priceData.price).toBe('number');
      expect(typeof priceData.timestamp).toBe('number');
      expect(typeof priceData.decimals).toBe('number');
      expect(typeof priceData.confidence).toBe('number');
    });

    it('置信区间应该符合 ConfidenceInterval 接口', async () => {
      const priceData = await client.getPrice('ETH');
      const interval = priceData.confidenceInterval as ConfidenceInterval;

      expect(typeof interval.bid).toBe('number');
      expect(typeof interval.ask).toBe('number');
      expect(typeof interval.widthPercentage).toBe('number');
    });

    it('历史价格数组中的每个元素应该符合 PriceData 接口', async () => {
      const prices = await client.getHistoricalPrices('SOL', undefined, 6);

      prices.forEach((price) => {
        expect(typeof price.provider).toBe('string');
        expect(typeof price.symbol).toBe('string');
        expect(typeof price.price).toBe('number');
        expect(typeof price.timestamp).toBe('number');
      });
    });
  });
});
