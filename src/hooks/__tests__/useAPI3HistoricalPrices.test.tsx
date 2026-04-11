import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';

import { API3Client } from '@/lib/oracles/api3';
import { type PriceData, Blockchain } from '@/types/oracle';

import { useAPI3HistoricalPrices, type TimeRange } from '../api3/useAPI3HistoricalPrices';

jest.mock('@/lib/oracles/api3', () => ({
  API3Client: jest.fn(),
}));

const mockHistoricalData: PriceData[] = [
  {
    provider: 'api3',
    symbol: 'BTC',
    price: 67000,
    timestamp: Date.now() - 3600000,
    decimals: 8,
    source: 'api3',
  },
  {
    provider: 'api3',
    symbol: 'BTC',
    price: 67500,
    timestamp: Date.now() - 7200000,
    decimals: 8,
    source: 'api3',
  },
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

describe('useAPI3HistoricalPrices', () => {
  let mockClient: { getHistoricalPrices: jest.Mock };

  beforeEach(() => {
    mockClient = {
      getHistoricalPrices: jest.fn(),
    };
    (API3Client as jest.Mock).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch historical data successfully', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(
      () => useAPI3HistoricalPrices({ symbol: 'BTC', timeRange: '24h' }),
      { wrapper: createTestWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.error).toBeUndefined();
  });

  it('should return empty array when no data', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue([]);

    const { result } = renderHook(() => useAPI3HistoricalPrices({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should handle fetch error', async () => {
    mockClient.getHistoricalPrices.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useAPI3HistoricalPrices({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should not fetch when disabled', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    renderHook(() => useAPI3HistoricalPrices({ symbol: 'BTC', enabled: false }), {
      wrapper: createTestWrapper(),
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockClient.getHistoricalPrices).not.toHaveBeenCalled();
  });

  it('should refetch data', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(() => useAPI3HistoricalPrices({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockClient.getHistoricalPrices).toHaveBeenCalledTimes(2);
  });

  it('should use default timeRange of 24h', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(() => useAPI3HistoricalPrices({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockClient.getHistoricalPrices).toHaveBeenCalledWith('BTC', undefined, 24);
  });

  it.each([
    ['1h', 1],
    ['24h', 24],
    ['7d', 168],
    ['30d', 720],
    ['90d', 2160],
  ] as [TimeRange, number][])(
    'should map timeRange %s to period %d',
    async (timeRange, expectedPeriod) => {
      mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

      const { result } = renderHook(() => useAPI3HistoricalPrices({ symbol: 'BTC', timeRange }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockClient.getHistoricalPrices).toHaveBeenCalledWith('BTC', undefined, expectedPeriod);
    }
  );

  it('should pass chain parameter to client', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(
      () => useAPI3HistoricalPrices({ symbol: 'BTC', chain: Blockchain.ETHEREUM }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockClient.getHistoricalPrices).toHaveBeenCalledWith(
      'BTC',
      Blockchain.ETHEREUM,
      expect.any(Number)
    );
  });
});
