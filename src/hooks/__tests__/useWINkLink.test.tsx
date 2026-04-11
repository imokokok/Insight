import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';

import { WINkLinkClient } from '@/lib/oracles';
import { type PriceData, Blockchain } from '@/types/oracle';

import {
  useWINkLinkPrice,
  useWINkLinkHistoricalPrices,
  useWINkLinkAllData,
} from '../oracles/winklink';

jest.mock('@/lib/oracles', () => ({
  WINkLinkClient: jest.fn(),
}));

const mockPriceData: PriceData = {
  provider: 'winklink',
  symbol: 'BTC',
  price: 68000,
  timestamp: Date.now(),
  decimals: 8,
  confidence: 0.96,
  source: 'winklink',
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

describe('useWINkLinkPrice', () => {
  let mockClient: { getPrice: jest.Mock };

  beforeEach(() => {
    mockClient = {
      getPrice: jest.fn(),
    };
    (WINkLinkClient as jest.Mock).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch price data successfully', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);

    const { result } = renderHook(() => useWINkLinkPrice('BTC', Blockchain.ETHEREUM), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockPriceData);
    expect(result.current.isError).toBe(false);
  });

  it('should handle fetch error', async () => {
    mockClient.getPrice.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWINkLinkPrice('BTC'), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
  });

  it('should not fetch when disabled', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);

    renderHook(() => useWINkLinkPrice('BTC', undefined, false), {
      wrapper: createTestWrapper(),
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockClient.getPrice).not.toHaveBeenCalled();
  });
});

describe('useWINkLinkHistoricalPrices', () => {
  let mockClient: { getHistoricalPrices: jest.Mock };

  beforeEach(() => {
    mockClient = {
      getHistoricalPrices: jest.fn(),
    };
    (WINkLinkClient as jest.Mock).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch historical data successfully', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(
      () => useWINkLinkHistoricalPrices('BTC', Blockchain.ETHEREUM, 24),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.isError).toBe(false);
  });

  it('should return empty array when no data', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue([]);

    const { result } = renderHook(() => useWINkLinkHistoricalPrices('BTC'), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should handle fetch error', async () => {
    mockClient.getHistoricalPrices.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useWINkLinkHistoricalPrices('BTC'), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
  });

  it('should use default period of 24', async () => {
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(() => useWINkLinkHistoricalPrices('BTC'), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockClient.getHistoricalPrices).toHaveBeenCalledWith('BTC', undefined, 24);
  });
});

describe('useWINkLinkAllData', () => {
  let mockClient: { getPrice: jest.Mock; getHistoricalPrices: jest.Mock };

  beforeEach(() => {
    mockClient = {
      getPrice: jest.fn(),
      getHistoricalPrices: jest.fn(),
    };
    (WINkLinkClient as jest.Mock).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch both price and historical data', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(() => useWINkLinkAllData({ symbol: 'BTC' }), {
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

    const { result } = renderHook(() => useWINkLinkAllData({ symbol: 'BTC' }), {
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

    const { result } = renderHook(() => useWINkLinkAllData({ symbol: 'BTC' }), {
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

    const { result } = renderHook(() => useWINkLinkAllData({ symbol: 'BTC' }), {
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

    renderHook(() => useWINkLinkAllData({ symbol: 'BTC', enabled: false }), {
      wrapper: createTestWrapper(),
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockClient.getPrice).not.toHaveBeenCalled();
    expect(mockClient.getHistoricalPrices).not.toHaveBeenCalled();
  });

  it('should track lastUpdated timestamp', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(() => useWINkLinkAllData({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('should provide dataStates for individual data sources', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(() => useWINkLinkAllData({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.dataStates).toBeDefined();
    expect(result.current.dataStates.price).toBeDefined();
    expect(result.current.dataStates.historical).toBeDefined();
    expect(result.current.dataStates.price.data).toEqual(mockPriceData);
    expect(result.current.dataStates.historical.data).toEqual(mockHistoricalData);
  });

  it('should allow refetching individual data sources', async () => {
    mockClient.getPrice.mockResolvedValue(mockPriceData);
    mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

    const { result } = renderHook(() => useWINkLinkAllData({ symbol: 'BTC' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.dataStates.price.refetch();
    });

    expect(mockClient.getPrice).toHaveBeenCalledTimes(2);
    expect(mockClient.getHistoricalPrices).toHaveBeenCalledTimes(1);
  });
});
