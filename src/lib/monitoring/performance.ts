import { createLogger } from '@/lib/utils/logger';
import { env } from '@/lib/config/env';

const logger = createLogger('performance');

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'count' | 'percent' | 'bytes';
  timestamp: number;
  tags?: Record<string, string>;
}

export interface PerformanceEntry {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private entries: Map<string, PerformanceEntry> = new Map();
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 100;

  isEnabled(): boolean {
    return env.features.enablePerformanceMonitoring;
  }

  startMeasure(name: string): void {
    if (!this.isEnabled()) return;

    this.entries.set(name, {
      name,
      startTime: performance.now(),
    });
  }

  endMeasure(name: string): number | null {
    if (!this.isEnabled()) return null;

    const entry = this.entries.get(name);
    if (!entry) {
      logger.warn(`No performance entry found for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - entry.startTime;

    entry.endTime = endTime;
    entry.duration = duration;

    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
    });

    this.entries.delete(name);

    return duration;
  }

  recordMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled()) return;

    this.metrics.push(metric);

    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    logger.debug('Performance metric recorded', { metric });
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name);
  }

  getAverageMetric(name: string): number | null {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return null;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  clearMetrics(): void {
    this.metrics = [];
    this.entries.clear();
  }

  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isEnabled()) {
      return fn();
    }

    this.startMeasure(name);
    return fn().finally(() => {
      this.endMeasure(name);
    });
  }

  getSummary(): {
    totalMetrics: number;
    averageDurations: Record<string, number>;
    metricCounts: Record<string, number>;
  } {
    const metricCounts: Record<string, number> = {};
    const averageDurations: Record<string, number> = {};

    this.metrics.forEach((metric) => {
      metricCounts[metric.name] = (metricCounts[metric.name] || 0) + 1;
    });

    Object.keys(metricCounts).forEach((name) => {
      const avg = this.getAverageMetric(name);
      if (avg !== null) {
        averageDurations[name] = avg;
      }
    });

    return {
      totalMetrics: this.metrics.length,
      averageDurations,
      metricCounts,
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function trackPerformance(
  name: string,
  value: number,
  unit: PerformanceMetric['unit'] = 'ms',
  tags?: Record<string, string>
): void {
  performanceMonitor.recordMetric({
    name,
    value,
    unit,
    timestamp: Date.now(),
    tags,
  });
}

export function measurePerformance(name: string): {
  end: () => number | null;
} {
  performanceMonitor.startMeasure(name);
  return {
    end: () => performanceMonitor.endMeasure(name),
  };
}

export async function withPerformanceTracking<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return performanceMonitor.measureAsync(name, fn);
}

export function usePerformanceTracking(name: string): {
  start: () => void;
  end: () => number | null;
} {
  return {
    start: () => performanceMonitor.startMeasure(name),
    end: () => performanceMonitor.endMeasure(name),
  };
}

export function reportWebVitals(metric: { name: string; value: number; id: string }): void {
  if (!env.features.enablePerformanceMonitoring) return;

  trackPerformance(`web-vital-${metric.name}`, metric.value, 'ms', {
    id: metric.id,
  });
}
