'use client';

import { Blockchain } from '@/lib/oracles';
import { chainColors, SparklineProps, ProgressBarProps, JumpIndicatorProps } from '../constants';

export function Sparkline({ data, color, width = 80, height = 20 }: SparklineProps) {
  if (!data || data.length < 2) {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  const recentData = data.slice(-20);
  const min = Math.min(...recentData);
  const max = Math.max(...recentData);
  const range = max - min || 1;

  const points = recentData
    .map((value, index) => {
      const x = (index / (recentData.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function ProgressBar({
  value,
  color,
  max = 100,
  showValue = true,
  suffix = '%',
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden min-w-[60px]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {showValue && (
        <span className="text-xs font-mono text-gray-600 min-w-[45px] text-right">
          {value.toFixed(1)}
          {suffix}
        </span>
      )}
    </div>
  );
}

export function JumpIndicator({ count }: JumpIndicatorProps) {
  const getJumpColor = (cnt: number): string => {
    if (cnt < 3) return '#10B981';
    if (cnt <= 5) return '#F59E0B';
    return '#EF4444';
  };

  const color = getJumpColor(count);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className="w-2 h-4 rounded-sm"
            style={{
              backgroundColor: count >= level ? color : '#E5E7EB',
            }}
          />
        ))}
      </div>
      <span className="text-xs font-mono text-gray-600">{count}</span>
    </div>
  );
}

export function TrendIndicator({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) return null;
  const isPositive = changePercent >= 0;
  return (
    <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? '↑' : '↓'} {Math.abs(changePercent).toFixed(2)}%
    </span>
  );
}

export { chainColors };
export type { Blockchain };
