'use client';

import { useCallback, useRef, useEffect } from 'react';

import { env } from '@/lib/config/env';
import { reportCustomMetric } from '@/lib/monitoring';
import { createLogger } from '@/lib/utils/logger';

import { priceCache, historicalCache, type CacheStats } from './cacheUtils';

const logger = createLogger('performance-monitoring');

interface QueryPerformanceMetric {
  name: 'query_response_time' | 'data_processing_time' | 'chart_render_time' | 'validation_time';
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceSnapshot {
  webVitals: {
    fcp: number | null;
    lcp: number | null;
    inp: number | null;
    cls: number | null;
  };
  customMetrics: {
    queryResponseTime: number | null;
    dataProcessingTime: number | null;
    chartRenderTime: number | null;
    validationTime: number | null;
  };
  cacheStats: CacheStats;
  timestamp: number;
}

interface PerformanceThresholds {
  queryResponseTime: { good: number; poor: number };
  dataProcessingTime: { good: number; poor: number };
  chartRenderTime: { good: number; poor: number };
  validationTime: { good: number; poor: number };
}

const CUSTOM_THRESHOLDS: PerformanceThresholds = {
  queryResponseTime: { good: 2000, poor: 5000 },
  dataProcessingTime: { good: 100, poor: 500 },
  chartRenderTime: { good: 500, poor: 1500 },
  validationTime: { good: 50, poor: 200 },
};

type MetricRating = 'good' | 'needs-improvement' | 'poor';

function getCustomMetricRating(name: keyof PerformanceThresholds, value: number): MetricRating {
  const thresholds = CUSTOM_THRESHOLDS[name];
  if (!thresholds) return 'poor';
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

class PerformanceMonitor {
  private metrics: QueryPerformanceMetric[] = [];
  private maxMetrics: number = 100;
  private webVitalsSnapshot: PerformanceSnapshot['webVitals'] = {
    fcp: null,
    lcp: null,
    inp: null,
    cls: null,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.initWebVitalsCollection();
    }
  }

  private initWebVitalsCollection() {
    const observePerformance = () => {
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.webVitalsSnapshot.fcp = entry.startTime;
        }
      });

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            this.webVitalsSnapshot.lcp = entry.startTime;
          }
          if (entry.entryType === 'layout-shift' && !(entry as LayoutShift).hadRecentInput) {
            this.webVitalsSnapshot.cls =
              (this.webVitalsSnapshot.cls || 0) + (entry as LayoutShift).value;
          }
          if (entry.entryType === 'first-input') {
            this.webVitalsSnapshot.inp =
              (entry as PerformanceEventTiming).processingEnd -
              (entry as PerformanceEventTiming).processingStart;
          }
        }
      });

      try {
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        observer.observe({ type: 'layout-shift', buffered: true });
        observer.observe({ type: 'first-input', buffered: true });
      } catch {
        logger.warn('PerformanceObserver not fully supported');
      }
    };

    if (document.readyState === 'complete') {
      observePerformance();
    } else {
      window.addEventListener('load', observePerformance);
    }
  }

  recordMetric(metric: QueryPerformanceMetric): void {
    this.metrics.push(metric);

    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    if (env.features.enablePerformanceMonitoring || env.app.isDevelopment) {
      const rating = getCustomMetricRating(
        metric.name.replace('_time', 'Time') as keyof PerformanceThresholds,
        metric.value
      );
      logger.info(`[Performance] ${metric.name}: ${metric.value.toFixed(2)}ms (${rating})`);

      reportCustomMetric(`price_query_${metric.name}`, metric.value);
    }
  }

  startMeasure(name: string): () => number {
    const startTime = performance.now();
    const markName = `${name}-start`;

    try {
      performance.mark(markName);
    } catch {
      // Mark might already exist, ignore
    }

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      try {
        performance.mark(`${name}-end`);
        performance.measure(name, markName, `${name}-end`);
      } catch {
        // Measurement might fail, ignore
      }

      return duration;
    };
  }

  getMetrics(): QueryPerformanceMetric[] {
    return [...this.metrics];
  }

  getLatestMetrics(): Record<string, number | null> {
    const latest: Record<string, number | null> = {
      queryResponseTime: null,
      dataProcessingTime: null,
      chartRenderTime: null,
      validationTime: null,
    };

    const metricMap: Record<string, keyof typeof latest> = {
      query_response_time: 'queryResponseTime',
      data_processing_time: 'dataProcessingTime',
      chart_render_time: 'chartRenderTime',
      validation_time: 'validationTime',
    };

    for (let i = this.metrics.length - 1; i >= 0; i--) {
      const metric = this.metrics[i];
      const key = metricMap[metric.name];
      if (key && latest[key] === null) {
        latest[key] = metric.value;
      }
    }

    return latest;
  }

  getSnapshot(): PerformanceSnapshot {
    const latestMetrics = this.getLatestMetrics();

    return {
      webVitals: { ...this.webVitalsSnapshot },
      customMetrics: {
        queryResponseTime: latestMetrics.queryResponseTime,
        dataProcessingTime: latestMetrics.dataProcessingTime,
        chartRenderTime: latestMetrics.chartRenderTime,
        validationTime: latestMetrics.validationTime,
      },
      cacheStats: this.getCacheStats(),
      timestamp: Date.now(),
    };
  }

  getCacheStats(): CacheStats {
    const priceStats = priceCache.getStats();
    const historicalStats = historicalCache.getStats();

    return {
      size: priceStats.size + historicalStats.size,
      maxSize: Math.max(priceStats.maxSize, historicalStats.maxSize),
      hitRate: (priceStats.hitRate + historicalStats.hitRate) / 2,
      missRate: (priceStats.missRate + historicalStats.missRate) / 2,
      hits: priceStats.hits + historicalStats.hits,
      misses: priceStats.misses + historicalStats.misses,
    };
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  getAverageMetrics(timeWindowMs?: number): Record<string, number> {
    const now = Date.now();
    const cutoff = timeWindowMs ? now - timeWindowMs : 0;

    const filtered = timeWindowMs
      ? this.metrics.filter((m) => m.timestamp >= cutoff)
      : this.metrics;

    const sums: Record<string, { total: number; count: number }> = {};

    for (const metric of filtered) {
      if (!sums[metric.name]) {
        sums[metric.name] = { total: 0, count: 0 };
      }
      sums[metric.name].total += metric.value;
      sums[metric.name].count++;
    }

    const averages: Record<string, number> = {};
    for (const [name, data] of Object.entries(sums)) {
      averages[name] = data.total / data.count;
    }

    return averages;
  }

  reportToAnalytics(): void {
    if (!env.features.enableAnalytics) return;

    const snapshot = this.getSnapshot();
    const averages = this.getAverageMetrics(60000);

    for (const [name, value] of Object.entries(averages)) {
      reportCustomMetric(`price_query_avg_${name}`, value);
    }

    if (snapshot.cacheStats.hitRate !== undefined) {
      reportCustomMetric('cache_hit_rate', snapshot.cacheStats.hitRate * 100);
    }
  }
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
  processingEnd: number;
}

