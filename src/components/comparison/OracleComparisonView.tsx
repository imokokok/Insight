'use client';

import { useState, useMemo, useId } from 'react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
  Scatter,
  ZAxis,
} from 'recharts';

import {
  EnhancedComparisonTable,
  type DeviationThreshold,
} from '@/components/comparison/EnhancedComparisonTable';
import { DeviationHighlighter, DeviationIndicator } from '@/components/ui/DeviationHighlighter';
import { EnhancedStatCard } from '@/components/ui/EnhancedStatCard';
import { useTranslations } from '@/i18n';
import { chartColors, baseColors } from '@/lib/config/colors';
import { getOracleColor } from '@/lib/oracles/colors';
import { type OracleProvider } from '@/types/oracle';

import { DifferenceBadge } from './DifferenceBadge';
import { type OracleComparisonItem, type OracleComparisonResult } from './types';

interface OracleComparisonViewProps {
  oracles: OracleComparisonItem[];
  benchmarkOracle?: OracleProvider;
  showCharts?: boolean;
  showRadar?: boolean;
  showTable?: boolean;
  className?: string;
  /** 偏离阈值配置 */
  deviationThreshold?: DeviationThreshold;
}

// 高对比度配色方案
const highContrastColors = {
  primary: ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777'],
  semantic: {
    positive: '#059669',
    negative: '#dc2626',
    warning: '#d97706',
    danger: '#dc2626',
    neutral: '#6b7280',
  },
};

// 获取高对比度颜色
const getHighContrastColor = (index: number): string => {
  return highContrastColors.primary[index % highContrastColors.primary.length];
};

