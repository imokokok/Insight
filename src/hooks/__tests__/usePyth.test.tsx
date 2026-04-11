import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';

import { PythClient } from '@/lib/oracles/pythNetwork';
import { type PriceData, Blockchain } from '@/types/oracle';

import { usePythPrice, usePythHistorical, usePythAllData } from '../oracles/pyth';

jest.mock('@/lib/oracles/pythNetwork', () => ({
  PythClient: jest.fn(),
}));

const mockPriceData: PriceData = {
  provider: 'pyth',
  symbol: 'BTC',
  price: 68000,
  timestamp: Date.now(),
  decimals: 8,
  confidence: 0.98,
  source: 'pyth',
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

describe('usePythPrice', () => {
  let mockClient: { getPrice: jest.Mock };

  beforeEach(() => {
    mockClient = {
      getPrice: jest.fn(),
    };
    (PythClient as jest.Mock).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch price data successfully', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);

    const { result } = renderHook(
      () => usePythPrice({ symbol: 'BTC', chain: Blockchain.ETHEREUM }),
      { wrapper: createTestWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).toEqual(mockPriceData);
    expect(result.current.error).toBeUndefined();
  });

  it('should handle fetch error', async () => {
    mockClient.getPrice.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePythPrice({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.price).toBeUndefined();
  });

  it('should not fetch when disabled', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);

    renderHook(() => usePythPrice({ symbol: 'BTC', enabled: false }), {
      wrapper: createTestWrapper(),
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockClient.getPrice).not.toHaveBeenCalled();
  });

  it('should refetch data', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);

    const { result } = renderHook(() => usePythPrice({ symbol: 'BTC' }), {
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
});

describe('usePythHistorical', () => {
  let mockClient: { getHistoricalPrices: jest.Mock };

  beforeEach(() => {
    mockClient = {
      getHistoricalPrices: jest.fn(),
    };
    (PythClient as jest.Mock).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch historical data successfully', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(() => usePythHistorical({ symbol: 'BTC', period: 30 }), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.historicalData).toHaveLength(2);
    expect(result.current.error).toBeUndefined();
  });

  it('should return empty array when no data', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue([]);

    const { result } = renderHook(() => usePythHistorical({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.historicalData).toEqual([]);
  });

  it('should handle fetch error', async () => {
    mockClient.getHistoricalPrices.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => usePythHistorical({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should use default period of 30', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(() => usePythHistorical({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockClient.getHistoricalPrices).toHaveBeenCalledWith('BTC', undefined, 30);
  });
});

describe('usePythAllData', () => {
  let mockClient: { getPrice: jest.Mock; getHistoricalPrices: jest.Mock };

  beforeEach(() => {
    mockClient = {
      getPrice: jest.fn(),
      getHistoricalPrices: jest.fn(),
    };
    (PythClient as jest.Mock).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch both price and historical data', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(() => usePythAllData({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

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

    const { result } = renderHook(() => usePythAllData({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

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

    const { result } = renderHook(() => usePythAllData({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.errors).toHaveLength(2);
  });

  it('should refetch all data', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(() => usePythAllData({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

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

    renderHook(() => usePythAllData({ symbol: 'BTC', enabled: false }), {
      wrapper: createTestWrapper(),
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockClient.getPrice).not.toHaveBeenCalled();
    expect(mockClient.getHistoricalPrices).not.toHaveBeenCalled();
  });
});
