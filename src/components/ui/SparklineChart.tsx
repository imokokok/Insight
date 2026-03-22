'use client';

import { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface SparklineChartProps {
  /** 数据数组 */
  data: number[];
  /** 图表宽度 */
  width?: number;
  /** 图表高度 */
  height?: number;
  /** 线条颜色（覆盖自动趋势颜色） */
  color?: string;
  /** 是否填充区域 */
  fill?: boolean;
  /** 是否启用动画 */
  animate?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * SparklineChart - 迷你折线图组件
 *
 * 使用 SVG 渲染的轻量级趋势图表，自动根据数据趋势显示不同颜色
 * - 上升趋势：绿色 (--success-500)
 * - 下降趋势：红色 (--danger-500)
 * - 持平：灰色 (--gray-500)
 */
export function SparklineChart({
  data,
  width = 120,
  height = 40,
  color,
  fill = false,
  animate = true,
  className,
}: SparklineChartProps) {
  const [isVisible, setIsVisible] = useState(false);

  // 触发动画
  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [animate, data]);

  // 计算趋势方向
  const trend = useMemo(() => {
    if (data.length < 2) return 'neutral';
    const first = data[0];
    const last = data[data.length - 1];
    const diff = last - first;
    const threshold = Math.abs(first) * 0.001; // 0.1% 阈值

    if (diff > threshold) return 'up';
    if (diff < -threshold) return 'down';
    return 'neutral';
  }, [data]);

  // 确定颜色
  const lineColor = useMemo(() => {
    if (color) return color;
    switch (trend) {
      case 'up':
        return 'var(--success-500)';
      case 'down':
        return 'var(--danger-500)';
      default:
        return 'var(--gray-500)';
    }
  }, [color, trend]);

  // 填充颜色（带透明度）
  const fillColor = useMemo(() => {
    if (color) return color.replace(')', ', 0.15)').replace('rgb(', 'rgba(');
    switch (trend) {
      case 'up':
        return 'var(--success-500)';
      case 'down':
        return 'var(--danger-500)';
      default:
        return 'var(--gray-500)';
    }
  }, [color, trend]);

  // 计算 SVG 路径
  const { linePath, areaPath } = useMemo(() => {
    if (data.length === 0) return { linePath: '', areaPath: '' };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y };
    });

    // 生成平滑曲线路径
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
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { linePath, areaPath };
  }, [data, width, height]);

  // 如果没有数据，显示占位符
  if (data.length === 0) {
    return (
      <div
        className={cn('bg-gray-100 rounded', className)}
        style={{ width, height }}
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
        <linearGradient id={`gradient-${trend}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop
            offset="0%"
            stopColor={fillColor}
            stopOpacity={0.3}
          />
          <stop
            offset="100%"
            stopColor={fillColor}
            stopOpacity={0}
          />
        </linearGradient>

        {/* 裁剪路径用于动画 */}
        <clipPath id="sparkline-clip">
          <rect
            x="0"
            y="0"
            width={isVisible ? width : 0}
            height={height}
          >
            {animate && (
              <animate
                attributeName="width"
                from="0"
                to={width}
                dur="0.6s"
                fill="freeze"
                calcMode="spline"
                keySplines="0.4 0 0.2 1"
              />
            )}
          </rect>
        </clipPath>
      </defs>

      <g clipPath={animate ? 'url(#sparkline-clip)' : undefined}>
        {/* 区域填充 */}
        {fill && (
          <path
            d={areaPath}
            fill={`url(#gradient-${trend})`}
            className={cn(
              'transition-opacity duration-300',
              isVisible ? 'opacity-100' : 'opacity-0'
            )}
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
          className={cn(
            'transition-all duration-500',
            isVisible ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            strokeDasharray: animate ? 1000 : undefined,
            strokeDashoffset: animate ? (isVisible ? 0 : 1000) : undefined,
            transition: animate ? 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s' : undefined,
          }}
        />

        {/* 终点标记点 */}
        {data.length > 0 && (
          <circle
            cx={width - 2}
            cy={(() => {
              const min = Math.min(...data);
              const max = Math.max(...data);
              const range = max - min || 1;
              const lastValue = data[data.length - 1];
              return 2 + (height - 4) - ((lastValue - min) / range) * (height - 4);
            })()}
            r={2}
            fill={lineColor}
            className={cn(
              'transition-all duration-300',
              isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            )}
            style={{
              transformOrigin: `${width - 2}px ${(() => {
                const min = Math.min(...data);
                const max = Math.max(...data);
                const range = max - min || 1;
                const lastValue = data[data.length - 1];
                return 2 + (height - 4) - ((lastValue - min) / range) * (height - 4);
              })()}px`,
              transitionDelay: animate ? '0.5s' : undefined,
            }}
          />
        )}
      </g>
    </svg>
  );
}

export default SparklineChart;
