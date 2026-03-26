'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useTranslations } from '@/i18n';
import { TimeRange } from '@/components/oracle/shared/TabNavigation';
import { ExportModal } from '../forms/ExportModal';
import { ExportOptions } from '@/hooks';
import { useGlobalTimeRange, useSetGlobalTimeRange } from '@/stores/uiStore';

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

function formatLastUpdate(
  timestamp: number | undefined,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (!timestamp) return '';

  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 5000) {
    return t('time.justUpdated');
  } else if (diff < 60000) {
    return t('time.secondsAgo', { seconds: Math.floor(diff / 1000) });
  } else if (diff < 3600000) {
    return t('time.minutesAgo', { minutes: Math.floor(diff / 60000) });
  } else {
    return t('time.hoursAgo', { hours: Math.floor(diff / 3600000) });
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
  const t = useTranslations();
  const [showExportModal, setShowExportModal] = useState(false);
  const [displayTime, setDisplayTime] = useState(formatLastUpdate(lastUpdateTime, t));
  const [showJustUpdated, setShowJustUpdated] = useState(false);
  const globalTimeRange = useGlobalTimeRange();
  const setGlobalTimeRange = useSetGlobalTimeRange();

  useEffect(() => {
    if (lastUpdateTime) {
      setShowJustUpdated(true);
      const timer = setTimeout(() => setShowJustUpdated(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastUpdateTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayTime(formatLastUpdate(lastUpdateTime, t));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdateTime, t]);

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
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              {icon && <div className="flex-shrink-0">{icon}</div>}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {showTimeRange && (
                <div className="flex items-center">
                  {TIME_RANGES.map((range) => (
                    <button
                      key={range}
                      onClick={() => setGlobalTimeRange(range)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        globalTimeRange === range
                          ? 'text-gray-900 border-b-2 border-gray-900'
                          : 'text-gray-500 hover:text-gray-700'
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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:border-gray-400 hover:text-gray-900 transition-colors disabled:opacity-50"
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
                      strokeWidth={1.5}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span className="hidden sm:inline">{t('chainlink.refresh')}</span>
                </button>

                {showExport && onExport && (
                  <button
                    onClick={handleExportClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:border-gray-400 hover:text-gray-900 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span className="hidden sm:inline">{t('chainlink.export')}</span>
                  </button>
                )}
              </div>

              {showJustUpdated && (
                <span className="text-xs text-success-600">{t('time.justUpdated')}</span>
              )}

              {!showJustUpdated && lastUpdateTime && displayTime && (
                <span className="text-xs text-gray-400">{displayTime}</span>
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
