'use client';

import { forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | string;
  icon?: ReactNode;
  onRetry?: () => void;
  retryText?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export const ErrorState = forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      title = '出错了',
      description = '加载数据时发生错误，请稍后重试',
      error,
      icon,
      onRetry,
      retryText = '重试',
      action,
      className,
      compact = false,
    },
    ref
  ) => {
    const errorMessage = error instanceof Error ? error.message : error;

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center',
          compact ? 'py-8 px-4' : 'py-16 px-4',
          className
        )}
        role="alert"
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-danger-50 mb-4',
            compact ? 'w-12 h-12' : 'w-16 h-16'
          )}
        >
          {icon || (
            <AlertTriangle
              className={cn(
                'text-danger-500',
                compact ? 'w-6 h-6' : 'w-8 h-8'
              )}
            />
          )}
        </div>
        <h3
          className={cn(
            'font-semibold text-gray-900 mb-1',
            compact ? 'text-base' : 'text-lg'
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            'text-gray-500 max-w-sm',
            compact ? 'text-sm' : 'text-base'
          )}
        >
          {description}
        </p>
        {errorMessage && (
          <p className="mt-2 text-sm text-danger-600 max-w-sm break-words">
            {errorMessage}
          </p>
        )}
        <div className={cn('flex items-center gap-3', compact ? 'mt-4' : 'mt-6')}>
          {onRetry && (
            <Button
              variant="primary"
              size={compact ? 'sm' : 'md'}
              onClick={onRetry}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              {retryText}
            </Button>
          )}
          {action}
        </div>
      </div>
    );
  }
);

ErrorState.displayName = 'ErrorState';
