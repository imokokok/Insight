'use client';

import { useState, useEffect, useCallback } from 'react';

import { env } from '@/lib/config/env';
import { useTranslations } from '@/i18n';

import {
  usePerformanceMonitoring,
  getMetricRatingDisplay,
  getWebVitalRatingDisplay,
  type PerformanceThresholds,
} from '../utils/performanceMonitoring';

import type { CacheStats } from '../utils/cacheUtils';

interface PerformanceIndicatorProps {
  queryResponseTime?: number | null;
  dataProcessingTime?: number | null;
  validationTime?: number | null;
  className?: string;
}

interface MetricDisplay {
  label: string;
  value: number | null;
  unit: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  color: string;
  ratingLabel: string;
}

export function PerformanceIndicator({
  queryResponseTime,
  dataProcessingTime,
  validationTime,
  className = '',
}: PerformanceIndicatorProps) {
  const t = useTranslations();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);

  const { getCacheStats, getPerformanceSnapshot } = usePerformanceMonitoring();

  useEffect(() => {
    const stored = localStorage.getItem('price-query-debug-mode');
    setDebugMode(stored === 'true');

    const handleStorageChange = () => {
      const updated = localStorage.getItem('price-query-debug-mode');
      setDebugMode(updated === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (env.app.isDevelopment || debugMode) {
      setIsVisible(true);
    }
  }, [debugMode]);

  useEffect(() => {
    if (!isVisible) return;

    const updateStats = () => {
      setCacheStats(getCacheStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [isVisible, getCacheStats]);

  const toggleDebugMode = useCallback(() => {
    const newMode = !debugMode;
    setDebugMode(newMode);
    localStorage.setItem('price-query-debug-mode', String(newMode));
  }, [debugMode]);

  const getMetricDisplay = useCallback(
    (
      label: string,
      value: number | null | undefined,
      unit: string,
      metricKey?: keyof PerformanceThresholds
    ): MetricDisplay => {
      if (value === null || value === undefined) {
        return {
          label,
          value: null,
          unit,
          rating: 'good',
          color: 'text-gray-400',
          ratingLabel: t('performanceIndicator.ratings.noData'),
        };
      }

      const {
        rating,
        color,
        label: metricLabel,
      } = metricKey
        ? getMetricRatingDisplay(metricKey, value)
        : { rating: 'good' as const, color: 'text-gray-400', label: t('performanceIndicator.ratings.unknown') };

      return {
        label,
        value,
        unit,
        rating,
        color,
        ratingLabel: metricLabel,
      };
    },
    []
  );

  const formatValue = (value: number | null, unit: string): string => {
    if (value === null) return '-';
    if (unit === 'ms') {
      if (value < 1000) return `${value.toFixed(0)}ms`;
      return `${(value / 1000).toFixed(2)}s`;
    }
    if (unit === '%') return `${(value * 100).toFixed(1)}%`;
    return `${value.toFixed(0)}${unit}`;
  };

  const metrics: MetricDisplay[] = [
    getMetricDisplay(t('performanceIndicator.metrics.queryResponse'), queryResponseTime, 'ms', 'queryResponseTime'),
    getMetricDisplay(t('performanceIndicator.metrics.dataProcessing'), dataProcessingTime, 'ms', 'dataProcessingTime'),
    getMetricDisplay(t('performanceIndicator.metrics.dataValidation'), validationTime, 'ms', 'validationTime'),
  ];

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded((prev) => !prev);
    }
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`text-xs ${className}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={handleKeyDown}
          className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-expanded={isExpanded}
          aria-label={t('performanceIndicator.panelLabel')}
        >
          <svg
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-mono">{t('performanceIndicator.title')}</span>
        </button>

        <button
          type="button"
          onClick={toggleDebugMode}
          className={`px-2 py-1 rounded text-xs ${
            debugMode
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {debugMode ? t('performanceIndicator.debugOn') : t('performanceIndicator.debugOff')}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="flex flex-col">
                <span className="text-gray-500 dark:text-gray-400">{metric.label}</span>
                <div className="flex items-baseline gap-1">
                  <span className={`font-mono font-medium ${metric.color}`}>
                    {formatValue(metric.value, metric.unit)}
                  </span>
                  <span className={`text-xs ${metric.color}`}>{metric.ratingLabel}</span>
                </div>
              </div>
            ))}

            {cacheStats && (
              <div className="flex flex-col">
                <span className="text-gray-500 dark:text-gray-400">{t('performanceIndicator.metrics.cacheHitRate')}</span>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`font-mono font-medium ${
                      cacheStats.hitRate >= 0.7
                        ? 'text-green-500'
                        : cacheStats.hitRate >= 0.3
                          ? 'text-yellow-500'
                          : 'text-red-500'
                    }`}
                  >
                    {formatValue(cacheStats.hitRate, '%')}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({cacheStats.hits}/{cacheStats.hits + cacheStats.misses})
                  </span>
                </div>
              </div>
            )}

            {cacheStats && (
              <div className="flex flex-col">
                <span className="text-gray-500 dark:text-gray-400">{t('performanceIndicator.metrics.cacheSize')}</span>
                <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                  {cacheStats.size} / {cacheStats.maxSize}
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-400">
              <span>{t('performanceIndicator.thresholds')}: </span>
              <span className="text-green-500">{t('performanceIndicator.ratings.good')}</span>
              <span> / </span>
              <span className="text-yellow-500">{t('performanceIndicator.ratings.needsImprovement')}</span>
              <span> / </span>
              <span className="text-red-500">{t('performanceIndicator.ratings.poor')}</span>
            </div>
            <div className="mt-1 text-xs text-gray-400 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {t('performanceIndicator.reference')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface WebVitalsDisplayProps {
  className?: string;
}

export function WebVitalsDisplay({ className = '' }: WebVitalsDisplayProps) {
  const [vitals, setVitals] = useState<{
    fcp: number | null;
    lcp: number | null;
    inp: number | null;
    cls: number | null;
  }>({
    fcp: null,
    lcp: null,
    inp: null,
    cls: null,
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!env.app.isDevelopment) {
      const stored = localStorage.getItem('price-query-debug-mode');
      if (stored !== 'true') return;
    }
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const updateVitals = () => {
      const paintEntries = performance.getEntriesByType('paint');
      let fcp: number | null = null;

      paintEntries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          fcp = entry.startTime;
        }
      });

      setVitals((prev) => ({
        ...prev,
        fcp,
      }));
    };

    updateVitals();

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          setVitals((prev) => ({ ...prev, lcp: entry.startTime }));
        }
        if (entry.entryType === 'layout-shift') {
          const lsEntry = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
          if (!lsEntry.hadRecentInput) {
            setVitals((prev) => ({ ...prev, cls: (prev.cls || 0) + lsEntry.value }));
          }
        }
        if (entry.entryType === 'first-input') {
          const fiEntry = entry as PerformanceEntry & {
            processingStart: number;
            processingEnd: number;
          };
          setVitals((prev) => ({
            ...prev,
            inp: fiEntry.processingEnd - fiEntry.processingStart,
          }));
        }
      }
    });

    try {
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      observer.observe({ type: 'layout-shift', buffered: true });
      observer.observe({ type: 'first-input', buffered: true });
    } catch {
      // Observer not supported
    }

    return () => observer.disconnect();
  }, [isVisible]);

  if (!isVisible) return null;

  const formatMs = (value: number | null): string => {
    if (value === null) return '-';
    return `${value.toFixed(0)}ms`;
  };

  const formatCls = (value: number | null): string => {
    if (value === null) return '-';
    return value.toFixed(3);
  };

  return (
    <div className={`text-xs ${className}`}>
      <div className="grid grid-cols-4 gap-2">
        <div className="flex flex-col">
          <span className="text-gray-500">FCP</span>
          <span
            className={`font-mono ${
              vitals.fcp ? getWebVitalRatingDisplay('FCP', vitals.fcp).color : 'text-gray-400'
            }`}
          >
            {formatMs(vitals.fcp)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">LCP</span>
          <span
            className={`font-mono ${
              vitals.lcp ? getWebVitalRatingDisplay('LCP', vitals.lcp).color : 'text-gray-400'
            }`}
          >
            {formatMs(vitals.lcp)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">INP</span>
          <span
            className={`font-mono ${
              vitals.inp ? getWebVitalRatingDisplay('INP', vitals.inp).color : 'text-gray-400'
            }`}
          >
            {formatMs(vitals.inp)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500">CLS</span>
          <span
            className={`font-mono ${
              vitals.cls !== null
                ? getWebVitalRatingDisplay('CLS', vitals.cls).color
                : 'text-gray-400'
            }`}
          >
            {formatCls(vitals.cls)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default PerformanceIndicator;
