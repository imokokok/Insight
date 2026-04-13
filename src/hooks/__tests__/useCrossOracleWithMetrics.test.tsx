import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';

import { OracleClientFactory } from '@/lib/oracles';
import { type PriceData, type OracleProvider } from '@/types/oracle';

import { useCrossOracleWithMetrics } from '../oracles/useCrossOracleWithMetrics';

jest.mock('@/lib/oracles', () => ({
  OracleClientFactory: {
    getClient: jest.fn(),
  },
  extractBaseSymbol: jest.fn((symbol) => symbol),
}));

const mockPriceData: PriceData = {
  provider: 'chainlink',
  symbol: 'BTC',
  price: 68000,
  timestamp: Date.now(),
  decimals: 8,
  confidence: 0.98,
  source: 'chainlink',
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

describe('useCrossOracleWithMetrics', () => {
  let mockChainlinkClient: { getPrice: jest.Mock };
  let mockPythClient: { getPrice: jest.Mock };

  beforeEach(() => {
    mockChainlinkClient = {
      getPrice: jest.fn(),
    };
    mockPythClient = {
      getPrice: jest.fn(),
    };

    (OracleClientFactory.getClient as jest.Mock).mockImplementation((provider: OracleProvider) => {
      if (provider === 'chainlink') return mockChainlinkClient;
      if (provider === 'pyth') return mockPythClient;
      return { getPrice: jest.fn() };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty priceData when no oracles selected', async () => {
    const { result } = renderHook(
      () =>
        useCrossOracleWithMetrics({
          selectedSymbol: 'BTC',
          selectedOracles: [],
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.priceData).toEqual([]);
  });

  it('should fetch prices from multiple oracles', async () => {
    mockChainlinkClient.getPrice.mockResolvedValue({
      ...mockPriceData,
      provider: 'chainlink',
      price: 68000,
    });
    mockPythClient.getPrice.mockResolvedValue({
      ...mockPriceData,
      provider: 'pyth',
      price: 68050,
    });

    const { result } = renderHook(
      () =>
        useCrossOracleWithMetrics({
          selectedSymbol: 'BTC',
          selectedOracles: ['chainlink', 'pyth'],
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.priceData).toHaveLength(2);
    expect(result.current.priceData[0].provider).toBe('chainlink');
    expect(result.current.priceData[1].provider).toBe('pyth');
  });

  it('should handle partial errors', async () => {
    mockChainlinkClient.getPrice.mockResolvedValue({
      ...mockPriceData,
      provider: 'chainlink',
    });
    mockPythClient.getPrice.mockRejectedValue(new Error('Pyth error'));

    const { result } = renderHook(
      () =>
        useCrossOracleWithMetrics({
          selectedSymbol: 'BTC',
          selectedOracles: ['chainlink', 'pyth'],
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.priceData).toHaveLength(1);
    expect(result.current.isError).toBe(true);
    expect(result.current.errors).toHaveLength(1);
  });

  it('should handle all errors', async () => {
    mockChainlinkClient.getPrice.mockRejectedValue(new Error('Chainlink error'));
    mockPythClient.getPrice.mockRejectedValue(new Error('Pyth error'));

    const { result } = renderHook(
      () =>
        useCrossOracleWithMetrics({
          selectedSymbol: 'BTC',
          selectedOracles: ['chainlink', 'pyth'],
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.priceData).toHaveLength(0);
    expect(result.current.isError).toBe(true);
    expect(result.current.errors).toHaveLength(2);
  });

  it('should not fetch when disabled', async () => {
    renderHook(
      () =>
        useCrossOracleWithMetrics({
          selectedSymbol: 'BTC',
          selectedOracles: ['chainlink'],
          enabled: false,
        }),
      { wrapper: createTestWrapper() }
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockChainlinkClient.getPrice).not.toHaveBeenCalled();
  });

  it('should track lastUpdated timestamp', async () => {
    mockChainlinkClient.getPrice.mockResolvedValue(mockPriceData);

    const { result } = renderHook(
      () =>
        useCrossOracleWithMetrics({
          selectedSymbol: 'BTC',
          selectedOracles: ['chainlink'],
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('should refetch all data', async () => {
    mockChainlinkClient.getPrice.mockResolvedValue(mockPriceData);

    const { result } = renderHook(
      () =>
        useCrossOracleWithMetrics({
          selectedSymbol: 'BTC',
          selectedOracles: ['chainlink'],
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refetchAll();
    });

    expect(mockChainlinkClient.getPrice).toHaveBeenCalledTimes(2);
  });

  it('should calculate performance metrics', async () => {
    mockChainlinkClient.getPrice.mockResolvedValue({
      ...mockPriceData,
      price: 68000,
    });

    const { result } = renderHook(
      () =>
        useCrossOracleWithMetrics({
          selectedSymbol: 'BTC',
          selectedOracles: ['chainlink'],
          useCalculatedMetrics: true,
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.performanceMetrics).toBeDefined();
  });

  it('should clear history', async () => {
    mockChainlinkClient.getPrice.mockResolvedValue(mockPriceData);

    const { result } = renderHook(
      () =>
        useCrossOracleWithMetrics({
          selectedSymbol: 'BTC',
          selectedOracles: ['chainlink'],
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.stats.totalDataPoints).toBe(0);
  });

  it('should recalculate metrics', async () => {
    mockChainlinkClient.getPrice.mockResolvedValue(mockPriceData);

    const { result } = renderHook(
      () =>
        useCrossOracleWithMetrics({
          selectedSymbol: 'BTC',
          selectedOracles: ['chainlink'],
          useCalculatedMetrics: true,
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.recalculateMetrics();
    });

    expect(result.current.performanceMetrics).toBeDefined();
  });

  it('should track response time', async () => {
    mockChainlinkClient.getPrice.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockPriceData), 100);
        })
    );

    const { result } = renderHook(
      () =>
        useCrossOracleWithMetrics({
          selectedSymbol: 'BTC',
          selectedOracles: ['chainlink'],
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.priceData[0].responseTime).toBeGreaterThanOrEqual(0);
  });

  it('should return stats', async () => {
    mockChainlinkClient.getPrice.mockResolvedValue(mockPriceData);

    const { result } = renderHook(
      () =>
        useCrossOracleWithMetrics({
          selectedSymbol: 'BTC',
          selectedOracles: ['chainlink'],
        }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toBeDefined();
    expect(result.current.stats.providerCount).toBe(1);
  });
});
