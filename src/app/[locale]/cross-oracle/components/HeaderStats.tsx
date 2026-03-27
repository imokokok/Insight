'use client';

import { useMemo } from 'react';

interface HeaderStatsProps {
  selectedSymbol: string;
  selectedOracles: string[];
  avgPrice: number;
  changePercent: number | null;
  qualityScoreData: {
    freshness: { lastUpdated: Date };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number };
  };
  t: (key: string) => string;
}

export function HeaderStats({
  selectedSymbol,
  selectedOracles,
  avgPrice,
  changePercent,
  qualityScoreData,
  t,
}: HeaderStatsProps) {
  const formattedPrice = useMemo(() => {
    if (avgPrice <= 0) return '-';
    return `$${avgPrice.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, [avgPrice]);

  const formattedChange = useMemo(() => {
    if (changePercent === null) return null;
    const isPositive = changePercent >= 0;
    const sign = isPositive ? '+' : '';
    return {
      text: `${sign}${changePercent.toFixed(2)}%`,
      isPositive,
    };
  }, [changePercent]);

  const qualityScore = useMemo(() => {
    const { completeness, reliability } = qualityScoreData;
    const completenessScore =
      completeness.totalCount > 0 ? (completeness.successCount / completeness.totalCount) * 100 : 0;
    const reliabilityScore = (reliability.historicalAccuracy + reliability.responseSuccessRate) / 2;
    return ((completenessScore + reliabilityScore) / 2).toFixed(1);
  }, [qualityScoreData]);

  const lastUpdatedTime = useMemo(() => {
    return qualityScoreData.freshness.lastUpdated.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [qualityScoreData.freshness.lastUpdated]);

  const oracleCount = selectedOracles.length;

  return (
    <div className="bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Top Section: Live Badge + Description */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Live
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('crossOracle.subtitle')}
        </span>
      </div>

      {/* Middle Section: Symbol + Price */}
      <div className="px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          {/* Symbol */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {selectedSymbol}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t('crossOracle.realtimeComparison')}
            </p>
          </div>

          {/* Price */}
          <div className="text-left sm:text-right">
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
              {formattedPrice}
            </p>
            {formattedChange && (
              <div className="flex items-center gap-1 sm:justify-end mt-0.5">
                <svg
                  className={`w-3.5 h-3.5 ${formattedChange.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      formattedChange.isPositive
                        ? 'M5 10l7-7m0 0l7 7m-7-7v18'
                        : 'M19 14l-7 7m0 0l-7-7m7 7V3'
                    }
                  />
                </svg>
                <span
                  className={`text-sm font-medium ${formattedChange.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                >
                  {formattedChange.text}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Key Metrics */}
      <div className="px-4 sm:px-6 py-3 bg-gray-50/80 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {/* Oracle Count */}
          <div className="flex flex-col items-center sm:items-start p-2 sm:p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
            <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tabular-nums">
              {oracleCount}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('crossOracle.oracles')}
            </span>
          </div>

          {/* Quality Score */}
          <div className="flex flex-col items-center sm:items-start p-2 sm:p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
            <span className="text-lg sm:text-xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">
              {qualityScore}%
            </span>
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('crossOracle.quality')}
            </span>
          </div>

          {/* Last Updated */}
          <div className="flex flex-col items-center sm:items-start p-2 sm:p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
            <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tabular-nums">
              {lastUpdatedTime}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('crossOracle.updated') || 'Updated'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
