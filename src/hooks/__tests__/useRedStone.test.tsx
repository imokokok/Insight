import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';

import { RedStoneApiError } from '@/lib/errors';
import { type RedStoneClient } from '@/lib/oracles/redstone';
import { type PriceData, Blockchain } from '@/types/oracle';

import { useRedStonePrice, useRedStoneHistorical, useRedStoneAllData } from '../oracles/redstone';

const mockPriceData: PriceData = {
  provider: 'redstone',
  symbol: 'BTC',
  price: 68000,
  timestamp: Date.now(),
  decimals: 8,
  confidence: 0.97,
  source: 'redstone',
};

const mockHistoricalData: PriceData[] = [
  { ...mockPriceData, price: 67000, timestamp: Date.now() - 3600000 },
  { ...mockPriceData, price: 67500, timestamp: Date.now() - 7200000 },
];

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return function TestWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useRedStonePrice', () => {
  let mockClient: { getPrice: jest.Mock };

  beforeEach(() => {
    mockClient = {
      getPrice: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch price data successfully', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);

    const { result } = renderHook(
      () =>
        useRedStonePrice({
          symbol: 'BTC',
          chain: Blockchain.ETHEREUM,
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).toEqual(mockPriceData);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    mockClient.getPrice.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () =>
        useRedStonePrice({
          symbol: 'BTC',
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.price).toBeUndefined();
  });

  it('should not fetch when disabled', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);

    renderHook(
      () =>
        useRedStonePrice({
          symbol: 'BTC',
          enabled: false,
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockClient.getPrice).not.toHaveBeenCalled();
  });

  it('should refetch data', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);

    const { result } = renderHook(
      () =>
        useRedStonePrice({
          symbol: 'BTC',
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockClient.getPrice).toHaveBeenCalledTimes(2);
  });

  it('should handle RedStoneApiError with retryable flag', async () => {
    const apiError = new RedStoneApiError('Rate limit', 'RATE_LIMIT_ERROR', true);
    mockClient.getPrice.mockRejectedValue(apiError);

    const { result } = renderHook(
      () =>
        useRedStonePrice({
          symbol: 'BTC',
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe('useRedStoneHistorical', () => {
  let mockClient: { getHistoricalPrices: jest.Mock };

  beforeEach(() => {
    mockClient = {
      getHistoricalPrices: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch historical data successfully', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(
      () =>
        useRedStoneHistorical({
          symbol: 'BTC',
          period: 30,
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.historicalData).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('should return empty array when no data', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue([]);

    const { result } = renderHook(
      () =>
        useRedStoneHistorical({
          symbol: 'BTC',
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.historicalData).toEqual([]);
  });

  it('should handle fetch error', async () => {
    mockClient.getHistoricalPrices.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(
      () =>
        useRedStoneHistorical({
          symbol: 'BTC',
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should use default period of 30', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(
      () =>
        useRedStoneHistorical({
          symbol: 'BTC',
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockClient.getHistoricalPrices).toHaveBeenCalledWith('BTC', undefined, 30);
  });
});

describe('useRedStoneAllData', () => {
  let mockClient: { getPrice: jest.Mock; getHistoricalPrices: jest.Mock };

  beforeEach(() => {
    mockClient = {
      getPrice: jest.fn(),
      getHistoricalPrices: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch both price and historical data', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(
      () =>
        useRedStoneAllData({
          symbol: 'BTC',
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).toEqual(mockPriceData);
    expect(result.current.historicalData).toHaveLength(2);
    expect(result.current.isError).toBe(false);
    expect(result.current.errors).toHaveLength(0);
  });

  it('should handle partial errors', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);
    mockClient.getHistoricalPrices.mockRejectedValue(new Error('Historical error'));

    const { result } = renderHook(
      () =>
        useRedStoneAllData({
          symbol: 'BTC',
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).toEqual(mockPriceData);
    expect(result.current.isError).toBe(true);
    expect(result.current.errors).toHaveLength(1);
  });

  it('should handle all errors', async () => {
    mockClient.getPrice.mockRejectedValue(new Error('Price error'));
    mockClient.getHistoricalPrices.mockRejectedValue(new Error('Historical error'));

    const { result } = renderHook(
      () =>
        useRedStoneAllData({
          symbol: 'BTC',
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.errors).toHaveLength(2);
  });

  it('should refetch all data', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(
      () =>
        useRedStoneAllData({
          symbol: 'BTC',
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refetchAll();
    });

    expect(mockClient.getPrice).toHaveBeenCalledTimes(2);
    expect(mockClient.getHistoricalPrices).toHaveBeenCalledTimes(2);
  });

  it('should not fetch when disabled', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    renderHook(
      () =>
        useRedStoneAllData({
          symbol: 'BTC',
          enabled: false,
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockClient.getPrice).not.toHaveBeenCalled();
    expect(mockClient.getHistoricalPrices).not.toHaveBeenCalled();
  });

  it('should track lastUpdated timestamp', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(
      () =>
        useRedStoneAllData({
          symbol: 'BTC',
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('should track isFetching state', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(
      () =>
        useRedStoneAllData({
          symbol: 'BTC',
          client: mockClient as unknown as RedStoneClient,
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isFetching).toBe(false);
  });
});
