'use client';

import { useEffect, useState } from 'react';
import { chartColors } from '@/lib/config/colors';

interface GaugeChartProps {
  value: number;
  maxValue: number;
  label?: string;
  size?: number;
}

export default function GaugeChart({ value, maxValue, label, size = 160 }: GaugeChartProps) {
  const [displayValue, setDisplayValue] = useState(0);

  const clampedValue = Math.min(Math.max(value, 0), maxValue);
  const percentage = (clampedValue / maxValue) * 100;

  const getColor = (percent: number) => {
    if (percent < 20) return chartColors.semantic.success;
    if (percent < 40) return chartColors.recharts.primary;
    if (percent < 60) return chartColors.semantic.warning;
    return chartColors.semantic.danger;
  };

  const getRating = (percent: number) => {
    if (percent < 20) return 'Excellent';
    if (percent < 40) return 'Good';
    if (percent < 60) return 'Fair';
    return 'Poor';
  };

  useEffect(() => {
    const timer = setTimeout(() => setDisplayValue(clampedValue), 100);
    return () => clearTimeout(timer);
  }, [clampedValue]);

  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength;

  const color = getColor(percentage);
  const rating = getRating(percentage);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-135"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={chartColors.recharts.grid}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={0}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <span className="text-3xl font-bold" style={{ color }}>
            {displayValue.toFixed(2)}%
          </span>
          <span className="text-sm font-medium text-gray-500 mt-1">{rating}</span>
        </div>
      </div>
      {label && <p className="mt-3 text-sm font-medium text-gray-600">{label}</p>}
    </div>
  );
}
