'use client';

import { useState, useMemo } from 'react';
import { CorrelationData, CorrelationPair } from '../types';
import { useI18n } from '@/lib/i18n/provider';
import {
  Activity,
  BarChart3,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
} from 'lucide-react';

interface CorrelationMatrixProps {
  data: CorrelationData;
  loading?: boolean;
}

const CORRELATION_COLORS = {
  strongPositive: '#10B981', // 0.7 - 1.0
  moderatePositive: '#34D399', // 0.4 - 0.7
  weakPositive: '#6EE7B7', // 0.1 - 0.4
  neutral: '#9CA3AF', // -0.1 - 0.1
  weakNegative: '#F87171', // -0.4 - -0.1
  moderateNegative: '#EF4444', // -0.7 - -0.4
  strongNegative: '#DC2626', // -1.0 - -0.7
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
  if (value >= 0.7) return locale === 'zh-CN' ? '强正相关' : 'Strong Positive';
  if (value >= 0.4) return locale === 'zh-CN' ? '中等正相关' : 'Moderate Positive';
  if (value >= 0.1) return locale === 'zh-CN' ? '弱正相关' : 'Weak Positive';
  if (value >= -0.1) return locale === 'zh-CN' ? '无相关' : 'No Correlation';
  if (value >= -0.4) return locale === 'zh-CN' ? '弱负相关' : 'Weak Negative';
  if (value >= -0.7) return locale === 'zh-CN' ? '中等负相关' : 'Moderate Negative';
  return locale === 'zh-CN' ? '强负相关' : 'Strong Negative';
}

function getCorrelationIcon(value: number) {
  if (value > 0.1) return <TrendingUp className="w-4 h-4" />;
  if (value < -0.1) return <TrendingDown className="w-4 h-4" />;
  return <Minus className="w-4 h-4" />;
}

