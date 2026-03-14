'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { ValidatorHistoryData } from '@/lib/oracles/uma';
import { chartColors } from '@/lib/config/colors';
import { TimeRange, TIME_RANGE_OPTIONS } from './config';

export function ValidatorHistoryChart({
  data,
  timeRange,
  onTimeRangeChange,
}: {
  data: ValidatorHistoryData[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}) {
  const { t } = useI18n();
  const [activeMetric, setActiveMetric] = useState<'successRate' | 'responseTime' | 'reputation'>(
    'successRate'
  );

  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-900 text-sm font-semibold">
              {t('uma.validatorAnalytics.historyTrend')}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              {t('uma.validatorAnalytics.performanceHistory')}
            </p>
          </div>
        </div>
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          {t('uma.validatorAnalytics.noData')}
        </div>
      </div>
    );
  }

  const maxSuccessRate = Math.max(...data.map((d) => d.successRate));
  const minSuccessRate = Math.min(...data.map((d) => d.successRate));
  const maxResponseTime = Math.max(...data.map((d) => d.responseTime));
  const minResponseTime = Math.min(...data.map((d) => d.responseTime));
  const maxReputation = Math.max(...data.map((d) => d.reputation));
  const minReputation = Math.min(...data.map((d) => d.reputation));

  const getNormalizedValue = (value: number, min: number, max: number) => {
    if (max === min) return 50;
    return ((value - min) / (max - min)) * 80 + 10;
  };

  const createPath = (metric: keyof ValidatorHistoryData) => {
    if (data.length < 2) return '';

    let minVal: number, maxVal: number;
    switch (metric) {
      case 'successRate':
        minVal = minSuccessRate;
        maxVal = maxSuccessRate;
        break;
      case 'responseTime':
        minVal = minResponseTime;
        maxVal = maxResponseTime;
        break;
      case 'reputation':
        minVal = minReputation;
        maxVal = maxReputation;
        break;
      default:
        return '';
    }

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - getNormalizedValue(d[metric] as number, minVal, maxVal);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'successRate':
        return chartColors.semantic.success;
      case 'responseTime':
        return chartColors.recharts.primary;
      case 'reputation':
        return chartColors.recharts.purple;
      default:
        return chartColors.semantic.neutral;
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'successRate':
        return t('uma.validatorAnalytics.successRate');
      case 'responseTime':
        return t('uma.validatorAnalytics.responseTime');
      case 'reputation':
        return t('uma.validatorAnalytics.reputation');
      default:
        return metric;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('uma.validatorAnalytics.historyTrend')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {t('uma.validatorAnalytics.performanceHistory')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {TIME_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onTimeRangeChange(option.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                timeRange === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {(['successRate', 'responseTime', 'reputation'] as const).map((metric) => (
          <button
            key={metric}
            onClick={() => setActiveMetric(metric)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeMetric === metric
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getMetricColor(metric) }}
            />
            {getMetricLabel(metric)}
          </button>
        ))}
      </div>

      <div className="h-48 relative">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`gradient-${activeMetric}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getMetricColor(activeMetric)} stopOpacity="0.3" />
              <stop offset="100%" stopColor={getMetricColor(activeMetric)} stopOpacity="0" />
            </linearGradient>
          </defs>

          <g className="text-gray-200">
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="currentColor"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            ))}
          </g>

          <path
            d={`${createPath(activeMetric)} L 100,100 L 0,100 Z`}
            fill={`url(#gradient-${activeMetric})`}
            opacity="0.5"
          />

          <path
            d={createPath(activeMetric)}
            fill="none"
            stroke={getMetricColor(activeMetric)}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((d, i) => {
            let value: number, minVal: number, maxVal: number;
            switch (activeMetric) {
              case 'successRate':
                value = d.successRate;
                minVal = minSuccessRate;
                maxVal = maxSuccessRate;
                break;
              case 'responseTime':
                value = d.responseTime;
                minVal = minResponseTime;
                maxVal = maxResponseTime;
                break;
              case 'reputation':
                value = d.reputation;
                minVal = minReputation;
                maxVal = maxReputation;
                break;
              default:
                return null;
            }

            const x = (i / (data.length - 1)) * 100;
            const y = 100 - getNormalizedValue(value, minVal, maxVal);

            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r="2"
                  fill={getMetricColor(activeMetric)}
                  className="hover:r-3 transition-all"
                />
              </g>
            );
          })}
        </svg>

        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 px-2">
          <span>{data[0]?.date}</span>
          <span>{data[Math.floor(data.length / 2)]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">
              {t('uma.validatorAnalytics.avgSuccessRate')}
            </p>
            <p className="text-sm font-semibold text-green-600">
              {(data.reduce((sum, d) => sum + d.successRate, 0) / data.length).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">
              {t('uma.validatorAnalytics.avgResponseTime')}
            </p>
            <p className="text-sm font-semibold text-blue-600">
              {Math.round(data.reduce((sum, d) => sum + d.responseTime, 0) / data.length)}ms
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">
              {t('uma.validatorAnalytics.avgReputation')}
            </p>
            <p className="text-sm font-semibold text-purple-600">
              {Math.round(data.reduce((sum, d) => sum + d.reputation, 0) / data.length)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
