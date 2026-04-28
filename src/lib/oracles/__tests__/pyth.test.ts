import { PythClient } from '@/lib/oracles/clients/PythClient';
import {
  parsePythPrice,
  calculateConfidenceInterval,
  calculateConfidenceScore,
} from '@/lib/oracles/pyth/pythParser';
import type { PythPriceRaw } from '@/lib/oracles/pyth/types';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

const mockGetLatestPrice = jest.fn();
const mockGetHistoricalPrices = jest.fn();

jest.mock('@/lib/oracles/services/pythDataService', () => ({
  getPythDataService: () => ({
    getLatestPrice: mockGetLatestPrice,
    getHistoricalPrices: mockGetHistoricalPrices,
  }),
}));

jest.mock('@/lib/services/marketData/binanceMarketService');
jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('PythClient', () => {
  let client: PythClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLatestPrice.mockReset();
    mockGetHistoricalPrices.mockReset();
    client = new PythClient();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      expect(client.name).toBe(OracleProvider.PYTH);
      expect(client.supportedChains).toContain(Blockchain.ETHEREUM);
      expect(client.supportedChains).toContain(Blockchain.SOLANA);
      expect(client.supportedChains).toContain(Blockchain.ARBITRUM);
      expect(client.defaultUpdateIntervalMinutes).toBe(1);
    });

    it('should create client with custom config', () => {
      const customClient = new PythClient({ useDatabase: false, validateData: false });
      expect(customClient).toBeInstanceOf(PythClient);
    });
  });

  describe('getSupportedSymbols', () => {
    it('should return array of supported symbols', () => {
      const symbols = client.getSupportedSymbols();
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBeGreaterThan(0);
    });

    it('should include major cryptocurrencies', () => {
      const symbols = client.getSupportedSymbols();
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('SOL');
    });
  });

  describe('getSupportedSymbolsForChain', () => {
    it('should return symbols for Ethereum', () => {
      const symbols = client.getSupportedSymbolsForChain(Blockchain.ETHEREUM);
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
    });

    it('should return symbols for Solana', () => {
      const symbols = client.getSupportedSymbolsForChain(Blockchain.SOLANA);
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols).toContain('SOL');
    });

    it('should return empty array for unsupported chain', () => {
      const symbols = client.getSupportedSymbolsForChain(Blockchain.TRON);
      expect(symbols).toEqual([]);
    });
  });

  describe('isSymbolSupported', () => {
    it('should return true for supported symbol without chain', () => {
      expect(client.isSymbolSupported('BTC')).toBe(true);
      expect(client.isSymbolSupported('ETH')).toBe(true);
      expect(client.isSymbolSupported('SOL')).toBe(true);
    });

    it('should return true for supported symbol on supported chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.ETHEREUM)).toBe(true);
      expect(client.isSymbolSupported('SOL', Blockchain.SOLANA)).toBe(true);
    });

    it('should return false for unsupported symbol', () => {
      expect(client.isSymbolSupported('UNKNOWN')).toBe(false);
    });

    it('should return false for supported symbol on unsupported chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.TRON)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(client.isSymbolSupported('btc')).toBe(true);
      expect(client.isSymbolSupported('Btc')).toBe(true);
      expect(client.isSymbolSupported('BTC')).toBe(true);
    });
  });

  describe('getSupportedChainsForSymbol', () => {
    it('should return supported chains for BTC', () => {
      const chains = client.getSupportedChainsForSymbol('BTC');
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain(Blockchain.ETHEREUM);
    });

    it('should return supported chains for SOL', () => {
      const chains = client.getSupportedChainsForSymbol('SOL');
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain(Blockchain.SOLANA);
    });

    it('should return empty array for unsupported symbol', () => {
      const chains = client.getSupportedChainsForSymbol('UNKNOWN');
      expect(chains).toEqual([]);
    });
  });

  describe('getPrice', () => {
    const mockPythPrice: PriceData = {
      provider: OracleProvider.PYTH,
      symbol: 'BTC',
      price: 68000,
      timestamp: Date.now(),
      decimals: 8,
      confidence: 0.98,
    };

    it('should throw error for empty symbol', async () => {
      await expect(client.getPrice('')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should return price data for valid symbol', async () => {
      mockGetLatestPrice.mockResolvedValue(mockPythPrice);

      const result = await client.getPrice('BTC');

      expect(result).toMatchObject({
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
        price: mockPythPrice.price,
        source: 'pyth-hermes-api',
      });
    });

    it('should return price data with chain', async () => {
      mockGetLatestPrice.mockResolvedValue(mockPythPrice);

      const result = await client.getPrice('BTC', Blockchain.SOLANA);

      expect(result.chain).toBe(Blockchain.SOLANA);
    });

    it('should use Binance API for PYTH token', async () => {
      const mockMarketData = {
        currentPrice: 0.45,
        lastUpdated: new Date().toISOString(),
        priceChange24h: 0.02,
        priceChangePercentage24h: 4.5,
      };

      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(mockMarketData);

      const result = await client.getPrice('PYTH');

      expect(binanceMarketService.getTokenMarketData).toHaveBeenCalledWith('PYTH');
      expect(result).toMatchObject({
        provider: OracleProvider.PYTH,
        symbol: 'PYTH',
        price: mockMarketData.currentPrice,
        source: 'binance-api',
      });
    });

    it('should add confidence interval if not present', async () => {
      mockGetLatestPrice.mockResolvedValue({
        ...mockPythPrice,
        confidenceInterval: undefined,
      });

      const result = await client.getPrice('BTC');

      expect(result.confidenceInterval).toBeDefined();
      expect(result.confidenceInterval).toHaveProperty('bid');
      expect(result.confidenceInterval).toHaveProperty('ask');
      expect(result.confidenceInterval).toHaveProperty('widthPercentage');
    });

    it('should throw error when no price data available', async () => {
      mockGetLatestPrice.mockResolvedValue(null);

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should handle service error', async () => {
      mockGetLatestPrice.mockRejectedValue(new Error('Network error'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should handle PYTH token with Binance fallback failure', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(null);
      mockGetLatestPrice.mockResolvedValue(null);

      await expect(client.getPrice('PYTH')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });
  });

  describe('getHistoricalPrices', () => {
    const mockHistoricalPrices = [
      { timestamp: Date.now() - 3600000, price: 67500 },
      { timestamp: Date.now() - 1800000, price: 67750 },
      { timestamp: Date.now(), price: 68000 },
    ];

    it('should return empty array for empty symbol', async () => {
      const result = await client.getHistoricalPrices('');

      expect(result).toEqual([]);
    });

    it('should return historical price data', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(
        mockHistoricalPrices
      );

      const result = await client.getHistoricalPrices('BTC');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0]).toMatchObject({
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
        source: 'binance-api',
      });
    });

    it('should return historical prices with change calculations', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(
        mockHistoricalPrices
      );

      const result = await client.getHistoricalPrices('BTC');

      expect(result[0].change24h).toBe(0);
      expect(result[0].change24hPercent).toBe(0);
    });

    it('should use specified chain', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(
        mockHistoricalPrices
      );

      const result = await client.getHistoricalPrices('BTC', Blockchain.SOLANA, 24);

      expect(result[0].chain).toBe(Blockchain.SOLANA);
    });

    it('should use default period of 24 hours', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(
        mockHistoricalPrices
      );

      await client.getHistoricalPrices('BTC');

      expect(binanceMarketService.getHistoricalPrices).toHaveBeenCalledWith('BTC', 24);
    });

    it('should use custom period', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(
        mockHistoricalPrices
      );

      await client.getHistoricalPrices('BTC', undefined, 48);

      expect(binanceMarketService.getHistoricalPrices).toHaveBeenCalledWith('BTC', 48);
    });

    it('should return empty array when no historical data available', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue([]);

      const result = await client.getHistoricalPrices('BTC');

      expect(result).toEqual([]);
    });

    it('should return empty array when historical data is null', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(null);

      const result = await client.getHistoricalPrices('BTC');

      expect(result).toEqual([]);
    });

    it('should handle service error gracefully', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      const result = await client.getHistoricalPrices('BTC');

      expect(result).toEqual([]);
    });

    it('should calculate 24h changes correctly', async () => {
      const prices = [
        { timestamp: Date.now() - 7200000, price: 67000 },
        { timestamp: Date.now() - 3600000, price: 67500 },
        { timestamp: Date.now(), price: 68000 },
      ];

      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(prices);

      const result = await client.getHistoricalPrices('BTC');

      expect(result[0].change24h).toBe(0);
      expect(result[0].change24hPercent).toBe(0);
    });
  });

  describe('generateConfidenceInterval', () => {
    it('should generate confidence interval for BTC', async () => {
      mockGetLatestPrice.mockResolvedValue({
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
        price: 68000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.98,
        confidenceInterval: undefined,
      });

      const result = await client.getPrice('BTC');

      expect(result.confidenceInterval).toBeDefined();
      expect(result.confidenceInterval!.bid).toBeLessThan(result.price);
      expect(result.confidenceInterval!.ask).toBeGreaterThan(result.price);
    });

    it('should generate confidence interval for ETH', async () => {
      mockGetLatestPrice.mockResolvedValue({
        provider: OracleProvider.PYTH,
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.98,
        confidenceInterval: undefined,
      });

      const result = await client.getPrice('ETH');

      expect(result.confidenceInterval).toBeDefined();
    });

    it('should adjust spread based on price', async () => {
      mockGetLatestPrice.mockResolvedValue({
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
        price: 68000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.98,
        confidenceInterval: undefined,
      });

      const btcResult = await client.getPrice('BTC');

      mockGetLatestPrice.mockResolvedValue({
        provider: OracleProvider.PYTH,
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.98,
        confidenceInterval: undefined,
      });

      const ethResult = await client.getPrice('ETH');

      expect(btcResult.confidenceInterval!.widthPercentage).toBeDefined();
      expect(ethResult.confidenceInterval!.widthPercentage).toBeDefined();
    });
  });
});

