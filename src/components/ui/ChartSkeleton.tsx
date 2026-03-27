'use client';

import React from 'react';

import { chartColors } from '@/lib/config/colors';

interface ChartSkeletonProps {
  height?: number;
  className?: string;
  showToolbar?: boolean;
  variant?: 'price' | 'area' | 'line' | 'bar';
}

export function ChartSkeleton({
  height = 400,
  className = '',
  showToolbar = true,
  variant = 'price',
}: ChartSkeletonProps) {
  return (
    <div className={`skeleton-shimmer ${className}`} style={{ height }}>
      {showToolbar && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-32 bg-gray-200 rounded-md" />
            <div className="h-5 w-16 bg-gray-200 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gray-200 rounded-md" />
            <div className="h-8 w-8 bg-gray-200 rounded-md" />
          </div>
        </div>
      )}

      <div className="flex-1 bg-gray-50 p-4 h-full">
        <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
          {variant === 'price' && (
            <>
              <rect x="0" y="0" width="800" height="300" fill={chartColors.recharts.background} />
              <rect
                x="60"
                y="20"
                width="720"
                height="200"
                fill="none"
                stroke={chartColors.recharts.grid}
                strokeDasharray="3 3"
              />
              {[...Array(6)].map((_, i) => (
                <rect
                  key={`hline-${i}`}
                  x="60"
                  y={20 + i * 33}
                  width="720"
                  height="1"
                  fill={chartColors.recharts.grid}
                  opacity="0.5"
                />
              ))}
              {[...Array(10)].map((_, i) => (
                <rect
                  key={`vline-${i}`}
                  x={60 + i * 72}
                  y="20"
                  width="1"
                  height="200"
                  fill={chartColors.recharts.grid}
                  opacity="0.3"
                />
              ))}
              <path
                d="M 60 120 Q 200 80, 300 140 T 500 100 T 700 130"
                fill="none"
                stroke={chartColors.recharts.border}
                strokeWidth="2"
              />
              <rect
                x="60"
                y="220"
                width="720"
                height="60"
                fill={chartColors.recharts.grid}
                opacity="0.3"
                rx="4"
              />
            </>
          )}

          {variant === 'area' && (
            <>
              <rect x="0" y="0" width="800" height="300" fill={chartColors.recharts.background} />
              <defs>
                <linearGradient id="skeletonGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.recharts.grid} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={chartColors.recharts.grid} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 250 Q 100 200, 200 220 T 400 180 T 600 200 T 800 150 L 800 300 L 0 300 Z"
                fill="url(#skeletonGradient)"
              />
              <path
                d="M 0 250 Q 100 200, 200 220 T 400 180 T 600 200 T 800 150"
                fill="none"
                stroke={chartColors.recharts.border}
                strokeWidth="2"
              />
            </>
          )}

          {variant === 'line' && (
            <>
              <rect x="0" y="0" width="800" height="300" fill={chartColors.recharts.background} />
              <path
                d="M 0 150 Q 100 100, 200 180 T 400 120 T 600 160 T 800 100"
                fill="none"
                stroke={chartColors.recharts.border}
                strokeWidth="2"
                strokeDasharray="5 5"
              />
              {[...Array(8)].map((_, i) => (
                <circle
                  key={`dot-${i}`}
                  cx={i * 100 + 100}
                  cy={150 + (i % 2) * 30}
                  r="4"
                  fill={chartColors.recharts.border}
                />
              ))}
            </>
          )}

          {variant === 'bar' && (
            <>
              <rect x="0" y="0" width="800" height="300" fill={chartColors.recharts.background} />
              {[...Array(12)].map((_, i) => (
                <rect
                  key={`bar-${i}`}
                  x={60 + i * 60}
                  y={150 + (i % 2) * 30}
                  width="40"
                  height={100 - (i % 3) * 20}
                  fill={chartColors.recharts.grid}
                  rx="4"
                />
              ))}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

interface MiniChartSkeletonProps {
  height?: number;
  width?: string;
  className?: string;
}

export function MiniChartSkeleton({
  height = 80,
  width = '100%',
  className = '',
}: MiniChartSkeletonProps) {
  return (
    <div className={`skeleton-shimmer ${className}`} style={{ height, width }}>
      <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
        <rect x="0" y="0" width="200" height="80" fill={chartColors.recharts.background} />
        <defs>
          <linearGradient id="miniSkeletonGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColors.recharts.grid} stopOpacity="0.3" />
            <stop offset="100%" stopColor={chartColors.recharts.grid} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M 0 60 Q 50 40, 100 50 T 200 30 L 200 80 L 0 80 Z"
          fill="url(#miniSkeletonGradient)"
        />
        <path
          d="M 0 60 Q 50 40, 100 50 T 200 30"
          fill="none"
          stroke={chartColors.recharts.border}
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

interface MetricCardSkeletonProps {
  className?: string;
}

export function MetricCardSkeleton({ className = '' }: MetricCardSkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer border border-gray-200/60 bg-gray-50/80 rounded-lg p-6 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-gray-200 h-11 w-11 rounded-lg" />
        <div className="h-6 w-16 bg-gray-200 rounded-md" />
      </div>
      <div className="flex-1">
        <div className="h-4 w-24 bg-gray-200 mb-2 rounded" />
        <div className="h-8 w-20 bg-gray-200 mb-1 rounded-md" />
        <div className="h-3 w-16 bg-gray-200 rounded" />
      </div>
      <div className="mt-5 h-20 w-full bg-gray-200 rounded-md" />
    </div>
  );
}

interface HeroSkeletonProps {
  className?: string;
}

export function HeroSkeleton({ className = '' }: HeroSkeletonProps) {
  return (
    <section className={`relative min-h-screen flex flex-col overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100" />
      <div className="relative z-10 flex-1 flex items-center px-6 lg:px-12 xl:px-20 py-12">
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="skeleton-shimmer inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full mb-8">
              <div className="w-8 h-4 bg-gray-200 rounded" />
            </div>

            <div className="skeleton-shimmer mb-6">
              <div className="h-12 sm:h-14 md:h-16 lg:h-20 w-3/4 mx-auto bg-gray-200 rounded-lg mb-4" />
              <div className="h-12 sm:h-14 md:h-16 lg:h-20 w-2/3 mx-auto bg-gray-200 rounded-lg" />
            </div>

            <div className="skeleton-shimmer h-6 w-96 max-w-full mx-auto mb-10 bg-gray-200 rounded" />

            <div className="skeleton-shimmer max-w-2xl mx-auto mb-4">
              <div className="h-14 bg-gray-200 rounded-xl" />
            </div>

            <div className="skeleton-shimmer flex items-center justify-center gap-2 flex-wrap mb-10">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="px-3 py-1 h-7 w-16 bg-gray-200 rounded-full" />
              ))}
            </div>

            <div className="skeleton-shimmer flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12">
              <div className="h-12 w-40 bg-gray-200 rounded-lg" />
              <div className="h-12 w-40 bg-gray-200 rounded-lg" />
            </div>

            <div className="skeleton-shimmer grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gray-100 h-10 w-10 rounded-lg" />
                      <div className="h-4 w-20 bg-gray-200 rounded" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded-md" />
                  </div>
                  <div className="h-9 w-24 bg-gray-200 rounded-md mb-3" />
                  <div className="h-12 w-full bg-gray-200 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
