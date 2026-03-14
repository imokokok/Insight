import { vi } from 'vitest';
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
    getClient: vi.fn((provider: OracleProvider) => {
      if (clients[provider]) {
        return clients[provider]!;
      }
      return createMockClient(provider);
    }),
    getAllClients: vi.fn(() => {
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
    hasClient: vi.fn((provider: OracleProvider) => provider in clients),
    clearInstances: vi.fn(),
  };
}

export function createMockFetchResponse<T>(data: T, options: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = options;
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    blob: vi.fn().mockResolvedValue(new Blob([JSON.stringify(data)])),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  } as unknown as Response;
}

export function createMockLocalStorage() {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  } as unknown as Storage;
}

export function createMockSessionStorage() {
  return createMockLocalStorage();
}

export function mockWindowMatchMedia(matches: boolean = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

export function mockIntersectionObserver() {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  });
  window.IntersectionObserver = mockIntersectionObserver;
  return mockIntersectionObserver;
}

export function mockResizeObserver() {
  const mockResizeObserver = vi.fn();
  mockResizeObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  });
  window.ResizeObserver = mockResizeObserver;
  return mockResizeObserver;
}
