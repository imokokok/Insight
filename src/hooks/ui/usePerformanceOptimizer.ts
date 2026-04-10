'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { usePathname } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMetrics {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  tbt?: number;
}

export interface ResourceMetric {
  name: string;
  duration: number;
  size: number;
  type: 'script' | 'stylesheet' | 'image' | 'font' | 'other';
}

export interface NavigationTiming {
  dnsLookup: number;
  tcpConnection: number;
  serverResponse: number;
  domProcessing: number;
  resourceLoading: number;
  total: number;
}

export interface OptimizationSuggestion {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'loading' | 'rendering' | 'memory' | 'network';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
}

// ============================================================================
// Web Vitals Monitoring
// ============================================================================

export function useWebVitalsOptimizer() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isOptimized, setIsOptimized] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // First Contentful Paint
    const observeFCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries.find((e) => e.name === 'first-contentful-paint');
        if (fcp) {
          setMetrics((prev) => ({ ...prev, fcp: fcp.startTime }));
          if (fcp.startTime > 1800) {
            setIsOptimized(false);
          }
        }
      });
      observer.observe({ entryTypes: ['paint'] });
      return () => observer.disconnect();
    };

    // Largest Contentful Paint
    const observeLCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          setMetrics((prev) => ({ ...prev, lcp: lastEntry.startTime }));
          if (lastEntry.startTime > 2500) {
            setIsOptimized(false);
          }
        }
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      return () => observer.disconnect();
    };

    // First Input Delay
    const observeFID = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fid = entries[0] as PerformanceEventTiming;
        if (fid) {
          const delay = fid.processingStart - fid.startTime;
          setMetrics((prev) => ({ ...prev, fid: delay }));
          if (delay > 100) {
            setIsOptimized(false);
          }
        }
      });
      observer.observe({ entryTypes: ['first-input'] });
      return () => observer.disconnect();
    };

    // Cumulative Layout Shift
    const observeCLS = () => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as LayoutShift;
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value;
          }
        }
        setMetrics((prev) => ({ ...prev, cls: clsValue }));
        if (clsValue > 0.1) {
          setIsOptimized(false);
        }
      });
      observer.observe({ entryTypes: ['layout-shift'] });
      return () => observer.disconnect();
    };

    // Time to First Byte
    const measureTTFB = () => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.startTime;
        setMetrics((prev) => ({ ...prev, ttfb }));
        if (ttfb > 800) {
          setIsOptimized(false);
        }
      }
    };

    const cleanupFCP = observeFCP();
    const cleanupLCP = observeLCP();
    const cleanupFID = observeFID();
    const cleanupCLS = observeCLS();
    measureTTFB();

    return () => {
      cleanupFCP?.();
      cleanupLCP?.();
      cleanupFID?.();
      cleanupCLS?.();
    };
  }, []);

  const getOptimizationSuggestions = useCallback((): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];

    if (metrics.fcp && metrics.fcp > 1800) {
      suggestions.push({
        id: 'fcp-slow',
        type: 'critical',
        category: 'loading',
        title: 'First Contentful Paint is slow',
        description: `FCP is ${metrics.fcp.toFixed(0)}ms, which is above the recommended 1.8s`,
        impact: 'high',
        recommendation:
          'Consider optimizing critical rendering path, reducing server response time, and inlining critical CSS.',
      });
    }

    if (metrics.lcp && metrics.lcp > 2500) {
      suggestions.push({
        id: 'lcp-slow',
        type: 'critical',
        category: 'loading',
        title: 'Largest Contentful Paint is slow',
        description: `LCP is ${metrics.lcp.toFixed(0)}ms, which is above the recommended 2.5s`,
        impact: 'high',
        recommendation:
          'Optimize images, use next-gen formats like WebP, and implement lazy loading for below-fold images.',
      });
    }

    if (metrics.fid && metrics.fid > 100) {
      suggestions.push({
        id: 'fid-high',
        type: 'warning',
        category: 'rendering',
        title: 'First Input Delay is high',
        description: `FID is ${metrics.fid.toFixed(0)}ms, which is above the recommended 100ms`,
        impact: 'medium',
        recommendation:
          'Break up long tasks, use web workers for heavy computations, and optimize event handlers.',
      });
    }

    if (metrics.cls && metrics.cls > 0.1) {
      suggestions.push({
        id: 'cls-high',
        type: 'warning',
        category: 'rendering',
        title: 'Cumulative Layout Shift is high',
        description: `CLS is ${metrics.cls.toFixed(3)}, which is above the recommended 0.1`,
        impact: 'medium',
        recommendation:
          'Set explicit dimensions for images and videos, reserve space for dynamic content, and avoid inserting content above existing content.',
      });
    }

    return suggestions;
  }, [metrics]);

  return {
    metrics,
    isOptimized,
    suggestions: getOptimizationSuggestions(),
    getScore: useCallback(() => {
      let score = 100;
      if (metrics.fcp && metrics.fcp > 1800) score -= 20;
      if (metrics.lcp && metrics.lcp > 2500) score -= 25;
      if (metrics.fid && metrics.fid > 100) score -= 15;
      if (metrics.cls && metrics.cls > 0.1) score -= 15;
      if (metrics.ttfb && metrics.ttfb > 800) score -= 10;
      return Math.max(0, score);
    }, [metrics]),
  };
}

