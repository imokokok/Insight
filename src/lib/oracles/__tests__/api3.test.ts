import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { api3NetworkService } from '@/lib/services/oracle/api3NetworkService';
import { API3Client } from '@/lib/services/oracle/clients/api3';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type {
  AirnodeNetworkStats,
  DataSourceInfo,
  DAPICoverage,
  FirstPartyOracleData,
} from '@/types/oracle/api3';

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

const mockAirnodeService = {
  discoverEndpoints: jest.fn(),
  makeRequest: jest.fn(),
  authenticate: jest.fn(),
  getHeartbeat: jest.fn(),
  getAvailableAirnodes: jest.fn(),
};

const mockDapiService = {
  subscribe: jest.fn(),
  getData: jest.fn(),
  verifyUpdate: jest.fn(),
  getHeartbeat: jest.fn(),
  validateFreshness: jest.fn(),
  getCoverage: jest.fn(),
};

const mockBeaconService = {
  getBeaconSetData: jest.fn(),
  getAggregatedData: jest.fn(),
  getUpdateFrequency: jest.fn(),
  getDeviationThreshold: jest.fn(),
};

const mockDataSourceService = {
  verifyFirstPartyOracle: jest.fn(),
  checkAuthenticity: jest.fn(),
  validateTimestamp: jest.fn(),
  aggregateMultipleSources: jest.fn(),
  handleFailover: jest.fn(),
};

