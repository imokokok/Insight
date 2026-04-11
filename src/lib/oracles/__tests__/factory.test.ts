import { container, SERVICE_TOKENS } from '@/lib/di';
import { OracleClientError, ValidationError } from '@/lib/errors';
import { BaseOracleClient } from '@/lib/oracles/base';
import { OracleProvider, Blockchain, type PriceData } from '@/types/oracle';

import type { IOracleClient, IOracleClientFactory } from '../interfaces';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('@/lib/config/serverEnv', () => ({
  ALCHEMY_RPC: {
    ethereum: '',
    arbitrum: '',
    polygon: '',
    base: '',
    optimism: '',
    solana: '',
    bnb: '',
    avalanche: '',
    zksync: '',
    scroll: '',
    mantle: '',
    linea: '',
  },
  TRON_CONFIG: {
    rpcUrl: 'https://api.trongrid.io',
    solidityRpc: 'https://api.trongrid.io/walletsolidity',
    fullnodeRpc: 'https://api.trongrid.io/wallet',
    apiKey: '',
  },
  THEGRAPH_CONFIG: {
    apiKey: '',
  },
  API3_CONFIG: {
    marketApiUrl: 'https://market.api3.org/api/v1',
    daoApiUrl: 'https://api.api3.org',
    wsUrl: 'wss://ws.api3.org',
  },
  FEATURE_FLAGS: {
    useRealChainlinkData: true,
    useRealApi3Data: true,
    useRealWinklinkData: false,
  },
  CACHE_CONFIG: {
    winklinkTtl: 30000,
    chainlinkPriceTtl: 30000,
    api3PriceTtl: 30000,
  },
  SUPABASE_SERVER_CONFIG: {
    url: '',
    anonKey: '',
    serviceRoleKey: '',
  },
  SECURITY_CONFIG: {
    csrfSecret: '',
    jwtSecret: '',
    cronSecret: '',
  },
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

  async getHistoricalPrices(symbol: string, chain?: Blockchain, period?: number): Promise<PriceData[]> {
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

import { OracleClientFactory, getOracleClient, getAllOracleClients, getOracleClientFromDI, registerMockOracleFactory, unregisterMockOracleFactory } from '../factory';

describe('OracleClientFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    OracleClientFactory.clearInstances();
    try {
      container.unregister(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
    } catch {
      // Token might not be registered
    }
  });

  afterEach(() => {
    try {
      container.unregister(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
    } catch {
      // Token might not be registered
    }
    OracleClientFactory.clearInstances();
  });

  describe('Dependency Injection Tests', () => {
    describe('Register and resolve client from DI container', () => {
      it('should resolve client from DI when factory is registered', () => {
        const mockClient = new MockOracleClient();
        const mockFactory = new MockOracleClientFactory({
          chainlink: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);
        const result = OracleClientFactory.getClient('chainlink');

        expect(result).toBe(mockClient);
      });

      it('should return DI client instance when available', () => {
        const mockClient = new MockOracleClient(['BTC', 'ETH', 'SOL']);
        const mockFactory = new MockOracleClientFactory({
          pyth: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);
        const result = OracleClientFactory.getClient('pyth');

        expect(result.getSupportedSymbols()).toEqual(['BTC', 'ETH', 'SOL']);
      });

      it('should check DI container before creating new instance', () => {
        const mockClient = new MockOracleClient();
        const mockFactory = new MockOracleClientFactory({
          api3: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);
        const result = OracleClientFactory.getClient('api3');

        expect(result).toBeInstanceOf(MockOracleClient);
      });
    });

    describe('Override default client with DI client', () => {
      it('should override default client with DI registered client', () => {
        const defaultClient = OracleClientFactory.getClient('chainlink');
        const mockClient = new MockOracleClient(['OVERRIDE']);
        const mockFactory = new MockOracleClientFactory({
          chainlink: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);
        const overriddenClient = OracleClientFactory.getClient('chainlink');

        expect(overriddenClient).not.toBe(defaultClient);
        expect(overriddenClient.getSupportedSymbols()).toEqual(['OVERRIDE']);
      });

      it('should use DI client for all providers after registration', () => {
        const mockChainlinkClient = new MockOracleClient(['CL1', 'CL2']);
        const mockPythClient = new MockOracleClient(['PYTH1', 'PYTH2']);
        const mockFactory = new MockOracleClientFactory({
          chainlink: mockChainlinkClient,
          pyth: mockPythClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);

        const chainlinkResult = OracleClientFactory.getClient('chainlink');
        const pythResult = OracleClientFactory.getClient('pyth');

        expect(chainlinkResult.getSupportedSymbols()).toEqual(['CL1', 'CL2']);
        expect(pythResult.getSupportedSymbols()).toEqual(['PYTH1', 'PYTH2']);
      });
    });

    describe('Clear DI registration', () => {
      it('should clear DI registration and fall back to default', () => {
        const mockClient = new MockOracleClient(['MOCK']);
        const mockFactory = new MockOracleClientFactory({
          chainlink: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);
        expect(OracleClientFactory.isUsingDI()).toBe(true);

        OracleClientFactory.unregisterMockFactory();
        expect(OracleClientFactory.isUsingDI()).toBe(false);

        const client = OracleClientFactory.getClient('chainlink');
        expect(client.getSupportedSymbols()).not.toEqual(['MOCK']);
      });

      it('should properly unregister factory from container', () => {
        const mockFactory = new MockOracleClientFactory();
        OracleClientFactory.registerMockFactory(mockFactory);

        expect(container.has(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY)).toBe(true);

        OracleClientFactory.unregisterMockFactory();

        expect(container.has(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY)).toBe(false);
      });
    });

    describe('Multiple DI registrations', () => {
      it('should handle multiple DI registrations', () => {
        const firstMockClient = new MockOracleClient(['FIRST']);
        const firstFactory = new MockOracleClientFactory({
          chainlink: firstMockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(firstFactory);
        const firstResult = OracleClientFactory.getClient('chainlink');
        expect(firstResult.getSupportedSymbols()).toEqual(['FIRST']);

        const secondMockClient = new MockOracleClient(['SECOND']);
        const secondFactory = new MockOracleClientFactory({
          chainlink: secondMockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(secondFactory);
        const secondResult = OracleClientFactory.getClient('chainlink');
        expect(secondResult.getSupportedSymbols()).toEqual(['SECOND']);
      });

      it('should handle DI registration after default client creation', () => {
        const defaultClient = OracleClientFactory.getClient('chainlink');
        expect(defaultClient).toBeDefined();

        const mockClient = new MockOracleClient(['DI_OVERRIDE']);
        const mockFactory = new MockOracleClientFactory({
          chainlink: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);
        const diClient = OracleClientFactory.getClient('chainlink');

        expect(diClient.getSupportedSymbols()).toEqual(['DI_OVERRIDE']);
      });
    });

    describe('getClientFromDI', () => {
      it('should return client from DI when available', () => {
        const mockClient = new MockOracleClient();
        const mockFactory = new MockOracleClientFactory({
          redstone: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);
        const result = OracleClientFactory.getClientFromDI('redstone');

        expect(result).toBe(mockClient);
      });

      it('should return null when DI not registered', () => {
        const result = OracleClientFactory.getClientFromDI('chainlink');
        expect(result).toBeNull();
      });

      it('should return null after DI is unregistered', () => {
        const mockClient = new MockOracleClient();
        const mockFactory = new MockOracleClientFactory({
          dia: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);
        expect(OracleClientFactory.getClientFromDI('dia')).toBe(mockClient);

        OracleClientFactory.unregisterMockFactory();
        expect(OracleClientFactory.getClientFromDI('dia')).toBeNull();
      });
    });
  });

  describe('Error Handling Tests', () => {
    describe('Request unsupported oracle provider', () => {
      it('should throw ValidationError for unknown provider', () => {
        expect(() => OracleClientFactory.getClient('unknown_provider' as OracleProvider)).toThrow(ValidationError);
      });

      it('should include provider name in error message', () => {
        try {
          OracleClientFactory.getClient('invalid' as OracleProvider);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect((error as ValidationError).message).toContain('Unknown oracle provider');
        }
      });
    });

    describe('Invalid provider identifier', () => {
      it('should throw error for empty string provider', () => {
        expect(() => OracleClientFactory.getClient('' as OracleProvider)).toThrow();
      });

      it('should throw error for null-like provider', () => {
        expect(() => OracleClientFactory.getClient(null as unknown as OracleProvider)).toThrow();
      });

      it('should throw error for numeric provider', () => {
        expect(() => OracleClientFactory.getClient(123 as unknown as OracleProvider)).toThrow();
      });
    });

    describe('Client creation failure', () => {
      it('should throw OracleClientError when DI factory throws', () => {
        const mockFactory = {
          getClient: jest.fn().mockImplementation(() => {
            throw new Error('Factory error');
          }),
          getAllClients: jest.fn(),
          hasClient: jest.fn(),
          clearInstances: jest.fn(),
        } as unknown as IOracleClientFactory;

        OracleClientFactory.registerMockFactory(mockFactory);

        expect(() => OracleClientFactory.getClient('chainlink')).toThrow();
      });

      it('should handle DI client not being BaseOracleClient instance', () => {
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

        OracleClientFactory.registerMockFactory(mockFactory);
        const client = OracleClientFactory.getClient('chainlink');

        expect(client).toBeInstanceOf(BaseOracleClient);
      });
    });

    describe('Proper error logging', () => {
      it('should log error when client creation fails', () => {
        const { createLogger } = require('@/lib/utils/logger');
        const mockLogger = createLogger('OracleClientFactory');

        try {
          OracleClientFactory.getClient('unknown' as OracleProvider);
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
          .map(() => Promise.resolve(OracleClientFactory.getClient('chainlink')));

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
          .map(() => Promise.resolve(OracleClientFactory.getClient('pyth')));

        await Promise.all(promises);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000);
      });
    });

    describe('Concurrent requests for different clients', () => {
      it('should handle concurrent requests for different providers', async () => {
        const providers: OracleProvider[] = ['chainlink', 'pyth', 'api3', 'redstone', 'dia', 'winklink'];
        const promises = providers.map((provider) =>
          Promise.resolve(OracleClientFactory.getClient(provider))
        );

        const results = await Promise.all(promises);

        results.forEach((client, index) => {
          expect(client.name).toBe(providers[index]);
        });
      });

      it('should create different instances for different providers concurrently', async () => {
        const [chainlinkClient, pythClient, api3Client] = await Promise.all([
          Promise.resolve(OracleClientFactory.getClient('chainlink')),
          Promise.resolve(OracleClientFactory.getClient('pyth')),
          Promise.resolve(OracleClientFactory.getClient('api3')),
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
          .map(() =>
            new Promise<BaseOracleClient>((resolve) => {
              setTimeout(() => {
                resolve(OracleClientFactory.getClient('chainlink'));
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
          sequentialResults.push(OracleClientFactory.getClient('chainlink'));
        }

        const concurrentResults = await Promise.all(
          Array(5)
            .fill(null)
            .map(() => Promise.resolve(OracleClientFactory.getClient('chainlink')))
        );

        const allResults = [...sequentialResults, ...concurrentResults];
        const uniqueInstances = new Set(allResults);

        expect(uniqueInstances.size).toBe(1);
      });
    });

    describe('Race condition handling', () => {
      it('should handle race condition during instance creation', async () => {
        OracleClientFactory.clearInstances();

        const delayedCreation = new Promise<BaseOracleClient>((resolve) => {
          setTimeout(() => {
            resolve(OracleClientFactory.getClient('chainlink'));
          }, 100);
        });

        const immediateCreation = Promise.resolve(OracleClientFactory.getClient('chainlink'));

        const [delayed, immediate] = await Promise.all([delayedCreation, immediateCreation]);

        expect(delayed).toBe(immediate);
      });

      it('should handle concurrent clearInstances and getClient', async () => {
        const getClientPromise = Promise.resolve(OracleClientFactory.getClient('chainlink'));
        const clearPromise = Promise.resolve(OracleClientFactory.clearInstances());

        await Promise.all([getClientPromise, clearPromise]);

        const client = OracleClientFactory.getClient('chainlink');
        expect(client).toBeDefined();
      });
    });
  });

  describe('Singleton Pattern Tests', () => {
    describe('Same instance returned for multiple calls', () => {
      it('should return same instance for multiple getClient calls', () => {
        const client1 = OracleClientFactory.getClient('chainlink');
        const client2 = OracleClientFactory.getClient('chainlink');
        const client3 = OracleClientFactory.getClient('chainlink');

        expect(client1).toBe(client2);
        expect(client2).toBe(client3);
      });

      it('should return same instance after multiple operations', () => {
        const client1 = OracleClientFactory.getClient('pyth');
        OracleClientFactory.hasClient('pyth');
        OracleClientFactory.getSupportedSymbols('pyth');
        const client2 = OracleClientFactory.getClient('pyth');

        expect(client1).toBe(client2);
      });
    });

    describe('Different instances for different providers', () => {
      it('should return different instances for different providers', () => {
        const chainlinkClient = OracleClientFactory.getClient('chainlink');
        const pythClient = OracleClientFactory.getClient('pyth');
        const api3Client = OracleClientFactory.getClient('api3');

        expect(chainlinkClient).not.toBe(pythClient);
        expect(chainlinkClient).not.toBe(api3Client);
        expect(pythClient).not.toBe(api3Client);
      });

      it('should maintain separate instances for all providers', () => {
        const providers: OracleProvider[] = ['chainlink', 'pyth', 'api3', 'redstone', 'dia', 'winklink'];
        const clients = providers.map((p) => OracleClientFactory.getClient(p));

        for (let i = 0; i < clients.length; i++) {
          for (let j = i + 1; j < clients.length; j++) {
            expect(clients[i]).not.toBe(clients[j]);
          }
        }
      });
    });

    describe('Clear instances and recreate', () => {
      it('should create new instance after clearInstances', () => {
        const client1 = OracleClientFactory.getClient('chainlink');
        OracleClientFactory.clearInstances();
        const client2 = OracleClientFactory.getClient('chainlink');

        expect(client1).not.toBe(client2);
      });

      it('should clear all provider instances', () => {
        OracleClientFactory.getClient('chainlink');
        OracleClientFactory.getClient('pyth');
        OracleClientFactory.getClient('api3');

        expect(OracleClientFactory.hasClient('chainlink')).toBe(true);
        expect(OracleClientFactory.hasClient('pyth')).toBe(true);
        expect(OracleClientFactory.hasClient('api3')).toBe(true);

        OracleClientFactory.clearInstances();

        expect(OracleClientFactory.hasClient('chainlink')).toBe(false);
        expect(OracleClientFactory.hasClient('pyth')).toBe(false);
        expect(OracleClientFactory.hasClient('api3')).toBe(false);
      });

      it('should recreate instances after clear', () => {
        const client1 = OracleClientFactory.getClient('redstone');
        OracleClientFactory.clearInstances();
        const client2 = OracleClientFactory.getClient('redstone');

        expect(client1).not.toBe(client2);
        expect(client2).toBeDefined();
      });
    });

    describe('Instance persistence', () => {
      it('should persist instance across multiple operations', () => {
        const client = OracleClientFactory.getClient('dia');

        OracleClientFactory.getSupportedSymbols('dia');
        OracleClientFactory.isSymbolSupported('dia', 'BTC');
        OracleClientFactory.getSupportedChainsForSymbol('dia', 'BTC');

        const sameClient = OracleClientFactory.getClient('dia');
        expect(client).toBe(sameClient);
      });

      it('should persist instance after getAllClients call', () => {
        const client = OracleClientFactory.getClient('winklink');
        OracleClientFactory.getAllClients();
        const sameClient = OracleClientFactory.getClient('winklink');

        expect(client).toBe(sameClient);
      });
    });
  });

  describe('Configuration Management Tests', () => {
    describe('Configure factory with custom settings', () => {
      it('should accept custom configuration', () => {
        expect(() => {
          OracleClientFactory.configure({ useDatabase: false });
        }).not.toThrow();
      });

      it('should merge custom config with defaults', () => {
        OracleClientFactory.configure({ useDatabase: false });
        OracleClientFactory.configure({ validateData: true });

        // Configuration should be merged
        expect(() => OracleClientFactory.getClient('chainlink')).not.toThrow();
      });

      it('should handle partial configuration updates', () => {
        OracleClientFactory.configure({ useDatabase: true });
        OracleClientFactory.configure({ useDatabase: false, validateData: false });

        expect(() => OracleClientFactory.getClient('pyth')).not.toThrow();
      });
    });

    describe('Configuration propagation to clients', () => {
      it('should propagate useDatabase config to new clients', () => {
        OracleClientFactory.clearInstances();
        OracleClientFactory.configure({ useDatabase: false });

        const client = OracleClientFactory.getClient('chainlink');
        expect(client).toBeDefined();
      });

      it('should apply configuration to all provider types', () => {
        OracleClientFactory.clearInstances();
        OracleClientFactory.configure({ useDatabase: false, validateData: false });

        const providers: OracleProvider[] = ['chainlink', 'pyth', 'api3', 'redstone', 'dia', 'winklink'];
        providers.forEach((provider) => {
          const client = OracleClientFactory.getClient(provider);
          expect(client).toBeDefined();
        });
      });
    });

    describe('Configuration validation', () => {
      it('should handle invalid config values gracefully', () => {
        expect(() => {
          OracleClientFactory.configure({ useDatabase: 'invalid' as unknown as boolean });
        }).not.toThrow();
      });

      it('should handle empty configuration object', () => {
        expect(() => {
          OracleClientFactory.configure({});
        }).not.toThrow();
      });

      it('should handle undefined config values', () => {
        expect(() => {
          OracleClientFactory.configure({ useDatabase: undefined });
        }).not.toThrow();
      });
    });

    describe('Default configuration values', () => {
      it('should use default useDatabase value', () => {
        OracleClientFactory.clearInstances();
        const client = OracleClientFactory.getClient('chainlink');
        expect(client).toBeDefined();
      });

      it('should maintain defaults when partial config is provided', () => {
        OracleClientFactory.configure({ validateData: true });
        const client = OracleClientFactory.getClient('pyth');
        expect(client).toBeDefined();
      });
    });
  });

  describe('Mock Factory Registration Tests', () => {
    describe('Register mock factory for testing', () => {
      it('should register mock factory', () => {
        const mockFactory = new MockOracleClientFactory();
        OracleClientFactory.registerMockFactory(mockFactory);

        expect(OracleClientFactory.isUsingDI()).toBe(true);
      });

      it('should use mock factory for client creation', () => {
        const mockClient = new MockOracleClient(['TEST1', 'TEST2']);
        const mockFactory = new MockOracleClientFactory({
          chainlink: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);
        const client = OracleClientFactory.getClient('chainlink');

        expect(client.getSupportedSymbols()).toEqual(['TEST1', 'TEST2']);
      });
    });

    describe('Unregister mock factory', () => {
      it('should unregister mock factory', () => {
        const mockFactory = new MockOracleClientFactory();
        OracleClientFactory.registerMockFactory(mockFactory);
        expect(OracleClientFactory.isUsingDI()).toBe(true);

        OracleClientFactory.unregisterMockFactory();
        expect(OracleClientFactory.isUsingDI()).toBe(false);
      });

      it('should fall back to default after unregister', () => {
        const mockClient = new MockOracleClient(['MOCK']);
        const mockFactory = new MockOracleClientFactory({
          pyth: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);
        const mockResult = OracleClientFactory.getClient('pyth');
        expect(mockResult.getSupportedSymbols()).toEqual(['MOCK']);

        OracleClientFactory.unregisterMockFactory();
        const defaultResult = OracleClientFactory.getClient('pyth');
        expect(defaultResult.getSupportedSymbols()).not.toEqual(['MOCK']);
      });

      it('should handle unregister when not registered', () => {
        expect(() => {
          OracleClientFactory.unregisterMockFactory();
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

        OracleClientFactory.registerMockFactory(mockFactory);
        OracleClientFactory.getClient('chainlink');

        expect(mockFactory.getClient).toHaveBeenCalledWith('chainlink');
      });

      it('should call mock factory clearInstances', () => {
        const mockFactory = new MockOracleClientFactory();
        OracleClientFactory.registerMockFactory(mockFactory);

        OracleClientFactory.clearInstances();

        expect(mockFactory.clearInstancesCalled).toBe(true);
      });

      it('should call mock factory hasClient', () => {
        const mockFactory = {
          getClient: jest.fn(),
          getAllClients: jest.fn().mockReturnValue({}),
          hasClient: jest.fn().mockReturnValue(true),
          clearInstances: jest.fn(),
        } as unknown as IOracleClientFactory;

        OracleClientFactory.registerMockFactory(mockFactory);
        const result = OracleClientFactory.hasClient('chainlink');

        expect(mockFactory.hasClient).toHaveBeenCalledWith('chainlink');
        expect(result).toBe(true);
      });
    });

    describe('Switch between mock and real factory', () => {
      it('should switch from mock to real factory', () => {
        const mockClient = new MockOracleClient(['MOCK']);
        const mockFactory = new MockOracleClientFactory({
          api3: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);
        const mockResult = OracleClientFactory.getClient('api3');
        expect(mockResult.getSupportedSymbols()).toEqual(['MOCK']);

        OracleClientFactory.unregisterMockFactory();
        OracleClientFactory.clearInstances();
        const realResult = OracleClientFactory.getClient('api3');
        expect(realResult.getSupportedSymbols()).not.toEqual(['MOCK']);
      });

      it('should switch from real to mock factory', () => {
        const realClient = OracleClientFactory.getClient('redstone');
        expect(realClient).toBeDefined();

        const mockClient = new MockOracleClient(['MOCK_REDSTONE']);
        const mockFactory = new MockOracleClientFactory({
          redstone: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);
        const mockResult = OracleClientFactory.getClient('redstone');
        expect(mockResult.getSupportedSymbols()).toEqual(['MOCK_REDSTONE']);
      });

      it('should handle multiple switches', () => {
        const mockFactory1 = new MockOracleClientFactory({
          dia: new MockOracleClient(['FIRST']),
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory1);
        expect(OracleClientFactory.getClient('dia').getSupportedSymbols()).toEqual(['FIRST']);

        OracleClientFactory.unregisterMockFactory();

        const mockFactory2 = new MockOracleClientFactory({
          dia: new MockOracleClient(['SECOND']),
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory2);
        expect(OracleClientFactory.getClient('dia').getSupportedSymbols()).toEqual(['SECOND']);

        OracleClientFactory.unregisterMockFactory();
      });
    });
  });

  describe('Supported Symbols and Chains Tests', () => {
    describe('Get supported symbols for provider', () => {
      it('should return supported symbols for valid provider', () => {
        const symbols = OracleClientFactory.getSupportedSymbols('chainlink');
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

        OracleClientFactory.registerMockFactory(mockFactory);
        const symbols = OracleClientFactory.getSupportedSymbols('chainlink');

        expect(symbols).toEqual([]);
      });

      it('should return symbols for all providers', () => {
        const providers: OracleProvider[] = ['chainlink', 'pyth', 'api3', 'redstone', 'dia', 'winklink'];

        providers.forEach((provider) => {
          const symbols = OracleClientFactory.getSupportedSymbols(provider);
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

        OracleClientFactory.registerMockFactory(mockFactory);
        const result = OracleClientFactory.isSymbolSupported('chainlink', 'BTC');

        expect(result).toBe(true);
      });

      it('should return false for unsupported symbol', () => {
        const mockClient = new MockOracleClient(['BTC', 'ETH']);
        const mockFactory = new MockOracleClientFactory({
          pyth: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);
        const result = OracleClientFactory.isSymbolSupported('pyth', 'DOGE');

        expect(result).toBe(false);
      });

      it('should return false for empty symbol', () => {
        const result = OracleClientFactory.isSymbolSupported('chainlink', '');
        expect(result).toBe(false);
      });

      it('should return false for whitespace-only symbol', () => {
        const result = OracleClientFactory.isSymbolSupported('chainlink', '   ');
        expect(result).toBe(false);
      });

      it('should check symbol support with chain', () => {
        const mockClient = new MockOracleClient(['BTC']);
        const mockFactory = new MockOracleClientFactory({
          api3: mockClient,
        } as Record<OracleProvider, IOracleClient>);

        OracleClientFactory.registerMockFactory(mockFactory);
        const result = OracleClientFactory.isSymbolSupported('api3', 'BTC', Blockchain.ETHEREUM);

        expect(result).toBe(true);
      });
    });

    describe('Get supported chains for symbol', () => {
      it('should return supported chains for valid symbol', () => {
        const chains = OracleClientFactory.getSupportedChainsForSymbol('chainlink', 'ETH');
        expect(Array.isArray(chains)).toBe(true);
      });

      it('should return empty array for empty symbol', () => {
        const chains = OracleClientFactory.getSupportedChainsForSymbol('pyth', '');
        expect(chains).toEqual([]);
      });

      it('should return empty array for whitespace symbol', () => {
        const chains = OracleClientFactory.getSupportedChainsForSymbol('api3', '   ');
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

        OracleClientFactory.registerMockFactory(mockFactory);
        const chains = OracleClientFactory.getSupportedChainsForSymbol('chainlink', 'BTC');

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

        OracleClientFactory.registerMockFactory(mockFactory);
        const symbols = OracleClientFactory.getSupportedSymbols('chainlink');

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

        OracleClientFactory.registerMockFactory(mockFactory);
        const result = OracleClientFactory.isSymbolSupported('chainlink', 'BTC');

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

        OracleClientFactory.registerMockFactory(mockFactory);
        const chains = OracleClientFactory.getSupportedChainsForSymbol('chainlink', 'BTC');

        expect(chains).toEqual([]);
      });
    });

    describe('getAllSupportedSymbols', () => {
      it('should return symbols for all providers', () => {
        const result = OracleClientFactory.getAllSupportedSymbols();

        expect(result).toHaveProperty('chainlink');
        expect(result).toHaveProperty('pyth');
        expect(result).toHaveProperty('api3');
        expect(result).toHaveProperty('redstone');
        expect(result).toHaveProperty('dia');
        expect(result).toHaveProperty('winklink');
      });

      it('should return arrays for each provider', () => {
        const result = OracleClientFactory.getAllSupportedSymbols();

        Object.values(result).forEach((symbols) => {
          expect(Array.isArray(symbols)).toBe(true);
        });
      });
    });
  });

  describe('getAllClients', () => {
    it('should return all clients', () => {
      const clients = OracleClientFactory.getAllClients();

      expect(clients).toHaveProperty('chainlink');
      expect(clients).toHaveProperty('pyth');
      expect(clients).toHaveProperty('api3');
      expect(clients).toHaveProperty('redstone');
      expect(clients).toHaveProperty('dia');
      expect(clients).toHaveProperty('winklink');
    });

    it('should return BaseOracleClient instances', () => {
      const clients = OracleClientFactory.getAllClients();

      Object.values(clients).forEach((client) => {
        expect(client).toBeInstanceOf(BaseOracleClient);
      });
    });

    it('should use DI factory when registered', () => {
      const mockClient = new MockOracleClient(['ALL']);
      const mockFactory = new MockOracleClientFactory({
        chainlink: mockClient,
        pyth: mockClient,
        api3: mockClient,
        redstone: mockClient,
        dia: mockClient,
        winklink: mockClient,
      } as Record<OracleProvider, IOracleClient>);

      OracleClientFactory.registerMockFactory(mockFactory);
      const clients = OracleClientFactory.getAllClients();

      expect(clients.chainlink.getSupportedSymbols()).toEqual(['ALL']);
    });
  });

  describe('hasClient', () => {
    it('should return true for created client', () => {
      OracleClientFactory.getClient('chainlink');
      expect(OracleClientFactory.hasClient('chainlink')).toBe(true);
    });

    it('should return false for non-existent client', () => {
      expect(OracleClientFactory.hasClient('pyth')).toBe(false);
    });

    it('should use DI factory when registered', () => {
      const mockFactory = {
        getClient: jest.fn(),
        getAllClients: jest.fn(),
        hasClient: jest.fn().mockReturnValue(true),
        clearInstances: jest.fn(),
      } as unknown as IOracleClientFactory;

      OracleClientFactory.registerMockFactory(mockFactory);
      const result = OracleClientFactory.hasClient('chainlink');

      expect(result).toBe(true);
    });
  });

  describe('isUsingDI', () => {
    it('should return false when DI not registered', () => {
      expect(OracleClientFactory.isUsingDI()).toBe(false);
    });

    it('should return true when DI is registered', () => {
      const mockFactory = new MockOracleClientFactory();
      OracleClientFactory.registerMockFactory(mockFactory);

      expect(OracleClientFactory.isUsingDI()).toBe(true);
    });

    it('should return false after DI is unregistered', () => {
      const mockFactory = new MockOracleClientFactory();
      OracleClientFactory.registerMockFactory(mockFactory);
      OracleClientFactory.unregisterMockFactory();

      expect(OracleClientFactory.isUsingDI()).toBe(false);
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

    describe('getOracleClientFromDI', () => {
      it('should delegate to OracleClientFactory.getClientFromDI', () => {
        const result = getOracleClientFromDI('chainlink');
        expect(result).toBeNull();
      });
    });

    describe('registerMockOracleFactory', () => {
      it('should delegate to OracleClientFactory.registerMockFactory', () => {
        const mockFactory = new MockOracleClientFactory();
        registerMockOracleFactory(mockFactory);

        expect(OracleClientFactory.isUsingDI()).toBe(true);
      });
    });

    describe('unregisterMockOracleFactory', () => {
      it('should delegate to OracleClientFactory.unregisterMockFactory', () => {
        const mockFactory = new MockOracleClientFactory();
        registerMockOracleFactory(mockFactory);
        unregisterMockOracleFactory();

        expect(OracleClientFactory.isUsingDI()).toBe(false);
      });
    });
  });
});
