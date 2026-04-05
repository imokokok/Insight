'use client';

import { forwardRef, useMemo, type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

import { Skeleton } from './Skeleton';

export interface LoadingStatesProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'page' | 'card' | 'table' | 'chart' | 'list' | 'detail';
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  showToolbar?: boolean;
  chartHeight?: number;
}

export const PageLoadingState = forwardRef<HTMLDivElement, LoadingStatesProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('min-h-screen bg-gray-50 flex items-center justify-center p-8', className)}
        {...props}
      >
        <div className="flex flex-col items-center gap-4 max-w-md w-full">
          <div className="flex items-center gap-4 w-full">
            <Skeleton variant="circular" width={48} height={48} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="h-4 w-3/4" />
              <Skeleton variant="text" className="h-3 w-1/2" />
            </div>
          </div>
          <div className="w-full space-y-3 mt-4">
            <Skeleton variant="rounded" className="h-12 w-full" />
            <Skeleton variant="rounded" className="h-12 w-full" />
            <Skeleton variant="rounded" className="h-12 w-3/4" />
          </div>
        </div>
      </div>
    );
  }
);

PageLoadingState.displayName = 'PageLoadingState';

export const CardLoadingState = forwardRef<HTMLDivElement, LoadingStatesProps>(
  ({ className, rows = 3, showHeader = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}
        {...props}
      >
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant="text" className="h-6 w-32" />
            <Skeleton variant="rounded" className="h-8 w-24" />
          </div>
        )}
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton variant="circular" width={32} height={32} />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" className="h-4" />
                <Skeleton variant="text" className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

CardLoadingState.displayName = 'CardLoadingState';

export const TableLoadingState = forwardRef<HTMLDivElement, LoadingStatesProps>(
  ({ className, rows = 5, columns = 4, showHeader = true, showToolbar = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('bg-white rounded-lg border border-gray-200', className)}
        {...props}
      >
        {showToolbar && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <Skeleton variant="text" className="h-6 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton variant="rounded" className="h-8 w-24" />
              <Skeleton variant="rounded" className="h-8 w-24" />
            </div>
          </div>
        )}
        {showHeader && (
          <div className="flex items-center gap-4 p-4 border-b border-gray-200 bg-gray-50">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} variant="text" className="h-4 flex-1" />
            ))}
          </div>
        )}
        <div className="divide-y divide-gray-100">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-4 p-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  variant="text"
                  className={cn(
                    'h-4',
                    colIndex === 0 ? 'w-1/4' : colIndex === columns - 1 ? 'w-20' : 'flex-1'
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

TableLoadingState.displayName = 'TableLoadingState';

export const ChartLoadingState = forwardRef<HTMLDivElement, LoadingStatesProps>(
  ({ className, chartHeight = 300, showToolbar = true, ...props }, ref) => {
    const barHeights = useMemo(() => [45, 72, 38, 85, 55, 68, 42, 78], []);
    return (
      <div
        ref={ref}
        className={cn('bg-white rounded-lg border border-gray-200 p-4', className)}
        {...props}
      >
        {showToolbar && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Skeleton variant="text" className="h-6 w-32" />
              <Skeleton variant="rounded" className="h-5 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton variant="rounded" className="h-8 w-8" />
              <Skeleton variant="rounded" className="h-8 w-8" />
            </div>
          </div>
        )}
        <div className="relative" style={{ height: chartHeight }}>
          <Skeleton variant="rectangular" className="w-full h-full" />
          <div className="absolute inset-0 flex items-end justify-around px-4 pb-4">
            {barHeights.map((height, i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                className="w-8"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton variant="circular" width={8} height={8} />
              <Skeleton variant="text" className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }
);

ChartLoadingState.displayName = 'ChartLoadingState';

export const ListLoadingState = forwardRef<HTMLDivElement, LoadingStatesProps>(
  ({ className, rows = 5, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-3', className)} {...props}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200"
          >
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="h-4 w-1/3" />
              <Skeleton variant="text" className="h-3 w-2/3" />
            </div>
            <Skeleton variant="rounded" className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }
);

ListLoadingState.displayName = 'ListLoadingState';

export const DetailLoadingState = forwardRef<HTMLDivElement, LoadingStatesProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-6', className)} {...props}>
        <div className="flex items-start gap-4">
          <Skeleton variant="rounded" className="h-16 w-16" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-6 w-1/3" />
            <Skeleton variant="text" className="h-4 w-1/2" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 bg-white rounded-lg border border-gray-200">
              <Skeleton variant="text" className="h-3 w-16 mb-2" />
              <Skeleton variant="text" className="h-6 w-24" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Skeleton variant="text" className="h-5 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton variant="text" className="h-4 w-24" />
                <Skeleton variant="text" className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

DetailLoadingState.displayName = 'DetailLoadingState';

export const LoadingState = forwardRef<HTMLDivElement, LoadingStatesProps>(
  ({ variant = 'page', ...props }, ref) => {
    switch (variant) {
      case 'card':
        return <CardLoadingState ref={ref} {...props} />;
      case 'table':
        return <TableLoadingState ref={ref} {...props} />;
      case 'chart':
        return <ChartLoadingState ref={ref} {...props} />;
      case 'list':
        return <ListLoadingState ref={ref} {...props} />;
      case 'detail':
        return <DetailLoadingState ref={ref} {...props} />;
      case 'page':
      default:
        return <PageLoadingState ref={ref} {...props} />;
    }
  }
);

LoadingState.displayName = 'LoadingState';
