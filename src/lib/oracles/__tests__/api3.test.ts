import { API3Client } from '@/lib/services/oracle/clients/api3';
import { api3NetworkService } from '@/lib/services/oracle/api3NetworkService';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';

jest.mock('@/lib/services/oracle/api3NetworkService');
jest.mock('@/lib/services/marketData/binanceMarketService');
jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('API3Client', () => {
  let client: API3Client;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new API3Client();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      expect(client.name).toBe(OracleProvider.API3);
      expect(client.supportedChains).toContain(Blockchain.ETHEREUM);
      expect(client.supportedChains).toContain(Blockchain.ARBITRUM);
      expect(client.supportedChains).toContain(Blockchain.POLYGON);
      expect(client.defaultUpdateIntervalMinutes).toBe(1);
    });

    it('should create client with custom config', () => {
      const customClient = new API3Client({ useDatabase: false, validateData: false });
      expect(customClient).toBeInstanceOf(API3Client);
    });
  });

  describe('getSupportedSymbols', () => {
    it('should return array of supported symbols', () => {
      const symbols = client.getSupportedSymbols();
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBeGreaterThan(0);
    });

    it('should return unique symbols', () => {
      const symbols = client.getSupportedSymbols();
      const uniqueSymbols = [...new Set(symbols)];
      expect(symbols.length).toBe(uniqueSymbols.length);
    });
  });

  describe('getSupportedSymbolsForChain', () => {
    it('should return symbols for Ethereum', () => {
      const symbols = client.getSupportedSymbolsForChain(Blockchain.ETHEREUM);
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('BTC');
    });

    it('should return symbols for Arbitrum', () => {
      const symbols = client.getSupportedSymbolsForChain(Blockchain.ARBITRUM);
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols).toContain('ETH');
    });

    it('should return empty array for unsupported chain', () => {
      const symbols = client.getSupportedSymbolsForChain(Blockchain.SOLANA);
      expect(symbols).toEqual([]);
    });
  });

  describe('isSymbolSupported', () => {
    it('should return true for supported symbol without chain', () => {
      expect(client.isSymbolSupported('ETH')).toBe(true);
      expect(client.isSymbolSupported('BTC')).toBe(true);
    });

    it('should return true for supported symbol on supported chain', () => {
      expect(client.isSymbolSupported('ETH', Blockchain.ETHEREUM)).toBe(true);
      expect(client.isSymbolSupported('BTC', Blockchain.ARBITRUM)).toBe(true);
    });

    it('should return false for unsupported symbol', () => {
      expect(client.isSymbolSupported('UNKNOWN')).toBe(false);
    });

    it('should return false for supported symbol on unsupported chain', () => {
      expect(client.isSymbolSupported('ETH', Blockchain.SOLANA)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(client.isSymbolSupported('eth')).toBe(true);
      expect(client.isSymbolSupported('Eth')).toBe(true);
      expect(client.isSymbolSupported('ETH')).toBe(true);
    });
  });

  describe('getSupportedChainsForSymbol', () => {
    it('should return supported chains for ETH', () => {
      const chains = client.getSupportedChainsForSymbol('ETH');
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain(Blockchain.ETHEREUM);
    });

    it('should return empty array for unsupported symbol', () => {
      const chains = client.getSupportedChainsForSymbol('UNKNOWN');
      expect(chains).toEqual([]);
    });
  });

  describe('getPrice', () => {
    const mockApi3PriceData = {
      price: 3500.5,
      timestamp: Date.now(),
      source: 'api3-dapi-ethereum',
      decimals: 18,
      confidence: 0.98,
      dapiName: 'ETH/USD',
      proxyAddress: '0x1234567890abcdef',
      dataAge: 5000,
    };

    it('should throw error for empty symbol', async () => {
      await expect(client.getPrice('')).rejects.toMatchObject({
        message: 'Symbol is required',
        code: 'INVALID_SYMBOL',
      });
    });

    it('should return price data for valid symbol', async () => {
      (api3NetworkService.getPrice as jest.Mock).mockResolvedValue(mockApi3PriceData);

      const result = await client.getPrice('ETH');

      expect(result).toMatchObject({
        provider: OracleProvider.API3,
        symbol: 'ETH',
        price: mockApi3PriceData.price,
        timestamp: mockApi3PriceData.timestamp,
        decimals: mockApi3PriceData.decimals,
        confidence: mockApi3PriceData.confidence,
        chain: Blockchain.ETHEREUM,
        source: mockApi3PriceData.source,
        dataSource: 'real',
        dapiName: mockApi3PriceData.dapiName,
        proxyAddress: mockApi3PriceData.proxyAddress,
        dataAge: mockApi3PriceData.dataAge,
      });
    });

    it('should return price data for specific chain', async () => {
      (api3NetworkService.getPrice as jest.Mock).mockResolvedValue({
        ...mockApi3PriceData,
        source: 'api3-dapi-arbitrum',
      });

      const result = await client.getPrice('ETH', Blockchain.ARBITRUM);

      expect(result.chain).toBe(Blockchain.ARBITRUM);
      expect(api3NetworkService.getPrice).toHaveBeenCalledWith('ETH', Blockchain.ARBITRUM);
    });

    it('should throw error when price data not available', async () => {
      (api3NetworkService.getPrice as jest.Mock).mockResolvedValue(null);

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'API3_PRICE_NOT_AVAILABLE',
      });
    });

    it('should throw error when API3 service fails', async () => {
      (api3NetworkService.getPrice as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'API3_PRICE_ERROR',
      });
    });

    it('should re-throw API3_PRICE_NOT_AVAILABLE error', async () => {
      const customError = { code: 'API3_PRICE_NOT_AVAILABLE', message: 'Custom error' };
      (api3NetworkService.getPrice as jest.Mock).mockRejectedValue(customError);

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'API3_PRICE_NOT_AVAILABLE',
      });
    });
  });

  describe('getHistoricalPrices', () => {
    const mockHistoricalPrices = [
      { timestamp: Date.now() - 3600000, price: 3450 },
      { timestamp: Date.now() - 1800000, price: 3475 },
      { timestamp: Date.now(), price: 3500 },
    ];

    it('should throw error for empty symbol', async () => {
      await expect(client.getHistoricalPrices('')).rejects.toMatchObject({
        message: 'Symbol is required',
        code: 'INVALID_SYMBOL',
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
        provider: OracleProvider.API3,
        symbol: 'ETH',
        chain: Blockchain.ETHEREUM,
        dataSource: 'real',
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

    it('should throw error when no historical data available', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue([]);

      await expect(client.getHistoricalPrices('ETH')).rejects.toMatchObject({
        code: 'API3_HISTORICAL_PRICES_NOT_AVAILABLE',
      });
    });

    it('should throw error when historical data is null', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(null);

      await expect(client.getHistoricalPrices('ETH')).rejects.toMatchObject({
        code: 'API3_HISTORICAL_PRICES_NOT_AVAILABLE',
      });
    });

    it('should handle service error', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      await expect(client.getHistoricalPrices('ETH')).rejects.toMatchObject({
        code: 'API3_HISTORICAL_PRICES_ERROR',
      });
    });

    it('should re-throw API3_HISTORICAL_PRICES_NOT_AVAILABLE error', async () => {
      const customError = {
        code: 'API3_HISTORICAL_PRICES_NOT_AVAILABLE',
        message: 'Custom error',
      };
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockRejectedValue(
        customError
      );

      await expect(client.getHistoricalPrices('ETH')).rejects.toMatchObject({
        code: 'API3_HISTORICAL_PRICES_NOT_AVAILABLE',
      });
    });
  });

  describe('caching', () => {
    it('should cache data within TTL', async () => {
      const mockData = {
        price: 3500,
        timestamp: Date.now(),
        source: 'api3-dapi-ethereum',
        decimals: 18,
        confidence: 0.98,
        dapiName: 'ETH/USD',
        proxyAddress: '0x123',
        dataAge: 5000,
      };

      (api3NetworkService.getPrice as jest.Mock).mockResolvedValue(mockData);

      await client.getPrice('ETH');
      await client.getPrice('ETH');

      expect(api3NetworkService.getPrice).toHaveBeenCalledTimes(2);
    });
  });
});
