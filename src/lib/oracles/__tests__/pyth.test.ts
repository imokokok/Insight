import { PythClient } from '@/lib/services/oracle/clients/pyth';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

const mockGetLatestPrice = jest.fn();
const mockGetMultiplePrices = jest.fn();
const mockGetHistoricalPrices = jest.fn();

jest.mock('@/lib/oracles/pythDataService', () => ({
  getPythDataService: () => ({
    getLatestPrice: mockGetLatestPrice,
    getMultiplePrices: mockGetMultiplePrices,
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
    mockGetMultiplePrices.mockReset();
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
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(
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
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(
        mockHistoricalPrices
      );

      const result = await client.getHistoricalPrices('BTC');

      expect(result[0].change24h).toBe(0);
      expect(result[0].change24hPercent).toBe(0);
    });

    it('should use specified chain', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(
        mockHistoricalPrices
      );

      const result = await client.getHistoricalPrices('BTC', Blockchain.SOLANA, 24);

      expect(result[0].chain).toBe(Blockchain.SOLANA);
    });

    it('should use default period of 24 hours', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(
        mockHistoricalPrices
      );

      await client.getHistoricalPrices('BTC');

      expect(binanceMarketService.getHistoricalPricesByHours).toHaveBeenCalledWith('BTC', 24);
    });

    it('should use custom period', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(
        mockHistoricalPrices
      );

      await client.getHistoricalPrices('BTC', undefined, 48);

      expect(binanceMarketService.getHistoricalPricesByHours).toHaveBeenCalledWith('BTC', 48);
    });

    it('should return empty array when no historical data available', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue([]);

      const result = await client.getHistoricalPrices('BTC');

      expect(result).toEqual([]);
    });

    it('should return empty array when historical data is null', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(null);

      const result = await client.getHistoricalPrices('BTC');

      expect(result).toEqual([]);
    });

    it('should handle service error gracefully', async () => {
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockRejectedValue(
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

      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockResolvedValue(prices);

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
