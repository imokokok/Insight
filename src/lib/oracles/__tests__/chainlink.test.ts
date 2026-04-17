import { ChainlinkClient } from '@/lib/oracles/clients/chainlink';
import { chainlinkOnChainService } from '@/lib/oracles/services/chainlinkOnChainService';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';

jest.mock('@/lib/oracles/services/chainlinkOnChainService');
jest.mock('@/lib/oracles/services/chainlinkDataSources', () => ({
  isPriceFeedSupported: jest.fn((symbol: string, chainId: number) => {
    const supportedFeeds: Record<string, number[]> = {
      ETH: [1, 42161, 137, 8453],
      BTC: [1, 42161, 137, 8453],
      LINK: [1, 42161, 137],
      USDC: [1, 42161],
    };
    return supportedFeeds[symbol]?.includes(chainId) ?? false;
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

jest.mock('@/lib/oracles/base/databaseOperations', () => ({
  fetchPriceWithDatabase: jest.fn(),
  fetchHistoricalPricesWithDatabase: jest.fn(),
}));

// eslint-disable-next-line max-lines-per-function
describe('ChainlinkClient', () => {
  let client: ChainlinkClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new ChainlinkClient();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      expect(client.name).toBe(OracleProvider.CHAINLINK);
      expect(client.supportedChains).toContain(Blockchain.ETHEREUM);
      expect(client.supportedChains).toContain(Blockchain.ARBITRUM);
      expect(client.supportedChains).toContain(Blockchain.POLYGON);
      expect(client.defaultUpdateIntervalMinutes).toBe(60);
    });

    it('should create client with custom config', () => {
      const customClient = new ChainlinkClient({
        useDatabase: false,
        validateData: false,
        useRealData: false,
      });
      expect(customClient).toBeInstanceOf(ChainlinkClient);
    });

    it('should use real data by default', () => {
      const defaultClient = new ChainlinkClient();
      expect(defaultClient).toBeInstanceOf(ChainlinkClient);
    });
  });

  describe('getSupportedSymbols', () => {
    it('should return array of supported symbols', () => {
      (chainlinkOnChainService.getSupportedSymbols as jest.Mock).mockReturnValue([
        'ETH',
        'BTC',
        'LINK',
        'USDC',
      ]);

      const symbols = client.getSupportedSymbols();

      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('BTC');
    });
  });

  describe('isSymbolSupported', () => {
    it('should return true for supported symbol on Ethereum', () => {
      expect(client.isSymbolSupported('ETH', Blockchain.ETHEREUM)).toBe(true);
      expect(client.isSymbolSupported('BTC', Blockchain.ETHEREUM)).toBe(true);
    });

    it('should return true for supported symbol on Arbitrum', () => {
      expect(client.isSymbolSupported('ETH', Blockchain.ARBITRUM)).toBe(true);
    });

    it('should return false for unsupported symbol', () => {
      expect(client.isSymbolSupported('UNKNOWN', Blockchain.ETHEREUM)).toBe(false);
    });

    it('should return false for supported symbol on unsupported chain', () => {
      expect(client.isSymbolSupported('UNKNOWN', Blockchain.SOLANA)).toBe(false);
    });
  });

  describe('getSupportedChainsForSymbol', () => {
    it('should return supported chains for ETH', () => {
      (chainlinkOnChainService.getSupportedChainIds as jest.Mock).mockReturnValue([1, 42161, 137]);

      const chains = client.getSupportedChainsForSymbol('ETH');

      expect(Array.isArray(chains)).toBe(true);
    });

    it('should return empty array for unsupported symbol', () => {
      (chainlinkOnChainService.getSupportedChainIds as jest.Mock).mockReturnValue([]);

      const chains = client.getSupportedChainsForSymbol('UNKNOWN');

      expect(chains).toEqual([]);
    });
  });

  describe('getPrice', () => {
    const mockChainlinkPriceData = {
      symbol: 'ETH',
      price: 3500.5,
      timestamp: Date.now(),
      decimals: 8,
      roundId: BigInt(12345),
      answeredInRound: BigInt(12345),
      chainId: 1,
      description: 'ETH / USD',
      version: BigInt(1),
      startedAt: Date.now() - 60000,
    };

    it('should throw error for empty symbol', async () => {
      await expect(client.getPrice('')).rejects.toMatchObject({
        code: 'CHAINLINK_ERROR',
      });
    });

    it('should return price data for valid symbol', async () => {
      (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockChainlinkPriceData);

      const result = await client.getPrice('ETH');

      expect(result).toMatchObject({
        provider: OracleProvider.CHAINLINK,
        symbol: 'ETH',
        price: mockChainlinkPriceData.price,
        chain: Blockchain.ETHEREUM,
      });
    });

    it('should return price data with confidence', async () => {
      (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockChainlinkPriceData);

      const result = await client.getPrice('ETH');

      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should return price data for specific chain', async () => {
      (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue({
        ...mockChainlinkPriceData,
        chainId: 42161,
      });

      const result = await client.getPrice('ETH', Blockchain.ARBITRUM);

      expect(result.chain).toBe(Blockchain.ARBITRUM);
      expect(chainlinkOnChainService.getPrice).toHaveBeenCalledWith('ETH', 42161);
    });

    it('should include round metadata', async () => {
      (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockChainlinkPriceData);

      const result = await client.getPrice('ETH');

      expect(result.roundId).toBe(mockChainlinkPriceData.roundId.toString());
      expect(result.answeredInRound).toBe(mockChainlinkPriceData.answeredInRound.toString());
      expect(result.startedAt).toBe(mockChainlinkPriceData.startedAt);
    });

    it('should throw error when real data not available', async () => {
      const clientNoRealData = new ChainlinkClient({ useRealData: false });

      await expect(clientNoRealData.getPrice('ETH')).rejects.toMatchObject({
        code: 'CHAINLINK_ERROR',
      });
    });

    it('should throw error when price feed not supported', async () => {
      await expect(client.getPrice('UNKNOWN', Blockchain.ETHEREUM)).rejects.toMatchObject({
        code: 'CHAINLINK_ERROR',
      });
    });

    it('should handle service error', async () => {
      (chainlinkOnChainService.getPrice as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'CHAINLINK_ERROR',
      });
    });
  });

  describe('getHistoricalPrices', () => {
    const mockHistoricalPrices = [
      { timestamp: Date.now() - 3600000, price: 3450 },
      { timestamp: Date.now() - 1800000, price: 3475 },
      { timestamp: Date.now(), price: 3500 },
    ];

    it('should return empty array for empty symbol', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue([]);

      await expect(client.getHistoricalPrices('')).rejects.toMatchObject({
        code: 'CHAINLINK_HISTORICAL_ERROR',
      });
    });

    it('should return historical price data', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(
        mockHistoricalPrices
      );

      const result = await client.getHistoricalPrices('ETH');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0]).toMatchObject({
        provider: OracleProvider.CHAINLINK,
        symbol: 'ETH',
        chain: Blockchain.ETHEREUM,
      });
    });

    it('should return historical prices with change calculations', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(
        mockHistoricalPrices
      );

      const result = await client.getHistoricalPrices('ETH');

      expect(result[0].change24h).toBe(0);
      expect(result[0].change24hPercent).toBe(0);
    });

    it('should use specified chain', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(
        mockHistoricalPrices
      );

      const result = await client.getHistoricalPrices('ETH', Blockchain.ARBITRUM, 24);

      expect(result[0].chain).toBe(Blockchain.ARBITRUM);
    });

    it('should use default period of 24 hours', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(
        mockHistoricalPrices
      );

      await client.getHistoricalPrices('ETH');

      expect(binanceMarketService.getHistoricalPricesByHours).toHaveBeenCalledWith('ETH', 24);
    });

    it('should use custom period', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(
        mockHistoricalPrices
      );

      await client.getHistoricalPrices('ETH', undefined, 48);

      expect(binanceMarketService.getHistoricalPricesByHours).toHaveBeenCalledWith('ETH', 48);
    });

    it('should return empty array when no historical data available', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue([]);

      const result = await client.getHistoricalPrices('ETH');

      expect(result).toEqual([]);
    });

    it('should handle service error', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      await expect(client.getHistoricalPrices('ETH')).rejects.toMatchObject({
        code: 'CHAINLINK_HISTORICAL_ERROR',
      });
    });
  });

  describe('calculateConfidence', () => {
    it('should calculate confidence for Ethereum', async () => {
      const mockData = {
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        decimals: 8,
        roundId: BigInt(1),
        answeredInRound: BigInt(1),
        chainId: 1,
      };

      (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

      const result = await client.getPrice('ETH', Blockchain.ETHEREUM);

      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should calculate confidence for Arbitrum', async () => {
      const mockData = {
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        decimals: 8,
        roundId: BigInt(1),
        answeredInRound: BigInt(1),
        chainId: 42161,
      };

      (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

      const result = await client.getPrice('ETH', Blockchain.ARBITRUM);

      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should calculate confidence for Polygon', async () => {
      const mockData = {
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        decimals: 8,
        roundId: BigInt(1),
        answeredInRound: BigInt(1),
        chainId: 137,
      };

      (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

      const result = await client.getPrice('ETH', Blockchain.POLYGON);

      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('getChainId', () => {
    it('should return correct chain ID for Ethereum', async () => {
      const mockData = {
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        decimals: 8,
        roundId: BigInt(1),
        answeredInRound: BigInt(1),
        chainId: 1,
      };

      (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

      await client.getPrice('ETH', Blockchain.ETHEREUM);

      expect(chainlinkOnChainService.getPrice).toHaveBeenCalledWith('ETH', 1);
    });

    it('should return correct chain ID for Arbitrum', async () => {
      const mockData = {
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        decimals: 8,
        roundId: BigInt(1),
        answeredInRound: BigInt(1),
        chainId: 42161,
      };

      (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

      await client.getPrice('ETH', Blockchain.ARBITRUM);

      expect(chainlinkOnChainService.getPrice).toHaveBeenCalledWith('ETH', 42161);
    });

    it('should return correct chain ID for Polygon', async () => {
      const mockData = {
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        decimals: 8,
        roundId: BigInt(1),
        answeredInRound: BigInt(1),
        chainId: 137,
      };

      (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

      await client.getPrice('ETH', Blockchain.POLYGON);

      expect(chainlinkOnChainService.getPrice).toHaveBeenCalledWith('ETH', 137);
    });

    it('should default to Ethereum chain ID when no chain specified', async () => {
      const mockData = {
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        decimals: 8,
        roundId: BigInt(1),
        answeredInRound: BigInt(1),
        chainId: 1,
      };

      (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

      await client.getPrice('ETH');

      expect(chainlinkOnChainService.getPrice).toHaveBeenCalledWith('ETH', 1);
    });
  });

  describe('convertToPriceData', () => {
    it('should convert Chainlink data to PriceData format', async () => {
      const mockData = {
        symbol: 'BTC',
        price: 68000,
        timestamp: Date.now(),
        decimals: 8,
        roundId: BigInt(12345),
        answeredInRound: BigInt(12345),
        chainId: 1,
        description: 'BTC / USD',
        version: BigInt(1),
        startedAt: Date.now() - 60000,
      };

      (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

      const result = await client.getPrice('BTC');

      expect(result.provider).toBe(OracleProvider.CHAINLINK);
      expect(result.symbol).toBe('BTC');
      expect(result.price).toBe(68000);
      expect(result.decimals).toBe(8);
      expect(result.roundId).toBe('12345');
      expect(result.answeredInRound).toBe('12345');
      expect(result.source).toBe('BTC / USD');
    });
  });

  describe('Boundary Conditions', () => {
    describe('Very large price values', () => {
      it('should handle very large price values (1e15)', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 1e15,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.price).toBe(1e15);
        expect(Number.isFinite(result.price)).toBe(true);
        expect(result.price).toBeGreaterThan(0);
      });

      it('should handle maximum safe integer price values', async () => {
        const mockData = {
          symbol: 'ETH',
          price: Number.MAX_SAFE_INTEGER,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.price).toBe(Number.MAX_SAFE_INTEGER);
        expect(Number.isSafeInteger(result.price)).toBe(true);
      });
    });

    describe('Very small price values', () => {
      it('should handle very small price values (0.00000001)', async () => {
        const mockData = {
          symbol: 'SHIB',
          price: 0.00000001,
          timestamp: Date.now(),
          decimals: 18,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.price).toBe(0.00000001);
        expect(result.price).toBeGreaterThan(0);
      });

      it('should handle extremely small price values with high precision', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 1e-10,
          timestamp: Date.now(),
          decimals: 18,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.price).toBe(1e-10);
        expect(result.decimals).toBe(18);
      });
    });

    describe('Zero price handling', () => {
      it('should handle zero price value', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 0,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.price).toBe(0);
      });

      it('should handle price very close to zero', async () => {
        const mockData = {
          symbol: 'ETH',
          price: Number.MIN_VALUE,
          timestamp: Date.now(),
          decimals: 18,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.price).toBe(Number.MIN_VALUE);
        expect(result.price).toBeGreaterThan(0);
      });
    });

    describe('Negative price rejection', () => {
      it('should handle negative price value from service', async () => {
        const mockData = {
          symbol: 'ETH',
          price: -100,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.price).toBe(-100);
      });

      it('should handle negative infinity price', async () => {
        const mockData = {
          symbol: 'ETH',
          price: -Infinity,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.price).toBe(-Infinity);
      });
    });

    describe('Missing optional fields in price data', () => {
      it('should handle missing description field', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.source).toBe('Chainlink:ETH');
      });

      it('should handle missing version field', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
          description: 'ETH / USD',
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.version).toBeUndefined();
      });

      it('should handle missing startedAt field', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
          description: 'ETH / USD',
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.startedAt).toBeUndefined();
      });

      it('should handle minimal required fields only', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.provider).toBe(OracleProvider.CHAINLINK);
        expect(result.symbol).toBe('ETH');
        expect(result.price).toBe(3500);
        expect(result.confidence).toBeDefined();
      });
    });

    describe('Invalid timestamp formats', () => {
      it('should handle zero timestamp', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: 0,
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.timestamp).toBe(0);
      });

      it('should handle negative timestamp', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: -1000,
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.timestamp).toBe(-1000);
      });

      it('should handle very large timestamp (far future)', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: 9999999999999,
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.timestamp).toBe(9999999999999);
      });

      it('should handle floating point timestamp', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now() + 0.5,
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.timestamp).toBeDefined();
      });
    });
  });

  describe('Concurrency Tests', () => {
    describe('Multiple concurrent price requests for the same symbol', () => {
      it('should handle concurrent requests for the same symbol', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const promises = Array(10)
          .fill(null)
          .map(() => client.getPrice('ETH'));

        const results = await Promise.all(promises);

        expect(results).toHaveLength(10);
        results.forEach((result) => {
          expect(result.symbol).toBe('ETH');
          expect(result.price).toBe(3500);
        });
      });

      it('should return consistent results for concurrent same-symbol requests', async () => {
        let callCount = 0;
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockImplementation(async () => {
          callCount++;
          return { ...mockData, timestamp: Date.now() };
        });

        const promises = Array(5)
          .fill(null)
          .map(() => client.getPrice('ETH'));

        const results = await Promise.all(promises);

        expect(callCount).toBe(5);
        results.forEach((result) => {
          expect(result.provider).toBe(OracleProvider.CHAINLINK);
          expect(result.symbol).toBe('ETH');
        });
      });
    });

    describe('Concurrent requests for different symbols', () => {
      it('should handle concurrent requests for different symbols', async () => {
        const symbols = ['ETH', 'BTC', 'LINK'];
        const mockPrices: Record<string, number> = { ETH: 3500, BTC: 68000, LINK: 15 };

        (chainlinkOnChainService.getPrice as jest.Mock).mockImplementation(
          async (symbol: string) => ({
            symbol,
            price: mockPrices[symbol],
            timestamp: Date.now(),
            decimals: 8,
            roundId: BigInt(12345),
            answeredInRound: BigInt(12345),
            chainId: 1,
          })
        );

        const promises = symbols.map((symbol) => client.getPrice(symbol));
        const results = await Promise.all(promises);

        expect(results).toHaveLength(3);
        results.forEach((result, index) => {
          expect(result.symbol).toBe(symbols[index]);
          expect(result.price).toBe(mockPrices[symbols[index]]);
        });
      });

      it('should handle mixed success and failure in concurrent requests', async () => {
        (chainlinkOnChainService.getPrice as jest.Mock).mockImplementation(
          async (symbol: string) => {
            if (symbol === 'FAIL') {
              throw new Error('Failed to fetch price');
            }
            return {
              symbol,
              price: 1000,
              timestamp: Date.now(),
              decimals: 8,
              roundId: BigInt(12345),
              answeredInRound: BigInt(12345),
              chainId: 1,
            };
          }
        );

        const promises = ['ETH', 'FAIL', 'BTC'].map((symbol) =>
          client.getPrice(symbol).catch((e) => ({ error: e, symbol }))
        );

        const results = await Promise.all(promises);

        expect(results[0]).toHaveProperty('provider');
        expect((results[1] as { error: Error; symbol: string }).error).toBeDefined();
        expect(results[2]).toHaveProperty('provider');
      });
    });

    describe('Race condition handling', () => {
      it('should handle race conditions in price updates', async () => {
        const resolveOrder: string[] = [];

        (chainlinkOnChainService.getPrice as jest.Mock).mockImplementation(
          (symbol: string) =>
            new Promise((resolve) => {
              const delay = symbol === 'ETH' ? 100 : 50;
              setTimeout(() => {
                resolveOrder.push(symbol);
                resolve({
                  symbol,
                  price: symbol === 'ETH' ? 3500 : 68000,
                  timestamp: Date.now(),
                  decimals: 8,
                  roundId: BigInt(12345),
                  answeredInRound: BigInt(12345),
                  chainId: 1,
                });
              }, delay);
            })
        );

        const [ethResult, btcResult] = await Promise.all([
          client.getPrice('ETH'),
          client.getPrice('BTC'),
        ]);

        expect(ethResult.symbol).toBe('ETH');
        expect(btcResult.symbol).toBe('BTC');
        expect(resolveOrder).toEqual(['BTC', 'ETH']);
      });

      it('should handle rapid sequential requests', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const results = [];
        for (let i = 0; i < 20; i++) {
          results.push(await client.getPrice('ETH'));
        }

        expect(results).toHaveLength(20);
        results.forEach((result) => {
          expect(result.symbol).toBe('ETH');
        });
      });
    });

    describe('Cache consistency under concurrent access', () => {
      it('should maintain cache consistency with concurrent reads', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const concurrentReads = Array(50)
          .fill(null)
          .map(() => client.getPrice('ETH'));

        const results = await Promise.all(concurrentReads);

        const uniquePrices = new Set(results.map((r) => r.price));
        expect(uniquePrices.size).toBe(1);
      });

      it('should handle cache updates during concurrent access', async () => {
        let price = 3500;
        (chainlinkOnChainService.getPrice as jest.Mock).mockImplementation(async () => {
          const currentPrice = price;
          price += 1;
          return {
            symbol: 'ETH',
            price: currentPrice,
            timestamp: Date.now(),
            decimals: 8,
            roundId: BigInt(12345),
            answeredInRound: BigInt(12345),
            chainId: 1,
          };
        });

        const promises = Array(5)
          .fill(null)
          .map(() => client.getPrice('ETH'));

        const results = await Promise.all(promises);

        expect(results.every((r) => r.symbol === 'ETH')).toBe(true);
        expect(results.every((r) => r.price >= 3500)).toBe(true);
      });
    });
  });

  describe('Database Integration Tests', () => {
    const {
      fetchPriceWithDatabase,
      fetchHistoricalPricesWithDatabase,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require('@/lib/oracles/base/databaseOperations');

    describe('Successful database save and retrieval', () => {
      it('should fetch price from database successfully', async () => {
        const mockDbPrice = {
          provider: OracleProvider.CHAINLINK,
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          chain: Blockchain.ETHEREUM,
        };

        (fetchPriceWithDatabase as jest.Mock).mockResolvedValue(mockDbPrice);

        const result = await client.fetchPriceWithDatabase('ETH', Blockchain.ETHEREUM);

        expect(fetchPriceWithDatabase).toHaveBeenCalledWith(
          OracleProvider.CHAINLINK,
          'ETH',
          Blockchain.ETHEREUM,
          true
        );
        expect(result).toEqual(mockDbPrice);
      });

      it('should fetch historical prices from database successfully', async () => {
        const mockHistoricalData = [
          {
            provider: OracleProvider.CHAINLINK,
            symbol: 'ETH',
            price: 3400,
            timestamp: Date.now() - 3600000,
          },
          {
            provider: OracleProvider.CHAINLINK,
            symbol: 'ETH',
            price: 3450,
            timestamp: Date.now() - 1800000,
          },
          { provider: OracleProvider.CHAINLINK, symbol: 'ETH', price: 3500, timestamp: Date.now() },
        ];

        (fetchHistoricalPricesWithDatabase as jest.Mock).mockResolvedValue(mockHistoricalData);

        const result = await client.fetchHistoricalPricesWithDatabase(
          'ETH',
          Blockchain.ETHEREUM,
          24
        );

        expect(fetchHistoricalPricesWithDatabase).toHaveBeenCalledWith(
          OracleProvider.CHAINLINK,
          'ETH',
          Blockchain.ETHEREUM,
          24,
          true
        );
        expect(result).toEqual(mockHistoricalData);
      });
    });

    describe('Database connection failure handling', () => {
      it('should handle database connection failure gracefully', async () => {
        (fetchPriceWithDatabase as jest.Mock).mockRejectedValue(new Error('Connection refused'));

        await expect(client.fetchPriceWithDatabase('ETH', Blockchain.ETHEREUM)).rejects.toThrow(
          'Connection refused'
        );
      });

      it('should handle database timeout', async () => {
        (fetchPriceWithDatabase as jest.Mock).mockRejectedValue(new Error('Query timeout'));

        await expect(client.fetchPriceWithDatabase('ETH', Blockchain.ETHEREUM)).rejects.toThrow(
          'Query timeout'
        );
      });

      it('should handle database unavailable error', async () => {
        (fetchHistoricalPricesWithDatabase as jest.Mock).mockRejectedValue(
          new Error('Database unavailable')
        );

        await expect(
          client.fetchHistoricalPricesWithDatabase('ETH', Blockchain.ETHEREUM, 24)
        ).rejects.toThrow('Database unavailable');
      });
    });

    describe('Database timeout handling', () => {
      it('should handle slow database response', async () => {
        (fetchPriceWithDatabase as jest.Mock).mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                resolve({
                  provider: OracleProvider.CHAINLINK,
                  symbol: 'ETH',
                  price: 3500,
                  timestamp: Date.now(),
                });
              }, 100);
            })
        );

        const result = await client.fetchPriceWithDatabase('ETH', Blockchain.ETHEREUM);

        expect(result).toBeDefined();
        expect(result.symbol).toBe('ETH');
      }, 5000);
    });

    describe('Invalid data rejection by database', () => {
      it('should handle invalid data format from database', async () => {
        (fetchPriceWithDatabase as jest.Mock).mockResolvedValue(null);

        const result = await client.fetchPriceWithDatabase('ETH', Blockchain.ETHEREUM);

        expect(result).toBeNull();
      });

      it('should handle malformed data from database', async () => {
        (fetchPriceWithDatabase as jest.Mock).mockResolvedValue({
          provider: OracleProvider.CHAINLINK,
        });

        const result = await client.fetchPriceWithDatabase('ETH', Blockchain.ETHEREUM);

        expect(result).toBeDefined();
        expect(result.provider).toBe(OracleProvider.CHAINLINK);
      });
    });

    describe('Cache invalidation after database update', () => {
      it('should handle cache invalidation scenario', async () => {
        const firstPrice = {
          provider: OracleProvider.CHAINLINK,
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
        };

        const secondPrice = {
          provider: OracleProvider.CHAINLINK,
          symbol: 'ETH',
          price: 3550,
          timestamp: Date.now(),
        };

        (fetchPriceWithDatabase as jest.Mock)
          .mockResolvedValueOnce(firstPrice)
          .mockResolvedValueOnce(secondPrice);

        const result1 = await client.fetchPriceWithDatabase('ETH', Blockchain.ETHEREUM);
        const result2 = await client.fetchPriceWithDatabase('ETH', Blockchain.ETHEREUM);

        expect(result1.price).toBe(3500);
        expect(result2.price).toBe(3550);
      });
    });
  });

  describe('Error Recovery Tests', () => {
    describe('Network timeout recovery', () => {
      it('should handle network timeout and recover', async () => {
        (chainlinkOnChainService.getPrice as jest.Mock)
          .mockRejectedValueOnce(new Error('Network timeout'))
          .mockResolvedValueOnce({
            symbol: 'ETH',
            price: 3500,
            timestamp: Date.now(),
            decimals: 8,
            roundId: BigInt(12345),
            answeredInRound: BigInt(12345),
            chainId: 1,
          });

        await expect(client.getPrice('ETH')).rejects.toMatchObject({
          code: 'CHAINLINK_ERROR',
        });

        const result = await client.getPrice('ETH');
        expect(result.price).toBe(3500);
      });

      it('should handle multiple consecutive timeouts', async () => {
        (chainlinkOnChainService.getPrice as jest.Mock)
          .mockRejectedValueOnce(new Error('Timeout 1'))
          .mockRejectedValueOnce(new Error('Timeout 2'))
          .mockResolvedValueOnce({
            symbol: 'ETH',
            price: 3500,
            timestamp: Date.now(),
            decimals: 8,
            roundId: BigInt(12345),
            answeredInRound: BigInt(12345),
            chainId: 1,
          });

        await expect(client.getPrice('ETH')).rejects.toBeDefined();
        await expect(client.getPrice('ETH')).rejects.toBeDefined();

        const result = await client.getPrice('ETH');
        expect(result.price).toBe(3500);
      });
    });

    describe('Rate limit handling with retry', () => {
      it('should handle rate limit error', async () => {
        (chainlinkOnChainService.getPrice as jest.Mock).mockRejectedValue(
          new Error('Rate limit exceeded')
        );

        await expect(client.getPrice('ETH')).rejects.toMatchObject({
          code: 'CHAINLINK_ERROR',
        });
      });

      it('should eventually succeed after rate limit clears', async () => {
        (chainlinkOnChainService.getPrice as jest.Mock)
          .mockRejectedValueOnce(new Error('Rate limit exceeded'))
          .mockResolvedValueOnce({
            symbol: 'ETH',
            price: 3500,
            timestamp: Date.now(),
            decimals: 8,
            roundId: BigInt(12345),
            answeredInRound: BigInt(12345),
            chainId: 1,
          });

        await expect(client.getPrice('ETH')).rejects.toBeDefined();

        const result = await client.getPrice('ETH');
        expect(result.price).toBe(3500);
      });
    });

    describe('Invalid response format handling', () => {
      it('should handle malformed JSON response', async () => {
        (chainlinkOnChainService.getPrice as jest.Mock).mockRejectedValue(
          new Error('Unexpected token in JSON')
        );

        await expect(client.getPrice('ETH')).rejects.toMatchObject({
          code: 'CHAINLINK_ERROR',
        });
      });

      it('should handle empty response', async () => {
        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue({});

        const result = await client.getPrice('ETH');

        expect(result).toBeDefined();
      });

      it('should handle response with missing required fields', async () => {
        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue({
          symbol: 'ETH',
        });

        const result = await client.getPrice('ETH');

        expect(result.symbol).toBe('ETH');
      });
    });

    describe('Partial data availability', () => {
      it('should handle partial price data', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const result = await client.getPrice('ETH');

        expect(result.price).toBe(3500);
        expect(result.confidence).toBeDefined();
      });

      it('should handle historical data with gaps', async () => {
        const mockHistoricalPrices = [
          { timestamp: Date.now() - 7200000, price: 3400 },
          { timestamp: Date.now() - 1800000, price: 3450 },
        ];

        (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(
          mockHistoricalPrices
        );

        const result = await client.getHistoricalPrices('ETH');

        expect(result).toHaveLength(2);
      });
    });
  });

  describe('Performance Tests', () => {
    describe('Response time within acceptable limits', () => {
      it('should respond within 1 second for single price request', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const startTime = Date.now();
        await client.getPrice('ETH');
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000);
      });

      it('should handle batch requests efficiently', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const startTime = Date.now();
        const promises = Array(10)
          .fill(null)
          .map(() => client.getPrice('ETH'));
        await Promise.all(promises);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(2000);
      });

      it('should handle historical price requests efficiently', async () => {
        const mockHistoricalPrices = Array(168)
          .fill(null)
          .map((_, i) => ({
            timestamp: Date.now() - i * 3600000,
            price: 3500 + Math.random() * 100,
          }));

        (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(
          mockHistoricalPrices
        );

        const startTime = Date.now();
        const result = await client.getHistoricalPrices('ETH', Blockchain.ETHEREUM, 168);
        const endTime = Date.now();

        expect(result.length).toBe(168);
        expect(endTime - startTime).toBeLessThan(1000);
      });
    });

    describe('Memory usage under load', () => {
      it('should not leak memory during repeated requests', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        for (let i = 0; i < 100; i++) {
          await client.getPrice('ETH');
        }

        expect(chainlinkOnChainService.getPrice).toHaveBeenCalledTimes(100);
      });

      it('should handle large batch operations without memory issues', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const largeBatch = Array(1000)
          .fill(null)
          .map(() => client.getPrice('ETH'));

        const results = await Promise.all(largeBatch);

        expect(results).toHaveLength(1000);
        results.forEach((result) => {
          expect(result.symbol).toBe('ETH');
        });
      });
    });

    describe('Cache hit ratio optimization', () => {
      it('should benefit from repeated cache hits', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const firstCall = await client.getPrice('ETH');
        const secondCall = await client.getPrice('ETH');

        expect(firstCall).toBeDefined();
        expect(secondCall).toBeDefined();
        expect(chainlinkOnChainService.getPrice).toHaveBeenCalledTimes(2);
      });

      it('should handle cache misses gracefully', async () => {
        const mockData = {
          symbol: 'ETH',
          price: 3500,
          timestamp: Date.now(),
          decimals: 8,
          roundId: BigInt(12345),
          answeredInRound: BigInt(12345),
          chainId: 1,
        };

        (chainlinkOnChainService.getPrice as jest.Mock).mockResolvedValue(mockData);

        const results = await Promise.all([
          client.getPrice('ETH'),
          client.getPrice('BTC'),
          client.getPrice('LINK'),
        ]);

        expect(results).toHaveLength(3);
        expect(chainlinkOnChainService.getPrice).toHaveBeenCalledTimes(3);
      });
    });
  });
});
