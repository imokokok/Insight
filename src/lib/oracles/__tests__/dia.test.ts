/* eslint-disable max-lines-per-function */
import { getDIADataService } from '@/lib/oracles/diaDataService';
import { diaSymbols } from '@/lib/oracles/supportedSymbols';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { DIAClient } from '@/lib/services/oracle/clients/dia';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

jest.mock('@/lib/oracles/diaDataService');
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
    const mockDIAPriceData: PriceData = {
      provider: OracleProvider.DIA,
      symbol: 'ETH',
      price: 3500.5,
      timestamp: Date.now(),
      decimals: 8,
      confidence: 0.95,
      chain: Blockchain.ETHEREUM,
      source: 'dia-api',
    };

    const mockBinanceMarketData = {
      symbol: 'DIA',
      name: 'DIA',
      currentPrice: 0.85,
      marketCap: 50000000,
      marketCapRank: 500,
      totalVolume24h: 1000000,
      high24h: 0.9,
      low24h: 0.8,
      priceChange24h: 0.05,
      priceChangePercentage24h: 6.25,
      circulatingSupply: 60000000,
      totalSupply: 200000000,
      ath: 5.0,
      athChangePercentage: -83,
      atl: 0.5,
      atlChangePercentage: 70,
      lastUpdated: new Date().toISOString(),
    };

    describe('DIA token special handling', () => {
      it('should fetch DIA token price from Binance API', async () => {
        (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(
          mockBinanceMarketData
        );

        const result = await client.getPrice('DIA');

        expect(binanceMarketService.getTokenMarketData).toHaveBeenCalledWith('DIA');
        expect(result).toMatchObject({
          provider: OracleProvider.DIA,
          symbol: 'DIA',
          price: mockBinanceMarketData.currentPrice,
          decimals: 8,
          confidence: 0.95,
          change24h: mockBinanceMarketData.priceChange24h,
          change24hPercent: mockBinanceMarketData.priceChangePercentage24h,
          source: 'binance-api',
        });
        expect(result.timestamp).toBe(new Date(mockBinanceMarketData.lastUpdated).getTime());
      });

      it('should fetch DIA token price with specified chain', async () => {
        (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(
          mockBinanceMarketData
        );

        const result = await client.getPrice('DIA', Blockchain.ARBITRUM);

        expect(result.chain).toBe(Blockchain.ARBITRUM);
        expect(result.source).toBe('binance-api');
      });

      it('should use Ethereum as default chain for DIA token', async () => {
        (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(
          mockBinanceMarketData
        );

        const result = await client.getPrice('DIA');

        expect(result.chain).toBe(Blockchain.ETHEREUM);
      });

      it('should handle lowercase DIA symbol', async () => {
        (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(
          mockBinanceMarketData
        );

        const result = await client.getPrice('dia');

        expect(result.symbol).toBe('DIA');
        expect(binanceMarketService.getTokenMarketData).toHaveBeenCalledWith('dia');
      });

      it('should throw error when Binance returns no data for DIA', async () => {
        (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(null);

        await expect(client.getPrice('DIA')).rejects.toMatchObject({
          code: 'DIA_ERROR',
          message: 'Failed to fetch price from DIA',
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
    });

    describe('Regular token price fetching', () => {
      it('should fetch price for valid symbol', async () => {
        const mockGetAssetPrice = jest.fn().mockResolvedValue(mockDIAPriceData);
        (getDIADataService as jest.Mock).mockReturnValue({
          getAssetPrice: mockGetAssetPrice,
        });

        const result = await client.getPrice('ETH');

        expect(result).toMatchObject({
          provider: OracleProvider.DIA,
          symbol: 'ETH',
          price: mockDIAPriceData.price,
          chain: Blockchain.ETHEREUM,
        });
        expect(mockGetAssetPrice).toHaveBeenCalledWith('ETH', undefined);
      });

      it('should fetch price for specific chain', async () => {
        const mockGetAssetPrice = jest.fn().mockResolvedValue({
          ...mockDIAPriceData,
          chain: Blockchain.ARBITRUM,
        });
        (getDIADataService as jest.Mock).mockReturnValue({
          getAssetPrice: mockGetAssetPrice,
        });

        const result = await client.getPrice('ETH', Blockchain.ARBITRUM);

        expect(result.chain).toBe(Blockchain.ARBITRUM);
        expect(mockGetAssetPrice).toHaveBeenCalledWith('ETH', Blockchain.ARBITRUM);
      });

      it('should handle lowercase symbol', async () => {
        const mockGetAssetPrice = jest.fn().mockResolvedValue(mockDIAPriceData);
        (getDIADataService as jest.Mock).mockReturnValue({
          getAssetPrice: mockGetAssetPrice,
        });

        const result = await client.getPrice('eth');

        expect(result.symbol).toBe('ETH');
        expect(mockGetAssetPrice).toHaveBeenCalledWith('eth', undefined);
      });

      it('should throw error when DIA service returns no data', async () => {
        const mockGetAssetPrice = jest.fn().mockResolvedValue(null);
        (getDIADataService as jest.Mock).mockReturnValue({
          getAssetPrice: mockGetAssetPrice,
        });

        await expect(client.getPrice('ETH')).rejects.toMatchObject({
          code: 'DIA_ERROR',
          message: 'Failed to fetch price from DIA',
        });
      });

      it('should handle DIA service error', async () => {
        const mockGetAssetPrice = jest.fn().mockRejectedValue(new Error('DIA service error'));
        (getDIADataService as jest.Mock).mockReturnValue({
          getAssetPrice: mockGetAssetPrice,
        });

        await expect(client.getPrice('ETH')).rejects.toMatchObject({
          code: 'DIA_ERROR',
        });
      });

      it('should handle network error', async () => {
        const mockGetAssetPrice = jest.fn().mockRejectedValue(new Error('Network error'));
        (getDIADataService as jest.Mock).mockReturnValue({
          getAssetPrice: mockGetAssetPrice,
        });

        await expect(client.getPrice('ETH')).rejects.toMatchObject({
          code: 'DIA_ERROR',
          message: expect.stringContaining('Network error'),
        });
      });

      it('should handle timeout error', async () => {
        const mockGetAssetPrice = jest.fn().mockRejectedValue(new Error('Request timeout'));
        (getDIADataService as jest.Mock).mockReturnValue({
          getAssetPrice: mockGetAssetPrice,
        });

        await expect(client.getPrice('ETH')).rejects.toMatchObject({
          code: 'DIA_ERROR',
        });
      });

      it('should return price with confidence', async () => {
        const mockGetAssetPrice = jest.fn().mockResolvedValue(mockDIAPriceData);
        (getDIADataService as jest.Mock).mockReturnValue({
          getAssetPrice: mockGetAssetPrice,
        });

        const result = await client.getPrice('ETH');

        expect(result.confidence).toBeDefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });

      it('should return price with source', async () => {
        const mockGetAssetPrice = jest.fn().mockResolvedValue(mockDIAPriceData);
        (getDIADataService as jest.Mock).mockReturnValue({
          getAssetPrice: mockGetAssetPrice,
        });

        const result = await client.getPrice('ETH');

        expect(result.source).toBeDefined();
        expect(result.source).toBe('dia-api');
      });
    });

    describe('Error handling', () => {
      it('should handle non-Error objects', async () => {
        const mockGetAssetPrice = jest.fn().mockRejectedValue('String error');
        (getDIADataService as jest.Mock).mockReturnValue({
          getAssetPrice: mockGetAssetPrice,
        });

        await expect(client.getPrice('ETH')).rejects.toMatchObject({
          code: 'DIA_ERROR',
          message: expect.stringContaining('Failed to fetch price from DIA'),
        });
      });

      it('should handle undefined error', async () => {
        const mockGetAssetPrice = jest.fn().mockRejectedValue(undefined);
        (getDIADataService as jest.Mock).mockReturnValue({
          getAssetPrice: mockGetAssetPrice,
        });

        await expect(client.getPrice('ETH')).rejects.toMatchObject({
          code: 'DIA_ERROR',
        });
      });

      it('should handle null error', async () => {
        const mockGetAssetPrice = jest.fn().mockRejectedValue(null);
        (getDIADataService as jest.Mock).mockReturnValue({
          getAssetPrice: mockGetAssetPrice,
        });

        await expect(client.getPrice('ETH')).rejects.toMatchObject({
          code: 'DIA_ERROR',
        });
      });
    });
  });

  describe('getHistoricalPrices', () => {
    const mockHistoricalPrices: PriceData[] = [
      {
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        price: 3450,
        timestamp: Date.now() - 3600000,
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.ETHEREUM,
        source: 'dia-api',
      },
      {
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        price: 3475,
        timestamp: Date.now() - 1800000,
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.ETHEREUM,
        source: 'dia-api',
      },
      {
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.ETHEREUM,
        source: 'dia-api',
      },
    ];

    it('should return historical price data', async () => {
      const mockGetHistoricalPrices = jest.fn().mockResolvedValue(mockHistoricalPrices);
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0]).toMatchObject({
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        chain: Blockchain.ETHEREUM,
      });
      expect(mockGetHistoricalPrices).toHaveBeenCalledWith('ETH', undefined, 24);
    });

    it('should return historical prices with change calculations', async () => {
      const mockGetHistoricalPrices = jest.fn().mockResolvedValue(mockHistoricalPrices);
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(result[0].change24h).toBe(0);
      expect(result[0].change24hPercent).toBe(0);
    });

    it('should use specified chain', async () => {
      const mockGetHistoricalPrices = jest
        .fn()
        .mockResolvedValue(mockHistoricalPrices.map((p) => ({ ...p, chain: Blockchain.ARBITRUM })));
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH', Blockchain.ARBITRUM, 24);

      expect(result[0].chain).toBe(Blockchain.ARBITRUM);
      expect(mockGetHistoricalPrices).toHaveBeenCalledWith('ETH', Blockchain.ARBITRUM, 24);
    });

    it('should use default period of 24 hours', async () => {
      const mockGetHistoricalPrices = jest.fn().mockResolvedValue(mockHistoricalPrices);
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      await client.getHistoricalPrices('ETH');

      expect(mockGetHistoricalPrices).toHaveBeenCalledWith('ETH', undefined, 24);
    });

    it('should use custom period', async () => {
      const mockGetHistoricalPrices = jest.fn().mockResolvedValue(mockHistoricalPrices);
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      await client.getHistoricalPrices('ETH', undefined, 48);

      expect(mockGetHistoricalPrices).toHaveBeenCalledWith('ETH', undefined, 48);
    });

    it('should return empty array when no historical data available', async () => {
      const mockGetHistoricalPrices = jest.fn().mockResolvedValue([]);
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(result).toEqual([]);
    });

    it('should return empty array when DIA service returns null', async () => {
      const mockGetHistoricalPrices = jest.fn().mockResolvedValue(null);
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(result).toEqual([]);
    });

    it('should return empty array on service error', async () => {
      const mockGetHistoricalPrices = jest.fn().mockRejectedValue(new Error('Service error'));
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(result).toEqual([]);
    });

    it('should handle network error gracefully', async () => {
      const mockGetHistoricalPrices = jest.fn().mockRejectedValue(new Error('Network error'));
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(result).toEqual([]);
    });

    it('should handle non-Error objects in error handling', async () => {
      const mockGetHistoricalPrices = jest.fn().mockRejectedValue('String error');
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(result).toEqual([]);
    });

    it('should calculate change24h correctly', async () => {
      const mockData = [
        { price: 100, timestamp: Date.now() - 7200000, confidence: 0.95, source: 'dia-api' },
        { price: 105, timestamp: Date.now() - 3600000, confidence: 0.95, source: 'dia-api' },
        { price: 110, timestamp: Date.now(), confidence: 0.95, source: 'dia-api' },
      ];

      const mockGetHistoricalPrices = jest.fn().mockResolvedValue(mockData);
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(result[0].change24h).toBe(0);
      expect(result[0].change24hPercent).toBe(0);
      expect(result[1].change24h).toBe(5);
      expect(result[1].change24hPercent).toBe(5);
      expect(result[2].change24h).toBe(10);
      expect(result[2].change24hPercent).toBe(10);
    });

    it('should use Ethereum as default chain', async () => {
      const mockGetHistoricalPrices = jest.fn().mockResolvedValue(mockHistoricalPrices);
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(result[0].chain).toBe(Blockchain.ETHEREUM);
    });

    it('should preserve confidence from source data', async () => {
      const mockDataWithConfidence = [
        { price: 100, timestamp: Date.now(), confidence: 0.92, source: 'dia-api' },
        { price: 105, timestamp: Date.now() + 3600000, confidence: 0.98, source: 'dia-api' },
      ];

      const mockGetHistoricalPrices = jest.fn().mockResolvedValue(mockDataWithConfidence);
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(result[0].confidence).toBe(0.92);
      expect(result[1].confidence).toBe(0.98);
    });

    it('should use default confidence when not provided', async () => {
      const mockDataWithoutConfidence = [
        { price: 100, timestamp: Date.now(), source: 'dia-api' },
        { price: 105, timestamp: Date.now() + 3600000, source: 'dia-api' },
      ];

      const mockGetHistoricalPrices = jest.fn().mockResolvedValue(mockDataWithoutConfidence);
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(result[0].confidence).toBe(0.95);
      expect(result[1].confidence).toBe(0.95);
    });

    it('should preserve source from source data', async () => {
      const mockDataWithSource = [
        { price: 100, timestamp: Date.now(), confidence: 0.95, source: 'custom-source' },
      ];

      const mockGetHistoricalPrices = jest.fn().mockResolvedValue(mockDataWithSource);
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(result[0].source).toBe('custom-source');
    });

    it('should use default source when not provided', async () => {
      const mockDataWithoutSource = [{ price: 100, timestamp: Date.now(), confidence: 0.95 }];

      const mockGetHistoricalPrices = jest.fn().mockResolvedValue(mockDataWithoutSource);
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(result[0].source).toBe('dia-api');
    });
  });

  describe('Integration with DIADataService', () => {
    it('should call getDIADataService singleton', async () => {
      const mockGetAssetPrice = jest.fn().mockResolvedValue({
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.ETHEREUM,
        source: 'dia-api',
      });

      (getDIADataService as jest.Mock).mockReturnValue({
        getAssetPrice: mockGetAssetPrice,
      });

      await client.getPrice('ETH');

      expect(getDIADataService).toHaveBeenCalled();
    });

    it('should use same DIADataService instance for multiple calls', async () => {
      const mockGetAssetPrice = jest.fn().mockResolvedValue({
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.ETHEREUM,
        source: 'dia-api',
      });

      (getDIADataService as jest.Mock).mockReturnValue({
        getAssetPrice: mockGetAssetPrice,
      });

      await client.getPrice('ETH');
      await client.getPrice('BTC');
      await client.getPrice('LINK');

      expect(getDIADataService).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle symbol with whitespace', async () => {
      const mockGetAssetPrice = jest.fn().mockResolvedValue({
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.ETHEREUM,
        source: 'dia-api',
      });

      (getDIADataService as jest.Mock).mockReturnValue({
        getAssetPrice: mockGetAssetPrice,
      });

      const result = await client.getPrice(' eth ');

      expect(result.symbol).toBe('ETH');
    });

    it('should handle very large price values', async () => {
      const largePrice = 999999999.99;
      const mockGetAssetPrice = jest.fn().mockResolvedValue({
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        price: largePrice,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.ETHEREUM,
        source: 'dia-api',
      });

      (getDIADataService as jest.Mock).mockReturnValue({
        getAssetPrice: mockGetAssetPrice,
      });

      const result = await client.getPrice('ETH');

      expect(result.price).toBe(largePrice);
    });

    it('should handle very small price values', async () => {
      const smallPrice = 0.00000001;
      const mockGetAssetPrice = jest.fn().mockResolvedValue({
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        price: smallPrice,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.ETHEREUM,
        source: 'dia-api',
      });

      (getDIADataService as jest.Mock).mockReturnValue({
        getAssetPrice: mockGetAssetPrice,
      });

      const result = await client.getPrice('ETH');

      expect(result.price).toBe(smallPrice);
    });

    it('should handle zero price', async () => {
      const mockGetAssetPrice = jest.fn().mockResolvedValue({
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        price: 0,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.ETHEREUM,
        source: 'dia-api',
      });

      (getDIADataService as jest.Mock).mockReturnValue({
        getAssetPrice: mockGetAssetPrice,
      });

      const result = await client.getPrice('ETH');

      expect(result.price).toBe(0);
    });

    it('should handle historical prices with single data point', async () => {
      const singleDataPoint = [
        { price: 100, timestamp: Date.now(), confidence: 0.95, source: 'dia-api' },
      ];

      const mockGetHistoricalPrices = jest.fn().mockResolvedValue(singleDataPoint);
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(result.length).toBe(1);
      expect(result[0].change24h).toBe(0);
      expect(result[0].change24hPercent).toBe(0);
    });

    it('should handle historical prices with many data points', async () => {
      const manyDataPoints = Array.from({ length: 100 }, (_, i) => ({
        price: 100 + i,
        timestamp: Date.now() - i * 3600000,
        confidence: 0.95,
        source: 'dia-api',
      }));

      const mockGetHistoricalPrices = jest.fn().mockResolvedValue(manyDataPoints);
      (getDIADataService as jest.Mock).mockReturnValue({
        getHistoricalPrices: mockGetHistoricalPrices,
      });

      const result = await client.getHistoricalPrices('ETH');

      expect(result.length).toBe(100);
    });
  });

  describe('Real API integration scenarios', () => {
    it('should handle rate limiting from DIA API', async () => {
      const mockGetAssetPrice = jest.fn().mockRejectedValue(new Error('Rate limit exceeded'));
      (getDIADataService as jest.Mock).mockReturnValue({
        getAssetPrice: mockGetAssetPrice,
      });

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'DIA_ERROR',
        message: expect.stringContaining('Rate limit exceeded'),
      });
    });

    it('should handle invalid response from DIA API', async () => {
      const mockGetAssetPrice = jest.fn().mockResolvedValue({
        invalid: 'response',
      });
      (getDIADataService as jest.Mock).mockReturnValue({
        getAssetPrice: mockGetAssetPrice,
      });

      const result = await client.getPrice('ETH');

      expect(result).toBeDefined();
    });

    it('should handle malformed JSON from Binance API', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockRejectedValue(
        new Error('Unexpected token < in JSON')
      );

      await expect(client.getPrice('DIA')).rejects.toMatchObject({
        code: 'DIA_ERROR',
      });
    });

    it('should handle connection timeout from DIA API', async () => {
      const mockGetAssetPrice = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));
      (getDIADataService as jest.Mock).mockReturnValue({
        getAssetPrice: mockGetAssetPrice,
      });

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'DIA_ERROR',
      });
    });

    it('should handle DNS resolution failure', async () => {
      const mockGetAssetPrice = jest
        .fn()
        .mockRejectedValue(new Error('getaddrinfo ENOTFOUND api.diadata.org'));
      (getDIADataService as jest.Mock).mockReturnValue({
        getAssetPrice: mockGetAssetPrice,
      });

      await expect(client.getPrice('ETH')).rejects.toMatchObject({
        code: 'DIA_ERROR',
      });
    });
  });

  describe('Data validation', () => {
    it('should handle missing timestamp in price data', async () => {
      const mockGetAssetPrice = jest.fn().mockResolvedValue({
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        price: 3500,
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.ETHEREUM,
        source: 'dia-api',
      });

      (getDIADataService as jest.Mock).mockReturnValue({
        getAssetPrice: mockGetAssetPrice,
      });

      const result = await client.getPrice('ETH');

      expect(result).toBeDefined();
    });

    it('should handle missing decimals in price data', async () => {
      const mockGetAssetPrice = jest.fn().mockResolvedValue({
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        confidence: 0.95,
        chain: Blockchain.ETHEREUM,
        source: 'dia-api',
      });

      (getDIADataService as jest.Mock).mockReturnValue({
        getAssetPrice: mockGetAssetPrice,
      });

      const result = await client.getPrice('ETH');

      expect(result).toBeDefined();
    });

    it('should handle missing confidence in price data', async () => {
      const mockGetAssetPrice = jest.fn().mockResolvedValue({
        provider: OracleProvider.DIA,
        symbol: 'ETH',
        price: 3500,
        timestamp: Date.now(),
        decimals: 8,
        chain: Blockchain.ETHEREUM,
        source: 'dia-api',
      });

      (getDIADataService as jest.Mock).mockReturnValue({
        getAssetPrice: mockGetAssetPrice,
      });

      const result = await client.getPrice('ETH');

      expect(result).toBeDefined();
    });
  });
});
