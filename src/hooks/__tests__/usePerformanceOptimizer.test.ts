import { renderHook, act } from '@testing-library/react';

import {
  useWebVitalsOptimizer,
  useResourceOptimizer,
  useNavigationOptimizer,
  useLazyLoadOptimizer,
  useRouteOptimizer,
  useMemoryOptimizer,
  usePerformanceOptimizer,
} from '../ui/usePerformanceOptimizer';

const originalPerformance = global.performance;

const mockPerformanceWithObserver = () => {
  const mockObserver = {
    observe: jest.fn(),
    disconnect: jest.fn(),
  };
  (window as { PerformanceObserver?: jest.Mock }).PerformanceObserver = jest.fn(
    () => mockObserver
  );
  return mockObserver;
};

describe('useWebVitalsOptimizer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(global, 'performance', {
      value: {
        ...originalPerformance,
        getEntriesByType: jest.fn().mockReturnValue([]),
      },
      writable: true,
      configurable: true,
    });
    mockPerformanceWithObserver();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (window as { PerformanceObserver?: jest.Mock }).PerformanceObserver;
    Object.defineProperty(global, 'performance', {
      value: originalPerformance,
      writable: true,
      configurable: true,
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useWebVitalsOptimizer());

    expect(result.current.metrics).toEqual({});
    expect(result.current.isOptimized).toBe(true);
  });

  it('should generate optimization suggestions', () => {
    const { result } = renderHook(() => useWebVitalsOptimizer());

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(Array.isArray(result.current.suggestions)).toBe(true);
  });

  it('should calculate score', () => {
    const { result } = renderHook(() => useWebVitalsOptimizer());

    const score = result.current.getScore();

    expect(score).toBe(100);
  });
});

describe('useResourceOptimizer', () => {
  const mockResources = [
    {
      name: 'https://example.com/script.js',
      duration: 100,
      transferSize: 5000,
      initiatorType: 'script',
    },
    {
      name: 'https://example.com/slow-script.js',
      duration: 1500,
      transferSize: 10000,
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
    const { result } = renderHook(() => useResourceOptimizer());

    expect(result.current.resources.length).toBe(4);
  });

  it('should identify slow resources', () => {
    const { result } = renderHook(() => useResourceOptimizer());

    expect(result.current.slowResources.length).toBe(1);
    expect(result.current.slowResources[0].duration).toBe(1500);
  });

  it('should calculate total size', () => {
    const { result } = renderHook(() => useResourceOptimizer());

    expect(result.current.totalSize).toBe(27000);
  });

  it('should calculate total duration', () => {
    const { result } = renderHook(() => useResourceOptimizer());

    expect(result.current.totalDuration).toBe(1850);
  });

  it('should count scripts and images', () => {
    const { result } = renderHook(() => useResourceOptimizer());

    expect(result.current.scriptCount).toBe(2);
    expect(result.current.imageCount).toBe(1);
  });
});

