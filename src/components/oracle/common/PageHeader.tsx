'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { TimeRange } from './TabNavigation';
import { ExportModal } from '../forms/ExportModal';
import { ExportOptions } from '@/hooks';
import { useTimeRange } from '@/contexts/TimeRangeContext';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onRefresh: () => void;
  onExport?: (options?: ExportOptions) => void;
  isRefreshing: boolean;
  showTimeRange?: boolean;
  showExport?: boolean;
  lastUpdateTime?: number;
}

const TIME_RANGES: TimeRange[] = ['1H', '24H', '7D', '30D', '90D', '1Y', 'ALL'];

function formatLastUpdate(timestamp: number | undefined): string {
  if (!timestamp) return '';

  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 5000) {
    return '刚刚更新';
  } else if (diff < 60000) {
    return `${Math.floor(diff / 1000)}秒前`;
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  } else {
    return `${Math.floor(diff / 3600000)}小时前`;
  }
}

export function PageHeader({
  title,
  subtitle,
  icon,
  onRefresh,
  onExport,
  isRefreshing,
  showTimeRange = true,
  showExport = true,
  lastUpdateTime,
}: PageHeaderProps) {
  const { t } = useI18n();
  const [showExportModal, setShowExportModal] = useState(false);
  const [displayTime, setDisplayTime] = useState(formatLastUpdate(lastUpdateTime));
  const [showJustUpdated, setShowJustUpdated] = useState(false);
  const { globalTimeRange, setGlobalTimeRange } = useTimeRange();

  useEffect(() => {
    if (lastUpdateTime) {
      setShowJustUpdated(true);
      const timer = setTimeout(() => setShowJustUpdated(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastUpdateTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayTime(formatLastUpdate(lastUpdateTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdateTime]);

  const handleExportClick = () => {
    if (onExport) {
      setShowExportModal(true);
    }
  };

  const handleExportConfirm = (options: ExportOptions) => {
    if (onExport) {
      onExport(options);
    }
    setShowExportModal(false);
  };

  return (
    <>
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
                      onClick={() => setGlobalTimeRange(range)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                        globalTimeRange === range
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {t(`chainlink.timeRange.${range}`)}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all duration-200 disabled:opacity-50 overflow-hidden"
                >
                  {isRefreshing && <span className="absolute inset-0 bg-blue-50 animate-pulse" />}
                  <svg
                    className={`w-4 h-4 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`}
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
                  <span className="hidden sm:inline relative z-10">{t('chainlink.refresh')}</span>
                </button>

                {showJustUpdated && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full animate-pulse">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    刚刚更新
                  </span>
                )}

                {!showJustUpdated && lastUpdateTime && displayTime && (
                  <span className="text-xs text-gray-400">{displayTime}</span>
                )}
              </div>

              {showExport && onExport && (
                <button
                  onClick={handleExportClick}
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

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportConfirm}
        defaultTimeRange={globalTimeRange}
      />
    </>
  );
}
