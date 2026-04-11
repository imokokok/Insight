'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { track } from '@vercel/analytics';

import { env } from '@/lib/config/env';
import {
  onMetric,
  reportCustomMetric,
  getPerformanceScore,
  type WebVitalMetric,
  PERFORMANCE_THRESHOLDS,
} from '@/lib/monitoring/webVitals';

export interface OperationMetric {
  name: string;
  startTime: number;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  renderCount: number;
  mountTime?: number;
  updateCount?: number;
}

export interface PerformanceReport {
  timestamp: number;
  url: string;
  webVitals: WebVitalMetric[];
  operations: OperationMetric[];
  components: ComponentRenderMetric[];
  memory?: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
}

const isProduction = env.app.isProduction;
const enableAnalytics = env.features.enableAnalytics;

export function usePerformanceTracker(operationName: string) {
  const startTimeRef = useRef<number>(0);
  const isTrackingRef = useRef<boolean>(false);

  const start = useCallback(() => {
    startTimeRef.current = performance.now();
    isTrackingRef.current = true;
  }, []);

  const end = useCallback(
    (metadata?: Record<string, unknown>) => {
      if (!isTrackingRef.current) return 0;

      const duration = performance.now() - startTimeRef.current;
      isTrackingRef.current = false;

      const _metric: OperationMetric = {
        name: operationName,
        startTime: startTimeRef.current,
        duration,
        metadata,
      };

      if (isProduction && enableAnalytics) {
        track('performance-operation', {
          operation: operationName,
          duration: Math.round(duration),
          ...metadata,
        });
      }

      // Performance logging disabled in development to avoid console noise

      return duration;
    },
    [operationName]
  );

  const measureAsync = useCallback(
    async <T>(fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> => {
      start();
      try {
        const result = await fn();
        end(metadata);
        return result;
      } catch (error) {
        end({ ...metadata, error: true });
        throw error;
      }
    },
    [start, end]
  );

  return { start, end, measureAsync };
}

export function useComponentPerformance(componentName: string, enabled = true) {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef<number>(0);
  const updateCountRef = useRef(0);
  const [metrics, setMetrics] = useState<ComponentRenderMetric | null>(null);
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    mountTimeRef.current = performance.now();
    const currentRenderCount = renderCountRef.current;
    const currentUpdateCount = updateCountRef.current;

    return () => {
      const mountDuration = performance.now() - mountTimeRef.current;

      if (isProduction && enableAnalytics) {
        track('component-performance', {
          component: componentName,
          renderCount: currentRenderCount,
          mountDuration: Math.round(mountDuration),
          updateCount: currentUpdateCount,
        });
      }

      // Component performance logging disabled in development
    };
  }, [componentName, enabled]);

  useEffect(() => {
    if (!enabled) return;

    renderCountRef.current++;
    const renderTime = performance.now();
    const currentRenderCount = renderCountRef.current;

    setRenderCount(currentRenderCount);
    setMetrics((prev) => ({
      componentName,
      renderTime,
      renderCount: currentRenderCount,
      mountTime: prev?.mountTime,
      updateCount: updateCountRef.current,
    }));
  }, [componentName, enabled]);

  const markUpdate = useCallback(() => {
    updateCountRef.current++;
  }, []);

  return { metrics, markUpdate, renderCount };
}

export function useWebVitalsMonitor() {
  const [metrics, setMetrics] = useState<WebVitalMetric[]>([]);
  const [score, setScore] = useState<number>(100);

  useEffect(() => {
    const unsubscribe = onMetric((metric) => {
      setMetrics((prev) => {
        const existing = prev.findIndex((m) => m.name === metric.name);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = metric;
          return updated;
        }
        return [...prev, metric];
      });
    });

    const updateScore = () => {
      const result = getPerformanceScore();
      setScore(result.score);
    };

    updateScore();
    const interval = setInterval(updateScore, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const getMetricByName = useCallback(
    (name: string): WebVitalMetric | undefined => {
      return metrics.find((m) => m.name === name);
    },
    [metrics]
  );

  const getRating = useCallback(
    (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
      const thresholds = PERFORMANCE_THRESHOLDS[name as keyof typeof PERFORMANCE_THRESHOLDS];
      if (!thresholds) return 'good';
      if (value <= thresholds.good) return 'good';
      if (value <= thresholds.poor) return 'needs-improvement';
      return 'poor';
    },
    []
  );

  return { metrics, score, getMetricByName, getRating };
}

export function useMemoryMonitor(enabled = true) {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usagePercentage: number;
  } | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const updateMemoryInfo = () => {
      const memory = (performance as Performance & { memory?: MemoryInfo }).memory;
      if (memory) {
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 10000);

    return () => clearInterval(interval);
  }, [enabled]);

  return memoryInfo;
}

export function usePerformanceReport() {
  const [report, setReport] = useState<PerformanceReport | null>(null);

  const generateReport = useCallback(() => {
    const webVitals: WebVitalMetric[] = [];
    const memory = (performance as Performance & { memory?: MemoryInfo }).memory;

    const perfReport: PerformanceReport = {
      timestamp: Date.now(),
      url: window.location.href,
      webVitals,
      operations: [],
      components: [],
      memory: memory
        ? {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
          }
        : undefined,
    };

    setReport(perfReport);
    return perfReport;
  }, []);

  const reportOperation = useCallback((operation: OperationMetric) => {
    if (isProduction && enableAnalytics) {
      track('custom-operation', {
        name: operation.name,
        duration: Math.round(operation.duration),
        ...operation.metadata,
      });
    }

    reportCustomMetric(operation.name, operation.duration);
  }, []);

  return { report, generateReport, reportOperation };
}

export function useLongTaskMonitor(threshold = 50) {
  const [longTasks, setLongTasks] = useState<PerformanceEntry[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      setLongTasks((prev) => [...prev, ...entries].slice(-50));

      entries.forEach((entry) => {
        if (isProduction && enableAnalytics) {
          track('long-task', {
            duration: Math.round(entry.duration),
            startTime: Math.round(entry.startTime),
            name: entry.name,
          });
        }

        // Long task warnings disabled in development
      });
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      console.warn('Long task monitoring not supported');
    }

    return () => observer.disconnect();
  }, [threshold]);

  return longTasks;
}

export function useResourceTimingMonitor() {
  const [resources, setResources] = useState<PerformanceResourceTiming[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateResources = () => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      setResources(entries.slice(-100));
    };

    updateResources();
    const interval = setInterval(updateResources, 10000);

    return () => clearInterval(interval);
  }, []);

  const getSlowResources = useCallback(
    (threshold = 1000) => {
      return resources.filter((r) => r.duration > threshold);
    },
    [resources]
  );

  const getResourceByType = useCallback(
    (type: 'script' | 'stylesheet' | 'image' | 'fetch' | 'xhr') => {
      return resources.filter((r) => r.initiatorType === type);
    },
    [resources]
  );

  return { resources, getSlowResources, getResourceByType };
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}