export default function CorrelationMatrix({ data, loading = false }: CorrelationMatrixProps) {
  const { t, locale } = useI18n();
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

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent animate-spin rounded-full" />
          <span className="text-gray-500 text-sm">
            {locale === 'zh-CN' ? '加载中...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  if (!data.oracles || data.oracles.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {locale === 'zh-CN' ? '暂无相关性数据' : 'No correlation data available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-700">
              {stats.avgCorrelation.toFixed(2)}
            </div>
            <div className="text-xs text-blue-600">
              {locale === 'zh-CN' ? '平均相关性' : 'Avg Correlation'}
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-700">
              {stats.maxCorrelation.toFixed(2)}
            </div>
            <div className="text-xs text-green-600">
              {locale === 'zh-CN' ? '最高相关性' : 'Max Correlation'}
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-red-700">{stats.minCorrelation.toFixed(2)}</div>
            <div className="text-xs text-red-600">
              {locale === 'zh-CN' ? '最低相关性' : 'Min Correlation'}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-purple-700">
              {stats.strongCorrelations}/{stats.totalPairs}
            </div>
            <div className="text-xs text-purple-600">
              {locale === 'zh-CN' ? '强相关对数' : 'Strong Pairs'}
            </div>
          </div>
        </div>
      )}

      {/* 热力图 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900">
            {locale === 'zh-CN' ? '相关性热力图' : 'Correlation Heatmap'}
          </h4>
          <p className="text-sm text-gray-500 mt-1">
            {locale === 'zh-CN'
              ? '基于 TVS 历史数据计算的皮尔逊相关系数'
              : 'Pearson correlation coefficient based on TVS historical data'}
          </p>
        </div>

        <div className="p-4 overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* 表头 */}
            <div className="flex">
              <div className="w-24 flex-shrink-0" />
              {data.oracles.map((oracle) => (
                <div
                  key={oracle}
                  className="w-20 text-center text-xs font-medium text-gray-600 py-2"
                >
                  {oracle.split(' ')[0]}
                </div>
              ))}
            </div>

            {/* 矩阵 */}
            {data.oracles.map((oracleA, i) => (
              <div key={oracleA} className="flex">
                <div className="w-24 flex-shrink-0 text-xs font-medium text-gray-600 py-3 px-2 text-right">
                  {oracleA.split(' ')[0]}
                </div>
                {data.oracles.map((oracleB, j) => {
                  const value = i === j ? 1 : (data.matrix[i]?.[j] ?? 0);
                  const color = getCorrelationColor(value);

                  return (
                    <div
                      key={`${oracleA}-${oracleB}`}
                      className="w-20 h-10 flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:z-10"
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
                        }
                      }}
                    >
                      <span
                        className={`text-xs font-semibold ${
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

        {/* 图例 */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-gray-500">{locale === 'zh-CN' ? '图例:' : 'Legend:'}</span>
            {[
              {
                color: CORRELATION_COLORS.strongPositive,
                label: locale === 'zh-CN' ? '强正相关 (0.7-1.0)' : 'Strong Positive (0.7-1.0)',
              },
              {
                color: CORRELATION_COLORS.moderatePositive,
                label: locale === 'zh-CN' ? '中等正相关 (0.4-0.7)' : 'Moderate Positive (0.4-0.7)',
              },
              {
                color: CORRELATION_COLORS.weakPositive,
                label: locale === 'zh-CN' ? '弱正相关 (0.1-0.4)' : 'Weak Positive (0.1-0.4)',
              },
              {
                color: CORRELATION_COLORS.neutral,
                label: locale === 'zh-CN' ? '无相关 (-0.1-0.1)' : 'No Correlation (-0.1-0.1)',
              },
              {
                color: CORRELATION_COLORS.weakNegative,
                label: locale === 'zh-CN' ? '弱负相关 (-0.4--0.1)' : 'Weak Negative (-0.4--0.1)',
              },
              {
                color: CORRELATION_COLORS.moderateNegative,
                label:
                  locale === 'zh-CN' ? '中等负相关 (-0.7--0.4)' : 'Moderate Negative (-0.7--0.4)',
              },
              {
                color: CORRELATION_COLORS.strongNegative,
                label: locale === 'zh-CN' ? '强负相关 (-1.0--0.7)' : 'Strong Negative (-1.0--0.7)',
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 相关性列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">
              {locale === 'zh-CN' ? '相关性详情' : 'Correlation Details'}
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              {locale === 'zh-CN' ? `数据范围: ${data.timeRange}` : `Time Range: ${data.timeRange}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'correlation' | 'name')}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="correlation">
                {locale === 'zh-CN' ? '按相关性排序' : 'Sort by Correlation'}
              </option>
              <option value="name">{locale === 'zh-CN' ? '按名称排序' : 'Sort by Name'}</option>
            </select>
          </div>
        </div>

        <div className="max-h-[300px] overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {locale === 'zh-CN' ? '预言机 A' : 'Oracle A'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {locale === 'zh-CN' ? '预言机 B' : 'Oracle B'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {locale === 'zh-CN' ? '相关系数' : 'Correlation'}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {locale === 'zh-CN' ? '关系' : 'Relationship'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {locale === 'zh-CN' ? '置信度' : 'Confidence'}
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
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{pair.oracleA}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{pair.oracleB}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="font-semibold px-2 py-1 rounded"
                        style={{
                          backgroundColor: `${color}20`,
                          color,
                        }}
                      >
                        {pair.correlation.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span style={{ color }}>{getCorrelationIcon(pair.correlation)}</span>
                        <span className="text-xs text-gray-600">
                          {getCorrelationLabel(pair.correlation, locale)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
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

      {/* 详情弹窗 */}
      {showDetails && selectedPair && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {locale === 'zh-CN' ? '相关性详情' : 'Correlation Details'}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{selectedPair.oracleA}</div>
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: getCorrelationColor(selectedPair.correlation) }}
                >
                  {selectedPair.correlation.toFixed(3)}
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{selectedPair.oracleB}</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">
                      {locale === 'zh-CN' ? '关系类型' : 'Relationship'}
                    </div>
                    <div className="font-medium text-gray-900">
                      {getCorrelationLabel(selectedPair.correlation, locale)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">
                      {locale === 'zh-CN' ? '置信度' : 'Confidence'}
                    </div>
                    <div className="font-medium text-gray-900">
                      {(selectedPair.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">
                      {locale === 'zh-CN' ? '样本数量' : 'Sample Size'}
                    </div>
                    <div className="font-medium text-gray-900">{selectedPair.sampleSize}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">
                      {locale === 'zh-CN' ? '数据范围' : 'Time Range'}
                    </div>
                    <div className="font-medium text-gray-900">{data.timeRange}</div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>
                  {locale === 'zh-CN'
                    ? '相关系数衡量两个预言机 TVS 变化的同步程度。正值表示同向变动，负值表示反向变动。'
                    : 'The correlation coefficient measures how synchronized the TVS changes are between two oracles. Positive values indicate moving in the same direction, negative values indicate moving in opposite directions.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDetails(false)}
              className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {locale === 'zh-CN' ? '关闭' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* 说明 */}
      <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-gray-700 mb-1">
            {locale === 'zh-CN' ? '关于相关性分析' : 'About Correlation Analysis'}
          </p>
          <p>
            {locale === 'zh-CN'
              ? '相关性系数范围从 -1 到 1。1 表示完全正相关，-1 表示完全负相关，0 表示无相关性。'
              : 'Correlation coefficient ranges from -1 to 1. 1 indicates perfect positive correlation, -1 indicates perfect negative correlation, 0 indicates no correlation.'}
          </p>
        </div>
      </div>
    </div>
  );
}