describe('API3Client', () => {
  let client: API3Client;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new API3Client();

    mockAirnodeService.discoverEndpoints.mockReset();
    mockAirnodeService.makeRequest.mockReset();
    mockAirnodeService.authenticate.mockReset();
    mockAirnodeService.getHeartbeat.mockReset();
    mockAirnodeService.getAvailableAirnodes.mockReset();

    mockDapiService.subscribe.mockReset();
    mockDapiService.getData.mockReset();
    mockDapiService.verifyUpdate.mockReset();
    mockDapiService.getHeartbeat.mockReset();
    mockDapiService.validateFreshness.mockReset();
    mockDapiService.getCoverage.mockReset();

    mockBeaconService.getBeaconSetData.mockReset();
    mockBeaconService.getAggregatedData.mockReset();
    mockBeaconService.getUpdateFrequency.mockReset();
    mockBeaconService.getDeviationThreshold.mockReset();

    mockDataSourceService.verifyFirstPartyOracle.mockReset();
    mockDataSourceService.checkAuthenticity.mockReset();
    mockDataSourceService.validateTimestamp.mockReset();
    mockDataSourceService.aggregateMultipleSources.mockReset();
    mockDataSourceService.handleFailover.mockReset();
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
      (binanceMarketService.getHistoricalPricesByHours as jest.Mock).mockRejectedValue(customError);

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

  describe('Airnode Integration', () => {
    const mockAirnodeEndpoints = [
      { id: 'airnode-1', url: 'https://airnode1.example.com', status: 'active' },
      { id: 'airnode-2', url: 'https://airnode2.example.com', status: 'active' },
      { id: 'airnode-3', url: 'https://airnode3.example.com', status: 'inactive' },
    ];

    const mockAirnodeResponse = {
      data: { price: 3500.5, timestamp: Date.now() },
      signature: '0xabc123',
      airnodeAddress: '0xAirnode123',
    };

    describe('Airnode endpoint discovery', () => {
      it('should discover available Airnode endpoints', async () => {
        mockAirnodeService.discoverEndpoints.mockResolvedValue(mockAirnodeEndpoints);

        const endpoints = await mockAirnodeService.discoverEndpoints('ETH/USD');

        expect(endpoints).toBeDefined();
        expect(endpoints.length).toBe(3);
        expect(endpoints.filter((e: { status: string }) => e.status === 'active').length).toBe(2);
      });

      it('should filter endpoints by status', async () => {
        mockAirnodeService.discoverEndpoints.mockResolvedValue(mockAirnodeEndpoints);

        const endpoints = await mockAirnodeService.discoverEndpoints('ETH/USD');
        const activeEndpoints = endpoints.filter((e: { status: string }) => e.status === 'active');

        expect(activeEndpoints.length).toBe(2);
      });

      it('should handle empty endpoint list', async () => {
        mockAirnodeService.discoverEndpoints.mockResolvedValue([]);

        const endpoints = await mockAirnodeService.discoverEndpoints('UNKNOWN/USD');

        expect(endpoints).toEqual([]);
      });

      it('should cache discovered endpoints', async () => {
        mockAirnodeService.discoverEndpoints.mockResolvedValue(mockAirnodeEndpoints);

        await mockAirnodeService.discoverEndpoints('ETH/USD');
        await mockAirnodeService.discoverEndpoints('ETH/USD');

        expect(mockAirnodeService.discoverEndpoints).toHaveBeenCalledTimes(2);
      });
    });

    describe('Airnode request/response handling', () => {
      it('should make successful request to Airnode', async () => {
        mockAirnodeService.makeRequest.mockResolvedValue(mockAirnodeResponse);

        const response = await mockAirnodeService.makeRequest({
          endpoint: 'https://airnode1.example.com',
          params: { symbol: 'ETH' },
        });

        expect(response.data.price).toBe(3500.5);
        expect(response.signature).toBeDefined();
      });

      it('should handle concurrent requests to multiple Airnodes', async () => {
        mockAirnodeService.makeRequest.mockResolvedValue(mockAirnodeResponse);

        const requests = [
          mockAirnodeService.makeRequest({ endpoint: 'https://airnode1.example.com', params: { symbol: 'ETH' } }),
          mockAirnodeService.makeRequest({ endpoint: 'https://airnode2.example.com', params: { symbol: 'ETH' } }),
        ];

        const responses = await Promise.all(requests);

        expect(responses.length).toBe(2);
        responses.forEach((r) => expect(r.data.price).toBeDefined());
      });

      it('should validate response signature', async () => {
        mockAirnodeService.makeRequest.mockResolvedValue(mockAirnodeResponse);

        const response = await mockAirnodeService.makeRequest({
          endpoint: 'https://airnode1.example.com',
          params: { symbol: 'ETH' },
        });

        expect(response.signature).toMatch(/^0x[a-fA-F0-9]+$/);
      });

      it('should handle malformed response', async () => {
        mockAirnodeService.makeRequest.mockResolvedValue({
          data: null,
          signature: '0xinvalid',
        });

        const response = await mockAirnodeService.makeRequest({
          endpoint: 'https://airnode1.example.com',
          params: { symbol: 'ETH' },
        });

        expect(response.data).toBeNull();
      });
    });

    describe('Airnode authentication', () => {
      it('should authenticate with valid credentials', async () => {
        mockAirnodeService.authenticate.mockResolvedValue({
          success: true,
          token: 'valid-token-123',
        });

        const result = await mockAirnodeService.authenticate({
          apiKey: 'test-api-key',
          airnodeAddress: '0xAirnode123',
        });

        expect(result.success).toBe(true);
        expect(result.token).toBeDefined();
      });

      it('should reject invalid credentials', async () => {
        mockAirnodeService.authenticate.mockResolvedValue({
          success: false,
          error: 'Invalid API key',
        });

        const result = await mockAirnodeService.authenticate({
          apiKey: 'invalid-key',
          airnodeAddress: '0xAirnode123',
        });

        expect(result.success).toBe(false);
      });

      it('should handle authentication timeout', async () => {
        mockAirnodeService.authenticate.mockImplementation(
          () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
        );

        await expect(
          mockAirnodeService.authenticate({
            apiKey: 'test-api-key',
            airnodeAddress: '0xAirnode123',
          })
        ).rejects.toThrow('Timeout');
      });
    });

    describe('Airnode timeout handling', () => {
      it('should handle request timeout gracefully', async () => {
        mockAirnodeService.makeRequest.mockImplementation(
          () => new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 50))
        );

        await expect(
          mockAirnodeService.makeRequest({
            endpoint: 'https://airnode1.example.com',
            params: { symbol: 'ETH' },
            timeout: 100,
          })
        ).rejects.toThrow('Request timeout');
      });

      it('should respect custom timeout settings', async () => {
        const startTime = Date.now();
        mockAirnodeService.makeRequest.mockImplementation(
          () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 200))
        );

        try {
          await mockAirnodeService.makeRequest({
            endpoint: 'https://airnode1.example.com',
            params: { symbol: 'ETH' },
            timeout: 100,
          });
        } catch {
          const elapsed = Date.now() - startTime;
          expect(elapsed).toBeLessThan(300);
        }
      });
    });

    describe('Multiple Airnode failover', () => {
      it('should failover to next Airnode on failure', async () => {
        mockAirnodeService.makeRequest
          .mockRejectedValueOnce(new Error('Airnode 1 failed'))
          .mockResolvedValueOnce(mockAirnodeResponse);

        try {
          await mockAirnodeService.makeRequest({ endpoint: 'https://airnode1.example.com', params: { symbol: 'ETH' } });
        } catch {
          const response = await mockAirnodeService.makeRequest({
            endpoint: 'https://airnode2.example.com',
            params: { symbol: 'ETH' },
          });
          expect(response.data.price).toBe(3500.5);
        }
      });

      it('should try all available Airnodes before failing', async () => {
        mockAirnodeService.makeRequest.mockRejectedValue(new Error('All Airnodes failed'));
        mockAirnodeService.getAvailableAirnodes.mockResolvedValue(['airnode1', 'airnode2', 'airnode3']);

        const airnodes = await mockAirnodeService.getAvailableAirnodes();
        const results = [];

        for (const airnode of airnodes) {
          try {
            const response = await mockAirnodeService.makeRequest({ endpoint: airnode, params: { symbol: 'ETH' } });
            results.push(response);
          } catch {
            continue;
          }
        }

        expect(results.length).toBe(0);
        expect(mockAirnodeService.makeRequest).toHaveBeenCalledTimes(3);
      });

      it('should return first successful response from multiple Airnodes', async () => {
        mockAirnodeService.makeRequest
          .mockRejectedValueOnce(new Error('Airnode 1 failed'))
          .mockResolvedValueOnce(mockAirnodeResponse)
          .mockResolvedValueOnce({ ...mockAirnodeResponse, data: { price: 3501 } });

        const airnodes = ['airnode1', 'airnode2', 'airnode3'];
        const results = [];

        for (const airnode of airnodes) {
          try {
            const response = await mockAirnodeService.makeRequest({ endpoint: airnode, params: { symbol: 'ETH' } });
            results.push(response);
            break;
          } catch {
            continue;
          }
        }

        expect(results.length).toBe(1);
        expect(results[0].data.price).toBe(3500.5);
      });
    });
  });

  describe('dAPI Tests', () => {
    const mockDapiData = {
      dapiId: 'dapi-eth-usd-001',
      dapiName: 'ETH/USD',
      price: 3500.5,
      timestamp: Date.now(),
      decimals: 18,
      proxyAddress: '0xProxy123',
      updateMetadata: {
        lastUpdate: Date.now() - 30000,
        updateCount: 1000,
        deviation: 0.05,
      },
    };

    const mockDapiCoverage: DAPICoverage = {
      totalDapis: 150,
      byAssetType: {
        crypto: 100,
        forex: 30,
        commodities: 15,
        stocks: 5,
      },
      byChain: {
        ethereum: 80,
        arbitrum: 45,
        polygon: 25,
      },
      updateFrequency: {
        high: 60,
        medium: 70,
        low: 20,
      },
    };

    describe('dAPI subscription and data retrieval', () => {
      it('should subscribe to dAPI successfully', async () => {
        mockDapiService.subscribe.mockResolvedValue({
          success: true,
          subscriptionId: 'sub-123',
          dapiId: 'dapi-eth-usd-001',
        });

        const result = await mockDapiService.subscribe({
          dapiName: 'ETH/USD',
          chain: Blockchain.ETHEREUM,
        });

        expect(result.success).toBe(true);
        expect(result.subscriptionId).toBeDefined();
      });

      it('should retrieve data from subscribed dAPI', async () => {
        mockDapiService.getData.mockResolvedValue(mockDapiData);

        const data = await mockDapiService.getData('dapi-eth-usd-001');

        expect(data.price).toBe(3500.5);
        expect(data.dapiName).toBe('ETH/USD');
        expect(data.proxyAddress).toBeDefined();
      });

      it('should handle subscription to non-existent dAPI', async () => {
        mockDapiService.subscribe.mockResolvedValue({
          success: false,
          error: 'dAPI not found',
        });

        const result = await mockDapiService.subscribe({
          dapiName: 'UNKNOWN/USD',
          chain: Blockchain.ETHEREUM,
        });

        expect(result.success).toBe(false);
      });

      it('should retrieve multiple dAPI data concurrently', async () => {
        mockDapiService.getData.mockResolvedValue(mockDapiData);

        const requests = [
          mockDapiService.getData('dapi-eth-usd-001'),
          mockDapiService.getData('dapi-btc-usd-001'),
          mockDapiService.getData('dapi-link-usd-001'),
        ];

        const results = await Promise.all(requests);

        expect(results.length).toBe(3);
        results.forEach((r) => expect(r.price).toBeDefined());
      });
    });

    describe('dAPI update verification', () => {
      it('should verify successful dAPI update', async () => {
        mockDapiService.verifyUpdate.mockResolvedValue({
          verified: true,
          updateTxHash: '0xTxHash123',
          blockNumber: 18000000,
          timestamp: Date.now(),
        });

        const result = await mockDapiService.verifyUpdate({
          dapiId: 'dapi-eth-usd-001',
          expectedPrice: 3500.5,
        });

        expect(result.verified).toBe(true);
        expect(result.updateTxHash).toBeDefined();
      });

      it('should detect failed update', async () => {
        mockDapiService.verifyUpdate.mockResolvedValue({
          verified: false,
          error: 'Update transaction reverted',
        });

        const result = await mockDapiService.verifyUpdate({
          dapiId: 'dapi-eth-usd-001',
          expectedPrice: 3500.5,
        });

        expect(result.verified).toBe(false);
      });

      it('should verify update within deviation threshold', async () => {
        mockDapiService.verifyUpdate.mockResolvedValue({
          verified: true,
          actualPrice: 3501,
          expectedPrice: 3500,
          deviation: 0.028,
          withinThreshold: true,
        });

        const result = await mockDapiService.verifyUpdate({
          dapiId: 'dapi-eth-usd-001',
          expectedPrice: 3500,
          threshold: 0.05,
        });

        expect(result.withinThreshold).toBe(true);
      });
    });

    describe('dAPI heartbeat monitoring', () => {
      it('should receive heartbeat from active dAPI', async () => {
        mockDapiService.getHeartbeat.mockResolvedValue({
          dapiId: 'dapi-eth-usd-001',
          status: 'active',
          lastHeartbeat: Date.now() - 10000,
          consecutiveUpdates: 100,
          uptime: 99.9,
        });

        const heartbeat = await mockDapiService.getHeartbeat('dapi-eth-usd-001');

        expect(heartbeat.status).toBe('active');
        expect(heartbeat.uptime).toBeGreaterThan(99);
      });

      it('should detect stale dAPI from heartbeat', async () => {
        mockDapiService.getHeartbeat.mockResolvedValue({
          dapiId: 'dapi-eth-usd-001',
          status: 'stale',
          lastHeartbeat: Date.now() - 3600000,
          consecutiveUpdates: 0,
          uptime: 95.5,
        });

        const heartbeat = await mockDapiService.getHeartbeat('dapi-eth-usd-001');

        expect(heartbeat.status).toBe('stale');
        expect(heartbeat.lastHeartbeat).toBeLessThan(Date.now() - 1800000);
      });

      it('should track heartbeat history', async () => {
        const heartbeats = [];
        for (let i = 0; i < 5; i++) {
          mockDapiService.getHeartbeat.mockResolvedValue({
            dapiId: 'dapi-eth-usd-001',
            status: 'active',
            lastHeartbeat: Date.now() - i * 60000,
          });
          heartbeats.push(await mockDapiService.getHeartbeat('dapi-eth-usd-001'));
        }

        expect(heartbeats.length).toBe(5);
      });
    });

    describe('dAPI data freshness validation', () => {
      it('should validate fresh data', async () => {
        mockDapiService.validateFreshness.mockResolvedValue({
          isFresh: true,
          dataAge: 30000,
          maxAge: 60000,
          lastUpdate: Date.now() - 30000,
        });

        const result = await mockDapiService.validateFreshness({
          dapiId: 'dapi-eth-usd-001',
          maxAgeMs: 60000,
        });

        expect(result.isFresh).toBe(true);
        expect(result.dataAge).toBeLessThan(result.maxAge);
      });

      it('should detect stale data', async () => {
        mockDapiService.validateFreshness.mockResolvedValue({
          isFresh: false,
          dataAge: 120000,
          maxAge: 60000,
          lastUpdate: Date.now() - 120000,
        });

        const result = await mockDapiService.validateFreshness({
          dapiId: 'dapi-eth-usd-001',
          maxAgeMs: 60000,
        });

        expect(result.isFresh).toBe(false);
        expect(result.dataAge).toBeGreaterThan(result.maxAge);
      });

      it('should handle missing timestamp', async () => {
        mockDapiService.validateFreshness.mockResolvedValue({
          isFresh: false,
          error: 'No timestamp available',
        });

        const result = await mockDapiService.validateFreshness({
          dapiId: 'dapi-unknown',
          maxAgeMs: 60000,
        });

        expect(result.isFresh).toBe(false);
      });
    });

    describe('dAPI coverage verification', () => {
      it('should return dAPI coverage statistics', async () => {
        mockDapiService.getCoverage.mockResolvedValue(mockDapiCoverage);

        const coverage = await mockDapiService.getCoverage();

        expect(coverage.totalDapis).toBe(150);
        expect(coverage.byAssetType.crypto).toBe(100);
        expect(coverage.byChain.ethereum).toBe(80);
      });

      it('should verify dAPI exists in coverage', async () => {
        mockDapiService.getCoverage.mockResolvedValue(mockDapiCoverage);

        const coverage = await mockDapiService.getCoverage();

        expect(coverage.totalDapis).toBeGreaterThan(0);
        expect(coverage.byAssetType).toBeDefined();
      });

      it('should check chain-specific coverage', async () => {
        mockDapiService.getCoverage.mockResolvedValue(mockDapiCoverage);

        const coverage = await mockDapiService.getCoverage();

        expect(coverage.byChain).toHaveProperty('ethereum');
        expect(coverage.byChain).toHaveProperty('arbitrum');
        expect(coverage.byChain).toHaveProperty('polygon');
      });
    });
  });

  describe('Data Source Verification', () => {
    const mockDataSourceInfo: DataSourceInfo = {
      id: 'ds-binance-001',
      name: 'Binance',
      type: 'exchange',
      credibilityScore: 0.95,
      accuracy: 0.98,
      responseSpeed: 0.92,
      availability: 0.999,
      airnodeAddress: '0xAirnodeBinance',
      dapiContract: '0xDapiContract',
      chain: 'ethereum',
    };

    const mockFirstPartyOracleData: FirstPartyOracleData = {
      airnodeDeployments: {
        total: 50,
        byRegion: {
          northAmerica: 20,
          europe: 15,
          asia: 10,
          others: 5,
        },
        byChain: {
          ethereum: 30,
          arbitrum: 15,
          polygon: 5,
        },
        byProviderType: {
          exchanges: 30,
          traditionalFinance: 15,
          others: 5,
        },
      },
      dapiCoverage: {
        totalDapis: 150,
        byAssetType: {
          crypto: 100,
          forex: 30,
          commodities: 15,
          stocks: 5,
        },
        byChain: {
          ethereum: 80,
          arbitrum: 45,
          polygon: 25,
        },
        updateFrequency: {
          high: 60,
          medium: 70,
          low: 20,
        },
      },
      advantages: {
        noMiddlemen: true,
        sourceTransparency: true,
        responseTime: 200,
      },
    };

    describe('First-party oracle verification', () => {
      it('should verify first-party oracle status', async () => {
        mockDataSourceService.verifyFirstPartyOracle.mockResolvedValue({
          isVerified: true,
          oracleData: mockFirstPartyOracleData,
        });

        const result = await mockDataSourceService.verifyFirstPartyOracle('ETH/USD');

        expect(result.isVerified).toBe(true);
        expect(result.oracleData.airnodeDeployments.total).toBe(50);
      });

      it('should detect non-first-party oracle', async () => {
        mockDataSourceService.verifyFirstPartyOracle.mockResolvedValue({
          isVerified: false,
          reason: 'Data sourced from third-party aggregator',
        });

        const result = await mockDataSourceService.verifyFirstPartyOracle('UNKNOWN/USD');

        expect(result.isVerified).toBe(false);
      });

      it('should verify Airnode deployment count', async () => {
        mockDataSourceService.verifyFirstPartyOracle.mockResolvedValue({
          isVerified: true,
          oracleData: mockFirstPartyOracleData,
        });

        const result = await mockDataSourceService.verifyFirstPartyOracle('ETH/USD');

        expect(result.oracleData.airnodeDeployments.total).toBeGreaterThan(0);
      });
    });

    describe('Data source authenticity check', () => {
      it('should verify data source authenticity', async () => {
        mockDataSourceService.checkAuthenticity.mockResolvedValue({
          isAuthentic: true,
          dataSource: mockDataSourceInfo,
          verificationMethod: 'signature',
        });

        const result = await mockDataSourceService.checkAuthenticity({
          data: { price: 3500.5 },
          signature: '0xSignature123',
          sourceId: 'ds-binance-001',
        });

        expect(result.isAuthentic).toBe(true);
        expect(result.dataSource.credibilityScore).toBeGreaterThan(0.9);
      });

      it('should detect tampered data', async () => {
        mockDataSourceService.checkAuthenticity.mockResolvedValue({
          isAuthentic: false,
          reason: 'Signature verification failed',
        });

        const result = await mockDataSourceService.checkAuthenticity({
          data: { price: 999999 },
          signature: '0xInvalidSignature',
          sourceId: 'ds-binance-001',
        });

        expect(result.isAuthentic).toBe(false);
      });

      it('should validate data source credentials', async () => {
        mockDataSourceService.checkAuthenticity.mockResolvedValue({
          isAuthentic: true,
          dataSource: mockDataSourceInfo,
        });

        const result = await mockDataSourceService.checkAuthenticity({
          data: { price: 3500.5 },
          signature: '0xSignature123',
          sourceId: 'ds-binance-001',
        });

        expect(result.dataSource.availability).toBeGreaterThan(0.99);
      });
    });

    describe('Data source timestamp validation', () => {
      it('should validate recent timestamp', async () => {
        mockDataSourceService.validateTimestamp.mockResolvedValue({
          isValid: true,
          timestamp: Date.now() - 30000,
          age: 30000,
          maxAge: 60000,
        });

        const result = await mockDataSourceService.validateTimestamp({
          timestamp: Date.now() - 30000,
          maxAgeMs: 60000,
        });

        expect(result.isValid).toBe(true);
        expect(result.age).toBeLessThan(result.maxAge);
      });

      it('should detect outdated timestamp', async () => {
        mockDataSourceService.validateTimestamp.mockResolvedValue({
          isValid: false,
          timestamp: Date.now() - 3600000,
          age: 3600000,
          maxAge: 60000,
        });

        const result = await mockDataSourceService.validateTimestamp({
          timestamp: Date.now() - 3600000,
          maxAgeMs: 60000,
        });

        expect(result.isValid).toBe(false);
      });

      it('should handle future timestamp', async () => {
        mockDataSourceService.validateTimestamp.mockResolvedValue({
          isValid: false,
          reason: 'Timestamp is in the future',
        });

        const result = await mockDataSourceService.validateTimestamp({
          timestamp: Date.now() + 60000,
          maxAgeMs: 60000,
        });

        expect(result.isValid).toBe(false);
      });
    });

    describe('Multiple data source aggregation', () => {
      it('should aggregate data from multiple sources', async () => {
        const sources = [
          { id: 'binance', price: 3500, weight: 0.4 },
          { id: 'coinbase', price: 3502, weight: 0.35 },
          { id: 'kraken', price: 3498, weight: 0.25 },
        ];

        mockDataSourceService.aggregateMultipleSources.mockResolvedValue({
          aggregatedPrice: 3500.2,
          sources: sources,
          deviation: 0.057,
          confidence: 0.97,
        });

        const result = await mockDataSourceService.aggregateMultipleSources(sources);

        expect(result.aggregatedPrice).toBeCloseTo(3500.2, 1);
        expect(result.confidence).toBeGreaterThan(0.9);
      });

      it('should handle source weight variations', async () => {
        const sources = [
          { id: 'binance', price: 3500, weight: 0.8 },
          { id: 'coinbase', price: 3520, weight: 0.2 },
        ];

        mockDataSourceService.aggregateMultipleSources.mockResolvedValue({
          aggregatedPrice: 3504,
          sources: sources,
          deviation: 0.57,
          confidence: 0.95,
        });

        const result = await mockDataSourceService.aggregateMultipleSources(sources);

        expect(result.aggregatedPrice).toBeCloseTo(3504, 0);
      });

      it('should detect outlier sources', async () => {
        const sources = [
          { id: 'binance', price: 3500, weight: 0.33 },
          { id: 'coinbase', price: 3502, weight: 0.33 },
          { id: 'outlier', price: 5000, weight: 0.34 },
        ];

        mockDataSourceService.aggregateMultipleSources.mockResolvedValue({
          aggregatedPrice: 3501,
          sources: sources,
          deviation: 42.8,
          outlierDetected: true,
          confidence: 0.65,
        });

        const result = await mockDataSourceService.aggregateMultipleSources(sources);

        expect(result.outlierDetected).toBe(true);
        expect(result.confidence).toBeLessThan(0.9);
      });
    });

    describe('Data source failover', () => {
      it('should failover to backup source', async () => {
        mockDataSourceService.handleFailover.mockResolvedValue({
          success: true,
          activeSource: 'coinbase',
          failedSource: 'binance',
          price: 3501,
        });

        const result = await mockDataSourceService.handleFailover({
          failedSourceId: 'binance',
          backupSourceIds: ['coinbase', 'kraken'],
        });

        expect(result.success).toBe(true);
        expect(result.activeSource).toBe('coinbase');
      });

      it('should exhaust all backup sources', async () => {
        mockDataSourceService.handleFailover.mockResolvedValue({
          success: false,
          error: 'All backup sources failed',
          attemptedSources: ['coinbase', 'kraken', 'ftx'],
        });

        const result = await mockDataSourceService.handleFailover({
          failedSourceId: 'binance',
          backupSourceIds: ['coinbase', 'kraken', 'ftx'],
        });

        expect(result.success).toBe(false);
        expect(result.attemptedSources?.length).toBe(3);
      });

      it('should maintain data quality during failover', async () => {
        mockDataSourceService.handleFailover.mockResolvedValue({
          success: true,
          activeSource: 'coinbase',
          price: 3501,
          qualityScore: 0.95,
        });

        const result = await mockDataSourceService.handleFailover({
          failedSourceId: 'binance',
          backupSourceIds: ['coinbase'],
        });

        expect(result.qualityScore).toBeGreaterThan(0.9);
      });
    });
  });

  describe('Beacon Data Tests', () => {
    const mockBeaconSetData = {
      beaconSetId: 'beacon-set-eth-001',
      beacons: [
        { id: 'beacon-1', value: 3499, timestamp: Date.now() },
        { id: 'beacon-2', value: 3501, timestamp: Date.now() },
        { id: 'beacon-3', value: 3500, timestamp: Date.now() },
      ],
      aggregatedValue: 3500,
      timestamp: Date.now(),
    };

    describe('Beacon set data retrieval', () => {
      it('should retrieve beacon set data', async () => {
        mockBeaconService.getBeaconSetData.mockResolvedValue(mockBeaconSetData);

        const data = await mockBeaconService.getBeaconSetData('beacon-set-eth-001');

        expect(data.beacons.length).toBe(3);
        expect(data.aggregatedValue).toBe(3500);
      });

      it('should handle empty beacon set', async () => {
        mockBeaconService.getBeaconSetData.mockResolvedValue({
          beaconSetId: 'beacon-set-empty',
          beacons: [],
          aggregatedValue: null,
          timestamp: Date.now(),
        });

        const data = await mockBeaconService.getBeaconSetData('beacon-set-empty');

        expect(data.beacons.length).toBe(0);
        expect(data.aggregatedValue).toBeNull();
      });

      it('should retrieve specific beacon from set', async () => {
        mockBeaconService.getBeaconSetData.mockResolvedValue(mockBeaconSetData);

        const data = await mockBeaconService.getBeaconSetData('beacon-set-eth-001');
        const beacon = data.beacons.find((b: { id: string }) => b.id === 'beacon-1');

        expect(beacon).toBeDefined();
        expect(beacon.value).toBe(3499);
      });
    });

    describe('Beacon aggregation verification', () => {
      it('should verify correct aggregation', async () => {
        mockBeaconService.getAggregatedData.mockResolvedValue({
          aggregatedValue: 3500,
          method: 'median',
          beaconCount: 3,
          deviation: 0.057,
        });

        const result = await mockBeaconService.getAggregatedData('beacon-set-eth-001');

        expect(result.aggregatedValue).toBe(3500);
        expect(result.method).toBe('median');
      });

      it('should handle weighted aggregation', async () => {
        mockBeaconService.getAggregatedData.mockResolvedValue({
          aggregatedValue: 3500.5,
          method: 'weighted_average',
          weights: [0.5, 0.3, 0.2],
          beaconCount: 3,
        });

        const result = await mockBeaconService.getAggregatedData('beacon-set-eth-001', {
          method: 'weighted_average',
        });

        expect(result.method).toBe('weighted_average');
        expect(result.weights).toBeDefined();
      });

      it('should detect aggregation anomalies', async () => {
        mockBeaconService.getAggregatedData.mockResolvedValue({
          aggregatedValue: 3500,
          anomalyDetected: true,
          anomalyReason: 'High deviation between beacons',
          beaconValues: [3499, 3501, 3600],
        });

        const result = await mockBeaconService.getAggregatedData('beacon-set-eth-001');

        expect(result.anomalyDetected).toBe(true);
      });
    });

    describe('Beacon update frequency', () => {
      it('should return update frequency metrics', async () => {
        mockBeaconService.getUpdateFrequency.mockResolvedValue({
          averageInterval: 60000,
          minInterval: 30000,
          maxInterval: 120000,
          updateCount: 1440,
          period: '24h',
        });

        const frequency = await mockBeaconService.getUpdateFrequency('beacon-set-eth-001');

        expect(frequency.averageInterval).toBe(60000);
        expect(frequency.updateCount).toBe(1440);
      });

      it('should detect irregular update patterns', async () => {
        mockBeaconService.getUpdateFrequency.mockResolvedValue({
          averageInterval: 120000,
          minInterval: 30000,
          maxInterval: 600000,
          irregularityDetected: true,
          missedUpdates: 5,
        });

        const frequency = await mockBeaconService.getUpdateFrequency('beacon-set-eth-001');

        expect(frequency.irregularityDetected).toBe(true);
        expect(frequency.missedUpdates).toBeGreaterThan(0);
      });

      it('should track update frequency over time', async () => {
        mockBeaconService.getUpdateFrequency.mockResolvedValue({
          hourlyUpdates: [60, 62, 58, 61, 60, 59, 60, 61],
          trend: 'stable',
        });

        const frequency = await mockBeaconService.getUpdateFrequency('beacon-set-eth-001');

        expect(frequency.trend).toBe('stable');
        expect(frequency.hourlyUpdates.length).toBe(8);
      });
    });

    describe('Beacon deviation threshold', () => {
      it('should return deviation threshold settings', async () => {
        mockBeaconService.getDeviationThreshold.mockResolvedValue({
          threshold: 0.5,
          unit: 'percent',
          lastTriggered: Date.now() - 3600000,
          triggerCount: 10,
        });

        const threshold = await mockBeaconService.getDeviationThreshold('beacon-set-eth-001');

        expect(threshold.threshold).toBe(0.5);
        expect(threshold.unit).toBe('percent');
      });

      it('should detect threshold breach', async () => {
        mockBeaconService.getDeviationThreshold.mockResolvedValue({
          threshold: 0.5,
          currentDeviation: 0.75,
          breached: true,
          breachDirection: 'upward',
        });

        const threshold = await mockBeaconService.getDeviationThreshold('beacon-set-eth-001');

        expect(threshold.breached).toBe(true);
        expect(threshold.currentDeviation).toBeGreaterThan(threshold.threshold);
      });

      it('should track threshold breach history', async () => {
        mockBeaconService.getDeviationThreshold.mockResolvedValue({
          threshold: 0.5,
          breachHistory: [
            { timestamp: Date.now() - 7200000, deviation: 0.6 },
            { timestamp: Date.now() - 3600000, deviation: 0.55 },
          ],
        });

        const threshold = await mockBeaconService.getDeviationThreshold('beacon-set-eth-001');

        expect(threshold.breachHistory.length).toBe(2);
      });
    });
  });

  describe('Error Handling Tests', () => {
    describe('Invalid dAPI ID handling', () => {
      it('should throw error for invalid dAPI ID format', async () => {
        mockDapiService.getData.mockRejectedValue(new Error('Invalid dAPI ID format'));

        await expect(mockDapiService.getData('invalid-dapi-id')).rejects.toThrow('Invalid dAPI ID format');
      });

      it('should handle non-existent dAPI ID', async () => {
        mockDapiService.getData.mockResolvedValue(null);

        const result = await mockDapiService.getData('dapi-nonexistent-001');

        expect(result).toBeNull();
      });

      it('should provide helpful error message for invalid dAPI', async () => {
        mockDapiService.subscribe.mockRejectedValue({
          code: 'INVALID_DAPI_ID',
          message: 'dAPI ID must follow format: dapi-{symbol}-{currency}-{chain}',
        });

        await expect(mockDapiService.subscribe({ dapiName: 'INVALID', chain: Blockchain.ETHEREUM })).rejects.toMatchObject({
          code: 'INVALID_DAPI_ID',
        });
      });
    });

    describe('Unsupported chain handling', () => {
      it('should return empty array for unsupported chain', () => {
        const symbols = client.getSupportedSymbolsForChain(Blockchain.SOLANA);
        expect(symbols).toEqual([]);
      });

      it('should return false for symbol on unsupported chain', () => {
        expect(client.isSymbolSupported('ETH', Blockchain.SOLANA)).toBe(false);
      });

      it('should handle chain not in mapping', async () => {
        (api3NetworkService.getPrice as jest.Mock).mockResolvedValue(null);

        await expect(client.getPrice('ETH', Blockchain.SOLANA)).rejects.toMatchObject({
          code: 'API3_PRICE_NOT_AVAILABLE',
        });
      });

      it('should list supported chains correctly', () => {
        const supportedChains = client.supportedChains;

        expect(supportedChains).toContain(Blockchain.ETHEREUM);
        expect(supportedChains).toContain(Blockchain.ARBITRUM);
        expect(supportedChains).not.toContain(Blockchain.SOLANA);
      });
    });

    describe('Airnode unavailable handling', () => {
      it('should handle Airnode connection failure', async () => {
        mockAirnodeService.makeRequest.mockRejectedValue(new Error('Connection refused'));

        await expect(
          mockAirnodeService.makeRequest({
            endpoint: 'https://unavailable.example.com',
            params: { symbol: 'ETH' },
          })
        ).rejects.toThrow('Connection refused');
      });

      it('should handle Airnode timeout', async () => {
        mockAirnodeService.makeRequest.mockRejectedValue(new Error('ETIMEDOUT'));

        await expect(
          mockAirnodeService.makeRequest({
            endpoint: 'https://timeout.example.com',
            params: { symbol: 'ETH' },
          })
        ).rejects.toThrow('ETIMEDOUT');
      });

      it('should handle Airnode rate limiting', async () => {
        mockAirnodeService.makeRequest.mockRejectedValue({
          status: 429,
          message: 'Rate limit exceeded',
        });

        await expect(
          mockAirnodeService.makeRequest({
            endpoint: 'https://ratelimited.example.com',
            params: { symbol: 'ETH' },
          })
        ).rejects.toMatchObject({
          status: 429,
        });
      });

      it('should handle all Airnodes unavailable', async () => {
        mockAirnodeService.getAvailableAirnodes.mockResolvedValue([]);

        const airnodes = await mockAirnodeService.getAvailableAirnodes();

        expect(airnodes.length).toBe(0);
      });
    });

    describe('Stale data detection', () => {
      it('should detect stale price data', async () => {
        const staleData = {
          price: 3500,
          timestamp: Date.now() - 3600000,
          source: 'api3-dapi-ethereum',
          decimals: 18,
          confidence: 0.98,
          dapiName: 'ETH/USD',
          proxyAddress: '0x123',
          dataAge: 3600000,
        };

        (api3NetworkService.getPrice as jest.Mock).mockResolvedValue(staleData);

        const result = await client.getPrice('ETH');

        expect(result.dataAge).toBeGreaterThan(1800000);
      });

      it('should reject data older than threshold', async () => {
        mockDapiService.validateFreshness.mockResolvedValue({
          isFresh: false,
          dataAge: 7200000,
          maxAge: 3600000,
        });

        const result = await mockDapiService.validateFreshness({
          dapiId: 'dapi-eth-usd-001',
          maxAgeMs: 3600000,
        });

        expect(result.isFresh).toBe(false);
      });

      it('should warn about aging data', async () => {
        const agingData = {
          price: 3500,
          timestamp: Date.now() - 300000,
          source: 'api3-dapi-ethereum',
          decimals: 18,
          confidence: 0.98,
          dapiName: 'ETH/USD',
          proxyAddress: '0x123',
          dataAge: 300000,
        };

        (api3NetworkService.getPrice as jest.Mock).mockResolvedValue(agingData);

        const result = await client.getPrice('ETH');

        expect(result.dataAge).toBeGreaterThan(60000);
        expect(result.dataAge).toBeLessThan(600000);
      });

      it('should track data freshness over time', async () => {
        const dataPoints = [
          { dataAge: 30000, isFresh: true },
          { dataAge: 45000, isFresh: true },
          { dataAge: 120000, isFresh: false },
        ];

        for (const point of dataPoints) {
          mockDapiService.validateFreshness.mockResolvedValue({
            isFresh: point.isFresh,
            dataAge: point.dataAge,
          });

          const result = await mockDapiService.validateFreshness({
            dapiId: 'dapi-eth-usd-001',
            maxAgeMs: 60000,
          });

          expect(result.isFresh).toBe(point.isFresh);
        }
      });
    });
  });
});
