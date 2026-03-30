'use client';

import React, { useEffect, useState, useCallback } from 'react';

import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

// ============================================
// 进度条组件
// ============================================

interface ProgressBarProps {
  progress: number;
  total?: number;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  total = 100,
  showPercentage = true,
  size = 'md',
  variant = 'default',
  animated = true,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (progress / total) * 100));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantClasses = {
    default: 'bg-primary-600',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-danger-500',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            variantClasses[variant],
            animated && 'progress-bar-animated'
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
      {showPercentage && (
        <div className="flex justify-between items-center mt-1.5 text-xs text-gray-500">
          <span>{Math.round(percentage)}%</span>
          <span>
            {progress} / {total}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// 圆形进度组件
// ============================================

interface CircularProgressProps {
  progress: number;
  total?: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export function CircularProgress({
  progress,
  total = 100,
  size = 60,
  strokeWidth = 4,
  showPercentage = true,
  variant = 'default',
  className,
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (progress / total) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    default: '#2563eb',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  };

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
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={variantColors[variant]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300 ease-out"
        />
      </svg>
      {showPercentage && (
        <span className="absolute text-sm font-medium text-gray-700">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

// ============================================
// 步骤进度组件
// ============================================

interface StepProgressProps {
  steps: string[];
  currentStep: number;
  variant?: 'default' | 'vertical';
  className?: string;
}



// ============================================
// 数据加载进度组件
// ============================================

interface DataLoadingProgressProps {
  isLoading: boolean;
  progress?: number;
  total?: number;
  message?: string;
  subMessage?: string;
  onCancel?: () => void;
  showCancel?: boolean;
  estimatedTime?: number;
  className?: string;
}

export function DataLoadingProgress({
  isLoading,
  progress = 0,
  total = 100,
  message,
  subMessage,
  onCancel,
  showCancel = true,
  estimatedTime,
  className,
}: DataLoadingProgressProps) {
  const t = useTranslations('loading');
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    // Reset elapsed time when loading starts
    const timer = setTimeout(() => setElapsedTime(0), 0);
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isLoading]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (!isLoading) return null;

  const percentage = Math.min(100, Math.max(0, (progress / total) * 100));

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm',
        className
      )}
    >
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{message || t('loadingData')}</h3>
          </div>
          {showCancel && onCancel && (
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={t('cancel')}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mb-4">
          <ProgressBar progress={progress} total={total} size="lg" animated />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>{subMessage || t('fetchingData')}</span>
          <span className="font-medium">{Math.round(percentage)}%</span>
        </div>

        {(estimatedTime || elapsedTime > 0) && (
          <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-100">
            <span>
              {t('elapsedTime')}: {formatTime(elapsedTime)}
            </span>
            {estimatedTime && (
              <span>
                {t('estimatedTime')}: {formatTime(estimatedTime)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// 批量操作进度组件
// ============================================

interface BatchOperationProgressProps {
  isProcessing: boolean;
  completed: number;
  total: number;
  failed?: number;
  operationName: string;
  onCancel?: () => void;
  showDetails?: boolean;
  items?: Array<{
    id: string;
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  }>;
  className?: string;
}



// ============================================
// 骨架屏加载状态 Hook
// ============================================

interface UseLoadingProgressOptions {
  onComplete?: () => void;
  onError?: (error: Error) => void;
}



// ============================================
// 懒加载占位组件
// ============================================

interface LazyLoadPlaceholderProps {
  height?: string | number;
  children?: React.ReactNode;
  className?: string;
}


