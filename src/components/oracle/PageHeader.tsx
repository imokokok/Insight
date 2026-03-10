'use client';

import { ReactNode, useMemo, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { TimeRange } from './TabNavigation';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  onRefresh: () => void;
  onExport?: () => void;
  isRefreshing: boolean;
  showTimeRange?: boolean;
  showExport?: boolean;
}

const TIME_RANGES: TimeRange[] = ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'];

export function PageHeader({
  title,
  subtitle,
  icon,
  timeRange,
  onTimeRangeChange,
  onRefresh,
  onExport,
  isRefreshing,
  showTimeRange = true,
  showExport = true,
}: PageHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {icon && <div className="flex-shrink-0">{icon}</div>}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {showTimeRange && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range}
                    onClick={() => onTimeRangeChange(range)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      timeRange === range
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {t(`chainlink.timeRange.${range}`)}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">{t('chainlink.refresh')}</span>
            </button>

            {showExport && onExport && (
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span className="hidden sm:inline">{t('chainlink.export')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
