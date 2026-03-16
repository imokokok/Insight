import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';
import * as Sentry from '@sentry/nextjs';

type WebVitalMetric = {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
};

type MetricHandler = (metric: WebVitalMetric) => void;

const handlers: MetricHandler[] = [];

export const onMetric = (handler: MetricHandler) => {
  handlers.push(handler);
  return () => {
    const index = handlers.indexOf(handler);
    if (index > -1) handlers.splice(index, 1);
  };
};

const sendToAnalytics = (metric: WebVitalMetric) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[WebVital]', metric.name, metric.value, metric.rating);
  }
  
  Sentry.metrics.distribution(metric.name, metric.value);
};

const handleMetric = (metric: Metric) => {
  const webVitalMetric: WebVitalMetric = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  };
  
  handlers.forEach((handler) => handler(webVitalMetric));
  sendToAnalytics(webVitalMetric);
};

export const reportMetric = (metric: WebVitalMetric) => {
  handlers.forEach((handler) => handler(metric));
  sendToAnalytics(metric);
};

export const initWebVitals = () => {
  if (typeof window === 'undefined') return;
  
  onCLS(handleMetric);
  onINP(handleMetric);
  onLCP(handleMetric);
  onFCP(handleMetric);
  onTTFB(handleMetric);
};
