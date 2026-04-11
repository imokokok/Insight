import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { apiClient } from '@/lib/api';

import { useOraclePrices } from '../data/useOraclePrices';

jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockPriceData = [
  {
    provider: 'chainlink',
    symbol: 'BTC',
    price: 68000,
    timestamp: Date.now(),
    decimals: 8,
  },
  {
    provider: 'pyth',
    symbol: 'ETH',
    price: 3500,
    timestamp: Date.now(),
    decimals: 8,
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

describe('useOraclePrices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch oracle prices successfully', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { prices: mockPriceData },
    });

    const { result } = renderHook(() => useOraclePrices(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].symbol).toBe('BTC');
  });

  it('should fetch prices with provider filter', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { prices: [mockPriceData[0]] },
    });

    const { result } = renderHook(() => useOraclePrices({ provider: 'chainlink' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('provider=chainlink'));
  });

  it('should fetch prices with symbols filter', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { prices: mockPriceData },
    });

    const { result } = renderHook(() => useOraclePrices({ symbols: ['BTC', 'ETH'] }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('symbols=BTC%2CETH'));
  });

  it('should fetch prices with chain filter', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { prices: mockPriceData },
    });

    const { result } = renderHook(() => useOraclePrices({ chain: 'ethereum' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('chain=ethereum'));
  });

  it('should handle fetch error', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOraclePrices(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should return empty array when no prices', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { prices: null },
    });

    const { result } = renderHook(() => useOraclePrices(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should combine all filters in request', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { prices: mockPriceData },
    });

    const { result } = renderHook(
      () =>
        useOraclePrices({
          provider: 'chainlink',
          symbols: ['BTC'],
          chain: 'ethereum',
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const calledUrl = (apiClient.get as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toContain('provider=chainlink');
    expect(calledUrl).toContain('symbols=BTC');
    expect(calledUrl).toContain('chain=ethereum');
  });
});
