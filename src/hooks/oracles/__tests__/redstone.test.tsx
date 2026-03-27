'use client';

import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import * as storage from '@/lib/oracles/storage';

import { useRedStonePrice, useRedStoneHistorical, useRedStoneAllData } from '../redstone';

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

describe('useRedStonePrice', () => {
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
    const { result } = renderHook(() => useRedStonePrice({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).not.toBeNull();
    expect(result.current.price?.symbol).toBe('BTC');
    expect(result.current.price?.provider).toBe('redstone');
    expect(result.current.error).toBeNull();
  });

  it('should handle different symbols', async () => {
    const { result } = renderHook(() => useRedStonePrice({ symbol: 'ETH' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price?.symbol).toBe('ETH');
  });

  it('should handle chain parameter', async () => {
    const { result } = renderHook(() => useRedStonePrice({ symbol: 'BTC', chain: 'ethereum' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price?.chain).toBe('ethereum');
  });

  it('should respect enabled option', async () => {
    const { result } = renderHook(() => useRedStonePrice({ symbol: 'BTC', enabled: false }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.price).toBeUndefined();
  });

  it('should support refetch', async () => {
    const { result } = renderHook(() => useRedStonePrice({ symbol: 'BTC' }), {
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

describe('useRedStoneHistorical', () => {
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
    const { result } = renderHook(() => useRedStoneHistorical({ symbol: 'BTC', period: 30 }), {
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
    const { result } = renderHook(() => useRedStoneHistorical({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.historicalData.length).toBe(120);
  });

  it('should return prices in chronological order', async () => {
    const { result } = renderHook(() => useRedStoneHistorical({ symbol: 'BTC', period: 24 }), {
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

describe('useRedStoneAllData', () => {
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
    const { result } = renderHook(() => useRedStoneAllData({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).not.toBeNull();
    expect(result.current.historicalData).toBeInstanceOf(Array);
    expect(result.current.networkStats).not.toBeNull();
    expect(result.current.ecosystem).not.toBeNull();
    expect(result.current.riskMetrics).not.toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('should return ecosystem data', async () => {
    const { result } = renderHook(() => useRedStoneAllData({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.ecosystem).toHaveProperty('integrations');
    expect(result.current.ecosystem?.integrations).toBeInstanceOf(Array);
    expect(result.current.ecosystem?.integrations.length).toBeGreaterThan(0);
  });

  it('should return risk metrics data', async () => {
    const { result } = renderHook(() => useRedStoneAllData({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.riskMetrics).toHaveProperty('centralizationRisk');
    expect(result.current.riskMetrics).toHaveProperty('liquidityRisk');
    expect(result.current.riskMetrics).toHaveProperty('technicalRisk');
    expect(result.current.riskMetrics).toHaveProperty('overallRisk');
  });

  it('should combine loading states', async () => {
    const { result } = renderHook(() => useRedStoneAllData({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).not.toBeNull();
    expect(result.current.historicalData.length).toBeGreaterThan(0);
    expect(result.current.networkStats).toHaveProperty('activeNodes');
    expect(result.current.ecosystem).not.toBeNull();
    expect(result.current.riskMetrics).not.toBeNull();
  });

  it('should collect errors from all queries', async () => {
    const { result } = renderHook(() => useRedStoneAllData({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errors).toBeInstanceOf(Array);
  });

  it('should support refetchAll', async () => {
    const { result } = renderHook(() => useRedStoneAllData({ symbol: 'BTC' }), {
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
    const { result } = renderHook(() => useRedStoneAllData({ symbol: 'BTC', enabled: false }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.price).toBeUndefined();
  });

  it('should return lastUpdated from price timestamp', async () => {
    const { result } = renderHook(() => useRedStoneAllData({ symbol: 'BTC' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lastUpdated).not.toBeNull();
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });
});
