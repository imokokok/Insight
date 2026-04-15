import { SupraClient } from '@/lib/oracles/clients/supra';
import { getSupraDataService } from '@/lib/oracles/services/supraDataService';
import { OracleProvider, Blockchain } from '@/types/oracle';

jest.mock('@/lib/oracles/services/supraDataService');
jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockFetchLatestPrice = jest.fn();
const mockFetchHistoricalPrices = jest.fn();

const mockSupraDataService = {
  fetchLatestPrice: mockFetchLatestPrice,
  fetchHistoricalPrices: mockFetchHistoricalPrices,
};

(getSupraDataService as jest.Mock).mockReturnValue(mockSupraDataService);

describe('SupraClient', () => {
  let client: SupraClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new SupraClient();
    mockFetchLatestPrice.mockReset();
    mockFetchHistoricalPrices.mockReset();
  });

  afterEach(() => {
    client.clearCache();
  });

  describe('constructor', () => {
    it('should have name set to OracleProvider.SUPRA', () => {
      expect(client.name).toBe(OracleProvider.SUPRA);
    });

    it('should have non-empty supportedChains array', () => {
      expect(Array.isArray(client.supportedChains)).toBe(true);
      expect(client.supportedChains.length).toBeGreaterThan(0);
    });

    it('should include expected chains', () => {
      expect(client.supportedChains).toContain(Blockchain.ETHEREUM);
      expect(client.supportedChains).toContain(Blockchain.ARBITRUM);
      expect(client.supportedChains).toContain(Blockchain.OPTIMISM);
      expect(client.supportedChains).toContain(Blockchain.POLYGON);
      expect(client.supportedChains).toContain(Blockchain.AVALANCHE);
      expect(client.supportedChains).toContain(Blockchain.BASE);
      expect(client.supportedChains).toContain(Blockchain.SOLANA);
      expect(client.supportedChains).toContain(Blockchain.APTOS);
      expect(client.supportedChains).toContain(Blockchain.SUI);
    });

    it('should have defaultUpdateIntervalMinutes set to 5', () => {
      expect(client.defaultUpdateIntervalMinutes).toBe(5);
    });

    it('should create client with custom config', () => {
      const customClient = new SupraClient({ useDatabase: false, validateData: false });
      expect(customClient).toBeInstanceOf(SupraClient);
    });
  });

  describe('getSupportedSymbols', () => {
    it('should return array containing BTC and ETH', () => {
      const symbols = client.getSupportedSymbols();
      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBeGreaterThan(0);
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('SOL');
      expect(symbols).toContain('BNB');
    });

    it('should return unique symbols', () => {
      const symbols = client.getSupportedSymbols();
      const uniqueSymbols = [...new Set(symbols)];
      expect(symbols.length).toBe(uniqueSymbols.length);
    });

    it('should return a copy of symbols array', () => {
      const symbols1 = client.getSupportedSymbols();
      const symbols2 = client.getSupportedSymbols();
      expect(symbols1).not.toBe(symbols2);
      expect(symbols1).toEqual(symbols2);
    });
  });

  describe('isSymbolSupported', () => {
    it('should return true for supported symbols without chain', () => {
      expect(client.isSymbolSupported('BTC')).toBe(true);
      expect(client.isSymbolSupported('ETH')).toBe(true);
      expect(client.isSymbolSupported('SOL')).toBe(true);
      expect(client.isSymbolSupported('USDC')).toBe(true);
    });

    it('should return true for supported symbol on supported chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.ETHEREUM)).toBe(true);
      expect(client.isSymbolSupported('ETH', Blockchain.ARBITRUM)).toBe(true);
      expect(client.isSymbolSupported('SOL', Blockchain.SOLANA)).toBe(true);
    });

    it('should return false for unsupported symbol', () => {
      expect(client.isSymbolSupported('UNKNOWN')).toBe(false);
      expect(client.isSymbolSupported('INVALID')).toBe(false);
    });

    it('should return false for supported symbol on unsupported chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.TRON)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(client.isSymbolSupported('btc')).toBe(true);
      expect(client.isSymbolSupported('Btc')).toBe(true);
      expect(client.isSymbolSupported('BTC')).toBe(true);
      expect(client.isSymbolSupported('eth')).toBe(true);
    });
  });

  describe('getSupportedChainsForSymbol', () => {
    it('should return supported chains for supported symbol', () => {
      const chains = client.getSupportedChainsForSymbol('BTC');
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain(Blockchain.ETHEREUM);
      expect(chains).toContain(Blockchain.ARBITRUM);
    });

    it('should return empty array for unsupported symbol', () => {
      const chains = client.getSupportedChainsForSymbol('UNKNOWN');
      expect(chains).toEqual([]);
    });
  });

  describe('getPrice', () => {
    const mockPriceData = {
      price: 68000.5,
      high24h: 69000,
      low24h: 67000,
      change24h: 1.5,
      timestamp: Date.now(),
    };

    it('should return correct PriceData with provider=SUPRA and source=supra-api', async () => {
      mockFetchLatestPrice.mockResolvedValue(mockPriceData);

      const result = await client.getPrice('BTC');

      expect(result).toMatchObject({
        provider: OracleProvider.SUPRA,
        symbol: 'BTC',
        price: mockPriceData.price,
        decimals: 8,
        confidence: 0.95,
        source: 'supra-api',
        change24h: mockPriceData.change24h,
        change24hPercent: mockPriceData.change24h,
      });
      expect(result.timestamp).toBe(mockPriceData.timestamp);
    });

    it('should default chain to ETHEREUM when not specified', async () => {
      mockFetchLatestPrice.mockResolvedValue(mockPriceData);

      const result = await client.getPrice('BTC');

      expect(result.chain).toBe(Blockchain.ETHEREUM);
    });

    it('should use specified chain', async () => {
      mockFetchLatestPrice.mockResolvedValue(mockPriceData);

      const result = await client.getPrice('BTC', Blockchain.ARBITRUM);

      expect(result.chain).toBe(Blockchain.ARBITRUM);
    });

    it('should handle lowercase symbol', async () => {
      mockFetchLatestPrice.mockResolvedValue(mockPriceData);

      const result = await client.getPrice('btc');

      expect(result.symbol).toBe('BTC');
    });

    it('should call fetchLatestPrice with correct trading pair', async () => {
      mockFetchLatestPrice.mockResolvedValue(mockPriceData);

      await client.getPrice('BTC');

      expect(mockFetchLatestPrice).toHaveBeenCalledWith('btc_usdt', undefined);
    });

    it('should pass abort signal to fetchLatestPrice', async () => {
      mockFetchLatestPrice.mockResolvedValue(mockPriceData);
      const signal = new AbortController().signal;

      await client.getPrice('BTC', undefined, { signal });

      expect(mockFetchLatestPrice).toHaveBeenCalledWith('btc_usdt', signal);
    });

    it('should throw SYMBOL_NOT_SUPPORTED for unknown symbols', async () => {
      await expect(client.getPrice('UNKNOWN_SYMBOL')).rejects.toMatchObject({
        code: 'SYMBOL_NOT_SUPPORTED',
      });
    });

    it('should throw NO_DATA_AVAILABLE when API returns no data', async () => {
      mockFetchLatestPrice.mockResolvedValue(null);

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'NO_DATA_AVAILABLE',
      });
    });

    it('should throw NO_DATA_AVAILABLE when API returns NaN price', async () => {
      mockFetchLatestPrice.mockResolvedValue({
        ...mockPriceData,
        price: NaN,
      });

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'NO_DATA_AVAILABLE',
      });
    });

    it('should re-throw errors with code property', async () => {
      const customError = { code: 'CUSTOM_ERROR', message: 'Custom' };
      mockFetchLatestPrice.mockRejectedValue(customError);

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'CUSTOM_ERROR',
      });
    });

    it('should wrap unknown errors as SUPRA_ERROR', async () => {
      mockFetchLatestPrice.mockRejectedValue(new Error('Network failure'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'SUPRA_ERROR',
      });
    });
  });

  describe('getHistoricalPrices', () => {
    const mockOHLCData = [
      {
        timestamp: Date.now() - 7200000,
        open: 67000,
        high: 67500,
        low: 66800,
        close: 67200,
        volume: 100,
      },
      {
        timestamp: Date.now() - 3600000,
        open: 67200,
        high: 68000,
        low: 67100,
        close: 67800,
        volume: 150,
      },
      { timestamp: Date.now(), open: 67800, high: 68500, low: 67700, close: 68000, volume: 200 },
    ];

    it('should return PriceData array with correct mapping', async () => {
      mockFetchHistoricalPrices.mockResolvedValue(mockOHLCData);

      const result = await client.getHistoricalPrices('BTC');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0]).toMatchObject({
        provider: OracleProvider.SUPRA,
        symbol: 'BTC',
        decimals: 8,
        confidence: 0.95,
        source: 'supra-api',
      });
      expect(result[0].price).toBe(67200);
      expect(result[2].price).toBe(68000);
    });

    it('should default chain to ETHEREUM when not specified', async () => {
      mockFetchHistoricalPrices.mockResolvedValue(mockOHLCData);

      const result = await client.getHistoricalPrices('BTC');

      expect(result[0].chain).toBe(Blockchain.ETHEREUM);
    });

    it('should use specified chain', async () => {
      mockFetchHistoricalPrices.mockResolvedValue(mockOHLCData);

      const result = await client.getHistoricalPrices('BTC', Blockchain.ARBITRUM, 24);

      expect(result[0].chain).toBe(Blockchain.ARBITRUM);
    });

    it('should calculate change24h based on latest close price', async () => {
      mockFetchHistoricalPrices.mockResolvedValue(mockOHLCData);

      const result = await client.getHistoricalPrices('BTC');

      const latestClose = 68000;
      expect(result[0].change24h).toBe(Number((latestClose - 67200).toFixed(4)));
      expect(result[0].change24hPercent).toBe(
        Number((((latestClose - 67200) / 67200) * 100).toFixed(2))
      );
    });

    it('should return empty array for unsupported symbol', async () => {
      const result = await client.getHistoricalPrices('UNKNOWN_SYMBOL');

      expect(result).toEqual([]);
    });

    it('should return empty array when API returns empty data', async () => {
      mockFetchHistoricalPrices.mockResolvedValue([]);

      const result = await client.getHistoricalPrices('BTC');

      expect(result).toEqual([]);
    });

    it('should return empty array when API returns null', async () => {
      mockFetchHistoricalPrices.mockResolvedValue(null);

      const result = await client.getHistoricalPrices('BTC');

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockFetchHistoricalPrices.mockRejectedValue(new Error('API error'));

      const result = await client.getHistoricalPrices('BTC');

      expect(result).toEqual([]);
    });

    it('should call fetchHistoricalPrices with correct parameters', async () => {
      mockFetchHistoricalPrices.mockResolvedValue(mockOHLCData);

      await client.getHistoricalPrices('ETH', Blockchain.ETHEREUM, 48);

      expect(mockFetchHistoricalPrices).toHaveBeenCalledWith(
        'eth_usdt',
        expect.any(Number),
        expect.any(Number),
        3600,
        undefined
      );
    });

    it('should pass abort signal to fetchHistoricalPrices', async () => {
      mockFetchHistoricalPrices.mockResolvedValue(mockOHLCData);
      const signal = new AbortController().signal;

      await client.getHistoricalPrices('BTC', undefined, 24, { signal });

      expect(mockFetchHistoricalPrices).toHaveBeenCalledWith(
        'btc_usdt',
        expect.any(Number),
        expect.any(Number),
        3600,
        signal
      );
    });
  });

  describe('getTokenOnChainData', () => {
    const mockPriceData = {
      price: 68000.5,
      high24h: 69000,
      low24h: 67000,
      change24h: 1.5,
      timestamp: Date.now() - 30000,
    };

    it('should return SupraTokenOnChainData with correct fields', async () => {
      mockFetchLatestPrice.mockResolvedValue(mockPriceData);

      const result = await client.getTokenOnChainData('BTC');

      expect(result).toMatchObject({
        symbol: 'BTC',
        price: mockPriceData.price,
        decimals: 8,
        high24h: mockPriceData.high24h,
        low24h: mockPriceData.low24h,
        change24h: mockPriceData.change24h,
        change24hPercent: mockPriceData.change24h,
        supportedChainsCount: client.supportedChains.length,
        updateIntervalMinutes: 5,
        lastUpdated: mockPriceData.timestamp,
      });
      expect(result?.dataAge).not.toBeNull();
      expect(typeof result?.dataAge).toBe('number');
    });

    it('should return null for unsupported symbol', async () => {
      const result = await client.getTokenOnChainData('UNKNOWN_SYMBOL');

      expect(result).toBeNull();
    });

    it('should return null when API returns no data', async () => {
      mockFetchLatestPrice.mockResolvedValue(null);

      const result = await client.getTokenOnChainData('BTC');

      expect(result).toBeNull();
    });

    it('should return null when API returns NaN price', async () => {
      mockFetchLatestPrice.mockResolvedValue({
        ...mockPriceData,
        price: NaN,
      });

      const result = await client.getTokenOnChainData('BTC');

      expect(result).toBeNull();
    });

    it('should return null on service error', async () => {
      mockFetchLatestPrice.mockRejectedValue(new Error('Service error'));

      const result = await client.getTokenOnChainData('BTC');

      expect(result).toBeNull();
    });

    it('should calculate dataAge correctly', async () => {
      const timestamp = Date.now() - 60000;
      mockFetchLatestPrice.mockResolvedValue({
        ...mockPriceData,
        timestamp,
      });

      const result = await client.getTokenOnChainData('BTC');

      expect(result?.dataAge).toBeGreaterThanOrEqual(60);
    });

    it('should return null dataAge when timestamp is missing', async () => {
      mockFetchLatestPrice.mockResolvedValue({
        ...mockPriceData,
        timestamp: 0,
      });

      const result = await client.getTokenOnChainData('BTC');

      expect(result?.dataAge).toBeNull();
    });

    it('should cache on-chain data', async () => {
      mockFetchLatestPrice.mockResolvedValue(mockPriceData);

      await client.getTokenOnChainData('BTC');
      await client.getTokenOnChainData('BTC');

      expect(mockFetchLatestPrice).toHaveBeenCalledTimes(1);
    });

    it('should handle lowercase symbol', async () => {
      mockFetchLatestPrice.mockResolvedValue(mockPriceData);

      const result = await client.getTokenOnChainData('btc');

      expect(result?.symbol).toBe('BTC');
    });
  });

  describe('clearCache', () => {
    it('should clear cache and allow fresh fetches', async () => {
      const mockPriceData = {
        price: 68000,
        high24h: 69000,
        low24h: 67000,
        change24h: 1.5,
        timestamp: Date.now(),
      };
      mockFetchLatestPrice.mockResolvedValue(mockPriceData);

      await client.getTokenOnChainData('BTC');
      client.clearCache();
      await client.getTokenOnChainData('BTC');

      expect(mockFetchLatestPrice).toHaveBeenCalledTimes(2);
    });
  });
});
