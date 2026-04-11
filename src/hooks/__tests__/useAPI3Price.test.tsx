import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';

import { API3Client } from '@/lib/oracles/api3';
import { type PriceData, Blockchain } from '@/types/oracle';

import { useAPI3Price } from '../api3/useAPI3Price';

jest.mock('@/lib/oracles/api3', () => ({
  API3Client: jest.fn(),
}));

const mockPriceData: PriceData = {
  provider: 'api3',
  symbol: 'BTC',
  price: 68000,
  timestamp: Date.now(),
  decimals: 8,
  confidence: 0.98,
  source: 'api3',
};

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

describe('useAPI3Price', () => {
  let mockClient: { getPrice: jest.Mock };

  beforeEach(() => {
    mockClient = {
      getPrice: jest.fn(),
    };
    (API3Client as jest.Mock).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch price data successfully', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);

    const { result } = renderHook(
      () => useAPI3Price({ symbol: 'BTC', chain: Blockchain.ETHEREUM }),
      { wrapper: createTestWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockPriceData);
    expect(result.current.error).toBeUndefined();
  });

  it('should handle fetch error', async () => {
    mockClient.getPrice.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAPI3Price({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it('should not fetch when disabled', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);

    renderHook(() => useAPI3Price({ symbol: 'BTC', enabled: false }), {
      wrapper: createTestWrapper(),
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockClient.getPrice).not.toHaveBeenCalled();
  });

  it('should refetch data', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);

    const { result } = renderHook(() => useAPI3Price({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockClient.getPrice).toHaveBeenCalledTimes(2);
  });

  it('should use custom refreshInterval', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);

    const { result } = renderHook(
      () => useAPI3Price({ symbol: 'BTC', refreshInterval: 5000 }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockPriceData);
  });

  it('should pass chain parameter to client', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);

    const { result } = renderHook(
      () => useAPI3Price({ symbol: 'BTC', chain: Blockchain.ETHEREUM }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockClient.getPrice).toHaveBeenCalledWith('BTC', Blockchain.ETHEREUM);
  });
});
