import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';

import { type PriceData, Blockchain } from '@/types/oracle';

const mockPriceData: PriceData = {
  provider: 'chainlink',
  symbol: 'BTC',
  price: 68000,
  timestamp: Date.now(),
  decimals: 8,
  confidence: 0.98,
  source: 'chainlink',
};

const mockHistoricalData: PriceData[] = [
  { ...mockPriceData, price: 67000, timestamp: Date.now() - 3600000 },
  { ...mockPriceData, price: 67500, timestamp: Date.now() - 7200000 },
  { ...mockPriceData, price: 68000, timestamp: Date.now() - 10800000 },
];

const mockClient = {
  getPrice: jest.fn(),
  getHistoricalPrices: jest.fn(),
};

jest.mock('@/lib/oracles/chainlink', () => ({
  ChainlinkClient: jest.fn().mockImplementation(() => mockClient),
}));

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

describe('useChainlink Hooks', () => {
  let useChainlinkPrice: typeof import('../oracles/chainlink').useChainlinkPrice;
  let useChainlinkHistorical: typeof import('../oracles/chainlink').useChainlinkHistorical;
  let useChainlinkAllData: typeof import('../oracles/chainlink').useChainlinkAllData;

  beforeAll(async () => {
    const module = await import('../oracles/chainlink');
    useChainlinkPrice = module.useChainlinkPrice;
    useChainlinkHistorical = module.useChainlinkHistorical;
    useChainlinkAllData = module.useChainlinkAllData;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.getPrice.mockReset();
    mockClient.getHistoricalPrices.mockReset();
  });

  describe('useChainlinkPrice', () => {
    it('should fetch price data successfully', async () => {
      mockClient.getPrice.mockResolvedValue(mockPriceData);

      const { result } = renderHook(
        () => useChainlinkPrice({ symbol: 'BTC', chain: Blockchain.ETHEREUM }),
        { wrapper: createTestWrapper() }
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 }
      );

      expect(result.current.price).toEqual(mockPriceData);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      mockClient.getPrice.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useChainlinkPrice({ symbol: 'BTC' }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 }
      );

      expect(result.current.error).toBeDefined();
    });

    it('should not fetch when disabled', async () => {
      mockClient.getPrice.mockResolvedValue(mockPriceData);

      renderHook(() => useChainlinkPrice({ symbol: 'BTC', enabled: false }), {
        wrapper: createTestWrapper(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockClient.getPrice).not.toHaveBeenCalled();
    });

    it('should refetch data', async () => {
      mockClient.getPrice.mockResolvedValue(mockPriceData);

      const { result } = renderHook(() => useChainlinkPrice({ symbol: 'BTC' }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 }
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockClient.getPrice).toHaveBeenCalled();
    });
  });

  describe('useChainlinkHistorical', () => {
    it('should fetch historical data successfully', async () => {
      mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

      const { result } = renderHook(
        () => useChainlinkHistorical({ symbol: 'BTC', period: 30 }),
        { wrapper: createTestWrapper() }
      );

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 }
      );

      expect(result.current.historicalData).toHaveLength(3);
      expect(result.current.error).toBeNull();
    });

    it('should return empty array when no data', async () => {
      mockClient.getHistoricalPrices.mockResolvedValue([]);

      const { result } = renderHook(() => useChainlinkHistorical({ symbol: 'BTC' }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 }
      );

      expect(result.current.historicalData).toEqual([]);
    });

    it('should handle fetch error', async () => {
      mockClient.getHistoricalPrices.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useChainlinkHistorical({ symbol: 'BTC' }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 }
      );

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useChainlinkAllData', () => {
    it('should fetch both price and historical data', async () => {
      mockClient.getPrice.mockResolvedValue(mockPriceData);
      mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

      const { result } = renderHook(() => useChainlinkAllData({ symbol: 'BTC' }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 10000 }
      );

      expect(result.current.price).toEqual(mockPriceData);
      expect(result.current.historicalData).toHaveLength(3);
      expect(result.current.isError).toBe(false);
      expect(result.current.errors).toHaveLength(0);
    });

    it('should handle partial errors', async () => {
      mockClient.getPrice.mockResolvedValue(mockPriceData);
      mockClient.getHistoricalPrices.mockRejectedValue(new Error('Historical error'));

      const { result } = renderHook(() => useChainlinkAllData({ symbol: 'BTC' }), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 10000 }
      );

      expect(result.current.price).toEqual(mockPriceData);
      expect(result.current.isError).toBe(true);
      expect(result.current.errors).toHaveLength(1);
    });

    it('should not fetch when disabled', async () => {
      mockClient.getPrice.mockResolvedValue(mockPriceData);
      mockClient.getHistoricalPrices.mockResolvedValue(mockHistoricalData);

      renderHook(() => useChainlinkAllData({ symbol: 'BTC', enabled: false }), {
        wrapper: createTestWrapper(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockClient.getPrice).not.toHaveBeenCalled();
      expect(mockClient.getHistoricalPrices).not.toHaveBeenCalled();
    });
  });
});
