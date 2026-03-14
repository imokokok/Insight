import { jest } from '@jest/globals';
import { PriceData, OracleProvider, Blockchain, OracleError } from '@/types/oracle';
import { IMockOracleClient, IOracleClientFactory } from '@/lib/oracles/interfaces';
import { createMockOracleClientBuilder, createMockPriceData } from '@/lib/oracles/__mocks__';

export function createMockPrice(
  symbol: string = 'BTC',
  overrides: Partial<PriceData> = {}
): PriceData {
  return createMockPriceData(symbol, overrides);
}

export function createMockClient(
  provider: OracleProvider = 'chainlink' as OracleProvider,
  options: {
    supportedChains?: Blockchain[];
    prices?: Record<string, PriceData>;
    errors?: Record<string, OracleError>;
    latency?: number;
  } = {}
): IMockOracleClient {
  const builder = createMockOracleClientBuilder()
    .withName(provider)
    .withSupportedChains(options.supportedChains ?? [Blockchain.ETHEREUM]);

  if (options.prices || options.errors || options.latency !== undefined) {
    builder.withMockData({
      prices: options.prices,
      errors: options.errors,
      latency: options.latency,
    });
  }

  return builder.build();
}

export function createMockFactory(
  options: {
    clients?: Partial<Record<OracleProvider, IMockOracleClient>>;
    defaultProvider?: OracleProvider;
  } = {}
): IOracleClientFactory {
  const clients = options.clients ?? {};
  const defaultProvider = options.defaultProvider ?? (OracleProvider.CHAINLINK);

  return {
    getClient: jest.fn((provider: OracleProvider) => {
      if (clients[provider]) {
        return clients[provider]!;
      }
      return createMockClient(provider);
    }),
    getAllClients: jest.fn(() => {
      const allClients: Record<OracleProvider, IMockOracleClient> = {
        [OracleProvider.CHAINLINK]: clients[OracleProvider.CHAINLINK] ?? createMockClient(OracleProvider.CHAINLINK),
        [OracleProvider.BAND_PROTOCOL]: clients[OracleProvider.BAND_PROTOCOL] ?? createMockClient(OracleProvider.BAND_PROTOCOL),
        [OracleProvider.UMA]: clients[OracleProvider.UMA] ?? createMockClient(OracleProvider.UMA),
        [OracleProvider.PYTH]: clients[OracleProvider.PYTH] ?? createMockClient(OracleProvider.PYTH),
        [OracleProvider.API3]: clients[OracleProvider.API3] ?? createMockClient(OracleProvider.API3),
        [OracleProvider.REDSTONE]: clients[OracleProvider.REDSTONE] ?? createMockClient(OracleProvider.REDSTONE),
      };
      return allClients;
    }),
    hasClient: jest.fn((provider: OracleProvider) => provider in clients),
    clearInstances: jest.fn(),
  };
}

export function createMockFetchResponse<T>(data: T, options: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = options;
  return {
    ok,
    status,
    json: jest.fn().mockImplementation(() => Promise.resolve(data)),
    text: jest.fn().mockImplementation(() => Promise.resolve(JSON.stringify(data))),
    blob: jest.fn().mockImplementation(() => Promise.resolve(new Blob([JSON.stringify(data)]))),
    arrayBuffer: jest.fn().mockImplementation(() => Promise.resolve(new ArrayBuffer(0))),
  } as unknown as Response;
}

export function createMockLocalStorage() {
  const store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] ?? null),
  } as unknown as Storage;
}

export function createMockSessionStorage() {
  return createMockLocalStorage();
}

export function mockWindowMatchMedia(matches: boolean = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: unknown) => ({
      matches,
      media: query as string,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

export function mockIntersectionObserver() {
  const mockIntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
  (window as unknown as Record<string, unknown>).IntersectionObserver = mockIntersectionObserver;
  return mockIntersectionObserver;
}

export function mockResizeObserver() {
  const mockResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
  (window as unknown as Record<string, unknown>).ResizeObserver = mockResizeObserver;
  return mockResizeObserver;
}
