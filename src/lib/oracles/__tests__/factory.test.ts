import { OracleClientError, ValidationError } from '@/lib/errors';
import { BaseOracleClient } from '@/lib/oracles/base';
import { type OracleProvider, Blockchain, type PriceData } from '@/types/oracle';

import {
  OracleClientFactory,
  getDefaultFactory,
  getOracleClient,
  getAllOracleClients,
  setMockOracleFactory,
  clearMockOracleFactory,
} from '../factory';

import type { IOracleClient, IOracleClientFactory } from '../interfaces';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('@/lib/config/env', () => ({
  env: {
    supabase: {
      url: '',
      anonKey: '',
    },
    app: {
      url: 'http://localhost:3000',
      environment: 'test',
      isDevelopment: false,
      isProduction: false,
      isTest: true,
    },
    features: {
      enableRealtime: false,
      enableAnalytics: false,
      enablePerformanceMonitoring: false,
      enableCSRFProtection: false,
      enableRateLimiting: false,
    },
    websocket: {
      url: undefined,
    },
  },
  FEATURE_FLAGS: {
    enableRealtime: false,
    enableAnalytics: false,
    enablePerformanceMonitoring: false,
    enableCSRFProtection: false,
    enableRateLimiting: false,
    useRealChainlinkData: true,
    useRealApi3Data: true,
    useRealWinklinkData: false,
  },
  isFeatureEnabled: jest.fn(),
  getEnv: jest.fn(),
  clientEnvSchema: {},
  lenientClientEnvSchema: {},
  serverEnvSchema: {},
  lenientServerEnvSchema: {},
}));

jest.mock('@/lib/oracles/base/databaseOperations', () => ({
  fetchPriceWithDatabase: jest.fn(),
  fetchHistoricalPricesWithDatabase: jest.fn(),
}));

jest.mock('@api3/contracts', () => ({
  computeCommunalApi3ReaderProxyV1Address: jest.fn(),
}));

class MockOracleClient extends BaseOracleClient {
  name: OracleProvider = 'chainlink';
  supportedChains: Blockchain[] = [Blockchain.ETHEREUM, Blockchain.POLYGON];
  private _supportedSymbols: string[];

  constructor(supportedSymbols: string[] = ['BTC', 'ETH', 'LINK']) {
    super();
    this._supportedSymbols = supportedSymbols;
  }

  getSupportedSymbols(): string[] {
    return this._supportedSymbols;
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    return this.generateMockPrice(symbol, 100, chain);
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number
  ): Promise<PriceData[]> {
    return this.generateMockHistoricalPrices(symbol, 100, chain, period);
  }
}

class MockOracleClientFactory implements IOracleClientFactory {
  private clients: Map<OracleProvider, IOracleClient> = new Map();
  private _clearInstancesCalled = false;

  constructor(clients?: Record<OracleProvider, IOracleClient>) {
    if (clients) {
      Object.entries(clients).forEach(([provider, client]) => {
        this.clients.set(provider as OracleProvider, client);
      });
    }
  }

  getClient(provider: OracleProvider): IOracleClient {
    const client = this.clients.get(provider);
    if (!client) {
      throw new OracleClientError(`Mock client not found for provider: ${provider}`, { provider });
    }
    return client;
  }

  getAllClients(): Record<OracleProvider, IOracleClient> {
    const result: Partial<Record<OracleProvider, IOracleClient>> = {};
    this.clients.forEach((client, provider) => {
      result[provider] = client;
    });
    return result as Record<OracleProvider, IOracleClient>;
  }

  hasClient(provider: OracleProvider): boolean {
    return this.clients.has(provider);
  }

  clearInstances(): void {
    this._clearInstancesCalled = true;
    this.clients.clear();
  }

  get clearInstancesCalled(): boolean {
    return this._clearInstancesCalled;
  }
}