// ============================================================================
// Resource Loading Optimization
// ============================================================================

export function useResourceOptimizer() {
  const [resources, setResources] = useState<ResourceMetric[]>([]);
  const [slowResources, setSlowResources] = useState<ResourceMetric[]>([]);

  const getResourceType = useCallback((url: string): ResourceMetric['type'] => {
    if (url.endsWith('.js')) return 'script';
    if (url.endsWith('.css')) return 'stylesheet';
    if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url)) return 'image';
    if (/\.(woff|woff2|ttf|otf|eot)$/i.test(url)) return 'font';
    return 'other';
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const analyzeResources = () => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      const resourceMetrics: ResourceMetric[] = entries.map((entry) => {
        const type = getResourceType(entry.name);
        return {
          name: entry.name,
          duration: entry.duration,
          size: entry.transferSize,
          type,
        };
      });

      setResources(resourceMetrics);
      setSlowResources(resourceMetrics.filter((r) => r.duration > 1000));
    };

    // Analyze after page load
    if (document.readyState === 'complete') {
      analyzeResources();
    } else {
      window.addEventListener('load', analyzeResources);
      return () => window.removeEventListener('load', analyzeResources);
    }
  }, [getResourceType]);

  const getTotalSize = useCallback(() => {
    return resources.reduce((sum, r) => sum + r.size, 0);
  }, [resources]);

  const getTotalDuration = useCallback(() => {
    return resources.reduce((sum, r) => sum + r.duration, 0);
  }, [resources]);

  return {
    resources,
    slowResources,
    totalSize: getTotalSize(),
    totalDuration: getTotalDuration(),
    scriptCount: resources.filter((r) => r.type === 'script').length,
    imageCount: resources.filter((r) => r.type === 'image').length,
  };
}

// ============================================================================
// Navigation Timing Analysis
// ============================================================================

export function useNavigationOptimizer() {
  const [timing, setTiming] = useState<NavigationTiming | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const analyzeNavigation = () => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;

      if (navigation) {
        setTiming({
          dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcpConnection: navigation.connectEnd - navigation.connectStart,
          serverResponse: navigation.responseEnd - navigation.requestStart,
          domProcessing: navigation.domComplete - navigation.responseEnd,
          resourceLoading: navigation.loadEventEnd - navigation.domComplete,
          total: navigation.loadEventEnd - navigation.startTime,
        });
      }
    };

    if (document.readyState === 'complete') {
      analyzeNavigation();
    } else {
      window.addEventListener('load', analyzeNavigation);
      return () => window.removeEventListener('load', analyzeNavigation);
    }
  }, []);

  const getBottleneck = useCallback(() => {
    if (!timing) return null;

    const phases = [
      { name: 'DNS Lookup', duration: timing.dnsLookup },
      { name: 'TCP Connection', duration: timing.tcpConnection },
      { name: 'Server Response', duration: timing.serverResponse },
      { name: 'DOM Processing', duration: timing.domProcessing },
      { name: 'Resource Loading', duration: timing.resourceLoading },
    ];

    return phases.reduce((max, phase) => (phase.duration > max.duration ? phase : max));
  }, [timing]);

  return {
    timing,
    bottleneck: getBottleneck(),
    isSlow: timing ? timing.total > 3000 : false,
  };
}

// ============================================================================
// Lazy Loading Optimization
// ============================================================================

