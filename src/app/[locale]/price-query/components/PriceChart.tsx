'use client';

/**
 * @fileoverview 价格图表组件
 * @description 展示价格历史数据的交互式图表，支持多数据源、对比模式、Brush选择器和十字准星
 */

import { useMemo, useState, useCallback } from 'react';

import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts';

import { ChartSkeleton } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { formatPrice } from '@/lib/utils/chartSharedUtils';
import { chainNames } from '@/lib/constants';

import { type QueryResult } from '../constants';

import { CustomTooltip } from './CustomTooltip';

export interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string | Record<string, unknown>;
}

interface PriceChartProps {
  chartData: ChartDataPoint[];
  queryResults: QueryResult[];
  hiddenSeries: Set<string>;
  onToggleSeries: (seriesName: string) => void;
  selectedTimeRange: number;
  selectedRow: string | null;
  compareMode?: boolean;
  compareChartData?: ChartDataPoint[];
  compareQueryResults?: QueryResult[];
  showBaseline?: boolean;
  avgPrice?: number;
}

/**
 * 价格图表组件
 *
 * @param props - 组件属性
 * @returns 价格图表 JSX 元素
 */
export function PriceChart({
  chartData,
  queryResults,
  hiddenSeries,
  onToggleSeries,
  selectedTimeRange,
  selectedRow,
  compareMode = false,
  compareChartData = [],
  compareQueryResults = [],
  showBaseline = false,
  avgPrice = 0,
}: PriceChartProps) {
  const t = useTranslations();

  // 十字准星状态
  const [cursorPosition, setCursorPosition] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });

  // 获取系列名称
  const seriesNames = useMemo(() => {
    const names = new Set<string>();
    chartData.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (key !== 'timestamp' && key !== 'time' && !key.startsWith('_')) {
          names.add(key);
        }
      });
    });
    return Array.from(names);
  }, [chartData]);

  // 构建数据源信息映射
  const oracleInfoMap = useMemo(() => {
    const map: Record<string, { chain?: string; provider?: string }> = {};
    queryResults.forEach((result) => {
      const key = `${result.provider}_${result.chain}`;
      map[key] = {
        provider: result.provider,
        chain: chainNames[result.chain],
      };
    });
    return map;
  }, [queryResults]);

  // 处理图表数据，添加 Tooltip 所需的额外信息
  const enhancedChartData = useMemo(() => {
    if (chartData.length === 0) return [];

    return chartData.map((point, index) => {
      const prevPoint = index > 0 ? chartData[index - 1] : null;
      const prevValues: Record<string, number> = {};

      // 计算前一个时间点的值
      if (prevPoint) {
        seriesNames.forEach((name) => {
          const prevValue = prevPoint[name];
          if (typeof prevValue === 'number') {
            prevValues[name] = prevValue;
          }
        });
      }

      return {
        ...point,
        _avgPrice: avgPrice,
        _prevValues: prevValues,
        _oracleInfo: oracleInfoMap,
      };
    });
  }, [chartData, seriesNames, avgPrice, oracleInfoMap]);

  // 获取对比系列名称
  const compareSeriesNames = useMemo(() => {
    if (!compareMode || compareChartData.length === 0) return [];
    const names = new Set<string>();
    compareChartData.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (key !== 'timestamp' && key !== 'time' && !key.startsWith('_')) {
          names.add(key);
        }
      });
    });
    return Array.from(names);
  }, [compareMode, compareChartData]);

  // 生成系列颜色
  const getSeriesColor = (index: number, isCompare = false) => {
    const colors = [
      '#3b82f6', // blue-500
      '#10b981', // emerald-500
      '#f59e0b', // amber-500
      '#ef4444', // red-500
      '#8b5cf6', // violet-500
      '#06b6d4', // cyan-500
      '#f97316', // orange-500
      '#ec4899', // pink-500
    ];
    const baseColor = colors[index % colors.length];
    if (isCompare) {
      // 对比模式使用更浅的色调
      return baseColor + '80'; // 50% opacity
    }
    return baseColor;
  };

  // 格式化时间标签
  const formatXAxisLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    if (selectedTimeRange <= 1) {
      // 1小时内，显示分钟
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } else if (selectedTimeRange <= 24) {
      // 24小时内，显示小时
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } else {
      // 超过24小时，显示日期
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  // 计算 Y 轴范围
  const yAxisDomain = useMemo(() => {
    if (enhancedChartData.length === 0) return ['auto', 'auto'];

    let min = Infinity;
    let max = -Infinity;

    enhancedChartData.forEach((point) => {
      seriesNames.forEach((name) => {
        if (!hiddenSeries.has(name)) {
          const value = (point as Record<string, unknown>)[name] as number;
          if (typeof value === 'number' && !isNaN(value)) {
            min = Math.min(min, value);
            max = Math.max(max, value);
          }
        }
      });
    });

    if (compareMode && compareChartData.length > 0) {
      compareChartData.forEach((point) => {
        compareSeriesNames.forEach((name) => {
          if (!hiddenSeries.has(name + '_compare')) {
            const value = point[name] as number;
            if (typeof value === 'number' && !isNaN(value)) {
              min = Math.min(min, value);
              max = Math.max(max, value);
            }
          }
        });
      });
    }

    if (min === Infinity || max === -Infinity) return ['auto', 'auto'];

    // 添加一些边距
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [enhancedChartData, compareChartData, seriesNames, compareSeriesNames, hiddenSeries, compareMode]);

  // 鼠标移动处理 - 更新十字准星位置
  const handleMouseMove = useCallback(
    (e: { activeCoordinate?: { x: number; y: number }; activePayload?: unknown[] }) => {
      if (e.activeCoordinate && e.activePayload && e.activePayload.length > 0) {
        setCursorPosition({
          x: e.activeCoordinate.x,
          y: e.activeCoordinate.y,
          visible: true,
        });
      }
    },
    []
  );

  // 鼠标离开处理 - 隐藏十字准星
  const handleMouseLeave = useCallback(() => {
    setCursorPosition((prev) => ({ ...prev, visible: false }));
  }, []);

  // 空状态
  if (enhancedChartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-gray-900">
            {t('priceQuery.charts.priceHistory')}
          </h3>
        </div>
        <ChartSkeleton height={300} variant="price" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 图表头部 */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-500" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-gray-900">
            {t('priceQuery.charts.priceHistory')}
          </h3>
        </div>
        {compareMode && (
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary-500" />
              {t('priceQuery.charts.current')}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary-500/50" />
              {t('priceQuery.charts.comparison')}
            </span>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 flex flex-wrap gap-2">
        {seriesNames.map((name, index) => {
          const isHidden = hiddenSeries.has(name);
          const color = getSeriesColor(index);
          return (
            <button
              key={name}
              onClick={() => onToggleSeries(name)}
              className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-all ${
                isHidden
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              title={isHidden ? t('priceQuery.charts.show') : t('priceQuery.charts.hide')}
            >
              {isHidden ? (
                <EyeOff className="w-3 h-3" aria-hidden="true" />
              ) : (
                <Eye className="w-3 h-3" aria-hidden="true" />
              )}
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isHidden ? '#9ca3af' : color }}
              />
              <span className="truncate max-w-[120px]">{name}</span>
            </button>
          );
        })}
      </div>

      {/* 图表区域 */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={360}>
          <LineChart
            data={enhancedChartData}
            margin={{ top: 5, right: 5, left: 0, bottom: 65 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxisLabel}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              minTickGap={30}
            />
            <YAxis
              domain={yAxisDomain}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => formatPrice(value)}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* 十字准星参考线 - 只在有数据且鼠标悬停时显示 */}
            {cursorPosition.visible && enhancedChartData.length > 0 && (
              <>
                <ReferenceLine
                  x={enhancedChartData[Math.min(
                    Math.floor((cursorPosition.x / 100) * enhancedChartData.length),
                    enhancedChartData.length - 1
                  )]?.timestamp}
                  stroke="#9ca3af"
                  strokeDasharray="3 3"
                  ifOverflow="hidden"
                />
              </>
            )}

            {/* 基准线 */}
            {showBaseline && avgPrice > 0 && (
              <ReferenceLine
                y={avgPrice}
                stroke="#9ca3af"
                strokeDasharray="5 5"
                label={{
                  value: t('priceQuery.charts.avgPrice'),
                  position: 'right',
                  fill: '#6b7280',
                  fontSize: 11,
                }}
              />
            )}

            {/* 当前数据系列 */}
            {seriesNames.map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={getSeriesColor(index)}
                strokeWidth={selectedRow === name ? 3 : 2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
                hide={hiddenSeries.has(name)}
                isAnimationActive={false}
              />
            ))}

            {/* 对比数据系列 */}
            {compareMode &&
              compareSeriesNames.map((name, index) => (
                <Line
                  key={`${name}_compare`}
                  type="monotone"
                  data={compareChartData}
                  dataKey={name}
                  stroke={getSeriesColor(index, true)}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 1 }}
                  hide={hiddenSeries.has(name + '_compare')}
                  isAnimationActive={false}
                />
              ))}

            {/* Brush 时间范围选择器 */}
            <Brush
              dataKey="timestamp"
              height={60}
              stroke="#6366f1"
              fill="#e0e7ff"
              travellerWidth={8}
              tickFormatter={formatXAxisLabel}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 图表底部信息 */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
        <span>
          {t('priceQuery.charts.dataPoints')}: {enhancedChartData.length}
        </span>
        <span>
          {t('priceQuery.charts.timeRange')}: {selectedTimeRange}h
        </span>
      </div>
    </div>
  );
}
