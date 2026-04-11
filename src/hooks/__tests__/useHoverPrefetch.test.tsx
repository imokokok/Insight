import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';

import { useHoverPrefetch, useHoverPrefetchHandlers } from '../ui/useHoverPrefetch';

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

describe('useHoverPrefetch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not prefetch when disabled', async () => {
    const queryFn = jest.fn().mockResolvedValue({ data: 'test' });
    const { result } = renderHook(() => useHoverPrefetch({ enabled: false }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.prefetch({
        queryKey: ['test'],
        queryFn,
      });
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(queryFn).not.toHaveBeenCalled();
    });
  });

  it('should prefetch after delay', async () => {
    const queryFn = jest.fn().mockResolvedValue({ data: 'test' });
    const { result } = renderHook(() => useHoverPrefetch({ delay: 100 }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.prefetch({
        queryKey: ['test'],
        queryFn,
      });
    });

    expect(queryFn).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalled();
    });
  });

  it('should cancel pending prefetch', async () => {
    const queryFn = jest.fn().mockResolvedValue({ data: 'test' });
    const { result } = renderHook(() => useHoverPrefetch({ delay: 100 }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.prefetch({
        queryKey: ['test'],
        queryFn,
      });
    });

    act(() => {
      result.current.cancelPrefetch();
    });

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(queryFn).not.toHaveBeenCalled();
    });
  });

  it('should call onSuccess callback', async () => {
    const queryFn = jest.fn().mockResolvedValue({ data: 'test' });
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useHoverPrefetch({ delay: 0, onSuccess }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.prefetch({
        queryKey: ['test'],
        queryFn,
      });
    });

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('should call onError callback on failure', async () => {
    const error = new Error('Test error');
    const queryFn = jest.fn().mockRejectedValue(error);
    const onError = jest.fn();

    // Create a new QueryClient for each test to avoid cache issues
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };

    const { result } = renderHook(() => useHoverPrefetch({ delay: 0, onError }), {
      wrapper,
    });

    await act(async () => {
      result.current.prefetch({
        queryKey: ['test-error-unique'],
        queryFn,
      });
      // Advance timers to trigger setTimeout callback
      await jest.advanceTimersByTimeAsync(10);
    });

    // Wait for the async operation inside setTimeout to complete
    await waitFor(
      () => {
        expect(onError).toHaveBeenCalledWith(error);
      },
      { timeout: 3000 }
    );
  });
});

describe('useHoverPrefetchHandlers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return mouse event handlers', () => {
    const queryFn = jest.fn().mockResolvedValue({ data: 'test' });
    const { result } = renderHook(
      () =>
        useHoverPrefetchHandlers({
          queryKey: ['test'],
          queryFn,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.onMouseEnter).toBeDefined();
    expect(result.current.onMouseLeave).toBeDefined();
    expect(result.current.isPrefetching).toBe(false);
  });

  it('should prefetch on mouse enter', async () => {
    const queryFn = jest.fn().mockResolvedValue({ data: 'test' });
    const { result } = renderHook(
      () =>
        useHoverPrefetchHandlers(
          {
            queryKey: ['test'],
            queryFn,
          },
          { delay: 0 }
        ),
      {
        wrapper: createWrapper(),
      }
    );

    act(() => {
      result.current.onMouseEnter();
    });

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalled();
    });
  });

  it('should cancel prefetch on mouse leave', async () => {
    const queryFn = jest.fn().mockResolvedValue({ data: 'test' });
    const { result } = renderHook(
      () =>
        useHoverPrefetchHandlers(
          {
            queryKey: ['test'],
            queryFn,
          },
          { delay: 100 }
        ),
      {
        wrapper: createWrapper(),
      }
    );

    act(() => {
      result.current.onMouseEnter();
    });

    act(() => {
      result.current.onMouseLeave();
    });

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(queryFn).not.toHaveBeenCalled();
    });
  });
});