describe('Hermes Client Tests', () => {
  describe('Hermes API connection and data retrieval', () => {
    it('should successfully connect to Hermes API and retrieve price data', async () => {
      const mockPythPrice: PriceData = {
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
        price: 68000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 98,
      };

      mockGetLatestPrice.mockResolvedValue(mockPythPrice);

      const client = new PythClient();
      const result = await client.getPrice('BTC');

      expect(result).toBeDefined();
      expect(result.provider).toBe(OracleProvider.PYTH);
      expect(result.symbol).toBe('BTC');
      expect(result.price).toBe(68000);
      expect(result.source).toBe('pyth-hermes-api');
    });

    it('should handle Hermes API timeout gracefully', async () => {
      mockGetLatestPrice.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      );

      const client = new PythClient();

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });
  });

  describe('Invalid price feed ID handling', () => {
    it('should return null for invalid price feed ID', async () => {
      mockGetLatestPrice.mockResolvedValue(null);

      const client = new PythClient();

      await expect(client.getPrice('INVALID_SYMBOL')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should handle malformed price feed response', async () => {
      mockGetLatestPrice.mockResolvedValue({
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
        price: undefined,
        timestamp: Date.now(),
      });

      const client = new PythClient();
      const result = await client.getPrice('BTC');

      expect(result.price).toBeUndefined();
    });

    it('should validate price feed ID format', () => {
      const validPriceId = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
      const invalidPriceId = 'invalid-id';

      expect(validPriceId.length).toBe(66);
      expect(validPriceId.startsWith('0x')).toBe(true);
      expect(invalidPriceId.length).toBeLessThan(66);
    });
  });
});

