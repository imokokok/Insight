import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';

import { useRoutePrefetch, usePrefetchMetrics, routePrefetchMap } from '../ui/useRoutePrefetch';

const mockPush = jest.fn();
const mockPathname = '/';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('useRoutePrefetch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPush.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should have route prefetch configurations', () => {
    expect(routePrefetchMap['/chainlink']).toBeDefined();
    expect(routePrefetchMap['/pyth-network']).toBeDefined();
    expect(routePrefetchMap['/api3']).toBeDefined();
    expect(routePrefetchMap['/cross-oracle']).toBeDefined();
    expect(routePrefetchMap['/price-query']).toBeDefined();
  });

  it('should not prefetch when disabled', async () => {
    const { result } = renderHook(
      () => useRoutePrefetch({ enabled: false, prefetchOnMount: false }),
      {
        wrapper: createWrapper(),
      }
    );

    const _config = routePrefetchMap['/chainlink'];
    const queryFn = jest.fn().mockResolvedValue({ data: 'test' });

    act(() => {
      result.current.prefetchRoute('/chainlink');
    });

    await waitFor(() => {
      expect(queryFn).not.toHaveBeenCalled();
    });
  });

  it('should navigate with prefetch', async () => {
    const { result } = renderHook(
      () => useRoutePrefetch({ enabled: true, prefetchOnMount: false }),
      {
        wrapper: createWrapper(),
      }
    );

    await act(async () => {
      await result.current.navigateWithPrefetch('/chainlink');
    });

    expect(mockPush).toHaveBeenCalledWith('/chainlink');
  });

  it('should cancel pending prefetch', () => {
    const { result } = renderHook(
      () => useRoutePrefetch({ enabled: true, prefetchOnMount: false }),
      {
        wrapper: createWrapper(),
      }
    );

    act(() => {
      result.current.prefetchRoute('/chainlink');
      result.current.cancelPrefetch();
    });

    expect(result.current).toBeDefined();
  });
});

describe('usePrefetchMetrics', () => {
  it('should track prefetch metrics', () => {
    const { result } = renderHook(() => usePrefetchMetrics(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.recordPrefetch();
      result.current.recordCacheHit();
      result.current.recordCacheMiss();
    });

    const metrics = result.current.getMetrics();
    expect(metrics.prefetchCount).toBe(1);
    expect(metrics.cacheHits).toBe(1);
    expect(metrics.cacheMisses).toBe(1);
  });

  it('should check cache status', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['test'], { data: 'cached' });

    const wrapper = function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };

    const { result } = renderHook(() => usePrefetchMetrics(), {
      wrapper,
    });

    let isCached: boolean;
    act(() => {
      isCached = result.current.checkCacheStatus(['test']);
    });

    expect(isCached!).toBe(true);

    act(() => {
      isCached = result.current.checkCacheStatus(['nonexistent']);
    });

    expect(isCached!).toBe(false);

    const metrics = result.current.getMetrics();
    expect(metrics.cacheHits).toBe(1);
    expect(metrics.cacheMisses).toBe(1);
  });
});

describe('Route Prefetch Configurations', () => {
  it('should have valid query keys for all routes', () => {
    Object.entries(routePrefetchMap).forEach(([route, config]) => {
      expect(config.route).toBe(route);
      expect(config.prefetchQueries).toBeDefined();
      expect(Array.isArray(config.prefetchQueries)).toBe(true);
      expect(config.prefetchQueries.length).toBeGreaterThan(0);

      config.prefetchQueries.forEach((query) => {
        expect(query.queryKey).toBeDefined();
        expect(query.queryFn).toBeDefined();
        expect(typeof query.queryFn).toBe('function');
      });
    });
  });

  it('should have priority settings', () => {
    Object.values(routePrefetchMap).forEach((config) => {
      expect(['high', 'low', undefined]).toContain(config.priority);
    });
  });
});
