'use client';

import { useMemo } from 'react';

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

interface CircularGaugeProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CircularGauge({
  value,
  size = 160,
  strokeWidth = 10,
  className,
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const maxValue = 2;
  const clampedValue = Math.min(Math.max(value, 0), maxValue);
  const progress = clampedValue / maxValue;
  const dashoffset = circumference * (1 - progress);

  const color = useMemo(() => {
    if (value < 1) return '#ef4444';
    if (value < 1.05) return '#f59e0b';
    if (value < 1.2) return '#eab308';
    return '#10b981';
  }, [value]);

  const statusText = useMemo(() => {
    if (value < 1) return '已清算';
    if (value < 1.05) return '临界';
    if (value < 1.2) return '警告';
    return '安全';
  }, [value]);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-2xl font-bold text-gray-900 tabular-nums"
        >
          {value.toFixed(2)}
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
          style={{ color }}
        >
          {statusText}
        </motion.span>
      </div>
    </div>
  );
}