export function OracleComparisonView({
  oracles,
  benchmarkOracle,
  showCharts = true,
  showRadar = true,
  showTable = true,
  className = '',
  deviationThreshold = { warning: 2, danger: 5 },
}: OracleComparisonViewProps) {
  const t = useTranslations('comparison.oracleComparison');

  // 生成唯一的 ARIA ID
  const chartRegionId = useId();
  const priceChartId = useId();
  const deviationChartId = useId();
  const radarChartId = useId();
  const tableRegionId = useId();
  const statsRegionId = useId();

  const [sortBy, setSortBy] = useState<'price' | 'deviation' | 'confidence' | 'responseTime'>(
    'price'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [hoveredOracle, setHoveredOracle] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  const comparisonResult: OracleComparisonResult = useMemo(() => {
    const validOracles = oracles.filter((o) => o.metrics?.price != null);
    const prices = validOracles.map((o) => o.metrics.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const sorted = [...prices].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const maxDeviation = Math.max(...validOracles.map((o) => Math.abs(o.metrics.deviation || 0)));
    const cv = (stdDev / avg) * 100;
    const consistencyScore = Math.max(0, Math.min(100, 100 - cv * 10));

    return {
      oracles: validOracles,
      averagePrice: avg,
      medianPrice: median,
      priceRange: max - min,
      stdDeviation: stdDev,
      consistencyScore,
      maxDeviation,
    };
  }, [oracles]);

  const sortedOracles = useMemo(() => {
    const validOracles = oracles.filter((o) => o.metrics != null);
    const sorted = [...validOracles].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortBy) {
        case 'price':
          aVal = a.metrics?.price ?? 0;
          bVal = b.metrics?.price ?? 0;
          break;
        case 'deviation':
          aVal = Math.abs(a.metrics?.deviation || 0);
          bVal = Math.abs(b.metrics?.deviation || 0);
          break;
        case 'confidence':
          aVal = a.metrics?.confidence || 0;
          bVal = b.metrics?.confidence || 0;
          break;
        case 'responseTime':
          aVal = a.metrics?.responseTime || 0;
          bVal = b.metrics?.responseTime || 0;
          break;
        default:
          aVal = a.metrics?.price ?? 0;
          bVal = b.metrics?.price ?? 0;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [oracles, sortBy, sortOrder]);

  const radarData = useMemo(() => {
    const validOracles = oracles.filter((o) => o.metrics != null);
    if (validOracles.length === 0) return [];
    const metrics = [
      {
        key: 'price',
        label: t('metrics.price'),
        max: Math.max(...validOracles.map((o) => o.metrics?.price ?? 0)) * 1.1 || 1,
      },
      { key: 'confidence', label: t('metrics.confidence'), max: 100 },
      {
        key: 'responseTime',
        label: t('metrics.responseTime'),
        max: Math.max(...validOracles.map((o) => o.metrics?.responseTime || 0)) * 1.2 || 1,
      },
      { key: 'accuracy', label: t('metrics.accuracy'), max: 100 },
      { key: 'reliability', label: t('metrics.reliability'), max: 100 },
    ];

    return metrics.map((m) => ({
      metric: m.label,
      ...validOracles.reduce(
        (acc, o) => {
          const val = (o.metrics?.[m.key as keyof typeof o.metrics] as number) || 0;
          acc[o.name] = (val / m.max) * 100;
          return acc;
        },
        {} as Record<string, number>
      ),
    }));
  }, [oracles, t]);

  const priceChartData = useMemo(() => {
    return oracles
      .filter((o) => o.metrics != null)
      .map((o, index) => ({
        name: o.name,
        price: o.metrics?.price ?? 0,
        deviation: o.metrics?.deviation || 0,
        color: getHighContrastColor(index),
        provider: o.provider,
      }));
  }, [oracles]);

  // 计算异常点数据
  const anomalyPoints = useMemo(() => {
    return priceChartData
      .filter((d) => Math.abs(d.deviation) >= deviationThreshold.warning)
      .map((d) => ({
        name: d.name,
        price: d.price,
        deviation: d.deviation,
        isDanger: Math.abs(d.deviation) >= deviationThreshold.danger,
      }));
  }, [priceChartData, deviationThreshold]);

  // 为 EnhancedComparisonTable 准备数据
  const tableData = useMemo(() => {
    return sortedOracles.map((oracle, index) => ({
      provider: oracle.provider,
      name: oracle.name,
      price: oracle.metrics?.price ?? 0,
      deviation: oracle.metrics?.deviation || 0,
      confidence: oracle.metrics?.confidence ? oracle.metrics.confidence * 100 : undefined,
      responseTime: oracle.metrics?.responseTime,
      color: getHighContrastColor(index),
    }));
  }, [sortedOracles]);

  const getConsistencyColor = (score: number): 'success' | 'primary' | 'warning' | 'danger' => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'primary';
    if (score >= 50) return 'warning';
    return 'danger';
  };

  const getConsistencyLabel = (score: number): string => {
    if (score >= 90) return t('consistency.excellent');
    if (score >= 70) return t('consistency.good');
    if (score >= 50) return t('consistency.fair');
    return t('consistency.poor');
  };

  // 生成 sparkline 数据（模拟趋势）
  const generateSparklineData = (baseValue: number): number[] => {
    const data: number[] = [];
    let current = baseValue;
    for (let i = 0; i < 20; i++) {
      current = current * (1 + (Math.random() - 0.5) * 0.02);
      data.push(current);
    }
    return data;
  };

  return (
    <div
      className={`space-y-6 ${className}`}
      role="main"
      aria-label={t('comparisonViewLabel', { defaultValue: '预言机价格对比视图' })}
    >
      {/* 实时公告区域 - 用于屏幕阅读器 */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Summary Stats - 使用 EnhancedStatCard */}
      <section
        id={statsRegionId}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        role="region"
        aria-label={t('statsRegionLabel', { defaultValue: '统计数据概览' })}
      >
        <EnhancedStatCard
          title={t('averagePrice')}
          value={`$${comparisonResult.averagePrice.toFixed(2)}`}
          trend="stable"
          sparklineData={generateSparklineData(comparisonResult.averagePrice)}
          tooltipContent={t('averagePriceTooltip')}
          role="article"
          aria-label={t('averagePriceAriaLabel', { defaultValue: '平均价格统计' })}
        />
        <EnhancedStatCard
          title={t('medianPrice')}
          value={`$${comparisonResult.medianPrice.toFixed(2)}`}
          trend="stable"
          sparklineData={generateSparklineData(comparisonResult.medianPrice)}
          tooltipContent={t('medianPriceTooltip')}
          role="article"
          aria-label={t('medianPriceAriaLabel', { defaultValue: '中位数价格统计' })}
        />
        <EnhancedStatCard
          title={t('consistencyScore')}
          value={comparisonResult.consistencyScore.toFixed(1)}
          change={comparisonResult.consistencyScore - 75}
          trend={comparisonResult.consistencyScore >= 75 ? 'up' : 'down'}
          confidence={comparisonResult.consistencyScore}
          tooltipContent={getConsistencyLabel(comparisonResult.consistencyScore)}
          role="article"
          aria-label={t('consistencyScoreAriaLabel', { defaultValue: '一致性评分' })}
        />
        <EnhancedStatCard
          title={t('maxDeviation')}
          value={`${comparisonResult.maxDeviation.toFixed(3)}%`}
          change={comparisonResult.maxDeviation}
          trend={comparisonResult.maxDeviation > deviationThreshold.danger ? 'down' : 'up'}
          tooltipContent={t('maxDeviationTooltip')}
          role="article"
          aria-label={t('maxDeviationAriaLabel', { defaultValue: '最大偏离值' })}
        />
      </section>

      {/* Charts */}
      {showCharts && (
        <section
          id={chartRegionId}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          role="region"
          aria-label={t('chartsRegionLabel', { defaultValue: '价格对比图表' })}
        >
          {/* Price Comparison Bar Chart - 添加异常点标记 */}
          <div
            className="bg-white border border-gray-200 rounded-lg p-4"
            role="figure"
            aria-labelledby={priceChartId}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 id={priceChartId} className="text-sm font-semibold text-gray-900" tabIndex={0}>
                {t('priceComparison')}
              </h4>
              {/* 异常指示器 */}
              {anomalyPoints.length > 0 && (
                <div
                  className="flex items-center gap-2"
                  role="group"
                  aria-label={t('anomalyIndicatorsLabel', { defaultValue: '异常数据指示器' })}
                >
                  <span className="text-xs text-gray-500">异常:</span>
                  {anomalyPoints.map((point, idx) => (
                    <DeviationIndicator
                      key={idx}
                      value={point.deviation}
                      threshold={deviationThreshold}
                      size="sm"
                      showPulse={point.isDanger}
                      aria-label={t('anomalyIndicator', {
                        name: point.name,
                        deviation: point.deviation.toFixed(3),
                        defaultValue: `${point.name} 偏离 ${point.deviation.toFixed(3)}%`,
                      })}
                    />
                  ))}
                </div>
              )}
            </div>
            <div
              className="h-64"
              role="img"
              aria-label={t('priceChartDescription', {
                count: priceChartData.length,
                defaultValue: `柱状图显示 ${priceChartData.length} 个预言机的价格对比`,
              })}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priceChartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  role="graphics-document"
                  aria-roledescription={t('barChartRole', { defaultValue: '柱状图' })}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[200]} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    aria-label={t('xAxisLabel', { defaultValue: '预言机名称' })}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${v.toFixed(0)}`}
                    tick={{ fontSize: 11 }}
                    aria-label={t('yAxisLabel', { defaultValue: '价格（美元）' })}
                  />
                  <RechartsTooltip
                    formatter={(value, name, props) => {
                      const data = props.payload;
                      return [
                        `$${Number(value).toFixed(2)}`,
                        `${t('price')} (${data.deviation >= 0 ? '+' : ''}${data.deviation.toFixed(3)}%)`,
                      ];
                    }}
                    contentStyle={{ fontSize: 12 }}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  <Bar
                    dataKey="price"
                    radius={[4, 4, 0, 0]}
                    role="graphics-symbol"
                    aria-label={t('priceBarLabel', { defaultValue: '价格柱状' })}
                  >
                    {priceChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        opacity={hoveredOracle && hoveredOracle !== entry.name ? 0.3 : 1}
                        stroke={hoveredOracle === entry.name ? '#000' : 'none'}
                        strokeWidth={hoveredOracle === entry.name ? 2 : 0}
                        tabIndex={0}
                        role="graphics-symbol"
                        aria-label={t('priceBarAriaLabel', {
                          name: entry.name,
                          price: entry.price.toFixed(2),
                          deviation: entry.deviation.toFixed(3),
                          defaultValue: `${entry.name}: 价格 $${entry.price.toFixed(2)}, 偏离 ${entry.deviation.toFixed(3)}%`,
                        })}
                        onFocus={() => setHoveredOracle(entry.name)}
                        onBlur={() => setHoveredOracle(null)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Deviation Chart - 使用 DeviationHighlighter */}
          <div
            className="bg-white border border-gray-200 rounded-lg p-4"
            role="figure"
            aria-labelledby={deviationChartId}
          >
            <h4
              id={deviationChartId}
              className="text-sm font-semibold text-gray-900 mb-4"
              tabIndex={0}
            >
              {t('deviationFromAverage')}
            </h4>
            <div
              className="h-64"
              role="img"
              aria-label={t('deviationChartDescription', {
                warning: deviationThreshold.warning,
                danger: deviationThreshold.danger,
                defaultValue: `偏离值图表，警告阈值 ${deviationThreshold.warning}%，危险阈值 ${deviationThreshold.danger}%`,
              })}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priceChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 80, bottom: 10 }}
                  role="graphics-document"
                  aria-roledescription={t('horizontalBarChartRole', { defaultValue: '水平柱状图' })}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={baseColors.gray[200]}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`}
                    tick={{ fontSize: 11 }}
                    aria-label={t('deviationAxisLabel', { defaultValue: '偏离百分比' })}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={70}
                    tick={{ fontSize: 11 }}
                    aria-label={t('oracleNameAxisLabel', { defaultValue: '预言机名称' })}
                  />
                  <RechartsTooltip
                    formatter={(value) => [
                      `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(3)}%`,
                      t('deviation'),
                    ]}
                    contentStyle={{ fontSize: 12 }}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  {/* 阈值参考线 */}
                  <ReferenceLine
                    x={deviationThreshold.warning}
                    stroke={highContrastColors.semantic.warning}
                    strokeDasharray="5 5"
                    label={{
                      value: `+${deviationThreshold.warning}%`,
                      position: 'top',
                      fontSize: 10,
                    }}
                    aria-label={t('warningThresholdLine', { defaultValue: '警告阈值线' })}
                  />
                  <ReferenceLine
                    x={-deviationThreshold.warning}
                    stroke={highContrastColors.semantic.warning}
                    strokeDasharray="5 5"
                    label={{
                      value: `-${deviationThreshold.warning}%`,
                      position: 'top',
                      fontSize: 10,
                    }}
                    aria-label={t('warningThresholdLineNegative', {
                      defaultValue: '负向警告阈值线',
                    })}
                  />
                  <ReferenceLine
                    x={deviationThreshold.danger}
                    stroke={highContrastColors.semantic.danger}
                    strokeDasharray="5 5"
                    label={{
                      value: `+${deviationThreshold.danger}%`,
                      position: 'top',
                      fontSize: 10,
                    }}
                    aria-label={t('dangerThresholdLine', { defaultValue: '危险阈值线' })}
                  />
                  <ReferenceLine
                    x={-deviationThreshold.danger}
                    stroke={highContrastColors.semantic.danger}
                    strokeDasharray="5 5"
                    label={{
                      value: `-${deviationThreshold.danger}%`,
                      position: 'top',
                      fontSize: 10,
                    }}
                    aria-label={t('dangerThresholdLineNegative', {
                      defaultValue: '负向危险阈值线',
                    })}
                  />
                  <Bar
                    dataKey="deviation"
                    radius={[0, 4, 4, 0]}
                    role="graphics-symbol"
                    aria-label={t('deviationBarLabel', { defaultValue: '偏离值柱状' })}
                  >
                    {priceChartData.map((entry, index) => {
                      const isDeviated = Math.abs(entry.deviation) >= deviationThreshold.warning;
                      const isDanger = Math.abs(entry.deviation) >= deviationThreshold.danger;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.deviation >= 0
                              ? highContrastColors.semantic.positive
                              : highContrastColors.semantic.negative
                          }
                          opacity={
                            hoveredOracle && hoveredOracle !== entry.name
                              ? 0.3
                              : isDeviated
                                ? 1
                                : 0.7
                          }
                          stroke={isDanger ? highContrastColors.semantic.danger : 'none'}
                          strokeWidth={isDanger ? 2 : 0}
                          tabIndex={0}
                          role="graphics-symbol"
                          aria-label={t('deviationBarAriaLabel', {
                            name: entry.name,
                            deviation: entry.deviation.toFixed(3),
                            status: isDanger ? 'danger' : isDeviated ? 'warning' : 'normal',
                            defaultValue: `${entry.name}: 偏离 ${entry.deviation.toFixed(3)}%, 状态: ${isDanger ? '危险' : isDeviated ? '警告' : '正常'}`,
                          })}
                          onFocus={() => setHoveredOracle(entry.name)}
                          onBlur={() => setHoveredOracle(null)}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* Radar Chart - 添加图例交互 */}
      {showRadar && oracles.length >= 2 && (
        <section
          className="bg-white border border-gray-200 rounded-lg p-4"
          role="region"
          aria-label={t('radarChartRegionLabel', { defaultValue: '性能雷达图' })}
        >
          <h4 id={radarChartId} className="text-sm font-semibold text-gray-900 mb-4" tabIndex={0}>
            {t('performanceRadar')}
          </h4>
          <div
            className="h-80"
            role="img"
            aria-label={t('radarChartDescription', {
              count: oracles.length,
              metrics: radarData.map((d) => d.metric).join(', '),
              defaultValue: `雷达图比较 ${oracles.length} 个预言机在 ${radarData.length} 个维度上的表现`,
            })}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={radarData}
                margin={{ top: 20, right: 80, left: 80, bottom: 20 }}
                role="graphics-document"
                aria-roledescription={t('radarChartRole', { defaultValue: '雷达图' })}
              >
                <PolarGrid stroke={baseColors.gray[200]} />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 11 }}
                  aria-label={t('radarMetricsLabel', { defaultValue: '性能指标' })}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                  aria-label={t('radarScoreLabel', { defaultValue: '得分（0-100）' })}
                />
                {oracles.map((oracle, index) => (
                  <Radar
                    key={oracle.provider}
                    name={oracle.name}
                    dataKey={oracle.name}
                    stroke={getHighContrastColor(index)}
                    fill={getHighContrastColor(index)}
                    fillOpacity={hoveredOracle === oracle.name ? 0.3 : 0.1}
                    strokeWidth={hoveredOracle === oracle.name ? 3 : 1.5}
                    strokeOpacity={hoveredOracle && hoveredOracle !== oracle.name ? 0.3 : 1}
                    role="graphics-symbol"
                    aria-label={t('radarSeriesAriaLabel', {
                      name: oracle.name,
                      defaultValue: `${oracle.name} 性能数据`,
                    })}
                    tabIndex={0}
                    onFocus={() => setHoveredOracle(oracle.name)}
                    onBlur={() => setHoveredOracle(null)}
                  />
                ))}
                <Legend
                  wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
                  role="group"
                  aria-label={t('radarLegendLabel', { defaultValue: '预言机图例，点击可高亮' })}
                  onClick={(e: any) => {
                    const oracleName = e?.value;
                    if (oracleName) {
                      setHoveredOracle(hoveredOracle === oracleName ? null : oracleName);
                      setAnnouncement(
                        t('oracleHighlighted', {
                          name: oracleName,
                          defaultValue: `已高亮 ${oracleName}`,
                        })
                      );
                    }
                  }}
                  onMouseEnter={(e: any) => {
                    if (e?.value) {
                      setHoveredOracle(e.value);
                    }
                  }}
                  onMouseLeave={() => setHoveredOracle(null)}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Comparison Table - 使用 EnhancedComparisonTable */}
      {showTable && (
        <section
          id={tableRegionId}
          className="bg-white border border-gray-200 rounded-lg overflow-hidden"
          role="region"
          aria-label={t('tableRegionLabel', { defaultValue: '详细对比数据表' })}
        >
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900" tabIndex={0}>
              {t('detailedComparison')}
            </h4>
            <div
              className="flex items-center gap-2"
              role="group"
              aria-label={t('sortControlsLabel', { defaultValue: '排序控制' })}
            >
              <label htmlFor="sort-select" className="text-xs text-gray-500">
                {t('sortBy')}:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as typeof sortBy);
                  setAnnouncement(
                    t('sortChanged', {
                      column: t(`metrics.${e.target.value}`),
                      defaultValue: `已按 ${t(`metrics.${e.target.value}`)} 排序`,
                    })
                  );
                }}
                className="text-xs border border-gray-300 px-2 py-1 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                aria-label={t('sortByAriaLabel', { defaultValue: '选择排序列' })}
              >
                <option value="price">{t('metrics.price')}</option>
                <option value="deviation">{t('metrics.deviation')}</option>
                <option value="confidence">{t('metrics.confidence')}</option>
                <option value="responseTime">{t('metrics.responseTime')}</option>
              </select>
              <button
                onClick={() => {
                  const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                  setSortOrder(newOrder);
                  setAnnouncement(
                    t('sortOrderChanged', {
                      order: newOrder === 'asc' ? t('ascending') : t('descending'),
                      defaultValue: `排序方向已改为 ${newOrder === 'asc' ? '升序' : '降序'}`,
                    })
                  );
                }}
                className="p-1 text-gray-500 hover:text-gray-700 focus:ring-2 focus:ring-primary-500 rounded"
                aria-label={t('toggleSortOrder', {
                  current: sortOrder,
                  defaultValue: `切换排序方向，当前为 ${sortOrder === 'asc' ? '升序' : '降序'}`,
                })}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
          <EnhancedComparisonTable
            data={tableData}
            benchmarkProvider={benchmarkOracle}
            deviationThreshold={deviationThreshold}
            sortColumn={sortBy}
            sortDirection={sortOrder}
            onSort={(column) => {
              if (sortBy === column) {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy(column as typeof sortBy);
                setSortOrder('desc');
              }
              setAnnouncement(
                t('sortedBy', {
                  column: t(`metrics.${column}`),
                  order:
                    sortBy === column && sortOrder === 'asc' ? t('descending') : t('ascending'),
                  defaultValue: `已按 ${t(`metrics.${column}`)} ${sortBy === column && sortOrder === 'asc' ? '降序' : '升序'} 排序`,
                })
              );
            }}
            aria-label={t('comparisonTableLabel', { defaultValue: '预言机数据对比表' })}
          />
        </section>
      )}
    </div>
  );
}

export default OracleComparisonView;
