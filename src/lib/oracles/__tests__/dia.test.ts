/* eslint-disable max-lines-per-function */
import { DIAClient } from '@/lib/oracles/clients/dia';
import { diaSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';

jest.mock('@/lib/services/marketData/binanceMarketService');
jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('DIAClient', () => {
  let client: DIAClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new DIAClient();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      expect(client.name).toBe(OracleProvider.DIA);
      expect(client.supportedChains).toContain(Blockchain.ETHEREUM);
      expect(client.supportedChains).toContain(Blockchain.ARBITRUM);
      expect(client.supportedChains).toContain(Blockchain.POLYGON);
      expect(client.supportedChains).toContain(Blockchain.AVALANCHE);
      expect(client.supportedChains).toContain(Blockchain.BNB_CHAIN);
      expect(client.supportedChains).toContain(Blockchain.BASE);
      expect(client.defaultUpdateIntervalMinutes).toBe(5);
    });

    it('should create client with custom config', () => {
      const customClient = new DIAClient({
        useDatabase: false,
        validateData: false,
        useRealData: false,
      });
      expect(customClient).toBeInstanceOf(DIAClient);
    });

    it('should have correct supported chains count', () => {
      expect(client.supportedChains.length).toBe(6);
    });
  });

  describe('getSupportedSymbols', () => {
    it('should return array of supported symbols', () => {
      const symbols = client.getSupportedSymbols();

      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('USDC');
      expect(symbols).toContain('USDT');
      expect(symbols).toContain('LINK');
      expect(symbols).toContain('UNI');
    });

    it('should return a copy of symbols array', () => {
      const symbols1 = client.getSupportedSymbols();
      const symbols2 = client.getSupportedSymbols();

      expect(symbols1).not.toBe(symbols2);
      expect(symbols1).toEqual(symbols2);
    });

    it('should match diaSymbols from supportedSymbols', () => {
      const symbols = client.getSupportedSymbols();
      expect(symbols).toEqual([...diaSymbols]);
    });
  });

  describe('isSymbolSupported', () => {
    it('should return true for supported symbol without chain', () => {
      expect(client.isSymbolSupported('BTC')).toBe(true);
      expect(client.isSymbolSupported('ETH')).toBe(true);
      expect(client.isSymbolSupported('LINK')).toBe(true);
    });

    it('should return true for supported symbol on supported chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.ETHEREUM)).toBe(true);
      expect(client.isSymbolSupported('ETH', Blockchain.ARBITRUM)).toBe(true);
      expect(client.isSymbolSupported('LINK', Blockchain.POLYGON)).toBe(true);
    });

    it('should return true for supported symbol on all supported chains', () => {
      const supportedChains = [
        Blockchain.ETHEREUM,
        Blockchain.ARBITRUM,
        Blockchain.POLYGON,
        Blockchain.AVALANCHE,
        Blockchain.BNB_CHAIN,
        Blockchain.BASE,
      ];

      supportedChains.forEach((chain) => {
        expect(client.isSymbolSupported('ETH', chain)).toBe(true);
      });
    });

    it('should return false for unsupported symbol', () => {
      expect(client.isSymbolSupported('UNKNOWN')).toBe(false);
      expect(client.isSymbolSupported('DOGE')).toBe(false);
      expect(client.isSymbolSupported('SOL')).toBe(false);
    });

    it('should return false for unsupported symbol on supported chain', () => {
      expect(client.isSymbolSupported('UNKNOWN', Blockchain.ETHEREUM)).toBe(false);
    });

    it('should return false for supported symbol on unsupported chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.SOLANA)).toBe(false);
      expect(client.isSymbolSupported('ETH', Blockchain.OPTIMISM)).toBe(false);
    });

    it('should handle lowercase symbols', () => {
      expect(client.isSymbolSupported('btc')).toBe(true);
      expect(client.isSymbolSupported('eth')).toBe(true);
      expect(client.isSymbolSupported('unknown')).toBe(false);
    });
  });

  describe('getSupportedChainsForSymbol', () => {
    it('should return supported chains for supported symbol', () => {
      const chains = client.getSupportedChainsForSymbol('ETH');

      expect(Array.isArray(chains)).toBe(true);
      expect(chains).toContain(Blockchain.ETHEREUM);
      expect(chains).toContain(Blockchain.ARBITRUM);
      expect(chains).toContain(Blockchain.POLYGON);
      expect(chains.length).toBe(6);
    });

    it('should return empty array for unsupported symbol', () => {
      const chains = client.getSupportedChainsForSymbol('UNKNOWN');

      expect(chains).toEqual([]);
    });

    it('should return same chains for all supported symbols', () => {
      const ethChains = client.getSupportedChainsForSymbol('ETH');
      const btcChains = client.getSupportedChainsForSymbol('BTC');
      const linkChains = client.getSupportedChainsForSymbol('LINK');

      expect(ethChains).toEqual(btcChains);
      expect(btcChains).toEqual(linkChains);
    });
  });

  describe('getPrice', () => {
    const mockBinanceMarketData = {
      symbol: 'ETH',
      name: 'Ethereum',
      currentPrice: 3500.5,
      marketCap: 420000000000,
      marketCapRank: 2,
      totalVolume24h: 15000000000,
      high24h: 3550,
      low24h: 3450,
      priceChange24h: 50.5,
      priceChangePercentage24h: 1.46,
      circulatingSupply: 120000000,
      totalSupply: 120000000,
      ath: 4878.26,
      athChangePercentage: -28.5,
      atl: 0.42,
      atlChangePercentage: 832000,
      lastUpdated: new Date().toISOString(),
    };

    it('should fetch price from Binance API', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(
        mockBinanceMarketData
      );

      const result = await client.getPrice('ETH');

      expect(binanceMarketService.getTokenMarketData).toHaveBeenCalledWith('ETH');
      expect(result).toMatchObject({
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        price: mockBinanceMarketData.currentPrice,
        decimals: 8,
        confidence: 0.95,
        change24h: mockBinanceMarketData.priceChange24h,
        change24hPercent: mockBinanceMarketData.priceChangePercentage24h,
        source: 'binance-api',
      });
      expect(result.timestamp).toBe(new Date(mockBinanceMarketData.lastUpdated).getTime());
    });

    it('should fetch price with specified chain', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(
        mockBinanceMarketData
      );

      const result = await client.getPrice('ETH', Blockchain.ARBITRUM);

      expect(result.chain).toBe(Blockchain.ARBITRUM);
      expect(result.source).toBe('binance-api');
    });

    it('should use Ethereum as default chain', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(
        mockBinanceMarketData
      );

      const result = await client.getPrice('ETH');

      expect(result.chain).toBe(Blockchain.ETHEREUM);
    });

    it('should handle lowercase symbol', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(
        mockBinanceMarketData
      );

      const result = await client.getPrice('eth');

      expect(result.symbol).toBe('ETH');
      expect(binanceMarketService.getTokenMarketData).toHaveBeenCalledWith('eth');
    });

    it('should throw error when Binance returns no data', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(null);

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'NO_DATA_AVAILABLE',
      });
    });

    it('should throw error when Binance API fails', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockRejectedValue(
        new Error('Binance API error')
      );

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'DIA_ERROR',
      });
    });

    it('should handle network error', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'DIA_ERROR',
        message: expect.stringContaining('Network error'),
      });
    });

    it('should handle timeout error', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockRejectedValue(
        new Error('Request timeout')
      );

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'DIA_ERROR',
      });
    });

    it('should handle non-Error objects', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockRejectedValue('String error');

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'DIA_ERROR',
        message: expect.stringContaining('Failed to fetch price from Binance API'),
      });
    });

    it('should handle undefined error', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockRejectedValue(undefined);

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'DIA_ERROR',
      });
    });

    it('should handle null error', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockRejectedValue(null);

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'DIA_ERROR',
      });
    });

    it('should fetch DIA token price from Binance API', async () => {
      const mockDIAMarketData = {
        ...mockBinanceMarketData,
        symbol: 'DIA',
        name: 'DIA',
        currentPrice: 0.85,
        priceChange24h: 0.05,
        priceChangePercentage24h: 6.25,
      };
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(mockDIAMarketData);

      const result = await client.getPrice('DIA');

      expect(binanceMarketService.getTokenMarketData).toHaveBeenCalledWith('DIA');
      expect(result).toMatchObject({
        provider: OracleProvider.DIA,
        symbol: 'DIA',
        price: 0.85,
        decimals: 8,
        confidence: 0.95,
        change24h: 0.05,
        change24hPercent: 6.25,
        source: 'binance-api',
      });
    });

    it('should throw error when Binance returns no data for DIA', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(null);

      await expect(client.getPrice('DIA')).rejects.toMatchObject({
        code: 'NO_DATA_AVAILABLE',
      });
    });

    it('should throw error when Binance API fails for DIA', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockRejectedValue(
        new Error('Binance API error')
      );

      await expect(client.getPrice('DIA')).rejects.toMatchObject({
        code: 'DIA_ERROR',
      });
    });

    it('should return price with confidence', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(
        mockBinanceMarketData
      );

      const result = await client.getPrice('ETH');

      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should return price with binance-api source', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(
        mockBinanceMarketData
      );

      const result = await client.getPrice('ETH');

      expect(result.source).toBe('binance-api');
    });

    it('should handle very large price values', async () => {
      const largePriceData = {
        ...mockBinanceMarketData,
        currentPrice: 999999999.99,
      };
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(largePriceData);

      const result = await client.getPrice('ETH');

      expect(result.price).toBe(999999999.99);
    });

    it('should handle very small price values', async () => {
      const smallPriceData = {
        ...mockBinanceMarketData,
        currentPrice: 0.00000001,
      };
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(smallPriceData);

      const result = await client.getPrice('ETH');

      expect(result.price).toBe(0.00000001);
    });

    it('should handle rate limiting from Binance API', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'DIA_ERROR',
        message: expect.stringContaining('Rate limit exceeded'),
      });
    });

    it('should handle malformed JSON from Binance API', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockRejectedValue(
        new Error('Unexpected token < in JSON')
      );

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'DIA_ERROR',
      });
    });

    it('should handle connection timeout from Binance API', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockRejectedValue(
        new Error('ETIMEDOUT')
      );

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'DIA_ERROR',
      });
    });

    it('should handle DNS resolution failure', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockRejectedValue(
        new Error('getaddrinfo ENOTFOUND api.binance.com')
      );

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'DIA_ERROR',
      });
    });
  });

  describe('getHistoricalPrices', () => {
    const mockHistoricalPricePoints = [
      { price: 3450, timestamp: Date.now() - 7200000 },
      { price: 3475, timestamp: Date.now() - 3600000 },
      { price: 3500, timestamp: Date.now() },
    ];

    it('should return historical price data from Binance API', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(
        mockHistoricalPricePoints
      );

      const result = await client.getHistoricalPrices('ETH');

      expect(binanceMarketService.getHistoricalPrices).toHaveBeenCalledWith('ETH', 24);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0]).toMatchObject({
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        chain: Blockchain.ETHEREUM,
        source: 'binance-api',
      });
    });

    it('should use specified chain', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(
        mockHistoricalPricePoints
      );

      const result = await client.getHistoricalPrices('ETH', Blockchain.ARBITRUM, 24);

      expect(result[0].chain).toBe(Blockchain.ARBITRUM);
    });

    it('should use default period of 24 hours', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(
        mockHistoricalPricePoints
      );

      await client.getHistoricalPrices('ETH');

      expect(binanceMarketService.getHistoricalPrices).toHaveBeenCalledWith('ETH', 24);
    });

    it('should use custom period', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(
        mockHistoricalPricePoints
      );

      await client.getHistoricalPrices('ETH', undefined, 48);

      expect(binanceMarketService.getHistoricalPrices).toHaveBeenCalledWith('ETH', 48);
    });

    it('should return empty array when no historical data available', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue([]);

      const result = await client.getHistoricalPrices('ETH');

      expect(result).toEqual([]);
    });

    it('should return empty array when Binance returns null', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(null);

      const result = await client.getHistoricalPrices('ETH');

      expect(result).toEqual([]);
    });

    it('should return empty array on Binance API error', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockRejectedValue(
        new Error('Binance API error')
      );

      const result = await client.getHistoricalPrices('ETH');

      expect(result).toEqual([]);
    });

    it('should calculate change24h correctly', async () => {
      const pricePoints = [
        { price: 100, timestamp: Date.now() - 7200000 },
        { price: 105, timestamp: Date.now() - 3600000 },
        { price: 110, timestamp: Date.now() },
      ];

      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(pricePoints);

      const result = await client.getHistoricalPrices('ETH');

      expect(result[0].change24h).toBe(10);
      expect(result[0].change24hPercent).toBe(10);
      expect(result[1].change24h).toBe(5);
      expect(result[1].change24hPercent).toBe(4.76);
      expect(result[2].change24h).toBe(0);
      expect(result[2].change24hPercent).toBe(0);
    });

    it('should use Ethereum as default chain', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(
        mockHistoricalPricePoints
      );

      const result = await client.getHistoricalPrices('ETH');

      expect(result[0].chain).toBe(Blockchain.ETHEREUM);
    });

    it('should use binance-api as source', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(
        mockHistoricalPricePoints
      );

      const result = await client.getHistoricalPrices('ETH');

      expect(result[0].source).toBe('binance-api');
    });

    it('should handle historical prices with single data point', async () => {
      const singleDataPoint = [{ price: 100, timestamp: Date.now() }];

      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(singleDataPoint);

      const result = await client.getHistoricalPrices('ETH');

      expect(result.length).toBe(1);
      expect(result[0].change24h).toBe(0);
      expect(result[0].change24hPercent).toBe(0);
    });

    it('should handle historical prices with many data points', async () => {
      const manyDataPoints = Array.from({ length: 100 }, (_, i) => ({
        price: 100 + i,
        timestamp: Date.now() - i * 3600000,
      }));

      (binanceMarketService.getHistoricalPrices as jest.Mock).mockResolvedValue(manyDataPoints);

      const result = await client.getHistoricalPrices('ETH');

      expect(result.length).toBe(100);
    });

    it('should handle non-Error objects in error handling', async () => {
      (binanceMarketService.getHistoricalPrices as jest.Mock).mockRejectedValue('String error');

      const result = await client.getHistoricalPrices('ETH');

      expect(result).toEqual([]);
    });
  });
});
