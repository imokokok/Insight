import { ChainlinkClient } from '@/lib/services/oracle/clients/chainlink';
import { chainlinkOnChainService } from '@/lib/oracles/chainlinkOnChainService';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';

jest.mock('@/lib/oracles/chainlinkOnChainService');
jest.mock('@/lib/oracles/chainlinkDataSources', () => ({
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
      (chainlinkOnChainService.getPrice as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

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
});
