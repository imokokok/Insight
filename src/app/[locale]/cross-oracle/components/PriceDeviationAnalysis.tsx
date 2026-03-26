'use client';

import { useMemo, useState } from 'react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from 'recharts';

import { getOracleColor } from '@/lib/oracles/colors';
import { type PriceData, type OracleProvider, ORACLE_PROVIDER_VALUES } from '@/types/oracle';

import { calculateZScore, isOutlier } from '../constants';

interface PriceDeviationAnalysisProps {
  priceData: PriceData[];
  avgPrice: number;
  standardDeviation: number;
  oracleChartColors: Record<OracleProvider, string>;
  t: (key: string) => string;
}

interface HistogramBin {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

interface OutlierData {
  provider: OracleProvider;
  price: number;
  deviation: number;
  deviationPercent: number;
  zScore: number;
  timestamp: number;
}

interface DeviationItem {
  provider: OracleProvider;
  price: number;
  deviation: number;
  deviationPercent: number;
  zScore: number | null;
  timestamp: number;
}

interface TimeSeriesPoint {
  timestamp: number;
  timeLabel: string;
  [key: string]: number | string;
}

export function PriceDeviationAnalysis({
  priceData,
  avgPrice,
  standardDeviation,
  oracleChartColors,
  t,
}: PriceDeviationAnalysisProps) {
  const [selectedOutlier, setSelectedOutlier] = useState<OutlierData | null>(null);

  // 计算每个数据点的偏差
  const deviations = useMemo<DeviationItem[]>(() => {
    return priceData
      .filter((d) => d.price > 0)
      .map((d) => {
        const deviation = d.price - avgPrice;
        const deviationPercent = avgPrice > 0 ? (deviation / avgPrice) * 100 : 0;
        const zScore = calculateZScore(d.price, avgPrice, standardDeviation);
        return {
          provider: d.provider,
          price: d.price,
          deviation,
          deviationPercent,
          zScore,
          timestamp: d.timestamp,
        };
      });
  }, [priceData, avgPrice, standardDeviation]);

  // 生成直方图数据
  const histogramData = useMemo(() => {
    if (deviations.length === 0) return [];

    const deviationPercents = deviations.map((d) => d.deviationPercent);
    const min = Math.min(...deviationPercents);
    const max = Math.max(...deviationPercents);
    const binCount = Math.min(10, Math.ceil(Math.sqrt(deviations.length)));
    const binWidth = (max - min) / binCount || 1;

    const bins: HistogramBin[] = [];
    for (let i = 0; i < binCount; i++) {
      const binMin = min + i * binWidth;
      const binMax = min + (i + 1) * binWidth;
      const count = deviationPercents.filter(
        (d) => d >= binMin && (i === binCount - 1 ? d <= binMax : d < binMax)
      ).length;

      bins.push({
        range: `${binMin.toFixed(2)}%~${binMax.toFixed(2)}%`,
        min: binMin,
        max: binMax,
        count,
        percentage: (count / deviations.length) * 100,
      });
    }

    return bins;
  }, [deviations]);

  // 生成时间序列数据
  const timeSeriesData = useMemo(() => {
    const groupedByTime = new Map<number, TimeSeriesPoint>();

    deviations.forEach((d) => {
      const timeKey = Math.floor(d.timestamp / 60000) * 60000;
      if (!groupedByTime.has(timeKey)) {
        groupedByTime.set(timeKey, {
          timestamp: timeKey,
          timeLabel: new Date(timeKey).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      }
      const point = groupedByTime.get(timeKey)!;
      point[d.provider] = d.deviationPercent;
    });

    return Array.from(groupedByTime.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [deviations]);

  // 检测异常值
  const outliers = useMemo<OutlierData[]>(() => {
    return deviations
      .filter(
        (d): d is DeviationItem & { zScore: number } => d.zScore !== null && isOutlier(d.zScore)
      )
      .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  }, [deviations]);

  // 计算统计摘要
  const stats = useMemo(() => {
    if (deviations.length === 0) {
      return {
        maxPositiveDeviation: 0,
        maxNegativeDeviation: 0,
        meanAbsoluteDeviation: 0,
        outlierCount: 0,
        outlierPercentage: 0,
      };
    }

    const deviationPercents = deviations.map((d) => d.deviationPercent);
    const maxPositiveDeviation = Math.max(...deviationPercents);
    const maxNegativeDeviation = Math.min(...deviationPercents);
    const meanAbsoluteDeviation =
      deviationPercents.reduce((sum, d) => sum + Math.abs(d), 0) / deviationPercents.length;

    return {
      maxPositiveDeviation,
      maxNegativeDeviation,
      meanAbsoluteDeviation,
      outlierCount: outliers.length,
      outlierPercentage: (outliers.length / deviations.length) * 100,
    };
  }, [deviations, outliers]);

  // 直方图 Tooltip
  const HistogramTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: HistogramBin }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 p-3 shadow-sm">
        <div className="text-sm font-medium text-gray-900 mb-1">{data.range}</div>
        <div className="text-xs text-gray-600">
          {t('crossOracle.deviationAnalysis.count')}: {data.count}
        </div>
        <div className="text-xs text-gray-600">
          {t('crossOracle.deviationAnalysis.percentage')}: {data.percentage.toFixed(1)}%
        </div>
      </div>
    );
  };

  // 时间序列 Tooltip
  const TimeSeriesTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="bg-white border border-gray-200 p-3 shadow-sm min-w-[200px]">
        <div className="text-sm font-medium text-gray-900 mb-2">{label}</div>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-700">{entry.dataKey}</span>
              </div>
              <span className="font-mono text-gray-900">{entry.value?.toFixed(3)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 统计摘要 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">
            {t('crossOracle.deviationAnalysis.maxPositive')}
          </div>
          <div className="text-lg font-semibold text-success-600">
            +{stats.maxPositiveDeviation.toFixed(3)}%
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">
            {t('crossOracle.deviationAnalysis.maxNegative')}
          </div>
          <div className="text-lg font-semibold text-danger-600">
            {stats.maxNegativeDeviation.toFixed(3)}%
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">
            {t('crossOracle.deviationAnalysis.meanAbsolute')}
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {stats.meanAbsoluteDeviation.toFixed(3)}%
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">
            {t('crossOracle.deviationAnalysis.outliers')}
          </div>
          <div className="text-lg font-semibold text-warning-600">
            {stats.outlierCount} ({stats.outlierPercentage.toFixed(1)}%)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 偏差分布直方图 */}
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">
              {t('crossOracle.deviationAnalysis.histogramTitle')}
            </h4>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-primary-500 rounded-sm" />
                {t('crossOracle.deviationAnalysis.distribution')}
              </span>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<HistogramTooltip />} />
                <Bar dataKey="percentage" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-center gap-6 text-xs text-gray-500">
            <span>
              {t('crossOracle.deviationAnalysis.mean')}:{' '}
              <span className="font-medium text-gray-900">
                {deviations.length > 0
                  ? (
                      deviations.reduce((sum, d) => sum + d.deviationPercent, 0) / deviations.length
                    ).toFixed(3)
                  : 0}
                %
              </span>
            </span>
            <span>
              {t('crossOracle.deviationAnalysis.stdDev')}:{' '}
              <span className="font-medium text-gray-900">
                {standardDeviation > 0 ? ((standardDeviation / avgPrice) * 100).toFixed(3) : 0}%
              </span>
            </span>
          </div>
        </div>

        {/* 时间序列偏差分析 */}
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900">
              {t('crossOracle.deviationAnalysis.timeSeriesTitle')}
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                {t('crossOracle.deviationAnalysis.zScoreThreshold')}: ±2
              </span>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip content={<TimeSeriesTooltip />} />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
                <ReferenceLine
                  y={((standardDeviation * 2) / avgPrice) * 100}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  y={((-standardDeviation * 2) / avgPrice) * 100}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                {ORACLE_PROVIDER_VALUES.map((provider) => (
                  <Line
                    key={provider}
                    type="monotone"
                    dataKey={provider}
                    stroke={oracleChartColors[provider] || getOracleColor(provider)}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 异常值检测面板 */}
      <div className="bg-white border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900">
            {t('crossOracle.deviationAnalysis.outliersTitle')}
          </h4>
          <span className="text-xs text-gray-500">
            {t('crossOracle.deviationAnalysis.totalOutliers')}: {outliers.length}
          </span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {outliers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              {t('crossOracle.deviationAnalysis.noOutliers')}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    {t('crossOracle.deviationAnalysis.oracle')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                    {t('crossOracle.deviationAnalysis.price')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                    {t('crossOracle.deviationAnalysis.deviation')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                    {t('crossOracle.deviationAnalysis.zScore')}
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                    {t('crossOracle.deviationAnalysis.action')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {outliers.map((outlier, index) => (
                  <tr
                    key={`${outlier.provider}-${index}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: oracleChartColors[outlier.provider] }}
                        />
                        <span className="font-medium text-gray-900">{outlier.provider}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-900">
                      ${outlier.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-mono ${
                        outlier.deviationPercent >= 0 ? 'text-success-600' : 'text-danger-600'
                      }`}
                    >
                      {outlier.deviationPercent >= 0 ? '+' : ''}
                      {outlier.deviationPercent.toFixed(3)}%
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          outlier.zScore > 0
                            ? 'bg-danger-50 text-danger-700'
                            : 'bg-success-50 text-success-700'
                        }`}
                      >
                        {outlier.zScore > 0 ? '+' : ''}
                        {outlier.zScore.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => setSelectedOutlier(outlier)}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {t('crossOracle.deviationAnalysis.view')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 异常值详情弹窗 */}
      {selectedOutlier && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedOutlier(null)}
        >
          <div
            className="bg-white border border-gray-200 p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                {t('crossOracle.deviationAnalysis.outlierDetail')}
              </h4>
              <button
                onClick={() => setSelectedOutlier(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('crossOracle.deviationAnalysis.oracle')}</span>
                <span className="font-medium text-gray-900">{selectedOutlier.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('crossOracle.deviationAnalysis.price')}</span>
                <span className="font-mono text-gray-900">
                  ${selectedOutlier.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('crossOracle.deviationAnalysis.avgPrice')}</span>
                <span className="font-mono text-gray-900">
                  ${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {t('crossOracle.deviationAnalysis.deviation')}
                </span>
                <span
                  className={`font-mono ${
                    selectedOutlier.deviationPercent >= 0 ? 'text-success-600' : 'text-danger-600'
                  }`}
                >
                  {selectedOutlier.deviationPercent >= 0 ? '+' : ''}
                  {selectedOutlier.deviationPercent.toFixed(4)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('crossOracle.deviationAnalysis.zScore')}</span>
                <span
                  className={`font-mono ${
                    Math.abs(selectedOutlier.zScore) > 2 ? 'text-danger-600' : 'text-gray-900'
                  }`}
                >
                  {selectedOutlier.zScore > 0 ? '+' : ''}
                  {selectedOutlier.zScore.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {t('crossOracle.deviationAnalysis.timestamp')}
                </span>
                <span className="text-gray-900">
                  {new Date(selectedOutlier.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                {Math.abs(selectedOutlier.zScore) > 3
                  ? t('crossOracle.deviationAnalysis.severeOutlier')
                  : t('crossOracle.deviationAnalysis.moderateOutlier')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
