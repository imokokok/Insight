'use client';

import { OracleProvider } from '@/types/oracle';

interface OutlierStats {
  count: number;
  avgDeviation: number;
  outliers: { index: number; provider: OracleProvider; zScore: number; deviation: number }[];
  oracleNames: string[];
}

interface StatsOverviewProps {
  outlierStats: OutlierStats;
  scrollToOutlier: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function StatsOverview({ outlierStats, scrollToOutlier, t }: StatsOverviewProps) {
  if (outlierStats.count === 0) return null;

  return (
    <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 border border-amber-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-amber-800">
                {t('crossOracle.outliers.detected')}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                {t('crossOracle.outliers.count', { count: outlierStats.count })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-amber-700">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-600 font-medium">
                  {t('crossOracle.outliers.outlierOracles')}:
                </span>
                <span className="font-medium">
                  {outlierStats.oracleNames.slice(0, 3).join('、')}
                  {outlierStats.oracleNames.length > 3 &&
                    ` ${t('crossOracle.outliers.andMore', { count: outlierStats.oracleNames.length })}`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-600 font-medium">
                  {t('crossOracle.outliers.avgDeviation')}:
                </span>
                <span className="font-medium">{outlierStats.avgDeviation.toFixed(3)}%</span>
              </div>
            </div>
          </div>
          <button
            onClick={scrollToOutlier}
            className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors border border-amber-200"
          >
            {t('crossOracle.outliers.viewDetails')}
          </button>
        </div>
      </div>
    </div>
  );
}