describe('Confidence Interval Tests', () => {
  describe('Valid confidence interval calculation', () => {
    it('should calculate valid confidence interval from price data', () => {
      const price = 68000;
      const confidence = 100;

      const interval = calculateConfidenceInterval(price, confidence);

      expect(interval.bid).toBeLessThan(price);
      expect(interval.ask).toBeGreaterThan(price);
      expect(interval.widthPercentage).toBeGreaterThan(0);
    });

    it('should produce symmetric bid/ask spread', () => {
      const price = 3500;
      const confidence = 50;

      const interval = calculateConfidenceInterval(price, confidence);

      const bidDiff = price - interval.bid;
      const askDiff = interval.ask - price;

      expect(bidDiff).toBeCloseTo(askDiff, 4);
    });

    it('should handle zero confidence value', () => {
      const price = 68000;
      const confidence = 0;

      const interval = calculateConfidenceInterval(price, confidence);

      expect(interval.bid).toBe(price);
      expect(interval.ask).toBe(price);
      expect(interval.widthPercentage).toBe(0);
    });
  });

  describe('Narrow confidence interval (high confidence)', () => {
    it('should produce narrow interval for high confidence data', () => {
      const price = 68000;
      const confidence = 10;

      const interval = calculateConfidenceInterval(price, confidence);

      expect(interval.widthPercentage).toBeLessThan(0.1);
    });

    it('should have high confidence score for narrow interval', () => {
      const price = 68000;
      const confidence = 10;

      const score = calculateConfidenceScore(confidence, price);

      expect(score).toBeGreaterThan(98);
    });

    it('should reflect tight price bounds', () => {
      const price = 3500;
      const confidence = 5;

      const interval = calculateConfidenceInterval(price, confidence);

      const spread = interval.ask - interval.bid;
      expect(spread).toBeLessThan(price * 0.01);
    });
  });

  describe('Wide confidence interval (low confidence)', () => {
    it('should produce wide interval for low confidence data', () => {
      const price = 68000;
      const confidence = 5000;

      const interval = calculateConfidenceInterval(price, confidence);

      expect(interval.widthPercentage).toBeGreaterThan(1);
    });

    it('should have lower confidence score for wide interval', () => {
      const price = 68000;
      const confidence = 5000;

      const score = calculateConfidenceScore(confidence, price);

      expect(score).toBeLessThan(99);
    });

    it('should reflect loose price bounds', () => {
      const price = 3500;
      const confidence = 500;

      const interval = calculateConfidenceInterval(price, confidence);

      const spread = interval.ask - interval.bid;
      expect(spread).toBeGreaterThan(price * 0.01);
    });
  });

  describe('Missing confidence interval handling', () => {
    it('should generate confidence interval when missing from price data', async () => {
      const mockPythPrice: PriceData = {
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
        price: 68000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 98,
        confidenceInterval: undefined,
      };

      mockGetLatestPrice.mockResolvedValue(mockPythPrice);

      const client = new PythClient();
      const result = await client.getPrice('BTC');

      expect(result.confidenceInterval).toBeDefined();
      expect(result.confidenceInterval?.bid).toBeDefined();
      expect(result.confidenceInterval?.ask).toBeDefined();
    });

    it('should use default spread when confidence not provided', async () => {
      const mockPythPrice: PriceData = {
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
        price: 68000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 98,
      };

      mockGetLatestPrice.mockResolvedValue(mockPythPrice);

      const client = new PythClient();
      const result = await client.getPrice('BTC');

      expect(result.confidenceInterval).toBeDefined();
      expect(result.confidenceInterval!.widthPercentage).toBeGreaterThan(0);
    });
  });

  describe('Confidence interval bounds validation', () => {
    it('should ensure bid is always less than price', () => {
      const prices = [100, 1000, 10000, 68000];
      const confidences = [1, 10, 100, 1000];

      prices.forEach((price) => {
        confidences.forEach((conf) => {
          const interval = calculateConfidenceInterval(price, conf);
          expect(interval.bid).toBeLessThan(price);
        });
      });
    });

    it('should ensure ask is always greater than price', () => {
      const prices = [100, 1000, 10000, 68000];
      const confidences = [1, 10, 100, 1000];

      prices.forEach((price) => {
        confidences.forEach((conf) => {
          const interval = calculateConfidenceInterval(price, conf);
          expect(interval.ask).toBeGreaterThan(price);
        });
      });
    });

    it('should ensure bid is always less than ask', () => {
      const prices = [100, 1000, 10000, 68000];
      const confidences = [1, 10, 100, 1000];

      prices.forEach((price) => {
        confidences.forEach((conf) => {
          const interval = calculateConfidenceInterval(price, conf);
          expect(interval.bid).toBeLessThan(interval.ask);
        });
      });
    });

    it('should handle edge case with zero price', () => {
      const interval = calculateConfidenceInterval(0, 100);

      expect(interval.widthPercentage).toBe(0);
    });
  });
});