export function useLazyLoadOptimizer(options?: IntersectionObserverInit) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  // 使用 Map 存储元素到 ID 的映射，避免依赖元素 id 属性
  const elementIdMapRef = useRef<WeakMap<Element, string>>(new WeakMap());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // 从 WeakMap 获取元素 ID，而不是依赖元素 id 属性
          const id = elementIdMapRef.current.get(entry.target);
          if (!id) return;

          if (entry.isIntersecting) {
            setVisibleElements((prev) => new Set([...prev, id]));
          } else {
            // 元素不再可见时，从 visibleElements 中移除
            setVisibleElements((prev) => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
        ...options,
      }
    );

    return () => {
      observerRef.current?.disconnect();
      elementIdMapRef.current = new WeakMap();
    };
  }, [options]);

  const observe = useCallback((element: Element | null, id?: string) => {
    if (element && observerRef.current) {
      // 如果没有提供 id，使用元素 id 属性或生成唯一 id
      const elementId = id || element.id || `lazy-${Math.random().toString(36).substr(2, 9)}`;
      elementIdMapRef.current.set(element, elementId);
      observerRef.current.observe(element);
      return elementId;
    }
    return null;
  }, []);

  const unobserve = useCallback((element: Element | null) => {
    if (element && observerRef.current) {
      observerRef.current.unobserve(element);
      elementIdMapRef.current.delete(element);
      // 从 visibleElements 中移除
      const id = elementIdMapRef.current.get(element);
      if (id) {
        setVisibleElements((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    }
  }, []);

  const isVisible = useCallback((id: string) => visibleElements.has(id), [visibleElements]);

  return { observe, unobserve, isVisible, visibleElements };
}

// ============================================================================
// Route-based Code Splitting
// ============================================================================

const MAX_ROUTE_METRICS = 50;

export function useRouteOptimizer() {
  const pathname = usePathname();
  const [routeMetrics, setRouteMetrics] = useState<Map<string, number>>(new Map());
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = performance.now();
  }, [pathname]);

  useEffect(() => {
    if (startTimeRef.current > 0) {
      const duration = performance.now() - startTimeRef.current;
      setRouteMetrics((prev) => {
        const newMap = new Map([...prev, [pathname, duration]]);
        // 限制 Map 大小，防止内存泄漏
        if (newMap.size > MAX_ROUTE_METRICS) {
          const firstKey = newMap.keys().next().value;
          if (firstKey !== undefined) {
            newMap.delete(firstKey);
          }
        }
        return newMap;
      });
    }
  }, [pathname]);

  const getAverageLoadTime = useCallback(() => {
    if (routeMetrics.size === 0) return 0;
    const total = Array.from(routeMetrics.values()).reduce((sum, time) => sum + time, 0);
    return total / routeMetrics.size;
  }, [routeMetrics]);

  const getSlowestRoutes = useCallback(
    (limit = 5) => {
      return Array.from(routeMetrics.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
    },
    [routeMetrics]
  );

  return {
    currentRoute: pathname,
    routeMetrics,
    averageLoadTime: getAverageLoadTime(),
    slowestRoutes: getSlowestRoutes(),
  };
}

// ============================================================================
// Memory Usage Optimization
// ============================================================================

export function useMemoryOptimizer() {
  const [memory, setMemory] = useState<{
    used: number;
    total: number;
    limit: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateMemory = () => {
      const memoryInfo = (performance as Performance & { memory?: MemoryInfo }).memory;
      // 检查浏览器是否支持 performance.memory API（Chrome 特有）
      if (!memoryInfo) {
        // 浏览器不支持，设置 null 表示不可用
        setMemory(null);
        return;
      }

      try {
        setMemory({
          used: memoryInfo.usedJSHeapSize,
          total: memoryInfo.totalJSHeapSize,
          limit: memoryInfo.jsHeapSizeLimit,
          percentage: (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100,
        });
      } catch (error) {
        // 处理可能的权限错误或 API 变更
        setMemory(null);
      }
    };

    updateMemory();
    const interval = setInterval(updateMemory, 30000);

    return () => clearInterval(interval);
  }, []);

  const isHighUsage = memory ? memory.percentage > 80 : false;
  const isCritical = memory ? memory.percentage > 90 : false;

  return {
    memory,
    isHighUsage,
    isCritical,
    formatSize: (bytes: number) => {
      const mb = bytes / 1024 / 1024;
      return `${mb.toFixed(1)} MB`;
    },
  };
}

// ============================================================================
// Combined Performance Hook
// ============================================================================

export function usePerformanceOptimizer() {
  const webVitals = useWebVitalsOptimizer();
  const resources = useResourceOptimizer();
  const navigation = useNavigationOptimizer();
  const route = useRouteOptimizer();
  const memory = useMemoryOptimizer();

  const getOverallHealth = useCallback(() => {
    const issues = [
      !webVitals.isOptimized,
      resources.slowResources.length > 0,
      navigation.isSlow,
      memory.isHighUsage,
    ].filter(Boolean).length;

    if (issues === 0) return 'excellent';
    if (issues === 1) return 'good';
    if (issues <= 3) return 'fair';
    return 'poor';
  }, [
    webVitals.isOptimized,
    resources.slowResources.length,
    navigation.isSlow,
    memory.isHighUsage,
  ]);

  const getReport = useCallback(() => {
    return {
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      webVitals: webVitals.metrics,
      resources: {
        total: resources.resources.length,
        slow: resources.slowResources.length,
        totalSize: resources.totalSize,
      },
      navigation: navigation.timing,
      memory: memory.memory,
      route: {
        current: route.currentRoute,
        averageLoadTime: route.averageLoadTime,
      },
      health: getOverallHealth(),
    };
  }, [webVitals.metrics, resources, navigation.timing, memory.memory, route, getOverallHealth]);

  return {
    webVitals,
    resources,
    navigation,
    route,
    memory,
    health: getOverallHealth(),
    getReport,
  };
}

// ============================================================================
// Type Definitions
// ============================================================================

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}
