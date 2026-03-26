import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useChainlinkPrice,
  useChainlinkHistorical,
  useChainlinkAllData,
} from '../chainlink';
import * as storage from '@/lib/oracles/storage';

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
    return (
      QueryClientProvider({ client: queryClient, children })
    );
  };
};

describe('useChainlinkPrice', () => {
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
    const { result } = renderHook(
      () => useChainlinkPrice({ symbol: 'BTC' }),
      { wrapper: createWrapper(queryClient) }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).not.toBeNull();
    expect(result.current.price?.symbol).toBe('BTC');
    expect(result.current.price?.provider).toBe('chainlink');
    expect(result.current.error).toBeNull();
  });

  it('should handle different symbols', async () => {
    const { result } = renderHook(
      () => useChainlinkPrice({ symbol: 'ETH' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price?.symbol).toBe('ETH');
  });

  it('should handle chain parameter', async () => {
    const { result } = renderHook(
      () => useChainlinkPrice({ symbol: 'BTC', chain: 'ethereum' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price?.chain).toBe('ethereum');
  });

  it('should respect enabled option', async () => {
    const { result } = renderHook(
      () => useChainlinkPrice({ symbol: 'BTC', enabled: false }),
      { wrapper: createWrapper(queryClient) }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.price).toBeUndefined();
  });

  it('should support refetch', async () => {
    const { result } = renderHook(
      () => useChainlinkPrice({ symbol: 'BTC' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstPrice = result.current.price?.price;

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).not.toBeNull();
  });
});

describe('useChainlinkHistorical', () => {
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
    const { result } = renderHook(
      () => useChainlinkHistorical({ symbol: 'BTC', period: 30 }),
      { wrapper: createWrapper(queryClient) }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.historicalData).toBeInstanceOf(Array);
    expect(result.current.historicalData.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });

  it('should use default period of 30', async () => {
    const { result } = renderHook(
      () => useChainlinkHistorical({ symbol: 'BTC' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.historicalData.length).toBe(120);
  });

  it('should handle different periods', async () => {
    const { result: result24 } = renderHook(
      () => useChainlinkHistorical({ symbol: 'BTC', period: 24 }),
      { wrapper: createWrapper(queryClient) }
    );

    const { result: result48 } = renderHook(
      () => useChainlinkHistorical({ symbol: 'BTC', period: 48 }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result24.current.isLoading).toBe(false);
      expect(result48.current.isLoading).toBe(false);
    });

    expect(result24.current.historicalData.length).toBe(96);
    expect(result48.current.historicalData.length).toBe(192);
  });

  it('should return prices in chronological order', async () => {
    const { result } = renderHook(
      () => useChainlinkHistorical({ symbol: 'BTC', period: 24 }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const prices = result.current.historicalData;
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i].timestamp).toBeGreaterThan(prices[i - 1].timestamp);
    }
  });

  it('should support refetch', async () => {
    const { result } = renderHook(
      () => useChainlinkHistorical({ symbol: 'BTC' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.historicalData).toBeInstanceOf(Array);
  });
});

describe('useChainlinkAllData', () => {
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
    const { result } = renderHook(
      () => useChainlinkAllData({ symbol: 'BTC' }),
      { wrapper: createWrapper(queryClient) }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).not.toBeNull();
    expect(result.current.historicalData).toBeInstanceOf(Array);
    expect(result.current.networkStats).not.toBeNull();
    expect(result.current.lastUpdated).not.toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('should combine loading states', async () => {
    const { result } = renderHook(
      () => useChainlinkAllData({ symbol: 'BTC' }),
      { wrapper: createWrapper(queryClient) }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).not.toBeNull();
    expect(result.current.historicalData.length).toBeGreaterThan(0);
    expect(result.current.networkStats).toHaveProperty('activeNodes');
  });

  it('should collect errors from all queries', async () => {
    const { result } = renderHook(
      () => useChainlinkAllData({ symbol: 'BTC' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errors).toBeInstanceOf(Array);
  });

  it('should support refetchAll', async () => {
    const { result } = renderHook(
      () => useChainlinkAllData({ symbol: 'BTC' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstUpdate = result.current.lastUpdated;

    await result.current.refetchAll();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lastUpdated).not.toBeNull();
  });

  it('should handle disabled state', async () => {
    const { result } = renderHook(
      () => useChainlinkAllData({ symbol: 'BTC', enabled: false }),
      { wrapper: createWrapper(queryClient) }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.price).toBeUndefined();
  });
});
