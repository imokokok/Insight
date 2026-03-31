'use client';

import { useEffect, useState, useCallback } from 'react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { usePerformanceOptimizer } from '@/hooks/usePerformanceOptimizer';
import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMonitorProps {
  enabled?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  showDetails?: boolean;
  className?: string;
  onPerformanceIssue?: (issue: string) => void;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  status: 'good' | 'warning' | 'critical';
  description?: string;
}

// ============================================================================
// Metric Card Component
// ============================================================================

function MetricCard({ label, value, unit, status, description }: MetricCardProps) {
  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    critical: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={cn('p-3 rounded-lg border', statusColors[status])}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-lg font-semibold">
        {value}
        {unit && <span className="text-sm ml-1">{unit}</span>}
      </div>
      {description && <div className="text-xs mt-1 opacity-70">{description}</div>}
    </div>
  );
}

// ============================================================================
// Performance Monitor Component
// ============================================================================

export function PerformanceMonitor({
  enabled = true,
  position = 'bottom-right',
  showDetails = false,
  className,
  onPerformanceIssue,
}: PerformanceMonitorProps) {
  const t = useTranslations('performance');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const performance = usePerformanceOptimizer();

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // Report performance issues
  useEffect(() => {
    if (!enabled || !onPerformanceIssue) return;

    const { webVitals, memory } = performance;

    if (webVitals.metrics.fcp && webVitals.metrics.fcp > 1800) {
      onPerformanceIssue('FCP_TOO_SLOW');
    }
    if (webVitals.metrics.lcp && webVitals.metrics.lcp > 2500) {
      onPerformanceIssue('LCP_TOO_SLOW');
    }
    if (memory.isCritical) {
      onPerformanceIssue('MEMORY_CRITICAL');
    }
  }, [performance, enabled, onPerformanceIssue]);

  const getMetricStatus = useCallback(
    (value: number | undefined, thresholds: { good: number; poor: number }) => {
      if (value === undefined) return 'good';
      if (value <= thresholds.good) return 'good';
      if (value <= thresholds.poor) return 'warning';
      return 'critical';
    },
    []
  );

  if (!enabled || !isVisible) return null;

  const { webVitals, resources, navigation, memory, health } = performance;

  return (
    <div className={cn('fixed z-50', positionClasses[position], className)}>
      {/* Collapsed View */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border transition-colors',
            health === 'excellent' && 'bg-green-50 border-green-200 text-green-700',
            health === 'good' && 'bg-blue-50 border-blue-200 text-blue-700',
            health === 'fair' && 'bg-yellow-50 border-yellow-200 text-yellow-700',
            health === 'poor' && 'bg-red-50 border-red-200 text-red-700'
          )}
        >
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                health === 'excellent' && 'bg-green-500',
                health === 'good' && 'bg-blue-500',
                health === 'fair' && 'bg-yellow-500',
                health === 'poor' && 'bg-red-500'
              )}
            />
            <span className="text-sm font-medium capitalize">{t(`health.${health}`)}</span>
          </div>
          <span className="text-xs opacity-60">{t('clickForDetails')}</span>
        </button>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <Card className="w-80 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{t('title')}</CardTitle>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Web Vitals */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2">{t('webVitals')}</h4>
              <div className="grid grid-cols-2 gap-2">
                <MetricCard
                  label="FCP"
                  value={webVitals.metrics.fcp ? Math.round(webVitals.metrics.fcp) : '-'}
                  unit="ms"
                  status={getMetricStatus(webVitals.metrics.fcp, { good: 1800, poor: 3000 })}
                />
                <MetricCard
                  label="LCP"
                  value={webVitals.metrics.lcp ? Math.round(webVitals.metrics.lcp) : '-'}
                  unit="ms"
                  status={getMetricStatus(webVitals.metrics.lcp, { good: 2500, poor: 4000 })}
                />
                <MetricCard
                  label="FID"
                  value={webVitals.metrics.fid ? Math.round(webVitals.metrics.fid) : '-'}
                  unit="ms"
                  status={getMetricStatus(webVitals.metrics.fid, { good: 100, poor: 300 })}
                />
                <MetricCard
                  label="CLS"
                  value={webVitals.metrics.cls ? webVitals.metrics.cls.toFixed(3) : '-'}
                  status={getMetricStatus(webVitals.metrics.cls, { good: 0.1, poor: 0.25 })}
                />
              </div>
            </div>

            {/* Memory */}
            {memory.memory && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">{t('memory')}</h4>
                <MetricCard
                  label={t('heapUsage')}
                  value={memory.formatSize(memory.memory.used)}
                  status={memory.isCritical ? 'critical' : memory.isHighUsage ? 'warning' : 'good'}
                  description={t('percentageOfLimit', {
                    percentage: memory.memory.percentage.toFixed(1),
                  })}
                />
              </div>
            )}

            {/* Resources */}
            {showDetails && resources.resources.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">{t('resources')}</h4>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>{t('totalResources')}:</span>
                    <span>{resources.resources.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('slowResources')}:</span>
                    <span className={resources.slowResources.length > 0 ? 'text-red-600' : ''}>
                      {resources.slowResources.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('totalSize')}:</span>
                    <span>{(resources.totalSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            {showDetails && navigation.timing && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">{t('navigation')}</h4>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>{t('totalTime')}:</span>
                    <span>{Math.round(navigation.timing.total)}ms</span>
                  </div>
                  {navigation.bottleneck && (
                    <div className="flex justify-between text-yellow-600">
                      <span>{t('bottleneck')}:</span>
                      <span>{navigation.bottleneck.name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {webVitals.suggestions.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">{t('suggestions')}</h4>
                <div className="space-y-2">
                  {webVitals.suggestions.slice(0, 2).map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className={cn(
                        'text-xs p-2 rounded border',
                        suggestion.type === 'critical' && 'bg-red-50 border-red-200 text-red-700',
                        suggestion.type === 'warning' &&
                          'bg-yellow-50 border-yellow-200 text-yellow-700',
                        suggestion.type === 'info' && 'bg-blue-50 border-blue-200 text-blue-700'
                      )}
                    >
                      <div className="font-medium">{suggestion.title}</div>
                      <div className="opacity-80 mt-0.5">{suggestion.recommendation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
