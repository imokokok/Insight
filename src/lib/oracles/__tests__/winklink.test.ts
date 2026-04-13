import { getWINkLinkRealDataService } from '@/lib/oracles/winklinkRealDataService';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { WINkLinkClient } from '@/lib/services/oracle/clients/winklink';
import { OracleProvider, Blockchain } from '@/types/oracle';

jest.mock('@/lib/oracles/winklinkRealDataService');
jest.mock('@/lib/services/marketData/binanceMarketService');
jest.mock('@/lib/config/serverEnv', () => ({
  FEATURE_FLAGS: {
    useRealWinklinkData: false,
    useRealChainlinkData: false,
    useRealApi3Data: false,
  },
}));
jest.mock('@/lib/oracles/base/databaseOperations', () => ({
  fetchPriceWithDatabase: jest.fn(),
  fetchHistoricalPricesWithDatabase: jest.fn(),
}));
jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockRealDataService = {
  getPriceFromContract: jest.fn(),
  getHistoricalPrices: jest.fn(),
};

const mockFetchPriceWithDatabase = jest.requireMock(
  '@/lib/oracles/base/databaseOperations'
).fetchPriceWithDatabase;

describe('WINkLinkClient', () => {
  let client: WINkLinkClient;

  beforeEach(() => {
    jest.clearAllMocks();
    (getWINkLinkRealDataService as jest.Mock).mockReturnValue(mockRealDataService);
    client = new WINkLinkClient();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      expect(client.name).toBe(OracleProvider.WINKLINK);
      expect(client.supportedChains).toEqual([Blockchain.TRON]);
      expect(client.defaultUpdateIntervalMinutes).toBe(60);
    });

    it('should create client with custom config', () => {
      const customClient = new WINkLinkClient({
        useDatabase: false,
        validateData: false,
        useRealData: false,
      });
      expect(customClient).toBeInstanceOf(WINkLinkClient);
    });
  });

  describe('getSupportedSymbols', () => {
    it('should return array of supported symbols', () => {
      const symbols = client.getSupportedSymbols();

      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('TRX');
      expect(symbols).toContain('WIN');
      expect(symbols).toContain('USDT');
    });

    it('should return all WINkLink supported symbols', () => {
      const symbols = client.getSupportedSymbols();

      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('TRX');
      expect(symbols).toContain('USDT');
      expect(symbols).toContain('USDC');
      expect(symbols).toContain('WIN');
      expect(symbols).toContain('BTT');
      expect(symbols).toContain('JST');
      expect(symbols).toContain('SUN');
    });
  });

  describe('isSymbolSupported', () => {
    it('should return true for supported symbol without chain', () => {
      expect(client.isSymbolSupported('BTC')).toBe(true);
      expect(client.isSymbolSupported('ETH')).toBe(true);
      expect(client.isSymbolSupported('TRX')).toBe(true);
      expect(client.isSymbolSupported('WIN')).toBe(true);
    });

    it('should return true for supported symbol on TRON chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.TRON)).toBe(true);
      expect(client.isSymbolSupported('ETH', Blockchain.TRON)).toBe(true);
    });

    it('should return false for unsupported symbol', () => {
      expect(client.isSymbolSupported('UNKNOWN')).toBe(false);
      expect(client.isSymbolSupported('SOL')).toBe(false);
    });

    it('should return false for supported symbol on unsupported chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.ETHEREUM)).toBe(false);
      expect(client.isSymbolSupported('ETH', Blockchain.ARBITRUM)).toBe(false);
      expect(client.isSymbolSupported('TRX', Blockchain.SOLANA)).toBe(false);
    });

    it('should handle case-insensitive symbol check', () => {
      expect(client.isSymbolSupported('btc')).toBe(true);
      expect(client.isSymbolSupported('Eth')).toBe(true);
      expect(client.isSymbolSupported('WIN')).toBe(true);
    });
  });

  describe('getSupportedChainsForSymbol', () => {
    it('should return TRON chain for supported symbol', () => {
      const chains = client.getSupportedChainsForSymbol('BTC');

      expect(chains).toEqual([Blockchain.TRON]);
    });

    it('should return TRON chain for WIN token', () => {
      const chains = client.getSupportedChainsForSymbol('WIN');

      expect(chains).toEqual([Blockchain.TRON]);
    });

    it('should return empty array for unsupported symbol', () => {
      const chains = client.getSupportedChainsForSymbol('UNKNOWN');

      expect(chains).toEqual([]);
    });
  });

  describe('getPrice - WIN token special handling', () => {
    const mockMarketData = {
      symbol: 'WIN',
      name: 'WINkLink',
      currentPrice: 0.00012,
      marketCap: 0,
      marketCapRank: 0,
      totalVolume24h: 50000000,
      high24h: 0.00013,
      low24h: 0.00011,
      priceChange24h: 0.000002,
      priceChangePercentage24h: 1.5,
      circulatingSupply: 0,
      totalSupply: 0,
      ath: 0,
      athChangePercentage: 0,
      atl: 0,
      atlChangePercentage: 0,
      lastUpdated: new Date().toISOString(),
    };

    it('should use Binance API for WIN token price', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(mockMarketData);

      const result = await client.getPrice('WIN');

      expect(binanceMarketService.getTokenMarketData).toHaveBeenCalledWith('WIN');
      expect(result).toMatchObject({
        provider: OracleProvider.WINKLINK,
        symbol: 'WIN',
        price: mockMarketData.currentPrice,
        chain: Blockchain.TRON,
        source: 'binance-api',
        decimals: 8,
        confidence: 0.95,
      });
    });

    it('should include 24h change data for WIN token', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(mockMarketData);

      const result = await client.getPrice('WIN');

      expect(result.change24h).toBe(mockMarketData.priceChange24h);
      expect(result.change24hPercent).toBe(mockMarketData.priceChangePercentage24h);
    });

    it('should handle WIN token with lowercase symbol', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(mockMarketData);

      const result = await client.getPrice('win');

      expect(binanceMarketService.getTokenMarketData).toHaveBeenCalledWith('win');
      expect(result.symbol).toBe('WIN');
    });

    it('should return correct timestamp from market data', async () => {
      const customTimestamp = Date.now() - 60000;
      const marketDataWithTimestamp = {
        ...mockMarketData,
        lastUpdated: new Date(customTimestamp).toISOString(),
      };
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(
        marketDataWithTimestamp
      );

      const result = await client.getPrice('WIN');

      expect(result.timestamp).toBe(customTimestamp);
    });

    it('should fallback to database when Binance returns null for WIN', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(null);
      mockFetchPriceWithDatabase.mockResolvedValue({
        provider: OracleProvider.WINKLINK,
        symbol: 'WIN',
        price: 0.00011,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.TRON,
      });

      const result = await client.getPrice('WIN');

      expect(mockFetchPriceWithDatabase).toHaveBeenCalled();
      expect(result.symbol).toBe('WIN');
    });
  });

  describe('getPrice - non-WIN tokens with real data disabled', () => {
    it('should fetch price from database when real data is disabled', async () => {
      mockFetchPriceWithDatabase.mockResolvedValue({
        provider: OracleProvider.WINKLINK,
        symbol: 'BTC',
        price: 45000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.TRON,
      });

      const result = await client.getPrice('BTC');

      expect(mockFetchPriceWithDatabase).toHaveBeenCalledWith(
        OracleProvider.WINKLINK,
        'BTC',
        undefined,
        true
      );
      expect(result.provider).toBe(OracleProvider.WINKLINK);
      expect(result.symbol).toBe('BTC');
    });

    it('should fetch price for ETH', async () => {
      mockFetchPriceWithDatabase.mockResolvedValue({
        provider: OracleProvider.WINKLINK,
        symbol: 'ETH',
        price: 3000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.TRON,
      });

      const result = await client.getPrice('ETH');

      expect(result.provider).toBe(OracleProvider.WINKLINK);
      expect(result.symbol).toBe('ETH');
    });

    it('should fetch price for TRX', async () => {
      mockFetchPriceWithDatabase.mockResolvedValue({
        provider: OracleProvider.WINKLINK,
        symbol: 'TRX',
        price: 0.08,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.TRON,
      });

      const result = await client.getPrice('TRX');

      expect(result.provider).toBe(OracleProvider.WINKLINK);
      expect(result.symbol).toBe('TRX');
    });

    it('should use specified chain', async () => {
      mockFetchPriceWithDatabase.mockResolvedValue({
        provider: OracleProvider.WINKLINK,
        symbol: 'BTC',
        price: 45000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.TRON,
      });

      const result = await client.getPrice('BTC', Blockchain.TRON);

      expect(result.chain).toBe(Blockchain.TRON);
      expect(mockFetchPriceWithDatabase).toHaveBeenCalledWith(
        OracleProvider.WINKLINK,
        'BTC',
        Blockchain.TRON,
        true
      );
    });
  });

  describe('getPrice - error handling', () => {
    it('should handle network error from Binance for WIN token', async () => {
      (binanceMarketService.getTokenMarketData as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );
      mockFetchPriceWithDatabase.mockRejectedValue(new Error('Database error'));

      await expect(client.getPrice('WIN')).rejects.toMatchObject({
        code: 'WINKLINK_ERROR',
      });
    });

    it('should handle database fetch error', async () => {
      const mockError = {
        message: 'Database connection failed',
        provider: OracleProvider.WINKLINK,
        code: 'WINKLINK_ERROR',
        timestamp: Date.now(),
        retryable: true,
      };
      mockFetchPriceWithDatabase.mockRejectedValue(mockError);

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'WINKLINK_ERROR',
      });
    });
  });

  describe('getHistoricalPrices', () => {
    const mockHistoricalPrices = [
      { timestamp: Date.now() - 3600000, price: 44000 },
      { timestamp: Date.now() - 1800000, price: 44500 },
      { timestamp: Date.now(), price: 45000 },
    ];

    it('should return historical price data', async () => {
      mockRealDataService.getHistoricalPrices.mockResolvedValue(mockHistoricalPrices);

      const result = await client.getHistoricalPrices('BTC');

      expect(mockRealDataService.getHistoricalPrices).toHaveBeenCalledWith('BTC', 24);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    it('should return historical prices with correct provider info', async () => {
      mockRealDataService.getHistoricalPrices.mockResolvedValue(mockHistoricalPrices);

      const result = await client.getHistoricalPrices('BTC');

      expect(result[0]).toMatchObject({
        provider: OracleProvider.WINKLINK,
        symbol: 'BTC',
        chain: Blockchain.TRON,
        decimals: 8,
        confidence: 0.95,
        source: 'winklink-contract',
      });
    });

    it('should calculate change24h and change24hPercent correctly', async () => {
      mockRealDataService.getHistoricalPrices.mockResolvedValue(mockHistoricalPrices);

      const result = await client.getHistoricalPrices('BTC');

      expect(result[0].change24h).toBe(0);
      expect(result[0].change24hPercent).toBe(0);

      const basePrice = mockHistoricalPrices[0].price;
      const lastPrice = mockHistoricalPrices[2].price;
      const expectedChange = lastPrice - basePrice;
      const expectedChangePercent = ((lastPrice - basePrice) / basePrice) * 100;

      expect(result[2].change24h).toBeCloseTo(expectedChange, 4);
      expect(result[2].change24hPercent).toBeCloseTo(expectedChangePercent, 2);
    });

    it('should use specified chain', async () => {
      mockRealDataService.getHistoricalPrices.mockResolvedValue(mockHistoricalPrices);

      const result = await client.getHistoricalPrices('BTC', Blockchain.TRON);

      expect(result[0].chain).toBe(Blockchain.TRON);
    });

    it('should use default period of 24 hours', async () => {
      mockRealDataService.getHistoricalPrices.mockResolvedValue(mockHistoricalPrices);

      await client.getHistoricalPrices('BTC');

      expect(mockRealDataService.getHistoricalPrices).toHaveBeenCalledWith('BTC', 24);
    });

    it('should use custom period', async () => {
      mockRealDataService.getHistoricalPrices.mockResolvedValue(mockHistoricalPrices);

      await client.getHistoricalPrices('BTC', Blockchain.TRON, 48);

      expect(mockRealDataService.getHistoricalPrices).toHaveBeenCalledWith('BTC', 48);
    });

    it('should return empty array when no historical data available', async () => {
      mockRealDataService.getHistoricalPrices.mockResolvedValue([]);

      const result = await client.getHistoricalPrices('BTC');

      expect(result).toEqual([]);
    });

    it('should return empty array when service returns null', async () => {
      mockRealDataService.getHistoricalPrices.mockResolvedValue(null);

      const result = await client.getHistoricalPrices('BTC');

      expect(result).toEqual([]);
    });

    it('should handle service error gracefully', async () => {
      mockRealDataService.getHistoricalPrices.mockRejectedValue(new Error('Service error'));

      const result = await client.getHistoricalPrices('BTC');

      expect(result).toEqual([]);
    });

    it('should handle uppercase symbol', async () => {
      mockRealDataService.getHistoricalPrices.mockResolvedValue(mockHistoricalPrices);

      const result = await client.getHistoricalPrices('btc');

      expect(result[0].symbol).toBe('BTC');
    });
  });

  describe('getHistoricalPrices - TRON ecosystem integration', () => {
    const mockTRXHistoricalPrices = [
      { timestamp: Date.now() - 3600000, price: 0.08 },
      { timestamp: Date.now() - 1800000, price: 0.081 },
      { timestamp: Date.now(), price: 0.082 },
    ];

    it('should fetch historical prices for TRX', async () => {
      mockRealDataService.getHistoricalPrices.mockResolvedValue(mockTRXHistoricalPrices);

      const result = await client.getHistoricalPrices('TRX');

      expect(result.length).toBe(3);
      expect(result[0].symbol).toBe('TRX');
      expect(result[0].chain).toBe(Blockchain.TRON);
    });

    it('should fetch historical prices for WIN token', async () => {
      const mockWINHistoricalPrices = [
        { timestamp: Date.now() - 3600000, price: 0.00011 },
        { timestamp: Date.now() - 1800000, price: 0.000115 },
        { timestamp: Date.now(), price: 0.00012 },
      ];

      mockRealDataService.getHistoricalPrices.mockResolvedValue(mockWINHistoricalPrices);

      const result = await client.getHistoricalPrices('WIN');

      expect(result.length).toBe(3);
      expect(result[0].symbol).toBe('WIN');
    });
  });

  describe('TRON ecosystem integration', () => {
    it('should only support TRON chain', () => {
      expect(client.supportedChains).toHaveLength(1);
      expect(client.supportedChains).toContain(Blockchain.TRON);
    });

    it('should reject non-TRON chains for symbol support', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.ETHEREUM)).toBe(false);
      expect(client.isSymbolSupported('ETH', Blockchain.ARBITRUM)).toBe(false);
      expect(client.isSymbolSupported('TRX', Blockchain.SOLANA)).toBe(false);
    });

    it('should accept TRON chain for supported symbols', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.TRON)).toBe(true);
      expect(client.isSymbolSupported('ETH', Blockchain.TRON)).toBe(true);
      expect(client.isSymbolSupported('TRX', Blockchain.TRON)).toBe(true);
    });
  });

  describe('Feature flag handling', () => {
    it('should use database fallback when USE_REAL_DATA is false', async () => {
      mockFetchPriceWithDatabase.mockResolvedValue({
        provider: OracleProvider.WINKLINK,
        symbol: 'BTC',
        price: 45000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.TRON,
      });

      const result = await client.getPrice('BTC');

      expect(mockRealDataService.getPriceFromContract).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should always use Binance for WIN regardless of feature flag', async () => {
      const mockMarketData = {
        symbol: 'WIN',
        name: 'WINkLink',
        currentPrice: 0.00012,
        marketCap: 0,
        marketCapRank: 0,
        totalVolume24h: 50000000,
        high24h: 0.00013,
        low24h: 0.00011,
        priceChange24h: 0.000002,
        priceChangePercentage24h: 1.5,
        circulatingSupply: 0,
        totalSupply: 0,
        ath: 0,
        athChangePercentage: 0,
        atl: 0,
        atlChangePercentage: 0,
        lastUpdated: new Date().toISOString(),
      };

      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(mockMarketData);

      await client.getPrice('WIN');

      expect(binanceMarketService.getTokenMarketData).toHaveBeenCalledWith('WIN');
    });
  });

  describe('Real data service integration', () => {
    it('should call getWINkLinkRealDataService singleton', async () => {
      mockRealDataService.getHistoricalPrices.mockResolvedValue([]);

      await client.getHistoricalPrices('BTC');

      expect(getWINkLinkRealDataService).toHaveBeenCalled();
    });

    it('should use same service instance for multiple calls', async () => {
      mockRealDataService.getHistoricalPrices.mockResolvedValue([]);

      await client.getHistoricalPrices('BTC');
      await client.getHistoricalPrices('ETH');

      expect(getWINkLinkRealDataService).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty symbol', async () => {
      mockFetchPriceWithDatabase.mockResolvedValue({
        provider: OracleProvider.WINKLINK,
        symbol: '',
        price: 0,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.TRON,
      });

      const result = await client.getPrice('');

      expect(result).toBeDefined();
    });

    it('should handle symbol with special characters', async () => {
      mockFetchPriceWithDatabase.mockResolvedValue({
        provider: OracleProvider.WINKLINK,
        symbol: 'BTC-USD',
        price: 45000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.TRON,
      });

      const result = await client.getPrice('BTC-USD');

      expect(result).toBeDefined();
    });

    it('should handle very long symbol', async () => {
      mockFetchPriceWithDatabase.mockResolvedValue({
        provider: OracleProvider.WINKLINK,
        symbol: 'VERYLONGSYMBOL',
        price: 0,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.TRON,
      });

      const result = await client.getPrice('VERYLONGSYMBOL');

      expect(result).toBeDefined();
    });

    it('should handle concurrent price requests', async () => {
      mockFetchPriceWithDatabase.mockResolvedValue({
        provider: OracleProvider.WINKLINK,
        symbol: 'BTC',
        price: 45000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.TRON,
      });

      const symbols = ['BTC', 'ETH', 'TRX', 'WIN'];

      const results = await Promise.all(symbols.map((s) => client.getPrice(s)));

      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.provider).toBe(OracleProvider.WINKLINK);
      });
    });
  });

  describe('Price data format validation', () => {
    it('should return price data with all required fields', async () => {
      mockFetchPriceWithDatabase.mockResolvedValue({
        provider: OracleProvider.WINKLINK,
        symbol: 'BTC',
        price: 45000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.95,
        chain: Blockchain.TRON,
      });

      const result = await client.getPrice('BTC');

      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('symbol');
      expect(result).toHaveProperty('price');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('chain');
    });

    it('should return correct decimals for WIN token', async () => {
      const mockMarketData = {
        symbol: 'WIN',
        name: 'WINkLink',
        currentPrice: 0.00012,
        marketCap: 0,
        marketCapRank: 0,
        totalVolume24h: 50000000,
        high24h: 0.00013,
        low24h: 0.00011,
        priceChange24h: 0.000002,
        priceChangePercentage24h: 1.5,
        circulatingSupply: 0,
        totalSupply: 0,
        ath: 0,
        athChangePercentage: 0,
        atl: 0,
        atlChangePercentage: 0,
        lastUpdated: new Date().toISOString(),
      };

      (binanceMarketService.getTokenMarketData as jest.Mock).mockResolvedValue(mockMarketData);

      const result = await client.getPrice('WIN');

      expect(result.decimals).toBe(8);
    });
  });

  describe('getHistoricalPrices - data transformation', () => {
    it('should transform raw historical data to PriceData format', async () => {
      const rawData = [
        { timestamp: 1000000, price: 100 },
        { timestamp: 2000000, price: 200 },
        { timestamp: 3000000, price: 300 },
      ];

      mockRealDataService.getHistoricalPrices.mockResolvedValue(rawData);

      const result = await client.getHistoricalPrices('TEST');

      expect(result[0].price).toBe(100);
      expect(result[1].price).toBe(200);
      expect(result[2].price).toBe(300);
    });

    it('should preserve data order from real data service', async () => {
      const orderedData = [
        { timestamp: 1000000, price: 100 },
        { timestamp: 2000000, price: 200 },
        { timestamp: 3000000, price: 300 },
      ];

      mockRealDataService.getHistoricalPrices.mockResolvedValue(orderedData);

      const result = await client.getHistoricalPrices('TEST');

      expect(result[0].timestamp).toBe(1000000);
      expect(result[1].timestamp).toBe(2000000);
      expect(result[2].timestamp).toBe(3000000);
    });
  });
});
