import { renderHook, act } from '@testing-library/react';

import {
  usePerformanceTracker,
  useComponentPerformance,
  useWebVitalsMonitor,
  useMemoryMonitor,
  usePerformanceReport,
  useLongTaskMonitor,
  useResourceTimingMonitor,
} from '../ui/usePerformanceMetrics';

jest.mock('@vercel/analytics', () => ({
  track: jest.fn(),
}));

jest.mock('@/lib/config/env', () => ({
  env: {
    app: { isProduction: false },
    features: { enableAnalytics: false },
  },
}));

jest.mock('@/lib/monitoring/webVitals', () => ({
  onMetric: jest.fn((callback) => {
    callback({ name: 'FCP', value: 100, rating: 'good' });
    return jest.fn();
  }),
  reportCustomMetric: jest.fn(),
  getPerformanceScore: jest.fn(() => ({ score: 95 })),
  PERFORMANCE_THRESHOLDS: {
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
  },
}));

describe('usePerformanceTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should track operation timing', () => {
    const { result } = renderHook(() => usePerformanceTracker('test-operation'));

    act(() => {
      result.current.start();
    });

    expect(result.current.end()).toBeGreaterThanOrEqual(0);
  });

  it('should return 0 if end is called without start', () => {
    const { result } = renderHook(() => usePerformanceTracker('test-operation'));

    const duration = result.current.end();

    expect(duration).toBe(0);
  });

  it('should measure async operation', async () => {
    const { result } = renderHook(() => usePerformanceTracker('async-operation'));

    const asyncFn = jest.fn().mockResolvedValue('result');

    let asyncResult: string | undefined;
    await act(async () => {
      asyncResult = await result.current.measureAsync(asyncFn);
    });

    expect(asyncResult).toBe('result');
    expect(asyncFn).toHaveBeenCalled();
  });

  it('should handle errors in async operation', async () => {
    const { result } = renderHook(() => usePerformanceTracker('error-operation'));

    const errorFn = jest.fn().mockRejectedValue(new Error('Test error'));

    await expect(
      act(async () => {
        await result.current.measureAsync(errorFn);
      })
    ).rejects.toThrow('Test error');
  });
});

describe('useComponentPerformance', () => {
  it('should track render count', () => {
    const { result, rerender } = renderHook(() => useComponentPerformance('TestComponent'));

    const initialCount = result.current.renderCount;

    rerender();

    expect(result.current.renderCount).toBeGreaterThan(initialCount);
  });

  it('should not track when disabled', () => {
    const { result, rerender } = renderHook(() => useComponentPerformance('TestComponent', false));

    expect(result.current.metrics).toBeNull();

    rerender();

    expect(result.current.metrics).toBeNull();
  });

  it('should track updates', () => {
    const { result } = renderHook(() => useComponentPerformance('TestComponent'));

    act(() => {
      result.current.markUpdate();
    });

    expect(result.current.metrics?.updateCount).toBeGreaterThanOrEqual(1);
  });
});

describe('useWebVitalsMonitor', () => {
  it('should return metrics', () => {
    const { result } = renderHook(() => useWebVitalsMonitor());

    expect(result.current.metrics).toBeDefined();
    expect(result.current.score).toBeDefined();
  });

  it('should get metric by name', () => {
    const { result } = renderHook(() => useWebVitalsMonitor());

    const metric = result.current.getMetricByName('FCP');

    expect(metric).toBeDefined();
    expect(metric?.name).toBe('FCP');
  });

  it('should get rating for value', () => {
    const { result } = renderHook(() => useWebVitalsMonitor());

    expect(result.current.getRating('FCP', 100)).toBe('good');
    expect(result.current.getRating('FCP', 2000)).toBe('needs-improvement');
    expect(result.current.getRating('FCP', 4000)).toBe('poor');
  });
});

