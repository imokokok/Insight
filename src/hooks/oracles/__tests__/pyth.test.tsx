'use client';

import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import * as storage from '@/lib/oracles/storage';

import { usePythPrice, usePythHistorical, usePythAllData } from '../pyth';

jest.mock('@/lib/oracles/storage', () => ({
  shouldUseDatabase: jest.fn(),
  savePriceToDatabase: jest.fn(),
  savePricesToDatabase: jest.fn(),
  getPriceFromDatabase: jest.fn(),
  getHistoricalPricesFromDatabase: jest.fn(),
  configureStorage: jest.fn(),
  getStorageConfig: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  getServerQueries: jest.fn(),
}));

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('usePythPrice', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    jest.clearAllMocks();
    (storage.shouldUseDatabase as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch price data successfully', async () => {
    const { result } = renderHook(() => usePythPrice({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).not.toBeNull();
    expect(result.current.price?.symbol).toBe('BTC');
    expect(result.current.price?.provider).toBe('pyth');
    expect(result.current.error).toBeNull();
  });

  it('should handle different symbols', async () => {
    const { result } = renderHook(() => usePythPrice({ symbol: 'ETH' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price?.symbol).toBe('ETH');
  });

  it('should handle chain parameter', async () => {
    const { result } = renderHook(() => usePythPrice({ symbol: 'BTC', chain: 'ethereum' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price?.chain).toBe('ethereum');
  });

  it('should respect enabled option', async () => {
    const { result } = renderHook(() => usePythPrice({ symbol: 'BTC', enabled: false }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.price).toBeUndefined();
  });

  it('should support refetch', async () => {
    const { result } = renderHook(() => usePythPrice({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).not.toBeNull();
  });
});

describe('usePythHistorical', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    jest.clearAllMocks();
    (storage.shouldUseDatabase as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch historical data successfully', async () => {
    const { result } = renderHook(() => usePythHistorical({ symbol: 'BTC', period: 30 }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.historicalData).toBeInstanceOf(Array);
    expect(result.current.historicalData.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });

  it('should use default period of 30', async () => {
    const { result } = renderHook(() => usePythHistorical({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.historicalData.length).toBe(120);
  });

  it('should return prices in chronological order', async () => {
    const { result } = renderHook(() => usePythHistorical({ symbol: 'BTC', period: 24 }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const prices = result.current.historicalData;
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i].timestamp).toBeGreaterThan(prices[i - 1].timestamp);
    }
  });
});

describe('usePythAllData', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    jest.clearAllMocks();
    (storage.shouldUseDatabase as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch all data successfully', async () => {
    const { result } = renderHook(() => usePythAllData({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).not.toBeNull();
    expect(result.current.historicalData).toBeInstanceOf(Array);
    expect(result.current.networkStats).not.toBeNull();
    expect(result.current.publishers).toBeInstanceOf(Array);
    expect(result.current.validators).toBeInstanceOf(Array);
    expect(result.current.isError).toBe(false);
  });

  it('should return publisher data', async () => {
    const { result } = renderHook(() => usePythAllData({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.publishers.length).toBeGreaterThan(0);
    expect(result.current.publishers[0]).toHaveProperty('id');
    expect(result.current.publishers[0]).toHaveProperty('name');
    expect(result.current.publishers[0]).toHaveProperty('stake');
    expect(result.current.publishers[0]).toHaveProperty('accuracy');
  });

  it('should return validator data', async () => {
    const { result } = renderHook(() => usePythAllData({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.validators.length).toBeGreaterThan(0);
    expect(result.current.validators[0]).toHaveProperty('id');
    expect(result.current.validators[0]).toHaveProperty('name');
    expect(result.current.validators[0]).toHaveProperty('stake');
    expect(result.current.validators[0]).toHaveProperty('status');
  });

  it('should combine loading states', async () => {
    const { result } = renderHook(() => usePythAllData({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).not.toBeNull();
    expect(result.current.historicalData.length).toBeGreaterThan(0);
    expect(result.current.networkStats).toHaveProperty('activeNodes');
    expect(result.current.publishers.length).toBeGreaterThan(0);
    expect(result.current.validators.length).toBeGreaterThan(0);
  });

  it('should collect errors from all queries', async () => {
    const { result } = renderHook(() => usePythAllData({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errors).toBeInstanceOf(Array);
  });

  it('should support refetchAll', async () => {
    const { result } = renderHook(() => usePythAllData({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.refetchAll();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).not.toBeNull();
  });

  it('should handle disabled state', async () => {
    const { result } = renderHook(() => usePythAllData({ symbol: 'BTC', enabled: false }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.price).toBeUndefined();
  });
});
