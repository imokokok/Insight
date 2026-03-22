'use client';

import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, Area, AreaChart } from 'recharts';

/**
 * SparklineChart Props 接口
 */
export interface SparklineChartProps {
  /** 数据数组 */
  data: number[];
  /** 图表宽度（像素） */
  width?: number;
  /** 图表高度（像素） */
  height?: number;
  /** 自定义颜色（覆盖趋势颜色） */
  color?: string;
  /** 是否填充区域 */
  fill?: boolean;
  /** 是否启用动画 */
  animate?: boolean;
}

/**
 * 将原始数据转换为 Recharts 需要的格式
 */
function transformData(data: number[]): Array<{ value: number; index: number }> {
  return data.map((value, index) => ({ value, index }));
}

/**
 * 判断数据趋势方向
 * @returns 1 表示上涨（绿色），-1 表示下跌（红色）
 */
function getTrendDirection(data: number[]): number {
  if (data.length < 2) return 1;
  const first = data[0];
  const last = data[data.length - 1];
  return last >= first ? 1 : -1;
}

/**
 * 获取趋势颜色
 * 上涨使用绿色（success-500），下跌使用红色（danger-500）
 */
function getTrendColor(direction: number): string {
  return direction > 0 ? '#10b981' : '#ef4444';
}

/**
 * SparklineChart - 迷你折线图组件
 *
 * 一个紧凑的折线图组件，不显示坐标轴，适用于展示价格趋势等场景。
 * 支持自动根据数据趋势显示不同颜色（上涨绿色/下跌红色），支持区域填充和动画效果。
 *
 * @example
 * ```tsx
 * // 基础用法
 * <SparklineChart data={[1, 2, 3, 4, 5]} />
 *
 * // 自定义尺寸和填充
 * <SparklineChart data={[1, 2, 3, 4, 5]} width={150} height={50} fill />
 *
 * // 禁用动画
 * <SparklineChart data={[1, 2, 3, 4, 5]} animate={false} />
 *
 * // 自定义颜色（覆盖趋势颜色）
 * <SparklineChart data={[1, 2, 3, 4, 5]} color="#3b82f6" />
 * ```
 */
export function SparklineChart({
  data,
  width = 120,
  height = 40,
  color,
  fill = false,
  animate = true,
}: SparklineChartProps) {
  const chartData = useMemo(() => transformData(data), [data]);

  const trendColor = useMemo(() => {
    if (color) return color;
    const direction = getTrendDirection(data);
    return getTrendColor(direction);
  }, [data, color]);

  const fillColor = useMemo(() => {
    return `${trendColor}20`; // 添加 20% 透明度的十六进制
  }, [trendColor]);

  if (data.length === 0) {
    return (
      <div
        className="bg-gray-100 rounded"
        style={{ width, height }}
        aria-label="Empty sparkline chart"
      />
    );
  }

  const commonProps = {
    data: chartData,
    margin: { top: 2, right: 2, bottom: 2, left: 2 },
  };

  const lineProps = {
    type: 'monotone' as const,
    dataKey: 'value',
    stroke: trendColor,
    strokeWidth: 1.5,
    dot: false,
    activeDot: false,
    isAnimationActive: animate,
    animationDuration: 800,
    animationEasing: 'ease-out' as const,
  };

  const areaProps = {
    type: 'monotone' as const,
    dataKey: 'value',
    stroke: trendColor,
    strokeWidth: 1.5,
    fill: fillColor,
    dot: false,
    activeDot: false,
    isAnimationActive: animate,
    animationDuration: 800,
    animationEasing: 'ease-out' as const,
  };

  return (
    <div style={{ width, height }} aria-label="Sparkline chart">
      <ResponsiveContainer width="100%" height="100%">
        {fill ? (
          <AreaChart {...commonProps}>
            <Area {...areaProps} />
          </AreaChart>
        ) : (
          <LineChart {...commonProps}>
            <Line {...lineProps} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default SparklineChart;