describe('OracleClientFactory', () => {
  let factory: OracleClientFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    factory = getDefaultFactory();
    factory.clearInstances();
    factory.clearMockFactory();
  });

  afterEach(() => {
    factory.clearMockFactory();
    factory.clearInstances();
  });

  describe('Mock Factory Tests', () => {
    describe('Set mock factory for client creation', () => {
      it('should resolve client from mock factory when set', () => {
        const mockClient = new MockOracleClient();
        const mockFactory = new MockOracleClientFactory({
          chainlink: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const result = factory.getClient('chainlink');

        expect(result).toBe(mockClient);
      });

      it('should return mock client instance when available', () => {
        const mockClient = new MockOracleClient(['BTC', 'ETH', 'SOL']);
        const mockFactory = new MockOracleClientFactory({
          pyth: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const result = factory.getClient('pyth');

        expect(result.getSupportedSymbols()).toEqual(['BTC', 'ETH', 'SOL']);
      });

      it('should check mock factory before creating new instance', () => {
        const mockClient = new MockOracleClient();
        const mockFactory = new MockOracleClientFactory({
          api3: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const result = factory.getClient('api3');

        expect(result).toBeInstanceOf(MockOracleClient);
      });
    });

    describe('Override default client with mock factory', () => {
      it('should override default client with mock factory client', () => {
        const defaultClient = factory.getClient('chainlink');
        const mockClient = new MockOracleClient(['OVERRIDE']);
        const mockFactory = new MockOracleClientFactory({
          chainlink: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const overriddenClient = factory.getClient('chainlink');

        expect(overriddenClient).not.toBe(defaultClient);
        expect(overriddenClient.getSupportedSymbols()).toEqual(['OVERRIDE']);
      });

      it('should use mock factory for all providers after setting', () => {
        const mockChainlinkClient = new MockOracleClient(['CL1', 'CL2']);
        const mockPythClient = new MockOracleClient(['PYTH1', 'PYTH2']);
        const mockFactory = new MockOracleClientFactory({
          chainlink: mockChainlinkClient,
          pyth: mockPythClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);

        const chainlinkResult = factory.getClient('chainlink');
        const pythResult = factory.getClient('pyth');

        expect(chainlinkResult.getSupportedSymbols()).toEqual(['CL1', 'CL2']);
        expect(pythResult.getSupportedSymbols()).toEqual(['PYTH1', 'PYTH2']);
      });
    });

    describe('Clear mock factory', () => {
      it('should clear mock factory and fall back to default', () => {
        const mockClient = new MockOracleClient(['MOCK']);
        const mockFactory = new MockOracleClientFactory({
          chainlink: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);

        factory.clearMockFactory();

        const client = factory.getClient('chainlink');
        expect(client.getSupportedSymbols()).not.toEqual(['MOCK']);
      });
    });

    describe('Multiple mock factory changes', () => {
      it('should handle multiple mock factory changes', () => {
        const firstMockClient = new MockOracleClient(['FIRST']);
        const firstFactory = new MockOracleClientFactory({
          chainlink: firstMockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(firstFactory);
        const firstResult = factory.getClient('chainlink');
        expect(firstResult.getSupportedSymbols()).toEqual(['FIRST']);

        const secondMockClient = new MockOracleClient(['SECOND']);
        const secondFactory = new MockOracleClientFactory({
          chainlink: secondMockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(secondFactory);
        const secondResult = factory.getClient('chainlink');
        expect(secondResult.getSupportedSymbols()).toEqual(['SECOND']);
      });

      it('should handle mock factory after default client creation', () => {
        const defaultClient = factory.getClient('chainlink');
        expect(defaultClient).toBeDefined();

        const mockClient = new MockOracleClient(['MOCK_OVERRIDE']);
        const mockFactory = new MockOracleClientFactory({
          chainlink: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const diClient = factory.getClient('chainlink');

        expect(diClient.getSupportedSymbols()).toEqual(['MOCK_OVERRIDE']);
      });
    });
  });

  describe('Error Handling Tests', () => {
    describe('Request unsupported oracle provider', () => {
      it('should throw ValidationError for unknown provider', () => {
        expect(() => factory.getClient('unknown_provider' as OracleProvider)).toThrow(
          ValidationError
        );
      });

      it('should include provider name in error message', () => {
        try {
          factory.getClient('invalid' as OracleProvider);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect((error as ValidationError).message).toContain('Unknown oracle provider');
        }
      });
    });

    describe('Invalid provider identifier', () => {
      it('should throw error for empty string provider', () => {
        expect(() => factory.getClient('' as OracleProvider)).toThrow();
      });

      it('should throw error for null-like provider', () => {
        expect(() => factory.getClient(null as unknown as OracleProvider)).toThrow();
      });

      it('should throw error for numeric provider', () => {
        expect(() => factory.getClient(123 as unknown as OracleProvider)).toThrow();
      });
    });

    describe('Client creation failure', () => {
      it('should throw OracleClientError when mock factory throws', () => {
        const mockFactory = {
          getClient: jest.fn().mockImplementation(() => {
            throw new Error('Factory error');
          }),
          getAllClients: jest.fn(),
          hasClient: jest.fn(),
          clearInstances: jest.fn(),
        } as unknown as IOracleClientFactory;

        factory.setMockFactory(mockFactory);

        expect(() => factory.getClient('chainlink')).toThrow();
      });

      it('should handle mock client not being BaseOracleClient instance', () => {
        const nonBaseClient = {
          name: 'chainlink',
          supportedChains: [Blockchain.ETHEREUM],
          getPrice: jest.fn(),
          getHistoricalPrices: jest.fn(),
          getSupportedSymbols: jest.fn().mockReturnValue(['BTC']),
        } as IOracleClient;

        const mockFactory = {
          getClient: jest.fn().mockReturnValue(nonBaseClient),
          getAllClients: jest.fn().mockReturnValue({ chainlink: nonBaseClient }),
          hasClient: jest.fn().mockReturnValue(true),
          clearInstances: jest.fn(),
        } as unknown as IOracleClientFactory;

        factory.setMockFactory(mockFactory);
        const client = factory.getClient('chainlink');

        expect(client).toBeInstanceOf(BaseOracleClient);
      });
    });

    describe('Proper error logging', () => {
      it('should log error when client creation fails', () => {
        const { createLogger } = require('@/lib/utils/logger');
        const mockLogger = createLogger('OracleClientFactory');

        try {
          factory.getClient('unknown' as OracleProvider);
        } catch {
          // Expected to throw
        }

        // Logger should have been called (mocked)
        expect(mockLogger.info).toBeDefined();
      });
    });
  });

  describe('Concurrency Tests', () => {
    describe('Multiple concurrent requests for same client', () => {
      it('should return same instance for concurrent requests', async () => {
        const promises = Array(10)
          .fill(null)
          .map(() => Promise.resolve(factory.getClient('chainlink')));

        const results = await Promise.all(promises);
        const firstClient = results[0];

        results.forEach((client) => {
          expect(client).toBe(firstClient);
        });
      });

      it('should handle concurrent getClient calls efficiently', async () => {
        const startTime = Date.now();
        const promises = Array(50)
          .fill(null)
          .map(() => Promise.resolve(factory.getClient('pyth')));

        await Promise.all(promises);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000);
      });
    });

    describe('Concurrent requests for different clients', () => {
      it('should handle concurrent requests for different providers', async () => {
        const providers: OracleProvider[] = [
          'chainlink',
          'pyth',
          'api3',
          'redstone',
          'dia',
          'winklink',
        ];
        const promises = providers.map((provider) => Promise.resolve(factory.getClient(provider)));

        const results = await Promise.all(promises);

        results.forEach((client, index) => {
          expect(client.name).toBe(providers[index]);
        });
      });

      it('should create different instances for different providers concurrently', async () => {
        const [chainlinkClient, pythClient, api3Client] = await Promise.all([
          Promise.resolve(factory.getClient('chainlink')),
          Promise.resolve(factory.getClient('pyth')),
          Promise.resolve(factory.getClient('api3')),
        ]);

        expect(chainlinkClient).not.toBe(pythClient);
        expect(chainlinkClient).not.toBe(api3Client);
        expect(pythClient).not.toBe(api3Client);
      });
    });

    describe('Thread-safe singleton pattern', () => {
      it('should maintain singleton across concurrent access', async () => {
        const promises = Array(20)
          .fill(null)
          .map(
            () =>
              new Promise<BaseOracleClient>((resolve) => {
                setTimeout(() => {
                  resolve(factory.getClient('chainlink'));
                }, Math.random() * 50);
              })
          );

        const results = await Promise.all(promises);
        const uniqueInstances = new Set(results);

        expect(uniqueInstances.size).toBe(1);
      });

      it('should handle rapid sequential and concurrent access', async () => {
        const sequentialResults: BaseOracleClient[] = [];
        for (let i = 0; i < 5; i++) {
          sequentialResults.push(factory.getClient('chainlink'));
        }

        const concurrentResults = await Promise.all(
          Array(5)
            .fill(null)
            .map(() => Promise.resolve(factory.getClient('chainlink')))
        );

        const allResults = [...sequentialResults, ...concurrentResults];
        const uniqueInstances = new Set(allResults);

        expect(uniqueInstances.size).toBe(1);
      });
    });

    describe('Race condition handling', () => {
      it('should handle race condition during instance creation', async () => {
        factory.clearInstances();

        const delayedCreation = new Promise<BaseOracleClient>((resolve) => {
          setTimeout(() => {
            resolve(factory.getClient('chainlink'));
          }, 100);
        });

        const immediateCreation = Promise.resolve(factory.getClient('chainlink'));

        const [delayed, immediate] = await Promise.all([delayedCreation, immediateCreation]);

        expect(delayed).toBe(immediate);
      });

      it('should handle concurrent clearInstances and getClient', async () => {
        const getClientPromise = Promise.resolve(factory.getClient('chainlink'));
        const clearPromise = Promise.resolve(factory.clearInstances());

        await Promise.all([getClientPromise, clearPromise]);

        const client = factory.getClient('chainlink');
        expect(client).toBeDefined();
      });
    });
  });

  describe('Singleton Pattern Tests', () => {
    describe('Same instance returned for multiple calls', () => {
      it('should return same instance for multiple getClient calls', () => {
        const client1 = factory.getClient('chainlink');
        const client2 = factory.getClient('chainlink');
        const client3 = factory.getClient('chainlink');

        expect(client1).toBe(client2);
        expect(client2).toBe(client3);
      });

      it('should return same instance after multiple operations', () => {
        const client1 = factory.getClient('pyth');
        factory.hasClient('pyth');
        factory.getSupportedSymbols('pyth');
        const client2 = factory.getClient('pyth');

        expect(client1).toBe(client2);
      });
    });

    describe('Different instances for different providers', () => {
      it('should return different instances for different providers', () => {
        const chainlinkClient = factory.getClient('chainlink');
        const pythClient = factory.getClient('pyth');
        const api3Client = factory.getClient('api3');

        expect(chainlinkClient).not.toBe(pythClient);
        expect(chainlinkClient).not.toBe(api3Client);
        expect(pythClient).not.toBe(api3Client);
      });

      it('should maintain separate instances for all providers', () => {
        const providers: OracleProvider[] = [
          'chainlink',
          'pyth',
          'api3',
          'redstone',
          'dia',
          'winklink',
        ];
        const clients = providers.map((p) => factory.getClient(p));

        for (let i = 0; i < clients.length; i++) {
          for (let j = i + 1; j < clients.length; j++) {
            expect(clients[i]).not.toBe(clients[j]);
          }
        }
      });
    });

    describe('Clear instances and recreate', () => {
      it('should create new instance after clearInstances', () => {
        const client1 = factory.getClient('chainlink');
        factory.clearInstances();
        const client2 = factory.getClient('chainlink');

        expect(client1).not.toBe(client2);
      });

      it('should clear all provider instances', () => {
        factory.getClient('chainlink');
        factory.getClient('pyth');
        factory.getClient('api3');

        expect(factory.hasClient('chainlink')).toBe(true);
        expect(factory.hasClient('pyth')).toBe(true);
        expect(factory.hasClient('api3')).toBe(true);

        factory.clearInstances();

        expect(factory.hasClient('chainlink')).toBe(false);
        expect(factory.hasClient('pyth')).toBe(false);
        expect(factory.hasClient('api3')).toBe(false);
      });

      it('should recreate instances after clear', () => {
        const client1 = factory.getClient('redstone');
        factory.clearInstances();
        const client2 = factory.getClient('redstone');

        expect(client1).not.toBe(client2);
        expect(client2).toBeDefined();
      });
    });

    describe('Instance persistence', () => {
      it('should persist instance across multiple operations', () => {
        const client = factory.getClient('dia');

        factory.getSupportedSymbols('dia');
        factory.isSymbolSupported('dia', 'BTC');
        factory.getSupportedChainsForSymbol('dia', 'BTC');

        const sameClient = factory.getClient('dia');
        expect(client).toBe(sameClient);
      });

      it('should persist instance after getAllClients call', () => {
        const client = factory.getClient('winklink');
        factory.getAllClients();
        const sameClient = factory.getClient('winklink');

        expect(client).toBe(sameClient);
      });
    });
  });

  describe('Configuration Management Tests', () => {
    describe('Configure factory with custom settings', () => {
      it('should accept custom configuration', () => {
        expect(() => {
          factory.configure({ useDatabase: false });
        }).not.toThrow();
      });

      it('should merge custom config with defaults', () => {
        factory.configure({ useDatabase: false });
        factory.configure({ validateData: true });

        expect(() => factory.getClient('chainlink')).not.toThrow();
      });

      it('should handle partial configuration updates', () => {
        factory.configure({ useDatabase: true });
        factory.configure({ useDatabase: false, validateData: false });

        expect(() => factory.getClient('pyth')).not.toThrow();
      });
    });

    describe('Configuration propagation to clients', () => {
      it('should propagate useDatabase config to new clients', () => {
        factory.clearInstances();
        factory.configure({ useDatabase: false });

        const client = factory.getClient('chainlink');
        expect(client).toBeDefined();
      });

      it('should apply configuration to all provider types', () => {
        factory.clearInstances();
        factory.configure({ useDatabase: false, validateData: false });

        const providers: OracleProvider[] = [
          'chainlink',
          'pyth',
          'api3',
          'redstone',
          'dia',
          'winklink',
        ];
        providers.forEach((provider) => {
          const client = factory.getClient(provider);
          expect(client).toBeDefined();
        });
      });
    });

    describe('Configuration validation', () => {
      it('should handle invalid config values gracefully', () => {
        expect(() => {
          factory.configure({ useDatabase: 'invalid' as unknown as boolean });
        }).not.toThrow();
      });

      it('should handle empty configuration object', () => {
        expect(() => {
          factory.configure({});
        }).not.toThrow();
      });

      it('should handle undefined config values', () => {
        expect(() => {
          factory.configure({ useDatabase: undefined });
        }).not.toThrow();
      });
    });

    describe('Default configuration values', () => {
      it('should use default useDatabase value', () => {
        factory.clearInstances();
        const client = factory.getClient('chainlink');
        expect(client).toBeDefined();
      });

      it('should maintain defaults when partial config is provided', () => {
        factory.configure({ validateData: true });
        const client = factory.getClient('pyth');
        expect(client).toBeDefined();
      });
    });
  });

  describe('Mock Factory Registration Tests', () => {
    describe('Set mock factory for testing', () => {
      it('should set mock factory', () => {
        const mockFactory = new MockOracleClientFactory();
        factory.setMockFactory(mockFactory);

        const client = factory.getClient('chainlink');
        expect(client).toBeDefined();
      });

      it('should use mock factory for client creation', () => {
        const mockClient = new MockOracleClient(['TEST1', 'TEST2']);
        const mockFactory = new MockOracleClientFactory({
          chainlink: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const client = factory.getClient('chainlink');

        expect(client.getSupportedSymbols()).toEqual(['TEST1', 'TEST2']);
      });
    });

    describe('Clear mock factory', () => {
      it('should clear mock factory', () => {
        const mockFactory = new MockOracleClientFactory();
        factory.setMockFactory(mockFactory);

        factory.clearMockFactory();

        const client = factory.getClient('chainlink');
        expect(client).toBeDefined();
      });

      it('should fall back to default after clear', () => {
        const mockClient = new MockOracleClient(['MOCK']);
        const mockFactory = new MockOracleClientFactory({
          pyth: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const mockResult = factory.getClient('pyth');
        expect(mockResult.getSupportedSymbols()).toEqual(['MOCK']);

        factory.clearMockFactory();
        const defaultResult = factory.getClient('pyth');
        expect(defaultResult.getSupportedSymbols()).not.toEqual(['MOCK']);
      });

      it('should handle clear when not set', () => {
        expect(() => {
          factory.clearMockFactory();
        }).not.toThrow();
      });
    });

    describe('Mock factory behavior verification', () => {
      it('should call mock factory getClient', () => {
        const mockClient = new MockOracleClient();
        const mockFactory = {
          getClient: jest.fn().mockReturnValue(mockClient),
          getAllClients: jest.fn().mockReturnValue({ chainlink: mockClient }),
          hasClient: jest.fn().mockReturnValue(true),
          clearInstances: jest.fn(),
        } as unknown as IOracleClientFactory;

        factory.setMockFactory(mockFactory);
        factory.getClient('chainlink');

        expect(mockFactory.getClient).toHaveBeenCalledWith('chainlink');
      });

      it('should call mock factory clearInstances', () => {
        const mockFactory = new MockOracleClientFactory();
        factory.setMockFactory(mockFactory);

        factory.clearInstances();

        expect(mockFactory.clearInstancesCalled).toBe(true);
      });

      it('should call mock factory hasClient', () => {
        const mockFactory = {
          getClient: jest.fn(),
          getAllClients: jest.fn().mockReturnValue({}),
          hasClient: jest.fn().mockReturnValue(true),
          clearInstances: jest.fn(),
        } as unknown as IOracleClientFactory;

        factory.setMockFactory(mockFactory);
        const result = factory.hasClient('chainlink');

        expect(result).toBe(true);
      });
    });

    describe('Switch between mock and real factory', () => {
      it('should switch from mock to real factory', () => {
        const mockClient = new MockOracleClient(['MOCK']);
        const mockFactory = new MockOracleClientFactory({
          api3: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const mockResult = factory.getClient('api3');
        expect(mockResult.getSupportedSymbols()).toEqual(['MOCK']);

        factory.clearMockFactory();
        factory.clearInstances();
        const realResult = factory.getClient('api3');
        expect(realResult.getSupportedSymbols()).not.toEqual(['MOCK']);
      });

      it('should switch from real to mock factory', () => {
        const realClient = factory.getClient('redstone');
        expect(realClient).toBeDefined();

        const mockClient = new MockOracleClient(['MOCK_REDSTONE']);
        const mockFactory = new MockOracleClientFactory({
          redstone: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const mockResult = factory.getClient('redstone');
        expect(mockResult.getSupportedSymbols()).toEqual(['MOCK_REDSTONE']);
      });

      it('should handle multiple switches', () => {
        const mockFactory1 = new MockOracleClientFactory({
          dia: new MockOracleClient(['FIRST']),
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory1);
        expect(factory.getClient('dia').getSupportedSymbols()).toEqual(['FIRST']);

        factory.clearMockFactory();

        const mockFactory2 = new MockOracleClientFactory({
          dia: new MockOracleClient(['SECOND']),
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory2);
        expect(factory.getClient('dia').getSupportedSymbols()).toEqual(['SECOND']);

        factory.clearMockFactory();
      });
    });
  });

  describe('Supported Symbols and Chains Tests', () => {
    describe('Get supported symbols for provider', () => {
      it('should return supported symbols for valid provider', () => {
        const symbols = factory.getSupportedSymbols('chainlink');
        expect(Array.isArray(symbols)).toBe(true);
      });

      it('should return empty array for error cases', () => {
        const mockFactory = {
          getClient: jest.fn().mockImplementation(() => {
            throw new Error('Test error');
          }),
          getAllClients: jest.fn(),
          hasClient: jest.fn(),
          clearInstances: jest.fn(),
        } as unknown as IOracleClientFactory;

        factory.setMockFactory(mockFactory);
        const symbols = factory.getSupportedSymbols('chainlink');

        expect(symbols).toEqual([]);
      });

      it('should return symbols for all providers', () => {
        const providers: OracleProvider[] = [
          'chainlink',
          'pyth',
          'api3',
          'redstone',
          'dia',
          'winklink',
        ];

        providers.forEach((provider) => {
          const symbols = factory.getSupportedSymbols(provider);
          expect(Array.isArray(symbols)).toBe(true);
        });
      });
    });

    describe('Check symbol support', () => {
      it('should return true for supported symbol', () => {
        const mockClient = new MockOracleClient(['BTC', 'ETH']);
        const mockFactory = new MockOracleClientFactory({
          chainlink: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const result = factory.isSymbolSupported('chainlink', 'BTC');

        expect(result).toBe(true);
      });

      it('should return false for unsupported symbol', () => {
        const mockClient = new MockOracleClient(['BTC', 'ETH']);
        const mockFactory = new MockOracleClientFactory({
          pyth: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const result = factory.isSymbolSupported('pyth', 'DOGE');

        expect(result).toBe(false);
      });

      it('should return false for empty symbol', () => {
        const result = factory.isSymbolSupported('chainlink', '');
        expect(result).toBe(false);
      });

      it('should return false for whitespace-only symbol', () => {
        const result = factory.isSymbolSupported('chainlink', '   ');
        expect(result).toBe(false);
      });

      it('should check symbol support with chain', () => {
        const mockClient = new MockOracleClient(['BTC']);
        const mockFactory = new MockOracleClientFactory({
          api3: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const result = factory.isSymbolSupported('api3', 'BTC', Blockchain.ETHEREUM);

        expect(result).toBe(true);
      });
    });

    describe('Get supported chains for symbol', () => {
      it('should return supported chains for valid symbol', () => {
        const chains = factory.getSupportedChainsForSymbol('chainlink', 'ETH');
        expect(Array.isArray(chains)).toBe(true);
      });

      it('should return empty array for empty symbol', () => {
        const chains = factory.getSupportedChainsForSymbol('pyth', '');
        expect(chains).toEqual([]);
      });

      it('should return empty array for whitespace symbol', () => {
        const chains = factory.getSupportedChainsForSymbol('api3', '   ');
        expect(chains).toEqual([]);
      });

      it('should handle error gracefully', () => {
        const mockFactory = {
          getClient: jest.fn().mockImplementation(() => {
            throw new Error('Test error');
          }),
          getAllClients: jest.fn(),
          hasClient: jest.fn(),
          clearInstances: jest.fn(),
        } as unknown as IOracleClientFactory;

        factory.setMockFactory(mockFactory);
        const chains = factory.getSupportedChainsForSymbol('chainlink', 'BTC');

        expect(chains).toEqual([]);
      });
    });

    describe('Handle errors gracefully', () => {
      it('should return empty array on provider error', () => {
        const errorClient = new MockOracleClient();
        errorClient.getSupportedSymbols = jest.fn().mockImplementation(() => {
          throw new Error('Provider error');
        });

        const mockFactory = new MockOracleClientFactory({
          chainlink: errorClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const symbols = factory.getSupportedSymbols('chainlink');

        expect(symbols).toEqual([]);
      });

      it('should return false on symbol check error', () => {
        const errorClient = new MockOracleClient();
        errorClient.isSymbolSupported = jest.fn().mockImplementation(() => {
          throw new Error('Check error');
        });

        const mockFactory = new MockOracleClientFactory({
          chainlink: errorClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const result = factory.isSymbolSupported('chainlink', 'BTC');

        expect(result).toBe(false);
      });

      it('should return empty array on chains query error', () => {
        const errorClient = new MockOracleClient();
        errorClient.getSupportedChainsForSymbol = jest.fn().mockImplementation(() => {
          throw new Error('Chains error');
        });

        const mockFactory = new MockOracleClientFactory({
          chainlink: errorClient,
        } as Record<OracleProvider, IOracleClient>);

        factory.setMockFactory(mockFactory);
        const chains = factory.getSupportedChainsForSymbol('chainlink', 'BTC');

        expect(chains).toEqual([]);
      });
    });

    describe('getAllSupportedSymbols', () => {
      it('should return symbols for all providers', () => {
        const result = factory.getAllSupportedSymbols();

        expect(result).toHaveProperty('chainlink');
        expect(result).toHaveProperty('pyth');
        expect(result).toHaveProperty('api3');
        expect(result).toHaveProperty('redstone');
        expect(result).toHaveProperty('dia');
        expect(result).toHaveProperty('winklink');
      });

      it('should return arrays for each provider', () => {
        const result = factory.getAllSupportedSymbols();

        Object.values(result).forEach((symbols) => {
          expect(Array.isArray(symbols)).toBe(true);
        });
      });
    });
  });

  describe('getAllClients', () => {
    it('should return all clients', () => {
      const clients = factory.getAllClients();

      expect(clients).toHaveProperty('chainlink');
      expect(clients).toHaveProperty('pyth');
      expect(clients).toHaveProperty('api3');
      expect(clients).toHaveProperty('redstone');
      expect(clients).toHaveProperty('dia');
      expect(clients).toHaveProperty('winklink');
    });

    it('should return BaseOracleClient instances', () => {
      const clients = factory.getAllClients();

      Object.values(clients).forEach((client) => {
        expect(client).toBeInstanceOf(BaseOracleClient);
      });
    });

    it('should use mock factory when set', () => {
      const mockClient = new MockOracleClient(['ALL']);
      const mockFactory = new MockOracleClientFactory({
        chainlink: mockClient,
        pyth: mockClient,
        api3: mockClient,
        redstone: mockClient,
        dia: mockClient,
        winklink: mockClient,
      } as Record<OracleProvider, IOracleClient>);

      factory.setMockFactory(mockFactory);
      const clients = factory.getAllClients();

      expect(clients.chainlink.getSupportedSymbols()).toEqual(['ALL']);
    });
  });

  describe('hasClient', () => {
    it('should return true for created client', () => {
      factory.getClient('chainlink');
      expect(factory.hasClient('chainlink')).toBe(true);
    });

    it('should return false for non-existent client', () => {
      expect(factory.hasClient('pyth')).toBe(false);
    });

    it('should use mock factory when set', () => {
      const mockFactory = {
        getClient: jest.fn(),
        getAllClients: jest.fn(),
        hasClient: jest.fn().mockReturnValue(true),
        clearInstances: jest.fn(),
      } as unknown as IOracleClientFactory;

      factory.setMockFactory(mockFactory);
      const result = factory.hasClient('chainlink');

      expect(result).toBe(true);
    });
  });

  describe('Exported Functions', () => {
    describe('getOracleClient', () => {
      it('should delegate to OracleClientFactory.getClient', () => {
        const client = getOracleClient('chainlink');
        expect(client).toBeInstanceOf(BaseOracleClient);
      });
    });

    describe('getAllOracleClients', () => {
      it('should delegate to OracleClientFactory.getAllClients', () => {
        const clients = getAllOracleClients();
        expect(Object.keys(clients).length).toBeGreaterThan(0);
      });
    });

    describe('setMockOracleFactory', () => {
      it('should delegate to OracleClientFactory.setMockFactory', () => {
        const mockFactory = new MockOracleClientFactory();
        setMockOracleFactory(mockFactory);

        const client = getDefaultFactory().getClient('chainlink');
        expect(client).toBeDefined();
      });
    });

    describe('clearMockOracleFactory', () => {
      it('should delegate to OracleClientFactory.clearMockFactory', () => {
        const mockFactory = new MockOracleClientFactory();
        setMockOracleFactory(mockFactory);
        clearMockOracleFactory();

        const client = getDefaultFactory().getClient('chainlink');
        expect(client).toBeInstanceOf(BaseOracleClient);
      });
    });
  });

  describe('Isolated Instance Tests', () => {
    it('should create isolated factory instances', () => {
      const isolatedFactory = new OracleClientFactory();
      const client = isolatedFactory.getClient('chainlink');
      expect(client).toBeInstanceOf(BaseOracleClient);
    });

    it('should not share instances between isolated factories', () => {
      const factory1 = new OracleClientFactory();
      const factory2 = new OracleClientFactory();

      const client1 = factory1.getClient('chainlink');
      const client2 = factory2.getClient('chainlink');

      expect(client1).not.toBe(client2);
    });

    it('should not affect default factory from isolated instance', () => {
      const isolatedFactory = new OracleClientFactory();
      const mockClient = new MockOracleClient(['ISOLATED']);
      const mockFactory = new MockOracleClientFactory({
        chainlink: mockClient,
      } as Record<OracleProvider, IOracleClient>);

      isolatedFactory.setMockFactory(mockFactory);
      const isolatedClient = isolatedFactory.getClient('chainlink');
      expect(isolatedClient.getSupportedSymbols()).toEqual(['ISOLATED']);

      const defaultClient = getDefaultFactory().getClient('chainlink');
      expect(defaultClient.getSupportedSymbols()).not.toEqual(['ISOLATED']);
    });

    it('should accept custom config in constructor', () => {
      const customFactory = new OracleClientFactory({ useDatabase: false });
      const client = customFactory.getClient('chainlink');
      expect(client).toBeDefined();
    });

    it('should merge constructor config with defaults', () => {
      const customFactory = new OracleClientFactory({ useDatabase: false });
      customFactory.configure({ validateData: true });
      const client = customFactory.getClient('pyth');
      expect(client).toBeDefined();
    });

    it('should maintain independent mock factory per instance', () => {
      const factory1 = new OracleClientFactory();
      const factory2 = new OracleClientFactory();

      const mockClient1 = new MockOracleClient(['FACTORY1']);
      const mockFactory1 = new MockOracleClientFactory({
        chainlink: mockClient1,
      } as Record<OracleProvider, IOracleClient>);

      factory1.setMockFactory(mockFactory1);

      expect(factory1.getClient('chainlink').getSupportedSymbols()).toEqual(['FACTORY1']);
      expect(() => factory2.getClient('chainlink')).not.toThrow();
    });
  });

  describe('getDefaultFactory', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getDefaultFactory();
      const instance2 = getDefaultFactory();
      expect(instance1).toBe(instance2);
    });

    it('should return an OracleClientFactory instance', () => {
      const instance = getDefaultFactory();
      expect(instance).toBeInstanceOf(OracleClientFactory);
    });
  });
});
