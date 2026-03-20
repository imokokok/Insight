'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { OracleProvider } from '@/types/oracle';
import { baseColors, chartColors } from '@/lib/config/colors';
import { oracleNames, oracleColors, PriceComparisonData } from './crossOracleConfig';


interface PriceStats {
  avg: number;
  max: number;
  min: number;
  range: number;
  stdDev: number;
  median: number;
}

interface DeviationAlert {
  provider: OracleProvider;
  name: string;
  deviation: number;
  price: number;
}

interface OverviewTabProps {
  consistencyScore: number;
  priceStats: PriceStats | null;
  deviationAlerts: DeviationAlert[];
  priceData: PriceComparisonData[];
  selectedOracles: OracleProvider[];
  getConsistencyLabel: (score: number) => string;
  getConsistencyColor: (score: number) => string;
  extendedStats: {
    maxDeviation: number;
    maxPriceOracle?: { name: string };
    minPriceOracle?: { name: string };
    avgResponseTime: number;
  } | null;
}

export function OverviewTab({
  consistencyScore,
  priceStats,
  deviationAlerts,
  priceData,
  selectedOracles,
  getConsistencyLabel,
  getConsistencyColor,
  extendedStats,
}: OverviewTabProps) {
  const t = useTranslations();

  const chartData = priceData.map((data) => ({
    name: oracleNames[data.provider],
    price: data.price,
    color: oracleColors[data.provider],
  }));

  return (
    <div className="space-y-6">
      {/* 核心指标 - 卡片网格 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 一致性评分 */}
        <div className="bg-slate-50/50 p-5 transition-colors hover:bg-slate-50">
          <p className="text-xs font-normal text-gray-400 mb-2">
            {t('crossOracleComparison.consistencyScore')}
          </p>
          <p className={`text-3xl font-semibold ${getConsistencyColor(consistencyScore)}`}>
            {consistencyScore}
          </p>
          <p className="text-xs text-gray-400 mt-1">{getConsistencyLabel(consistencyScore)}</p>
        </div>

        {/* 平均价格 */}
        {priceStats && (
          <div className="bg-slate-50/50 p-5 transition-colors hover:bg-slate-50">
            <p className="text-xs font-normal text-gray-400 mb-2">
              {t('crossOracle.averagePrice')}
            </p>
            <p className="text-3xl font-semibold text-gray-900">${priceStats.avg.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t('crossOracle.range')}: ${priceStats.range.toFixed(2)}
            </p>
          </div>
        )}

        {/* 价格范围 */}
        {priceStats && (
          <div className="bg-slate-50/50 p-5 transition-colors hover:bg-slate-50">
            <p className="text-xs font-normal text-gray-400 mb-2">{t('crossOracle.priceRange')}</p>
            <p className="text-3xl font-semibold text-gray-900">${priceStats.range.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {((priceStats.range / priceStats.avg) * 100).toFixed(2)}%
            </p>
          </div>
        )}

        {/* 最大偏差 */}
        {extendedStats && (
          <div className="bg-slate-50/50 p-5 transition-colors hover:bg-slate-50">
            <p className="text-xs font-normal text-gray-400 mb-2">
              {t('crossOracle.stats.maxPriceDifference')}
            </p>
            <p className="text-3xl font-semibold text-amber-600">
              {extendedStats.maxDeviation.toFixed(3)}%
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t('crossOracle.stats.deviationFromAverage')}
            </p>
          </div>
        )}
      </div>

      {/* 偏差警告 */}
      {deviationAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"
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
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-medium text-amber-800 mb-2">
                {t('crossOracle.priceDeviationAlert')} ({deviationAlerts.length})
              </h3>
              <div className="space-y-1.5">
                {deviationAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.provider} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2 h-2 flex-shrink-0"
                      style={{ backgroundColor: oracleColors[alert.provider] }}
                    />
                    <span className="text-gray-700 truncate">{alert.name}</span>
                    <span className="text-gray-500">{alert.deviation.toFixed(3)}%</span>
                  </div>
                ))}
                {deviationAlerts.length > 3 && (
                  <p className="text-xs text-gray-500">
                    +{deviationAlerts.length - 3} {t('crossOracle.more')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 价格对比图表 */}
      {chartData.length > 0 && (
        <div className="bg-slate-50/30 p-5">
          <h3 className="text-xs font-normal text-gray-500 mb-4">
            {t('crossOracle.currentPriceComparison')}
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={baseColors.gray[200]}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, t('crossOracle.price')]}
                  contentStyle={{
                    fontSize: 12,
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 选中预言机列表 */}
      <div className="bg-slate-50/30 p-5">
        <h3 className="text-xs font-normal text-gray-500 mb-3">
          {t('crossOracle.selectedOracles')} ({selectedOracles.length}/5)
        </h3>
        <div className="flex flex-wrap gap-2">
          {selectedOracles.map((provider) => (
            <div
              key={provider}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-xs text-gray-700"
            >
              <div className="w-2 h-2" style={{ backgroundColor: oracleColors[provider] }} />
              <span>{oracleNames[provider]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