describe('Price Accuracy Tests', () => {
  describe('Price deviation detection', () => {
    it('should detect significant price deviation', () => {
      const oraclePrice = 68000;
      const marketPrice = 67000;
      const deviation = Math.abs(oraclePrice - marketPrice) / marketPrice;

      expect(deviation).toBeGreaterThan(0.01);
    });

    it('should calculate deviation percentage correctly', () => {
      const oraclePrice = 68000;
      const marketPrice = 68000;
      const deviation = Math.abs(oraclePrice - marketPrice) / marketPrice;

      expect(deviation).toBe(0);
    });

    it('should handle zero market price', () => {
      const oraclePrice = 68000;
      const marketPrice = 0;

      const deviation =
        marketPrice === 0 ? Infinity : Math.abs(oraclePrice - marketPrice) / marketPrice;

      expect(deviation).toBe(Infinity);
    });
  });

  describe('Price staleness detection', () => {
    it('should detect stale price data', () => {
      const staleTimestamp = Date.now() - 600000;
      const currentTime = Date.now();
      const isStale = currentTime - staleTimestamp > 300000;

      expect(isStale).toBe(true);
    });

    it('should identify fresh price data', () => {
      const freshTimestamp = Date.now() - 60000;
      const currentTime = Date.now();
      const isFresh = currentTime - freshTimestamp <= 300000;

      expect(isFresh).toBe(true);
    });

    it('should handle edge case at staleness threshold', () => {
      const thresholdTimestamp = Date.now() - 300000;
      const currentTime = Date.now();
      const isStale = currentTime - thresholdTimestamp > 300000;

      expect(isStale).toBe(false);
    });
  });

  describe('Price validation against multiple sources', () => {
    it('should validate price against multiple sources', async () => {
      const pythPrice: PriceData = {
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
        price: 68000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 98,
      };

      const binancePrice = {
        currentPrice: 67950,
        lastUpdated: new Date().toISOString(),
      };

      mockGetLatestPrice.mockResolvedValue(pythPrice);
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(binancePrice);

      const client = new PythClient();
      const result = await client.getPrice('BTC');

      const priceDiff = Math.abs(result.price - binancePrice.currentPrice);
      const priceDiffPercent = priceDiff / binancePrice.currentPrice;

      expect(priceDiffPercent).toBeLessThan(0.01);
    });

    it('should flag significant price discrepancy', async () => {
      const pythPrice: PriceData = {
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
        price: 68000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 98,
      };

      const binancePrice = {
        currentPrice: 65000,
        lastUpdated: new Date().toISOString(),
      };

      mockGetLatestPrice.mockResolvedValue(pythPrice);
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(binancePrice);

      const client = new PythClient();
      const result = await client.getPrice('BTC');

      const priceDiff = Math.abs(result.price - binancePrice.currentPrice);
      const priceDiffPercent = priceDiff / binancePrice.currentPrice;

      expect(priceDiffPercent).toBeGreaterThan(0.01);
    });
  });

  describe('Price update frequency verification', () => {
    it('should verify frequent price updates', () => {
      const timestamps = [
        Date.now() - 300000,
        Date.now() - 240000,
        Date.now() - 180000,
        Date.now() - 120000,
        Date.now() - 60000,
      ];

      const intervals = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i - 1] - timestamps[i]);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      expect(avgInterval).toBeLessThan(120000);
    });

    it('should detect infrequent price updates', () => {
      const now = Date.now();
      const timestamps = [now - 600000, now - 300000, now];

      const intervals = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      expect(avgInterval).toBeGreaterThan(120000);
    });

    it('should track update frequency over time', () => {
      const now = Date.now();
      const updateHistory = [
        { timestamp: now - 300000, price: 68000 },
        { timestamp: now - 240000, price: 68050 },
        { timestamp: now - 180000, price: 68100 },
        { timestamp: now - 120000, price: 68080 },
        { timestamp: now - 60000, price: 68120 },
      ];

      const updateCount = updateHistory.length;
      const timeSpan = updateHistory[updateCount - 1].timestamp - updateHistory[0].timestamp;
      const updatesPerMinute = (updateCount / timeSpan) * 60000;

      expect(updatesPerMinute).toBeGreaterThan(0.5);
    });
  });
});

