'use client';

import React from 'react';

import { useTranslations } from '@/i18n';

interface ProgressBarProps {
  progress?: number;
  value?: number;
  total?: number;
  max?: number;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;
  color?: string;
  className?: string;
  suffix?: string;
}

export function ProgressBar({
  progress,
  value,
  total = 100,
  max = 100,
  showPercentage = false,
  size = 'md',
  variant = 'default',
  animated = true,
  color,
  className = '',
  suffix = '',
}: ProgressBarProps) {
  const numericValue = value ?? progress ?? 0;
  const percentage = Math.min(100, Math.max(0, (numericValue / (max || 100)) * 100));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const defaultColors = {
    default: 'bg-primary-600',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-danger-500',
  };

  const barColor = color || defaultColors[variant];

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            animated ? 'progress-bar-animated' : ''
          } ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <div className="flex justify-end mt-1 text-xs text-gray-500">
          <span>
            {Math.round(percentage)}
            {suffix}
          </span>
        </div>
      )}
    </div>
  );
}

interface JumpIndicatorProps {
  count: number;
  threshold?: number;
}

export function JumpIndicator({ count, threshold = 5 }: JumpIndicatorProps) {
  const t = useTranslations();

  const getColorClass = () => {
    if (count === 0) return 'text-emerald-500';
    if (count < threshold) return 'text-amber-500';
    return 'text-danger-500';
  };

  return (
    <div className="flex items-center gap-1">
      <span className={`text-lg font-bold ${getColorClass()}`}>{count}</span>
      <span className="text-xs text-gray-500">{t('crossChain.priceJumps')}</span>
    </div>
  );
}
