'use client';

import { useState, useMemo } from 'react';
import { CorrelationData, CorrelationPair } from '../types';
import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import { BarChart3, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { semanticColors, baseColors } from '@/lib/config/colors';
import { SegmentedControl } from '@/components/ui/selectors';

import { chartColors, getChartColor } from '@/lib/chartColors';

interface CorrelationMatrixProps {
  data: CorrelationData;
  loading?: boolean;
  onCellClick?: (oracleA: string, oracleB: string) => void;
  linkedOracle?: { primary: string; secondary: string } | null;
}

const CORRELATION_COLORS = {
  strongPositive: semanticColors.success.main,
  moderatePositive: semanticColors.success.light,
  weakPositive: baseColors.primary[100],
  neutral: semanticColors.neutral.main,
  weakNegative: semanticColors.danger.light,
  moderateNegative: semanticColors.danger.main,
  strongNegative: semanticColors.danger.dark,
};

function getCorrelationColor(value: number): string {
  if (value >= 0.7) return CORRELATION_COLORS.strongPositive;
  if (value >= 0.4) return CORRELATION_COLORS.moderatePositive;
  if (value >= 0.1) return CORRELATION_COLORS.weakPositive;
  if (value >= -0.1) return CORRELATION_COLORS.neutral;
  if (value >= -0.4) return CORRELATION_COLORS.weakNegative;
  if (value >= -0.7) return CORRELATION_COLORS.moderateNegative;
  return CORRELATION_COLORS.strongNegative;
}

function getCorrelationLabel(value: number, locale: string): string {
  if (value >= 0.7) return isChineseLocale(locale) ? '强正相关' : 'Strong Positive';
  if (value >= 0.4) return isChineseLocale(locale) ? '中等正相关' : 'Moderate Positive';
  if (value >= 0.1) return isChineseLocale(locale) ? '弱正相关' : 'Weak Positive';
  if (value >= -0.1) return isChineseLocale(locale) ? '无相关' : 'No Correlation';
  if (value >= -0.4) return isChineseLocale(locale) ? '弱负相关' : 'Weak Negative';
  if (value >= -0.7) return isChineseLocale(locale) ? '中等负相关' : 'Moderate Negative';
  return isChineseLocale(locale) ? '强负相关' : 'Strong Negative';
}

function getCorrelationIcon(value: number) {
  if (value > 0.1) return <TrendingUp className="w-4 h-4" />;
  if (value < -0.1) return <TrendingDown className="w-4 h-4" />;
  return <Minus className="w-4 h-4" />;
}

export default function CorrelationMatrix({
  data,
  loading = false,
  onCellClick,
  linkedOracle,
}: CorrelationMatrixProps) {
  const locale = useLocale();
  const [selectedPair, setSelectedPair] = useState<CorrelationPair | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [sortBy, setSortBy] = useState<'correlation' | 'name'>('correlation');

  const sortedPairs = useMemo(() => {
    if (!data.pairs) return [];
    if (sortBy === 'correlation') {
      return [...data.pairs].sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    }
    return [...data.pairs].sort((a, b) => a.oracleA.localeCompare(b.oracleA));
  }, [data.pairs, sortBy]);

  const stats = useMemo(() => {
    if (!data.pairs || data.pairs.length === 0) return null;
    const correlations = data.pairs.map((p) => p.correlation);
    const avgCorrelation = correlations.reduce((a, b) => a + b, 0) / correlations.length;
    const maxCorrelation = Math.max(...correlations);
    const minCorrelation = Math.min(...correlations);
    const strongCorrelations = correlations.filter((c) => Math.abs(c) >= 0.7).length;

    return {
      avgCorrelation,
      maxCorrelation,
      minCorrelation,
      strongCorrelations,
      totalPairs: correlations.length,
    };
  }, [data.pairs]);

  const MobileCorrelationList = () => (
    <div className="space-y-2">
      {sortedPairs.map((pair) => {
        const color = getCorrelationColor(pair.correlation);
        return (
          <div
            key={`${pair.oracleA}-${pair.oracleB}`}
            className="py-3 border-b border-gray-100 cursor-pointer active:bg-gray-50 rounded"
            onClick={() => {
              setSelectedPair(pair);
              setShowDetails(true);
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 text-sm">{pair.oracleA}</span>
                <span className="text-gray-400">→</span>
                <span className="font-medium text-gray-900 text-sm">{pair.oracleB}</span>
              </div>
              <span className="font-semibold text-base" style={{ color }}>
                {pair.correlation.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span style={{ color }}>{getCorrelationIcon(pair.correlation)}</span>
                <span className="text-xs text-gray-600">
                  {getCorrelationLabel(pair.correlation, locale)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>{isChineseLocale(locale) ? '置信度' : 'Confidence'}:</span>
                <span className="font-medium text-gray-700">
                  {(pair.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent animate-spin rounded-full" />
          <span className="text-gray-500 text-sm">
            {isChineseLocale(locale) ? '加载中...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  if (!data.oracles || data.oracles.length === 0) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            {isChineseLocale(locale) ? '暂无相关性数据' : 'No correlation data available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="py-3 border-t border-gray-100">
            <div className="text-xl font-semibold text-primary-700">
              {stats.avgCorrelation.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">
              {isChineseLocale(locale) ? '平均相关性' : 'Avg Correlation'}
            </div>
          </div>
          <div className="py-3 border-t border-gray-100">
            <div className="text-xl font-semibold text-success-700">
              {stats.maxCorrelation.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">
              {isChineseLocale(locale) ? '最高相关性' : 'Max Correlation'}
            </div>
          </div>
          <div className="py-3 border-t border-gray-100">
            <div className="text-xl font-semibold text-danger-700">
              {stats.minCorrelation.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">
              {isChineseLocale(locale) ? '最低相关性' : 'Min Correlation'}
            </div>
          </div>
          <div className="py-3 border-t border-gray-100">
            <div className="text-xl font-semibold text-purple-700">
              {stats.strongCorrelations}/{stats.totalPairs}
            </div>
            <div className="text-xs text-gray-600">
              {isChineseLocale(locale) ? '强相关对数' : 'Strong Pairs'}
            </div>
          </div>
        </div>
      )}

      <div className="hidden md:block py-4 border-b border-gray-100">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-900">
            {isChineseLocale(locale) ? '相关性热力图' : 'Correlation Heatmap'}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {isChineseLocale(locale)
              ? '基于 TVS 历史数据计算的皮尔逊相关系数'
              : 'Pearson correlation coefficient based on TVS historical data'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex">
              <div className="w-20 flex-shrink-0" />
              {data.oracles.map((oracle) => (
                <div
                  key={oracle}
                  className="w-16 text-center text-xs font-medium text-gray-600 py-2"
                >
                  {oracle.split(' ')[0]}
                </div>
              ))}
            </div>

            {data.oracles.map((oracleA, i) => (
              <div key={oracleA} className="flex">
                <div className="w-20 flex-shrink-0 text-xs font-medium text-gray-600 py-2.5 px-2 text-right">
                  {oracleA.split(' ')[0]}
                </div>
                {data.oracles.map((oracleB, j) => {
                  const value = i === j ? 1 : (data.matrix[i]?.[j] ?? 0);
                  const color = getCorrelationColor(value);
                  const isLinked =
                    linkedOracle &&
                    (linkedOracle.primary === oracleA || linkedOracle.primary === oracleB) &&
                    (linkedOracle.secondary === oracleA || linkedOracle.secondary === oracleB);

                  return (
                    <div
                      key={`${oracleA}-${oracleB}`}
                      className={`w-16 h-8 flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:z-10 ${
                        isLinked ? 'ring-2 ring-primary-500 ring-offset-1' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        if (i !== j) {
                          const pair = data.pairs.find(
                            (p) =>
                              (p.oracleA === oracleA && p.oracleB === oracleB) ||
                              (p.oracleA === oracleB && p.oracleB === oracleA)
                          );
                          if (pair) {
                            setSelectedPair(pair);
                            setShowDetails(true);
                          }
                          onCellClick?.(oracleA, oracleB);
                        }
                      }}
                    >
                      <span
                        className={`text-xs font-medium ${
                          Math.abs(value) > 0.5 ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {value.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-gray-500">{isChineseLocale(locale) ? '图例:' : 'Legend:'}</span>
            {[
              {
                color: CORRELATION_COLORS.strongPositive,
                label: isChineseLocale(locale) ? '强正相关 (0.7-1.0)' : 'Strong Positive (0.7-1.0)',
              },
              {
                color: CORRELATION_COLORS.moderatePositive,
                label: isChineseLocale(locale)
                  ? '中等正相关 (0.4-0.7)'
                  : 'Moderate Positive (0.4-0.7)',
              },
              {
                color: CORRELATION_COLORS.weakPositive,
                label: isChineseLocale(locale) ? '弱正相关 (0.1-0.4)' : 'Weak Positive (0.1-0.4)',
              },
              {
                color: CORRELATION_COLORS.neutral,
                label: isChineseLocale(locale) ? '无相关 (-0.1-0.1)' : 'No Correlation (-0.1-0.1)',
              },
              {
                color: CORRELATION_COLORS.weakNegative,
                label: isChineseLocale(locale)
                  ? '弱负相关 (-0.4--0.1)'
                  : 'Weak Negative (-0.4--0.1)',
              },
              {
                color: CORRELATION_COLORS.moderateNegative,
                label: isChineseLocale(locale)
                  ? '中等负相关 (-0.7--0.4)'
                  : 'Moderate Negative (-0.7--0.4)',
              },
              {
                color: CORRELATION_COLORS.strongNegative,
                label: isChineseLocale(locale)
                  ? '强负相关 (-1.0--0.7)'
                  : 'Strong Negative (-1.0--0.7)',
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="md:hidden py-4 border-b border-gray-100">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-900">
            {isChineseLocale(locale) ? '相关性列表' : 'Correlation List'}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {isChineseLocale(locale)
              ? '基于 TVS 历史数据计算的皮尔逊相关系数'
              : 'Pearson correlation coefficient based on TVS historical data'}
          </p>
        </div>
        <MobileCorrelationList />
      </div>

      <div className="py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              {isChineseLocale(locale) ? '相关性详情' : 'Correlation Details'}
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              {isChineseLocale(locale)
                ? `数据范围: ${data.timeRange}`
                : `Time Range: ${data.timeRange}`}
            </p>
          </div>
          <SegmentedControl
            options={[
              { value: 'correlation', label: isChineseLocale(locale) ? '按相关性' : 'Correlation' },
              { value: 'name', label: isChineseLocale(locale) ? '按名称' : 'Name' },
            ]}
            value={sortBy}
            onChange={(value) => setSortBy(value as 'correlation' | 'name')}
            size="sm"
          />
        </div>

        <div className="max-h-[300px] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white">
                  {isChineseLocale(locale) ? '预言机 A' : 'Oracle A'}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white">
                  {isChineseLocale(locale) ? '预言机 B' : 'Oracle B'}
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white">
                  {isChineseLocale(locale) ? '相关系数' : 'Correlation'}
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white">
                  {isChineseLocale(locale) ? '关系' : 'Relationship'}
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider bg-white">
                  {isChineseLocale(locale) ? '置信度' : 'Confidence'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedPairs.map((pair) => {
                const color = getCorrelationColor(pair.correlation);
                return (
                  <tr
                    key={`${pair.oracleA}-${pair.oracleB}`}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedPair(pair);
                      setShowDetails(true);
                    }}
                  >
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-gray-900 text-sm">{pair.oracleA}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-gray-900 text-sm">{pair.oracleB}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className="font-medium px-2 py-0.5 text-sm"
                        style={{
                          backgroundColor: `${color}15`,
                          color,
                        }}
                      >
                        {pair.correlation.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span style={{ color }}>{getCorrelationIcon(pair.correlation)}</span>
                        <span className="text-xs text-gray-600">
                          {getCorrelationLabel(pair.correlation, locale)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-sm text-gray-600">
                        {(pair.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showDetails && selectedPair && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded max-w-sm w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                {isChineseLocale(locale) ? '相关性详情' : 'Correlation Details'}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div className="flex items-center justify-center gap-3">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">{selectedPair.oracleA}</div>
                </div>
                <div
                  className="text-xl font-semibold"
                  style={{ color: getCorrelationColor(selectedPair.correlation) }}
                >
                  {selectedPair.correlation.toFixed(3)}
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">{selectedPair.oracleB}</div>
                </div>
              </div>

              <div className="py-3 border-t border-b border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500">
                      {isChineseLocale(locale) ? '关系类型' : 'Relationship'}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {getCorrelationLabel(selectedPair.correlation, locale)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">
                      {isChineseLocale(locale) ? '置信度' : 'Confidence'}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {(selectedPair.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">
                      {isChineseLocale(locale) ? '样本数量' : 'Sample Size'}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {selectedPair.sampleSize}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">
                      {isChineseLocale(locale) ? '数据范围' : 'Time Range'}
                    </div>
                    <div className="text-sm font-medium text-gray-900">{data.timeRange}</div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-600">
                <p>
                  {isChineseLocale(locale)
                    ? '相关系数衡量两个预言机 TVS 变化的同步程度。正值表示同向变动，负值表示反向变动。'
                    : 'The correlation coefficient measures how synchronized the TVS changes are between two oracles. Positive values indicate moving in the same direction, negative values indicate moving in opposite directions.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDetails(false)}
              className="w-full mt-4 px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm"
            >
              {isChineseLocale(locale) ? '关闭' : 'Close'}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-gray-500 py-3 border-b border-gray-100">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-gray-700 mb-0.5">
            {isChineseLocale(locale) ? '关于相关性分析' : 'About Correlation Analysis'}
          </p>
          <p>
            {isChineseLocale(locale)
              ? '相关性系数范围从 -1 到 1。1 表示完全正相关，-1 表示完全负相关，0 表示无相关性。'
              : 'Correlation coefficient ranges from -1 to 1. 1 indicates perfect positive correlation, -1 indicates perfect negative correlation, 0 indicates no correlation.'}
          </p>
        </div>
      </div>
    </div>
  );
}
