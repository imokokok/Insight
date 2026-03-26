'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/utils';

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
  /** 自定义类名 */
  className?: string;
}

/**
 * 判断数据趋势方向
 * @returns 'up' | 'down' | 'neutral'
 */
function getTrendDirection(data: number[]): 'up' | 'down' | 'neutral' {
  if (data.length < 2) return 'neutral';
  const first = data[0];
  const last = data[data.length - 1];
  const diff = last - first;
  const threshold = Math.abs(first) * 0.001; // 0.1% 阈值

  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'neutral';
}

/**
 * SparklineChart - 迷你折线图组件
 *
 * 使用 SVG 渲染的轻量级趋势图表，自动根据数据趋势显示不同颜色
 * - 上升趋势：绿色 (emerald-500)
 * - 下降趋势：红色 (rose-500)
 * - 持平：灰色 (gray-400)
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
  width = 60,
  height = 24,
  color,
  fill = false,
  animate = true,
  className,
}: SparklineChartProps) {
  // 计算趋势方向
  const trend = useMemo(() => getTrendDirection(data), [data]);

  // 确定颜色
  const lineColor = useMemo(() => {
    if (color) return color;
    switch (trend) {
      case 'up':
        return '#10b981'; // green
      case 'down':
        return '#ef4444'; // red
      default:
        return '#9ca3af'; // gray-400
    }
  }, [color, trend]);

  // 填充颜色（带透明度）
  const fillColor = useMemo(() => {
    if (color) {
      // 如果是 hex 颜色，转换为 rgba
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, 0.15)`;
      }
      return color;
    }
    switch (trend) {
      case 'up':
        return 'rgba(16, 185, 129, 0.15)'; // green with opacity
      case 'down':
        return 'rgba(239, 68, 68, 0.15)'; // red with opacity
      default:
        return 'rgba(156, 163, 175, 0.15)';
    }
  }, [color, trend]);

  // 计算 SVG 路径
  const { linePath, areaPath, lastPoint } = useMemo(() => {
    if (data.length === 0) {
      return { linePath: '', areaPath: '', lastPoint: null };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // 单点数据处理
    if (data.length === 1) {
      const x = width / 2;
      const y = height / 2;
      return {
        linePath: `M ${x} ${y}`,
        areaPath: '',
        lastPoint: { x, y },
      };
    }

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y };
    });

    // 生成平滑曲线路径（使用贝塞尔曲线）
    const linePath = points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;

      const prev = points[index - 1];
      const cp1x = prev.x + (point.x - prev.x) / 3;
      const cp1y = prev.y;
      const cp2x = point.x - (point.x - prev.x) / 3;
      const cp2y = point.y;

      return `${path} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
    }, '');

    // 生成区域填充路径
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return {
      linePath,
      areaPath,
      lastPoint: points[points.length - 1],
    };
  }, [data, width, height]);

  // 如果没有数据，显示占位符
  if (data.length === 0) {
    return (
      <div
        className={cn('bg-gray-100 rounded-md', className)}
        style={{ width, height }}
        aria-label="Empty sparkline chart"
      />
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      role="img"
      aria-label={`Trend chart showing ${trend === 'up' ? 'upward' : trend === 'down' ? 'downward' : 'neutral'} trend`}
    >
      <defs>
        {/* 渐变填充 */}
        <linearGradient id={`sparkline-gradient-${trend}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* 区域填充 */}
      {fill && data.length > 1 && (
        <path
          d={areaPath}
          fill={`url(#sparkline-gradient-${trend})`}
          className={cn(animate && 'transition-opacity duration-500')}
        />
      )}

      {/* 线条 */}
      <path
        d={linePath}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(animate && 'transition-all duration-500')}
      />

      {/* 终点标记点 */}
      {lastPoint && data.length > 1 && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={2}
          fill={lineColor}
          className={cn(animate && 'transition-all duration-300')}
        />
      )}

      {/* 单点显示为圆点 */}
      {data.length === 1 && lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={3}
          fill={lineColor}
          className={cn(animate && 'transition-all duration-300')}
        />
      )}
    </svg>
  );
}

export default SparklineChart;
