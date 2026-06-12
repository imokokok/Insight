import * as Sentry from '@sentry/nextjs';
import { track } from '@vercel/analytics';
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric, type CLSMetric } from 'web-vitals';

import { env } from '@/lib/config/env';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType?: string;
}

type MetricHandler = (metric: WebVitalMetric) => void;

const handlers: MetricHandler[] = [];

const sendToAnalytics = (metric: WebVitalMetric) => {
  if (env.app.isDevelopment) {
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

export const initWebVitals = () => {
  if (typeof window === 'undefined') return;

  onCLS(handleMetric);
  onINP(handleMetric);
  onLCP(handleMetric);
  onFCP(handleMetric);
  onTTFB(handleMetric);
};