const performanceMonitor = new PerformanceMonitor();

export function usePerformanceMonitoring() {
  const queryStartTimeRef = useRef<number | null>(null);
  const dataProcessingStartRef = useRef<number | null>(null);
  const validationStartRef = useRef<number | null>(null);

  const startQueryMeasure = useCallback(() => {
    queryStartTimeRef.current = performance.now();
    performanceMonitor.startMeasure('query');
  }, []);

  const endQueryMeasure = useCallback((metadata?: Record<string, unknown>) => {
    if (queryStartTimeRef.current === null) return 0;

    const duration = performance.now() - queryStartTimeRef.current;
    performanceMonitor.recordMetric({
      name: 'query_response_time',
      value: duration,
      timestamp: Date.now(),
      metadata,
    });

    queryStartTimeRef.current = null;
    return duration;
  }, []);

  const startDataProcessingMeasure = useCallback(() => {
    dataProcessingStartRef.current = performance.now();
  }, []);

  const endDataProcessingMeasure = useCallback((metadata?: Record<string, unknown>) => {
    if (dataProcessingStartRef.current === null) return 0;

    const duration = performance.now() - dataProcessingStartRef.current;
    performanceMonitor.recordMetric({
      name: 'data_processing_time',
      value: duration,
      timestamp: Date.now(),
      metadata,
    });

    dataProcessingStartRef.current = null;
    return duration;
  }, []);

  const startValidationMeasure = useCallback(() => {
    validationStartRef.current = performance.now();
  }, []);

  const endValidationMeasure = useCallback((metadata?: Record<string, unknown>) => {
    if (validationStartRef.current === null) return 0;

    const duration = performance.now() - validationStartRef.current;
    performanceMonitor.recordMetric({
      name: 'validation_time',
      value: duration,
      timestamp: Date.now(),
      metadata,
    });

    validationStartRef.current = null;
    return duration;
  }, []);

  const recordChartRenderTime = useCallback(
    (duration: number, metadata?: Record<string, unknown>) => {
      performanceMonitor.recordMetric({
        name: 'chart_render_time',
        value: duration,
        timestamp: Date.now(),
        metadata,
      });
    },
    []
  );

  const getPerformanceSnapshot = useCallback(() => {
    return performanceMonitor.getSnapshot();
  }, []);

  const getCacheStats = useCallback(() => {
    return performanceMonitor.getCacheStats();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      performanceMonitor.reportToAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    startQueryMeasure,
    endQueryMeasure,
    startDataProcessingMeasure,
    endDataProcessingMeasure,
    startValidationMeasure,
    endValidationMeasure,
    recordChartRenderTime,
    getPerformanceSnapshot,
    getCacheStats,
    performanceMonitor,
  };
}
