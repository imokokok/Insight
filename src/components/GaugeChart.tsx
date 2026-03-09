'use client';

import { useEffect, useState } from 'react';

interface GaugeChartProps {
  value: number;
  maxValue: number;
  label?: string;
  size?: number;
}

export default function GaugeChart({
  value,
  maxValue,
  label,
  size = 160,
}: GaugeChartProps) {
  const [displayValue, setDisplayValue] = useState(0);

  const clampedValue = Math.min(Math.max(value, 0), maxValue);
  const percentage = (clampedValue / maxValue) * 100;

  const getColor = (percent: number) => {
    if (percent < 20) return '#10B981';
    if (percent < 40) return '#3B82F6';
    if (percent < 60) return '#F59E0B';
    return '#EF4444';
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
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={0}
            strokeLinecap="round"
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
            strokeLinecap="round"
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
