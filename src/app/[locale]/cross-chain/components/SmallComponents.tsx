'use client';

import { baseColors, semanticColors } from '@/lib/config/colors';
import { type Blockchain } from '@/lib/oracles';

import {
  chainColors,
  type SparklineProps,
  type ProgressBarProps,
  type JumpIndicatorProps,
} from '../constants';

export function Sparkline({ data, color, width = 80, height = 20 }: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <span className="text-xs" style={{ color: baseColors.gray[400] }}>
        -
      </span>
    );
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
      <div
        className="flex-1 h-2 min-w-[60px] rounded-full overflow-hidden"
        style={{ backgroundColor: baseColors.gray[100] }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {showValue && (
        <span
          className="text-xs font-mono min-w-[45px] text-right tabular-nums"
          style={{ color: baseColors.gray[600] }}
        >
          {value.toFixed(1)}
          {suffix}
        </span>
      )}
    </div>
  );
}

export function JumpIndicator({ count }: JumpIndicatorProps) {
  const getJumpColor = (cnt: number): string => {
    if (cnt < 3) return semanticColors.success.main;
    if (cnt <= 5) return semanticColors.warning.main;
    return semanticColors.danger.main;
  };

  const color = getJumpColor(count);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className="w-1.5 h-3 rounded-sm transition-colors duration-200"
            style={{
              backgroundColor: count >= level ? color : baseColors.gray[200],
            }}
          />
        ))}
      </div>
      <span
        className="text-xs font-mono tabular-nums min-w-[16px] text-right"
        style={{ color: baseColors.gray[600] }}
      >
        {count}
      </span>
    </div>
  );
}

export function TrendIndicator({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) return null;
  const isPositive = changePercent >= 0;
  return (
    <span
      className="text-xs font-medium"
      style={{ color: isPositive ? semanticColors.success.main : semanticColors.danger.main }}
    >
      {isPositive ? '+' : ''}
      {Math.abs(changePercent).toFixed(1)}%
    </span>
  );
}

export { chainColors };
export type { Blockchain };
