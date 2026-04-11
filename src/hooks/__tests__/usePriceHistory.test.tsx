import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { apiClient } from '@/lib/api';

import { usePriceHistory } from '../data/usePriceHistory';

jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockHistoryData = [
  {
    timestamp: Date.now() - 3600000,
    price: 67000,
    volume: 1000000,
  },
  {
    timestamp: Date.now() - 7200000,
    price: 66500,
    volume: 1200000,
  },
  {
    timestamp: Date.now() - 10800000,
    price: 66000,
    volume: 900000,
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

describe('usePriceHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch price history successfully', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { history: mockHistoryData },
    });

    const { result } = renderHook(() => usePriceHistory({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(3);
  });

  it('should not fetch when symbol is empty', async () => {
    const { result } = renderHook(() => usePriceHistory({ symbol: '' }), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('should fetch history with provider filter', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { history: mockHistoryData },
    });

    const { result } = renderHook(
      () => usePriceHistory({ symbol: 'BTC', provider: 'chainlink' }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('provider=chainlink'));
  });

  it('should fetch history with chain filter', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { history: mockHistoryData },
    });

    const { result } = renderHook(
      () => usePriceHistory({ symbol: 'BTC', chain: 'ethereum' }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('chain=ethereum'));
  });

  it('should fetch history with period parameter', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { history: mockHistoryData },
    });

    const { result } = renderHook(
      () => usePriceHistory({ symbol: 'BTC', period: 30 }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('period=30'));
  });

  it('should handle fetch error', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePriceHistory({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should return empty array when no history', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { history: null },
    });

    const { result } = renderHook(() => usePriceHistory({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should combine all parameters in request', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { history: mockHistoryData },
    });

    const { result } = renderHook(
      () =>
        usePriceHistory({
          symbol: 'BTC',
          provider: 'chainlink',
          chain: 'ethereum',
          period: 7,
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const calledUrl = (apiClient.get as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toContain('symbol=BTC');
    expect(calledUrl).toContain('provider=chainlink');
    expect(calledUrl).toContain('chain=ethereum');
    expect(calledUrl).toContain('period=7');
  });
});
