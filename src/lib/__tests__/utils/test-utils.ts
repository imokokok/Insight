/**
 * Test utilities for Insight project
 * Provides common testing helpers and mock data generators
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BaseOracleClient } from '@/lib/oracles/base';
import { PriceData, Blockchain, OracleProvider } from '@/types/oracle';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';

/**
 * Create a test QueryClient with default options
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
}

/**
 * Wrapper component for React Query testing
 */
export function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

/**
 * Render a component with QueryClient provider
 */
export function renderWithQueryClient(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const queryClient = createTestQueryClient();
  const Wrapper = createWrapper(queryClient);

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  };
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random hex string
 */
export function generateRandomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a random Ethereum address
 */
export function generateRandomAddress(): string {
  return `0x${generateRandomHex(40)}`;
}

/**
 * Mock fetch response
 */
export function mockFetchResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response);
}

/**
 * Mock fetch error
 */
export function mockFetchError(message: string, status = 500) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(message),
  } as Response);
}

/**
 * Mock fetch function globally
 */
export function mockFetch(mockImplementation: typeof fetch) {
  global.fetch = mockImplementation;
}

/**
 * Restore original fetch
 */
export function restoreFetch() {
  if (typeof global !== 'undefined' && global.fetch) {
    jest.restoreAllMocks();
  }
}

/**
 * Calculate coefficient of variation
 */
export function calculateCoefficientOfVariation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return stdDev / mean;
}

/**
 * Check if array is sorted in ascending order
 */
export function isSortedAscending<T>(arr: T[], key?: keyof T): boolean {
  for (let i = 1; i < arr.length; i++) {
    const prev = key ? (arr[i - 1] as T)[key] : arr[i - 1];
    const curr = key ? (arr[i] as T)[key] : arr[i];
    if (prev > curr) return false;
  }
  return true;
}

/**
 * Check if array is sorted in descending order
 */
export function isSortedDescending<T>(arr: T[], key?: keyof T): boolean {
  for (let i = 1; i < arr.length; i++) {
    const prev = key ? (arr[i - 1] as T)[key] : arr[i - 1];
    const curr = key ? (arr[i] as T)[key] : arr[i];
    if (prev < curr) return false;
  }
  return true;
}

/**
 * Mock Oracle Client for testing
 */
export class MockOracleClient extends BaseOracleClient {
  name: OracleProvider = 'chainlink';
  supportedChains: Blockchain[] = [Blockchain.ETHEREUM, Blockchain.POLYGON];

  private mockPrice: PriceData = {
    provider: 'chainlink',
    symbol: 'BTC',
    price: 68000,
    timestamp: Date.now(),
    decimals: 8,
    confidence: 0.98,
  };

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    return { ...this.mockPrice, symbol, chain };
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number
  ): Promise<PriceData[]> {
    const prices: PriceData[] = [];
    for (let i = 0; i < (period || 24); i++) {
      prices.push({
        provider: 'chainlink',
        symbol,
        chain,
        price: 68000 + i * 100,
        timestamp: Date.now() - i * 3600000,
        decimals: 8,
        confidence: 0.98,
      });
    }
    return prices;
  }
}

/**
 * Create a mock oracle client with custom configuration
 */
export function createMockOracleClient(
  provider: OracleProvider = 'chainlink',
  options?: {
    basePrice?: number;
    symbol?: string;
    supportedChains?: Blockchain[];
  }
): MockOracleClient {
  const client = new MockOracleClient();
  client.name = provider;

  if (options?.supportedChains) {
    client.supportedChains = options.supportedChains;
  }

  return client;
}

/**
 * Wait for loading state to finish
 */
export async function waitForLoadingToFinish(
  queryClient: QueryClient,
  timeout = 1000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const isFetching = queryClient.isFetching();
    if (isFetching === 0) {
      return;
    }
    await wait(10);
  }

  throw new Error('Timeout waiting for loading to finish');
}

/**
 * Create mock price data
 */
export function createMockPriceData(overrides?: Partial<PriceData>): PriceData {
  return {
    provider: 'chainlink',
    symbol: 'BTC',
    price: 68000,
    timestamp: Date.now(),
    decimals: 8,
    confidence: 0.98,
    ...overrides,
  };
}

/**
 * Create mock historical price data
 */
export function createMockHistoricalPriceData(
  symbol: string,
  count: number,
  basePrice: number = 68000
): PriceData[] {
  return Array.from({ length: count }, (_, i) => ({
    provider: 'chainlink',
    symbol,
    price: basePrice + (Math.random() - 0.5) * basePrice * 0.02,
    timestamp: Date.now() - i * 3600000,
    decimals: 8,
    confidence: 0.95 + Math.random() * 0.05,
  }));
}
