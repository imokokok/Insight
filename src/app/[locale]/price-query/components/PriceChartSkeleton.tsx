'use client';

import React from 'react';

import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg';

interface PriceChartSkeletonProps {
  size?: Size;
  className?: string;
  showLegend?: boolean;
  showToolbar?: boolean;
  showFooter?: boolean;
}

const sizeConfig: Record<Size, { height: number; legendCount: number; footerHeight: string }> = {
  sm: {
    height: 280,
    legendCount: 2,
    footerHeight: 'h-8',
  },
  md: {
    height: 360,
    legendCount: 4,
    footerHeight: 'h-9',
  },
  lg: {
    height: 450,
    legendCount: 6,
    footerHeight: 'h-10',
  },
};

export function PriceChartSkeleton({
  size = 'md',
  className,
  showLegend = true,
  showToolbar = true,
  showFooter = true,
}: PriceChartSkeletonProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse',
        className
      )}
    >
      {showToolbar && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-200 rounded-full" />
            <div className="h-3 w-12 bg-gray-200 rounded" />
          </div>
        </div>
      )}

      {showLegend && (
        <div className="px-4 py-2 bg-white border-b border-gray-100 flex flex-wrap gap-2">
          {Array.from({ length: config.legendCount }).map((_, index) => (
            <div key={index} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md">
              <div className="w-3 h-3 bg-gray-200 rounded" />
              <div className="w-2 h-2 bg-gray-200 rounded-full" />
              <div className="h-3 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}

      <div className="p-4" style={{ height: config.height }}>
        <div className="w-full h-full bg-gray-50 rounded-md relative overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
            <rect x="0" y="0" width="800" height="300" fill="#f9fafb" />

            <rect
              x="60"
              y="20"
              width="720"
              height="220"
              fill="none"
              stroke="#e5e7eb"
              strokeDasharray="3 3"
            />

            {Array.from({ length: 6 }).map((_, i) => (
              <rect
                key={`hline-${i}`}
                x="60"
                y={20 + i * 36}
                width="720"
                height="1"
                fill="#e5e7eb"
                opacity="0.5"
              />
            ))}

            {Array.from({ length: 10 }).map((_, i) => (
              <rect
                key={`vline-${i}`}
                x={60 + i * 72}
                y="20"
                width="1"
                height="220"
                fill="#e5e7eb"
                opacity="0.3"
              />
            ))}

            <path
              d="M 60 150 Q 150 100, 250 130 T 400 90 T 550 120 T 700 80 T 780 100"
              fill="none"
              stroke="#d1d5db"
              strokeWidth="2"
            />

            <path
              d="M 60 180 Q 200 160, 300 190 T 500 150 T 700 170"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            <rect x="60" y="250" width="720" height="40" fill="#f3f4f6" rx="4" />

            <rect x="100" y="260" width="60" height="20" fill="#e5e7eb" rx="2" />
            <rect x="680" y="260" width="60" height="20" fill="#e5e7eb" rx="2" />
          </svg>
        </div>
      </div>

      {showFooter && (
        <div
          className={cn(
            'px-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between',
            config.footerHeight
          )}
        >
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
        </div>
      )}
    </div>
  );
}

interface PriceChartHeaderSkeletonProps {
  className?: string;
}

export function PriceChartHeaderSkeleton({ className }: PriceChartHeaderSkeletonProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 animate-pulse',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-gray-200 rounded" />
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gray-200 rounded-full" />
        <div className="h-3 w-12 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

interface PriceChartLegendSkeletonProps {
  count?: number;
  className?: string;
}

export function PriceChartLegendSkeleton({ count = 4, className }: PriceChartLegendSkeletonProps) {
  return (
    <div
      className={cn(
        'px-4 py-2 bg-white border-b border-gray-100 flex flex-wrap gap-2 animate-pulse',
        className
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md">
          <div className="w-3 h-3 bg-gray-200 rounded" />
          <div className="w-2 h-2 bg-gray-200 rounded-full" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

interface PriceChartBodySkeletonProps {
  height?: number;
  className?: string;
}

export function PriceChartBodySkeleton({ height = 360, className }: PriceChartBodySkeletonProps) {
  return (
    <div className={cn('p-4 animate-pulse', className)}>
      <div className="w-full bg-gray-50 rounded-md relative overflow-hidden" style={{ height }}>
        <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
          <rect x="0" y="0" width="800" height="300" fill="#f9fafb" />

          <rect
            x="60"
            y="20"
            width="720"
            height="220"
            fill="none"
            stroke="#e5e7eb"
            strokeDasharray="3 3"
          />

          {Array.from({ length: 6 }).map((_, i) => (
            <rect
              key={`hline-${i}`}
              x="60"
              y={20 + i * 36}
              width="720"
              height="1"
              fill="#e5e7eb"
              opacity="0.5"
            />
          ))}

          {Array.from({ length: 10 }).map((_, i) => (
            <rect
              key={`vline-${i}`}
              x={60 + i * 72}
              y="20"
              width="1"
              height="220"
              fill="#e5e7eb"
              opacity="0.3"
            />
          ))}

          <path
            d="M 60 150 Q 150 100, 250 130 T 400 90 T 550 120 T 700 80 T 780 100"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="2"
          />

          <path
            d="M 60 180 Q 200 160, 300 190 T 500 150 T 700 170"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          <rect x="60" y="250" width="720" height="40" fill="#f3f4f6" rx="4" />

          <rect x="100" y="260" width="60" height="20" fill="#e5e7eb" rx="2" />
          <rect x="680" y="260" width="60" height="20" fill="#e5e7eb" rx="2" />
        </svg>
      </div>
    </div>
  );
}

interface PriceChartFooterSkeletonProps {
  className?: string;
}

export function PriceChartFooterSkeleton({ className }: PriceChartFooterSkeletonProps) {
  return (
    <div
      className={cn(
        'px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between animate-pulse',
        className
      )}
    >
      <div className="h-3 w-20 bg-gray-200 rounded" />
      <div className="h-3 w-16 bg-gray-200 rounded" />
    </div>
  );
}
