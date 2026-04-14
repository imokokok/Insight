import { RedStoneApiError } from '@/lib/errors';
import { RedStoneClient } from '@/lib/oracles/clients/redstone';
import { REDSTONE_API_BASE } from '@/lib/oracles/constants/redstoneConstants';
import { OracleProvider, Blockchain } from '@/types/oracle';

global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const createMockResponse = (
  data: unknown,
  ok = true,
  status = 200,
  statusText = 'OK'
): Response => {
  return {
    ok,
    status,
    statusText,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn(),
  } as unknown as Response;
};

const createMockHistoricalResponse = (symbol: string, basePrice: number, points: number = 24) => {
  const now = Date.now();
  const data = [];
  for (let i = points; i >= 0; i--) {
    const variance = basePrice * 0.02;
    const randomFactor = Math.sin(i) * 0.5 + 0.5;
    const price = basePrice + randomFactor * variance - variance / 2;
    data.push({
      symbol,
      value: price,
      timestamp: now - i * 3600000,
    });
  }
  return data;
};

/* eslint-disable max-lines-per-function */
describe('RedStoneClient', () => {
  let client: RedStoneClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockFetch.mockReset();
    client = new RedStoneClient();
  });

  afterEach(() => {
    jest.useRealTimers();
    client.clearCache();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      expect(client.name).toBe(OracleProvider.REDSTONE);
      expect(client.supportedChains).toContain(Blockchain.ETHEREUM);
      expect(client.supportedChains).toContain(Blockchain.ARBITRUM);
      expect(client.supportedChains).toContain(Blockchain.OPTIMISM);
      expect(client.supportedChains).toContain(Blockchain.POLYGON);
      expect(client.supportedChains).toContain(Blockchain.AVALANCHE);
      expect(client.supportedChains).toContain(Blockchain.BASE);
      expect(client.defaultUpdateIntervalMinutes).toBe(10);
    });

    it('should create client with custom config', () => {
      const customClient = new RedStoneClient({
        useDatabase: false,
        validateData: false,
        useRealData: false,
      });
      expect(customClient).toBeInstanceOf(RedStoneClient);
    });

    it('should have correct number of supported chains', () => {
      expect(client.supportedChains.length).toBe(12);
    });
  });

  describe('getSupportedSymbols', () => {
    it('should return array of supported symbols', () => {
      const symbols = client.getSupportedSymbols();

      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols.length).toBeGreaterThan(0);
      expect(symbols).toContain('BTC');
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('SOL');
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
    it('should return true for supported symbol without chain', () => {
      expect(client.isSymbolSupported('BTC')).toBe(true);
      expect(client.isSymbolSupported('ETH')).toBe(true);
      expect(client.isSymbolSupported('SOL')).toBe(true);
      expect(client.isSymbolSupported('USDC')).toBe(true);
    });

    it('should return true for supported symbol on supported chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.ETHEREUM)).toBe(true);
      expect(client.isSymbolSupported('ETH', Blockchain.ARBITRUM)).toBe(true);
      expect(client.isSymbolSupported('SOL', Blockchain.POLYGON)).toBe(true);
    });

    it('should return false for unsupported symbol', () => {
      expect(client.isSymbolSupported('UNKNOWN')).toBe(false);
      expect(client.isSymbolSupported('INVALID')).toBe(false);
    });

    it('should return false for supported symbol on unsupported chain', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.SOLANA)).toBe(false);
      expect(client.isSymbolSupported('ETH', Blockchain.TRON)).toBe(false);
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

    it('should return same chains for all supported symbols', () => {
      const btcChains = client.getSupportedChainsForSymbol('BTC');
      const ethChains = client.getSupportedChainsForSymbol('ETH');
      expect(btcChains).toEqual(ethChains);
    });
  });

  describe('getPrice', () => {
    const mockPriceData = {
      symbol: 'BTC',
      value: 68000.5,
      timestamp: Date.now(),
      provider: 'redstone-rapid',
      change24h: 500,
      change24hPercent: 0.74,
    };

    it('should return price data for valid symbol', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([mockPriceData]));

      const result = await client.getPrice('BTC');

      expect(result).toMatchObject({
        provider: OracleProvider.REDSTONE,
        symbol: 'BTC',
        price: mockPriceData.value,
        decimals: 8,
        confidence: 0.97,
      });
      expect(result.confidenceInterval).toBeDefined();
      expect(result.confidenceInterval?.bid).toBeLessThan(result.price);
      expect(result.confidenceInterval?.ask).toBeGreaterThan(result.price);
      expect(mockFetch).toHaveBeenCalledWith(
        `${REDSTONE_API_BASE}/prices?symbol=BTC&provider=redstone-rapid`,
        expect.objectContaining({
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
      );
    });

    it('should return price data with chain context', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([mockPriceData]));

      const result = await client.getPrice('BTC', Blockchain.ARBITRUM);

      expect(result.chain).toBe(Blockchain.ARBITRUM);
    });

    it('should handle lowercase symbol', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([mockPriceData]));

      const result = await client.getPrice('btc');

      expect(result.symbol).toBe('BTC');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=BTC'),
        expect.any(Object)
      );
    });

    it('should include 24h change data', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([mockPriceData]));

      const result = await client.getPrice('BTC');

      expect(result.change24h).toBe(mockPriceData.change24h);
      expect(result.change24hPercent).toBe(mockPriceData.change24hPercent);
    });

    it('should throw error when API returns empty array', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]));

      await expect(client.getPrice('UNKNOWN')).rejects.toMatchObject({
        code: 'REDSTONE_ERROR',
      });
    });

    it('should throw error when API returns null', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'REDSTONE_ERROR',
      });
    });

    it('should handle timestamp in seconds format', async () => {
      const timestampInSeconds = Math.floor(Date.now() / 1000);
      mockFetch.mockResolvedValueOnce(
        createMockResponse([
          {
            ...mockPriceData,
            timestamp: timestampInSeconds,
          },
        ])
      );

      const result = await client.getPrice('BTC');

      expect(result.timestamp).toBeGreaterThan(1e12);
    });

    it('should handle timestamp in milliseconds format', async () => {
      const timestampInMs = Date.now();
      mockFetch.mockResolvedValueOnce(
        createMockResponse([
          {
            ...mockPriceData,
            timestamp: timestampInMs,
          },
        ])
      );

      const result = await client.getPrice('BTC');

      expect(result.timestamp).toBe(timestampInMs);
    });
  });

  describe('getPrice - error handling with real timers', () => {
    beforeEach(() => {
      jest.useRealTimers();
    });

    it('should throw error when network request fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'REDSTONE_API_ERROR',
      });
    });

    it('should handle HTTP 429 rate limit error', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}, false, 429, 'Too Many Requests'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'REDSTONE_API_ERROR',
      });
    });

    it('should handle HTTP 504 timeout error', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}, false, 504, 'Gateway Timeout'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'REDSTONE_API_ERROR',
      });
    });

    it('should handle HTTP 503 service unavailable', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}, false, 503, 'Service Unavailable'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'REDSTONE_API_ERROR',
      });
    });

    it('should handle JSON parse error', async () => {
      const invalidJsonResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
        text: jest.fn().mockResolvedValue('invalid json'),
        headers: new Headers(),
        redirected: false,
        type: 'basic',
        url: '',
        clone: jest.fn(),
        body: null,
        bodyUsed: false,
        arrayBuffer: jest.fn(),
        blob: jest.fn(),
        formData: jest.fn(),
      } as unknown as Response;

      mockFetch.mockResolvedValue(invalidJsonResponse);

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'REDSTONE_API_ERROR',
      });
    });
  });

  describe('getHistoricalPrices', () => {
    const mockHistoricalData = createMockHistoricalResponse('ETH', 3500, 24);

    it('should return historical price data', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockHistoricalData));

      const result = await client.getHistoricalPrices('ETH');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(mockHistoricalData.length);
      expect(result[0]).toMatchObject({
        provider: OracleProvider.REDSTONE,
        symbol: 'ETH',
        chain: Blockchain.ETHEREUM,
      });
    });

    it('should return historical prices with change calculations', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockHistoricalData));

      const result = await client.getHistoricalPrices('ETH');

      expect(result[0].change24h).toBe(0);
      expect(result[0].change24hPercent).toBe(0);
    });

    it('should use specified chain', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockHistoricalData));

      const result = await client.getHistoricalPrices('ETH', Blockchain.ARBITRUM, 24);

      expect(result[0].chain).toBe(Blockchain.ARBITRUM);
    });

    it('should use default period of 24 hours', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockHistoricalData));

      await client.getHistoricalPrices('ETH');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('fromTimestamp='),
        expect.any(Object)
      );
    });

    it('should use custom period', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockHistoricalData));

      await client.getHistoricalPrices('ETH', undefined, 48);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('fromTimestamp='),
        expect.any(Object)
      );
    });

    it('should return empty array when no historical data available', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]));

      const result = await client.getHistoricalPrices('UNKNOWN');

      expect(result).toEqual([]);
    });

    it('should return empty array when API returns null', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null));

      const result = await client.getHistoricalPrices('ETH');

      expect(result).toEqual([]);
    });

    it('should return empty array when API returns non-array', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ not: 'array' }));

      const result = await client.getHistoricalPrices('ETH');

      expect(result).toEqual([]);
    });

    it('should filter out invalid data points', async () => {
      const invalidData = [
        { symbol: 'ETH', value: 3500, timestamp: Date.now() },
        { symbol: 'ETH', value: 'invalid' as unknown as number, timestamp: Date.now() },
        { symbol: 'ETH', value: -100, timestamp: Date.now() },
        { symbol: 'ETH', value: 3400, timestamp: 'invalid' as unknown as number },
        { symbol: 'ETH', value: 3300, timestamp: Date.now() - 3600000 },
      ];
      mockFetch.mockResolvedValueOnce(createMockResponse(invalidData));

      const result = await client.getHistoricalPrices('ETH');

      expect(result.length).toBe(2);
    });

    it('should handle API error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API error'));

      const result = await client.getHistoricalPrices('ETH');

      expect(result).toEqual([]);
    });

    it('should handle HTTP error gracefully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500, 'Internal Server Error'));

      const result = await client.getHistoricalPrices('ETH');

      expect(result).toEqual([]);
    });
  });

  describe('caching', () => {
    const mockPriceData = {
      symbol: 'BTC',
      value: 68000.5,
      timestamp: Date.now(),
      provider: 'redstone-rapid',
      change24h: 500,
      change24hPercent: 0.74,
    };

    it('should cache price data within TTL', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([mockPriceData]));

      await client.getPrice('BTC');
      await client.getPrice('BTC');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should fetch new data after TTL expires', async () => {
      mockFetch.mockResolvedValue(createMockResponse([mockPriceData]));

      await client.getPrice('BTC');

      jest.advanceTimersByTime(10001);

      await client.getPrice('BTC');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should cache historical data', async () => {
      const mockHistoricalData = createMockHistoricalResponse('ETH', 3500, 24);
      mockFetch.mockResolvedValueOnce(createMockResponse(mockHistoricalData));

      await client.getHistoricalPrices('ETH');
      await client.getHistoricalPrices('ETH');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear cache', async () => {
      mockFetch.mockResolvedValue(createMockResponse([mockPriceData]));

      await client.getPrice('BTC');
      client.clearCache();
      await client.getPrice('BTC');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should have separate cache entries for different symbols', async () => {
      mockFetch.mockResolvedValue(createMockResponse([mockPriceData]));

      await client.getPrice('BTC');
      await client.getPrice('ETH');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should have separate cache entries for different periods', async () => {
      const mockHistoricalData = createMockHistoricalResponse('ETH', 3500, 48);
      mockFetch.mockResolvedValue(createMockResponse(mockHistoricalData));

      await client.getHistoricalPrices('ETH', undefined, 24);
      await client.getHistoricalPrices('ETH', undefined, 48);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('confidence interval generation', () => {
    const mockPriceData = {
      symbol: 'BTC',
      value: 68000,
      timestamp: Date.now(),
      provider: 'redstone-rapid',
    };

    it('should generate confidence interval with bid and ask', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([mockPriceData]));

      const result = await client.getPrice('BTC');

      expect(result.confidenceInterval).toBeDefined();
      expect(result.confidenceInterval?.bid).toBeDefined();
      expect(result.confidenceInterval?.ask).toBeDefined();
      expect(result.confidenceInterval?.widthPercentage).toBeDefined();
    });

    it('should have bid lower than price', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([mockPriceData]));

      const result = await client.getPrice('BTC');

      expect(result.confidenceInterval?.bid).toBeLessThan(result.price);
    });

    it('should have ask higher than price', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([mockPriceData]));

      const result = await client.getPrice('BTC');

      expect(result.confidenceInterval?.ask).toBeGreaterThan(result.price);
    });

    it('should use different spread percentages for different symbols', async () => {
      const btcData = {
        symbol: 'BTC',
        value: 68000,
        timestamp: Date.now(),
        provider: 'redstone-rapid',
      };
      const ethData = {
        symbol: 'ETH',
        value: 3500,
        timestamp: Date.now(),
        provider: 'redstone-rapid',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse([btcData]));
      mockFetch.mockResolvedValueOnce(createMockResponse([ethData]));

      const btcResult = await client.getPrice('BTC');
      const ethResult = await client.getPrice('ETH');

      expect(btcResult.confidenceInterval?.widthPercentage).toBeDefined();
      expect(ethResult.confidenceInterval?.widthPercentage).toBeDefined();
    });

    it('should generate deterministic spread within same minute', async () => {
      mockFetch.mockResolvedValue(createMockResponse([mockPriceData]));

      const result1 = await client.getPrice('BTC');
      const result2 = await client.getPrice('BTC');

      expect(result1.confidenceInterval?.widthPercentage).toBe(
        result2.confidenceInterval?.widthPercentage
      );
    });

    it('should use default spread for unknown symbols', async () => {
      const unknownSymbolData = {
        symbol: 'UNKNOWN',
        value: 100,
        timestamp: Date.now(),
        provider: 'redstone-rapid',
      };
      mockFetch.mockResolvedValueOnce(createMockResponse([unknownSymbolData]));

      const result = await client.getPrice('UNKNOWN');

      expect(result.confidenceInterval).toBeDefined();
      expect(result.confidenceInterval?.widthPercentage).toBeGreaterThan(0);
    });
  });

  describe('retry logic with exponential backoff', () => {
    const mockPriceData = {
      symbol: 'BTC',
      value: 68000,
      timestamp: Date.now(),
      provider: 'redstone-rapid',
    };

    beforeEach(() => {
      jest.useRealTimers();
    });

    it('should retry on network error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockResponse([mockPriceData]));

      const result = await client.getPrice('BTC');

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on timeout error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce(createMockResponse([mockPriceData]));

      const result = await client.getPrice('BTC');

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'REDSTONE_API_ERROR',
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 400, 'Bad Request'));

      await expect(client.getPrice('BTC')).rejects.toBeDefined();
    });

    it('should use exponential backoff delay', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockResponse([mockPriceData]));

      const startTime = Date.now();
      const resultPromise = client.getPrice('BTC');

      await new Promise((resolve) => setTimeout(resolve, 3500));

      const result = await resultPromise;
      const elapsed = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(elapsed).toBeGreaterThanOrEqual(2000);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('getTokenOnChainData', () => {
    const mockPriceData = {
      symbol: 'BTC',
      value: 68000,
      timestamp: Date.now(),
      provider: 'redstone-rapid',
    };

    it('should return on-chain data for valid symbol', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([mockPriceData]));

      const result = await client.getTokenOnChainData('BTC');

      expect(result).toMatchObject({
        symbol: 'BTC',
        price: mockPriceData.value,
        decimals: 8,
        supportedChainsCount: 12,
        updateIntervalMinutes: 10,
        provider: 'redstone-rapid',
      });
    });

    it('should return null when price fetch fails', async () => {
      jest.useRealTimers();
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await client.getTokenOnChainData('BTC');

      expect(result).toBeNull();
    });

    it('should return null when API returns empty array', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]));

      const result = await client.getTokenOnChainData('UNKNOWN');

      expect(result).toBeNull();
    });

    it('should include confidence interval data', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([mockPriceData]));

      const result = await client.getTokenOnChainData('BTC');

      expect(result?.bid).toBeDefined();
      expect(result?.ask).toBeDefined();
      expect(result?.spreadPercentage).toBeDefined();
    });

    it('should calculate data age', async () => {
      const timestamp = Date.now() - 30000;
      mockFetch.mockResolvedValueOnce(createMockResponse([{ ...mockPriceData, timestamp }]));

      const result = await client.getTokenOnChainData('BTC');

      expect(result?.dataAge).toBeGreaterThanOrEqual(30);
    });

    it('should cache on-chain data', async () => {
      mockFetch.mockResolvedValue(createMockResponse([mockPriceData]));

      await client.getTokenOnChainData('BTC');
      await client.getTokenOnChainData('BTC');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('error classification', () => {
    beforeEach(() => {
      jest.useRealTimers();
    });

    it('should classify rate limit error correctly', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}, false, 429, 'Too Many Requests'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'REDSTONE_API_ERROR',
      });
    });

    it('should classify timeout error correctly', async () => {
      mockFetch.mockRejectedValue(new Error('timeout'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'REDSTONE_API_ERROR',
      });
    });

    it('should classify network error correctly', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'REDSTONE_API_ERROR',
      });
    });

    it('should classify DNS error correctly', async () => {
      mockFetch.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'REDSTONE_API_ERROR',
      });
    });

    it('should classify parse error correctly', async () => {
      mockFetch.mockRejectedValue(new Error('JSON parse error'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'REDSTONE_API_ERROR',
      });
    });

    it('should classify generic fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Some other error'));

      await expect(client.getPrice('BTC')).rejects.toMatchObject({
        code: 'REDSTONE_API_ERROR',
      });
    });
  });

  describe('RedStoneApiError', () => {
    it('should create RedStoneApiError with correct properties', () => {
      const error = new RedStoneApiError('Test error', 'RATE_LIMIT_ERROR', {
        symbol: 'BTC',
        attemptCount: 2,
      });

      expect(error.message).toBe('Test error');
      expect(error.errorCode).toBe('RATE_LIMIT_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.attemptCount).toBe(2);
    });

    it('should mark rate limit error as retryable', () => {
      const error = new RedStoneApiError('Rate limited', 'RATE_LIMIT_ERROR');
      expect(error.retryable).toBe(true);
    });

    it('should mark network error as retryable', () => {
      const error = new RedStoneApiError('Network error', 'NETWORK_ERROR');
      expect(error.retryable).toBe(true);
    });

    it('should mark timeout error as retryable', () => {
      const error = new RedStoneApiError('Timeout', 'TIMEOUT_ERROR');
      expect(error.retryable).toBe(true);
    });

    it('should mark fetch error as retryable', () => {
      const error = new RedStoneApiError('Fetch failed', 'FETCH_ERROR');
      expect(error.retryable).toBe(true);
    });

    it('should mark parse error as non-retryable', () => {
      const error = new RedStoneApiError('Parse failed', 'PARSE_ERROR');
      expect(error.retryable).toBe(false);
    });

    it('should mark invalid response as non-retryable', () => {
      const error = new RedStoneApiError('Invalid response', 'INVALID_RESPONSE');
      expect(error.retryable).toBe(false);
    });

    it('should include cause error', () => {
      const cause = new Error('Original error');
      const error = new RedStoneApiError('Wrapped error', 'FETCH_ERROR', {}, cause);

      expect(error.cause).toBe(cause);
    });

    it('should generate correct API response', () => {
      const error = new RedStoneApiError('Test error', 'RATE_LIMIT_ERROR', {
        symbol: 'BTC',
        attemptCount: 3,
      });

      const response = error.toApiResponse();

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('REDSTONE_API_ERROR');
      expect(response.error.errorCode).toBe('RATE_LIMIT_ERROR');
      expect(response.error.retryable).toBe(true);
      expect(response.error.attemptCount).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty symbol', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]));

      await expect(client.getPrice('')).rejects.toMatchObject({
        code: 'REDSTONE_ERROR',
      });
    });

    it('should handle very large price values', async () => {
      const largePriceData = {
        symbol: 'BTC',
        value: 999999999999.99,
        timestamp: Date.now(),
        provider: 'redstone-rapid',
      };
      mockFetch.mockResolvedValueOnce(createMockResponse([largePriceData]));

      const result = await client.getPrice('BTC');

      expect(result.price).toBe(999999999999.99);
    });

    it('should handle very small price values', async () => {
      const smallPriceData = {
        symbol: 'SHIB',
        value: 0.00000001,
        timestamp: Date.now(),
        provider: 'redstone-rapid',
      };
      mockFetch.mockResolvedValueOnce(createMockResponse([smallPriceData]));

      const result = await client.getPrice('SHIB');

      expect(result.price).toBe(0.00000001);
    });

    it('should handle missing optional fields in response', async () => {
      const minimalData = {
        symbol: 'BTC',
        value: 68000,
        timestamp: Date.now(),
      };
      mockFetch.mockResolvedValueOnce(createMockResponse([minimalData]));

      const result = await client.getPrice('BTC');

      expect(result.change24h).toBe(0);
      expect(result.change24hPercent).toBe(0);
      expect(result.source).toBeUndefined();
    });

    it('should handle response with source array', async () => {
      const dataWithSource = {
        symbol: 'BTC',
        value: 68000,
        timestamp: Date.now(),
        provider: 'redstone-rapid',
        source: [
          { value: 67999, timestamp: Date.now() - 1000 },
          { value: 68001, timestamp: Date.now() },
        ],
      };
      mockFetch.mockResolvedValueOnce(createMockResponse([dataWithSource]));

      const result = await client.getPrice('BTC');

      expect(result).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple sequential requests', async () => {
      const symbols = ['BTC', 'ETH', 'SOL'];
      mockFetch.mockResolvedValue(
        createMockResponse([
          { symbol: 'BTC', value: 68000, timestamp: Date.now(), provider: 'redstone-rapid' },
        ])
      );

      for (const symbol of symbols) {
        await client.getPrice(symbol);
      }

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent requests for same symbol', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse([
          { symbol: 'BTC', value: 68000, timestamp: Date.now(), provider: 'redstone-rapid' },
        ])
      );

      const promises = [client.getPrice('BTC'), client.getPrice('BTC'), client.getPrice('BTC')];

      await Promise.all(promises);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should maintain cache across multiple operations', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse([
          { symbol: 'BTC', value: 68000, timestamp: Date.now(), provider: 'redstone-rapid' },
        ])
      );

      await client.getPrice('BTC');
      await client.getPrice('BTC');
      client.clearCache();
      await client.getPrice('BTC');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
