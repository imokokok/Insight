import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric, type CLSMetric } from 'web-vitals';
import * as Sentry from '@sentry/nextjs';
import { track } from '@vercel/analytics';
import { env } from '@/lib/config/env';

export interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType?: string;
}

type MetricHandler = (metric: WebVitalMetric) => void;

const handlers: MetricHandler[] = [];

export const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
} as const;

export type MetricName = keyof typeof PERFORMANCE_THRESHOLDS;

export const onMetric = (handler: MetricHandler) => {
  handlers.push(handler);
  return () => {
    const index = handlers.indexOf(handler);
    if (index > -1) handlers.splice(index, 1);
  };
};

const getRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const thresholds = PERFORMANCE_THRESHOLDS[name as MetricName];
  if (!thresholds) return 'good';

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
};

const sendToAnalytics = (metric: WebVitalMetric) => {
  if (env.app.isDevelopment) {
    console.log('[WebVital]', metric.name, metric.value.toFixed(2), metric.rating);
    return;
  }

  if (!env.features.enableAnalytics) return;

  Sentry.metrics.distribution(metric.name, metric.value);

  track('web-vital', {
    name: metric.name,
    value: Math.round(metric.value),
    rating: metric.rating,
    id: metric.id,
  });
};

const handleMetric = (metric: Metric) => {
  const webVitalMetric: WebVitalMetric = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: (metric as CLSMetric).navigationType,
  };

  handlers.forEach((handler) => handler(webVitalMetric));
  sendToAnalytics(webVitalMetric);
};

export const reportMetric = (metric: WebVitalMetric) => {
  handlers.forEach((handler) => handler(metric));
  sendToAnalytics(metric);
};

export const reportCustomMetric = (name: string, value: number) => {
  const metric: WebVitalMetric = {
    name,
    value,
    rating: getRating(name, value),
    delta: value,
    id: `${name}-${Date.now()}`,
  };

  reportMetric(metric);
};

export const getPerformanceScore = (): {
  score: number;
  metrics: Record<string, { value: number; rating: string }>;
} => {
  const metrics: Record<string, { value: number; rating: string }> = {};

  const entries = performance.getEntriesByType('navigation');
  if (entries.length > 0) {
    const navEntry = entries[0] as PerformanceNavigationTiming;
    metrics['TTFB'] = {
      value: navEntry.responseStart - navEntry.requestStart,
      rating: getRating('TTFB', navEntry.responseStart - navEntry.requestStart),
    };
  }

  const paintEntries = performance.getEntriesByType('paint');
  paintEntries.forEach((entry) => {
    if (entry.name === 'first-contentful-paint') {
      metrics['FCP'] = {
        value: entry.startTime,
        rating: getRating('FCP', entry.startTime),
      };
    }
  });

  let score = 100;
  Object.values(metrics).forEach((m) => {
    if (m.rating === 'poor') score -= 25;
    else if (m.rating === 'needs-improvement') score -= 10;
  });

  return { score: Math.max(0, score), metrics };
};

export const initWebVitals = () => {
  if (typeof window === 'undefined') return;

  onCLS(handleMetric);
  onINP(handleMetric);
  onLCP(handleMetric);
  onFCP(handleMetric);
  onTTFB(handleMetric);
};
