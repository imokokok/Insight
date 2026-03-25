'use client';

import { useMemo } from 'react';

export interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  showArea?: boolean;
  className?: string;
}

export function SparklineChart({
  data,
  color = '#3b82f6',
  height = 40,
  width = 120,
  showArea = false,
  className = '',
}: SparklineChartProps) {
  const { pathD, areaD, viewBox } = useMemo(() => {
    if (data.length === 0) {
      return { pathD: '', areaD: '', viewBox: '0 0 0 0' };
    }

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

    // Generate smooth line path using simple polyline
    const pathD = points.reduce((acc, point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${acc} ${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }, '');

    // Generate area path
    const areaD = showArea
      ? `${pathD} L ${points[points.length - 1]?.x.toFixed(2) || 0} ${height} L ${points[0]?.x.toFixed(2) || 0} ${height} Z`
      : '';

    const viewBox = `0 0 ${width} ${height}`;

    return { pathD, areaD, viewBox };
  }, [data, height, width, showArea]);

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 rounded ${className}`}
        style={{ width, height }}
      >
        <span className="text-xs text-gray-400">No data</span>
      </div>
    );
  }

  const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      className={`overflow-visible ${className}`}
      preserveAspectRatio="none"
    >
      <defs>
        {showArea && (
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        )}
      </defs>

      {showArea && areaD && (
        <path d={areaD} fill={`url(#${gradientId})`} stroke="none" />
      )}

      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* End point dot */}
      {data.length > 0 && (
        <circle
          cx={width - 2}
          cy={(() => {
            const min = Math.min(...data);
            const max = Math.max(...data);
            const range = max - min || 1;
            const chartHeight = height - 4;
            return 2 + chartHeight - ((data[data.length - 1] - min) / range) * chartHeight;
          })()}
          r={2}
          fill={color}
        />
      )}
    </svg>
  );
}

export default SparklineChart;