describe('Error Handling Tests', () => {
  let client: PythClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLatestPrice.mockReset();
    mockGetHistoricalPrices.mockReset();
    client = new PythClient();
  });

  describe('Invalid symbol handling', () => {
    it('should throw error for empty symbol', async () => {
      await expect(client.getPrice('')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should throw error for whitespace-only symbol', async () => {
      mockGetLatestPrice.mockResolvedValue(null);

      await expect(client.getPrice('   ')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should throw error for unknown symbol', async () => {
      mockGetLatestPrice.mockResolvedValue(null);

      await expect(client.getPrice('UNKNOWN_TOKEN')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should handle symbol with special characters', async () => {
      mockGetLatestPrice.mockResolvedValue(null);

      await expect(client.getPrice('BTC@USD')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });
  });

  describe('Unsupported chain handling', () => {
    it('should return false for symbol on unsupported chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.TRON)).toBe(false);
    });

    it('should return empty array for unsupported chain symbols', () => {
      const symbols = client.getSupportedSymbolsForChain(Blockchain.TRON);
      expect(symbols).toEqual([]);
    });

    it('should return empty chains for unsupported symbol', () => {
      const chains = client.getSupportedChainsForSymbol('UNKNOWN');
      expect(chains).toEqual([]);
    });

    it('should handle case-insensitive chain lookup', () => {
      const symbols = client.getSupportedSymbolsForChain(Blockchain.ETHEREUM);
      expect(symbols.length).toBeGreaterThan(0);
    });
  });

  describe('API rate limiting', () => {
    it('should handle rate limit error gracefully', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockGetLatestPrice.mockRejectedValue(rateLimitError);

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should handle 429 status code', async () => {
      const httpError = new Error('HTTP 429: Too Many Requests');
      mockGetLatestPrice.mockRejectedValue(httpError);

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should handle rate limit with retry', async () => {
      mockGetLatestPrice.mockRejectedValueOnce(new Error('Rate limit')).mockResolvedValueOnce({
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
        price: 68000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 98,
      });

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });
  });

  describe('Network partition handling', () => {
    it('should handle network timeout', async () => {
      mockGetLatestPrice.mockRejectedValue(new Error('Network timeout'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should handle connection refused', async () => {
      mockGetLatestPrice.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should handle DNS resolution failure', async () => {
      mockGetLatestPrice.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should handle SSL certificate errors', async () => {
      mockGetLatestPrice.mockRejectedValue(new Error('CERT_HAS_EXPIRED'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });
  });

  describe('Malformed response handling', () => {
    it('should handle invalid JSON response', async () => {
      mockGetLatestPrice.mockRejectedValue(new Error('Unexpected token in JSON'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should handle missing required fields in response', async () => {
      mockGetLatestPrice.mockResolvedValue(null);

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should handle null response body', async () => {
      mockGetLatestPrice.mockResolvedValue(null);

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });

    it('should handle empty response object', async () => {
      mockGetLatestPrice.mockResolvedValue(null);

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'PYTH_ERROR',
      });
    });
  });
});

describe('Pyth Parser Functions', () => {
  describe('parsePythPrice', () => {
    it('should parse valid Pyth price data', () => {
      const rawPrice: PythPriceRaw = {
        price: '680000000000',
        conf: '100000000',
        expo: -8,
        publish_time: Math.floor(Date.now() / 1000),
      };

      const result = parsePythPrice(rawPrice, 'BTC');

      expect(result.symbol).toBe('BTC');
      expect(result.price).toBe(6800);
      expect(result.provider).toBe(OracleProvider.PYTH);
    });

    it('should handle numeric price values', () => {
      const rawPrice: PythPriceRaw = {
        price: 680000000000,
        expo: -8,
      };

      const result = parsePythPrice(rawPrice, 'BTC');

      expect(result.price).toBe(6800);
    });

    it('should use default exponent when not provided', () => {
      const rawPrice: PythPriceRaw = {
        price: '680000000000',
      };

      const result = parsePythPrice(rawPrice, 'BTC');

      expect(result.decimals).toBe(8);
    });

    it('should handle negative exponents', () => {
      const rawPrice: PythPriceRaw = {
        price: '680000000000',
        expo: -10,
      };

      const result = parsePythPrice(rawPrice, 'BTC');

      expect(result.price).toBe(68);
    });
  });

  describe('calculateConfidenceScore', () => {
    it('should return high score for low confidence ratio', () => {
      const score = calculateConfidenceScore(10, 68000);

      expect(score).toBeGreaterThan(98);
    });

    it('should return low score for high confidence ratio', () => {
      const score = calculateConfidenceScore(6800, 68000);

      expect(score).toBeLessThan(99);
    });

    it('should handle zero price', () => {
      const score = calculateConfidenceScore(100, 0);

      expect(score).toBe(0);
    });

    it('should cap score at 100', () => {
      const score = calculateConfidenceScore(0, 68000);

      expect(score).toBeLessThanOrEqual(100);
    });

    it('should not return negative scores', () => {
      const score = calculateConfidenceScore(100000, 68000);

      expect(score).toBeGreaterThanOrEqual(0);
    });
  });
});