describe('useNavigationOptimizer', () => {
  const mockNavigation = {
    startTime: 0,
    domainLookupStart: 10,
    domainLookupEnd: 20,
    connectStart: 20,
    connectEnd: 50,
    requestStart: 50,
    responseEnd: 200,
    responseStart: 150,
    domComplete: 500,
    loadEventEnd: 600,
  } as PerformanceNavigationTiming;

  beforeEach(() => {
    Object.defineProperty(global, 'performance', {
      value: {
        ...originalPerformance,
        getEntriesByType: jest.fn().mockReturnValue([mockNavigation]),
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

  it('should return navigation timing', () => {
    const { result } = renderHook(() => useNavigationOptimizer());

    expect(result.current.timing).toBeDefined();
    expect(result.current.timing?.dnsLookup).toBe(10);
    expect(result.current.timing?.tcpConnection).toBe(30);
    expect(result.current.timing?.serverResponse).toBe(150);
  });

  it('should identify bottleneck', () => {
    const { result } = renderHook(() => useNavigationOptimizer());

    expect(result.current.bottleneck).toBeDefined();
    expect(result.current.bottleneck?.name).toBeDefined();
    expect(result.current.bottleneck?.duration).toBeDefined();
  });

  it('should identify slow navigation', () => {
    const { result } = renderHook(() => useNavigationOptimizer());

    expect(typeof result.current.isSlow).toBe('boolean');
  });
});

describe('useLazyLoadOptimizer', () => {
  let mockObserver: {
    observe: jest.Mock;
    unobserve: jest.Mock;
    disconnect: jest.Mock;
  };
  let observerCallback: (entries: IntersectionObserverEntry[]) => void;

  beforeEach(() => {
    mockObserver = {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    };

    (window as { IntersectionObserver?: jest.Mock }).IntersectionObserver = jest.fn(
      (callback) => {
        observerCallback = callback;
        return mockObserver;
      }
    );
  });

  afterEach(() => {
    delete (window as { IntersectionObserver?: jest.Mock }).IntersectionObserver;
  });

  it('should observe elements', () => {
    const { result } = renderHook(() => useLazyLoadOptimizer());

    const element = document.createElement('div');

    act(() => {
      result.current.observe(element, 'test-id');
    });

    expect(mockObserver.observe).toHaveBeenCalledWith(element);
  });

  it('should track visible elements', () => {
    const { result } = renderHook(() => useLazyLoadOptimizer());

    const element = document.createElement('div');

    act(() => {
      result.current.observe(element, 'test-id');
    });

    act(() => {
      observerCallback([
        {
          target: element,
          isIntersecting: true,
        } as IntersectionObserverEntry,
      ]);
    });

    expect(result.current.isVisible('test-id')).toBe(true);
  });

  it('should unobserve elements', () => {
    const { result } = renderHook(() => useLazyLoadOptimizer());

    const element = document.createElement('div');

    act(() => {
      result.current.observe(element, 'test-id');
    });

    act(() => {
      result.current.unobserve(element);
    });

    expect(mockObserver.unobserve).toHaveBeenCalledWith(element);
  });

  it('should disconnect on unmount', () => {
    const { unmount } = renderHook(() => useLazyLoadOptimizer());

    unmount();

    expect(mockObserver.disconnect).toHaveBeenCalled();
  });
});

describe('useRouteOptimizer', () => {
  const mockUsePathname = jest.fn();

  jest.mock('next/navigation', () => ({
    usePathname: () => mockUsePathname(),
  }));

  beforeEach(() => {
    mockUsePathname.mockReturnValue('/test');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should return current route', () => {
    const { result } = renderHook(() => useRouteOptimizer());

    expect(result.current.currentRoute).toBe('/test');
  });

  it('should calculate average load time', () => {
    const { result } = renderHook(() => useRouteOptimizer());

    expect(typeof result.current.averageLoadTime).toBe('number');
  });

  it('should return slowest routes', () => {
    const { result } = renderHook(() => useRouteOptimizer());

    expect(Array.isArray(result.current.slowestRoutes)).toBe(true);
  });
});

describe('useMemoryOptimizer', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'performance', {
      value: {
        ...originalPerformance,
        memory: {
          usedJSHeapSize: 40000000,
          totalJSHeapSize: 60000000,
          jsHeapSizeLimit: 100000000,
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

  it('should return memory info', () => {
    const { result } = renderHook(() => useMemoryOptimizer());

    expect(result.current.memory).not.toBeNull();
    expect(result.current.memory?.percentage).toBe(40);
  });

  it('should identify high usage', () => {
    Object.defineProperty(global, 'performance', {
      value: {
        ...originalPerformance,
        memory: {
          usedJSHeapSize: 85000000,
          totalJSHeapSize: 90000000,
          jsHeapSizeLimit: 100000000,
        },
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useMemoryOptimizer());

    expect(result.current.isHighUsage).toBe(true);
  });

  it('should identify critical usage', () => {
    Object.defineProperty(global, 'performance', {
      value: {
        ...originalPerformance,
        memory: {
          usedJSHeapSize: 95000000,
          totalJSHeapSize: 98000000,
          jsHeapSizeLimit: 100000000,
        },
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useMemoryOptimizer());

    expect(result.current.isCritical).toBe(true);
  });

  it('should format size', () => {
    const { result } = renderHook(() => useMemoryOptimizer());

    const formatted = result.current.formatSize(1048576);

    expect(formatted).toBe('1.0 MB');
  });

  it('should return null when memory API is not available', () => {
    Object.defineProperty(global, 'performance', {
      value: originalPerformance,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useMemoryOptimizer());

    expect(result.current.memory).toBeNull();
    expect(result.current.isHighUsage).toBe(false);
    expect(result.current.isCritical).toBe(false);
  });
});

describe('usePerformanceOptimizer', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'performance', {
      value: {
        ...originalPerformance,
        getEntriesByType: jest.fn().mockReturnValue([]),
      },
      writable: true,
      configurable: true,
    });
    mockPerformanceWithObserver();
  });

  afterEach(() => {
    delete (window as { PerformanceObserver?: jest.Mock }).PerformanceObserver;
    Object.defineProperty(global, 'performance', {
      value: originalPerformance,
      writable: true,
      configurable: true,
    });
  });

  it('should combine all performance metrics', () => {
    const { result } = renderHook(() => usePerformanceOptimizer());

    expect(result.current.webVitals).toBeDefined();
    expect(result.current.resources).toBeDefined();
    expect(result.current.navigation).toBeDefined();
    expect(result.current.route).toBeDefined();
    expect(result.current.memory).toBeDefined();
  });

  it('should return overall health', () => {
    const { result } = renderHook(() => usePerformanceOptimizer());

    expect(['excellent', 'good', 'fair', 'poor']).toContain(result.current.health);
  });

  it('should generate report', () => {
    const { result } = renderHook(() => usePerformanceOptimizer());

    const report = result.current.getReport();

    expect(report.timestamp).toBeDefined();
    expect(report.url).toBeDefined();
    expect(report.health).toBeDefined();
  });
});
