'use client';

import { useMemo, useState } from 'react';

import { TrendingUp, Table } from 'lucide-react';
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
import { chainNames } from '@/lib/constants';
import { formatPrice } from '@/lib/utils/chartSharedUtils';

import { type QueryResult } from '../constants';

import { ChartDataTable } from './ChartDataTable';
import { CustomTooltip } from './CustomTooltip';

export interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string | Record<string, unknown>;
}

interface PriceChartProps {
  chartData: ChartDataPoint[];
  queryResults: QueryResult[];
  selectedTimeRange: number;
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
  selectedTimeRange,
  avgPrice = 0,
}: PriceChartProps) {
  const t = useTranslations();

  const [showDataTable, setShowDataTable] = useState(false);

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

  // 生成系列颜色
  const getSeriesColor = (index: number) => {
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
    return colors[index % colors.length];
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
        const value = (point as Record<string, unknown>)[name] as number;
        if (typeof value === 'number' && !isNaN(value)) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      });
    });

    if (min === Infinity || max === -Infinity) return ['auto', 'auto'];

    // 添加一些边距
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [enhancedChartData, seriesNames]);

  const chartAriaLabel = useMemo(() => {
    if (enhancedChartData.length === 0 || seriesNames.length === 0) {
      return t('priceQuery.charts.priceHistory');
    }
    const firstPoint = enhancedChartData[0];
    const lastPoint = enhancedChartData[enhancedChartData.length - 1];
    const startTime = new Date(firstPoint.timestamp).toLocaleString();
    const endTime = new Date(lastPoint.timestamp).toLocaleString();
    const seriesList = seriesNames.join(', ');
    return t('priceQuery.charts.chartAriaLabel', {
      series: seriesList,
      startTime,
      endTime,
      points: enhancedChartData.length,
    });
  }, [enhancedChartData, seriesNames, t]);

  // 空状态
  if (enhancedChartData.length === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
        <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">
          {t('priceQuery.noHistoricalData') || 'No historical data available for this trading pair'}
        </p>
        <p className="text-xs mt-1 text-gray-500">
          {t('priceQuery.noHistoricalDataHint') ||
            'Historical data source may not support this token'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* 工具栏 */}
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setShowDataTable(!showDataTable)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            showDataTable
              ? 'bg-primary-50 text-primary-700 border border-primary-200'
              : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
          }`}
          aria-pressed={showDataTable}
          aria-label={
            showDataTable
              ? t('priceQuery.charts.hideDataTable')
              : t('priceQuery.charts.showDataTable')
          }
        >
          <Table className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{t('priceQuery.charts.tableView')}</span>
        </button>
      </div>

      {/* 图表 */}
      <div className="h-[300px] w-full" role="img" aria-label={chartAriaLabel} tabIndex={0}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={enhancedChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxisLabel}
              stroke="#9ca3af"
              fontSize={11}
              tickMargin={8}
              minTickGap={30}
            />
            <YAxis
              domain={yAxisDomain}
              tickFormatter={(value) => formatPrice(value as number)}
              stroke="#9ca3af"
              fontSize={11}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            {avgPrice > 0 && (
              <ReferenceLine y={avgPrice} stroke="#9ca3af" strokeDasharray="5 5" strokeWidth={1} />
            )}
            {seriesNames.map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={getSeriesColor(index)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
                isAnimationActive={true}
                animationDuration={500}
              />
            ))}
            <Brush dataKey="time" height={30} stroke="#3b82f6" travellerWidth={8} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {showDataTable && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <ChartDataTable
            chartData={chartData}
            seriesNames={seriesNames}
            selectedTimeRange={selectedTimeRange}
          />
        </div>
      )}
    </div>
  );
}