describe('useMemoryMonitor', () => {
  const originalPerformance = global.performance;

  beforeEach(() => {
    Object.defineProperty(global, 'performance', {
      value: {
        ...originalPerformance,
        memory: {
          usedJSHeapSize: 10000000,
          totalJSHeapSize: 20000000,
          jsHeapSizeLimit: 50000000,
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'performance', {
      value: originalPerformance,
      writable: true,
      configurable: true,
    });
  });

  it('should return memory info when available', () => {
    const { result } = renderHook(() => useMemoryMonitor());

    expect(result.current).not.toBeNull();
    expect(result.current?.usedJSHeapSize).toBe(10000000);
    expect(result.current?.usagePercentage).toBe(20);
  });

  it('should return null when disabled', () => {
    const { result } = renderHook(() => useMemoryMonitor(false));

    expect(result.current).toBeNull();
  });

  it('should return null when memory API is not available', () => {
    Object.defineProperty(global, 'performance', {
      value: originalPerformance,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useMemoryMonitor());

    expect(result.current).toBeNull();
  });
});

describe('usePerformanceReport', () => {
  it('should generate report', () => {
    const { result } = renderHook(() => usePerformanceReport());

    let report: ReturnType<typeof result.current.generateReport> | undefined;

    act(() => {
      report = result.current.generateReport();
    });

    expect(report).toBeDefined();
    expect(report?.timestamp).toBeDefined();
    expect(report?.url).toBeDefined();
  });

  it('should report operation', () => {
    const { result } = renderHook(() => usePerformanceReport());

    act(() => {
      result.current.reportOperation({
        name: 'test-op',
        startTime: Date.now(),
        duration: 100,
      });
    });

    expect(result.current.report).toBeDefined();
  });
});

describe('useLongTaskMonitor', () => {
  let mockObserver: { observe: jest.Mock; disconnect: jest.Mock };
  let observerCallback: (list: { getEntries: () => PerformanceEntry[] }) => void;

  beforeEach(() => {
    mockObserver = {
      observe: jest.fn(),
      disconnect: jest.fn(),
    };

    (window as { PerformanceObserver?: jest.Mock }).PerformanceObserver = jest.fn((callback) => {
      observerCallback = callback;
      return mockObserver;
    });
  });

  afterEach(() => {
    delete (window as { PerformanceObserver?: jest.Mock }).PerformanceObserver;
  });

  it('should observe long tasks', () => {
    renderHook(() => useLongTaskMonitor());

    expect(mockObserver.observe).toHaveBeenCalledWith({ entryTypes: ['longtask'] });
  });

  it('should collect long tasks', () => {
    const { result } = renderHook(() => useLongTaskMonitor());

    const mockEntry = {
      name: 'long-task',
      entryType: 'longtask',
      startTime: 100,
      duration: 100,
    } as PerformanceEntry;

    act(() => {
      observerCallback({ getEntries: () => [mockEntry] });
    });

    expect(result.current).toContainEqual(mockEntry);
  });

  it('should handle unsupported browser gracefully', () => {
    delete (window as { PerformanceObserver?: jest.Mock }).PerformanceObserver;

    const { result } = renderHook(() => useLongTaskMonitor());

    expect(result.current).toEqual([]);
  });
});

describe('useResourceTimingMonitor', () => {
  const mockResources = [
    {
      name: 'https://example.com/script.js',
      duration: 100,
      transferSize: 5000,
      initiatorType: 'script',
    },
    {
      name: 'https://example.com/style.css',
      duration: 50,
      transferSize: 2000,
      initiatorType: 'stylesheet',
    },
    {
      name: 'https://example.com/image.png',
      duration: 200,
      transferSize: 10000,
      initiatorType: 'image',
    },
  ] as PerformanceResourceTiming[];

  const originalPerformance = global.performance;

  beforeEach(() => {
    Object.defineProperty(global, 'performance', {
      value: {
        ...originalPerformance,
        getEntriesByType: jest.fn().mockReturnValue(mockResources),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'performance', {
      value: originalPerformance,
      writable: true,
      configurable: true,
    });
  });

  it('should return resources', () => {
    const { result } = renderHook(() => useResourceTimingMonitor());

    expect(result.current.resources.length).toBe(3);
  });

  it('should get slow resources', () => {
    const { result } = renderHook(() => useResourceTimingMonitor());

    const slowResources = result.current.getSlowResources(150);

    expect(slowResources.length).toBe(1);
    expect(slowResources[0].name).toBe('https://example.com/image.png');
  });

  it('should get resources by type', () => {
    const { result } = renderHook(() => useResourceTimingMonitor());

    const scripts = result.current.getResourceByType('script');
    const styles = result.current.getResourceByType('stylesheet');
    const images = result.current.getResourceByType('image');

    expect(scripts.length).toBe(1);
    expect(styles.length).toBe(1);
    expect(images.length).toBe(1);
  });
});
