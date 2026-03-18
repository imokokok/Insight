'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// 基础骨架屏组件
// ============================================

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'default' | 'circle' | 'text' | 'rect';
  animate?: boolean;
  delay?: number;
}

export function Skeleton({
  className,
  width,
  height,
  variant = 'default',
  animate = true,
  delay = 0,
}: SkeletonProps) {
  const style: React.CSSProperties = useMemo(
    () => ({
      width: width ?? (variant === 'text' ? '100%' : undefined),
      height: height ?? (variant === 'text' ? '1em' : undefined),
      animationDelay: delay ? `${delay}ms` : undefined,
    }),
    [width, height, variant, delay]
  );

  const variantClasses = {
    default: 'rounded-md',
    circle: 'rounded-full',
    text: 'rounded',
    rect: 'rounded-none',
  };

  return (
    <div
      className={cn(
        'bg-gray-200',
        variantClasses[variant],
        animate && 'skeleton-shimmer',
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

// ============================================
// 图表骨架屏
// ============================================

interface ChartSkeletonProps {
  height?: number;
  className?: string;
  showToolbar?: boolean;
  variant?: 'price' | 'area' | 'line' | 'bar' | 'pie' | 'heatmap';
  animate?: boolean;
}

export function ChartSkeletonEnhanced({
  height = 400,
  className = '',
  showToolbar = true,
  variant = 'price',
  animate = true,
}: ChartSkeletonProps) {
  const renderChartContent = () => {
    switch (variant) {
      case 'price':
        return (
          <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
            <rect x="0" y="0" width="800" height="300" fill="#f9fafb" />
            <rect
              x="60"
              y="20"
              width="720"
              height="200"
              fill="none"
              stroke="#e5e7eb"
              strokeDasharray="3 3"
            />
            {[...Array(6)].map((_, i) => (
              <rect
                key={`hline-${i}`}
                x="60"
                y={20 + i * 33}
                width="720"
                height="1"
                fill="#e5e7eb"
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
                fill="#e5e7eb"
                opacity="0.3"
              />
            ))}
            <path
              d="M 60 120 Q 200 80, 300 140 T 500 100 T 700 130"
              fill="none"
              stroke="#d1d5db"
              strokeWidth="2"
            />
            <rect x="60" y="220" width="720" height="60" fill="#e5e7eb" opacity="0.3" rx="4" />
          </svg>
        );
      case 'area':
        return (
          <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
            <rect x="0" y="0" width="800" height="300" fill="#f9fafb" />
            <defs>
              <linearGradient id="skeletonGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M 0 250 Q 100 200, 200 220 T 400 180 T 600 200 T 800 150 L 800 300 L 0 300 Z"
              fill="url(#skeletonGradient)"
            />
            <path
              d="M 0 250 Q 100 200, 200 220 T 400 180 T 600 200 T 800 150"
              fill="none"
              stroke="#d1d5db"
              strokeWidth="2"
            />
          </svg>
        );
      case 'line':
        return (
          <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
            <rect x="0" y="0" width="800" height="300" fill="#f9fafb" />
            <path
              d="M 0 150 Q 100 100, 200 180 T 400 120 T 600 160 T 800 100"
              fill="none"
              stroke="#d1d5db"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            {[...Array(8)].map((_, i) => (
              <circle
                key={`dot-${i}`}
                cx={i * 100 + 100}
                cy={150 + (i % 2) * 30}
                r="4"
                fill="#d1d5db"
              />
            ))}
          </svg>
        );
      case 'bar':
        return (
          <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
            <rect x="0" y="0" width="800" height="300" fill="#f9fafb" />
            {[...Array(12)].map((_, i) => (
              <rect
                key={`bar-${i}`}
                x={60 + i * 60}
                y={150 + (i % 2) * 30}
                width="40"
                height={100 - (i % 3) * 20}
                fill="#e5e7eb"
                rx="4"
              />
            ))}
          </svg>
        );
      case 'pie':
        return (
          <svg className="w-full h-full" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
            <circle cx="150" cy="150" r="100" fill="#e5e7eb" />
            <path d="M 150 50 A 100 100 0 0 1 250 150 L 150 150 Z" fill="#d1d5db" />
            <path d="M 250 150 A 100 100 0 0 1 150 250 L 150 150 Z" fill="#f3f4f6" />
            <path d="M 150 250 A 100 100 0 0 1 50 150 L 150 150 Z" fill="#e5e7eb" />
          </svg>
        );
      case 'heatmap':
        return (
          <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
            {[...Array(5)].map((_, row) =>
              [...Array(8)].map((_, col) => (
                <rect
                  key={`cell-${row}-${col}`}
                  x={col * 50}
                  y={row * 60}
                  width="48"
                  height="58"
                  fill={['#e5e7eb', '#d1d5db', '#f3f4f6', '#e5e7eb', '#d1d5db'][(row + col) % 5]}
                  rx="4"
                />
              ))
            )}
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn('flex flex-col', className)} style={{ height }}>
      {showToolbar && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Skeleton width={128} height={32} animate={animate} />
            <Skeleton width={64} height={20} animate={animate} delay={100} />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton width={32} height={32} variant="rect" animate={animate} delay={200} />
            <Skeleton width={32} height={32} variant="rect" animate={animate} delay={300} />
          </div>
        </div>
      )}
      <div className={cn('flex-1 bg-gray-50 p-4 rounded-lg', animate ? 'skeleton-shimmer' : '')}>
        {renderChartContent()}
      </div>
    </div>
  );
}

// ============================================
// 表格骨架屏
// ============================================

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  showToolbar?: boolean;
  className?: string;
  animate?: boolean;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  showToolbar = true,
  className = '',
  animate = true,
}: TableSkeletonProps) {
  return (
    <div className={cn('w-full', className)}>
      {showToolbar && (
        <div className="flex items-center justify-between mb-4">
          <Skeleton width={200} height={40} animate={animate} />
          <div className="flex items-center gap-2">
            <Skeleton width={120} height={36} animate={animate} delay={100} />
            <Skeleton width={100} height={36} animate={animate} delay={200} />
          </div>
        </div>
      )}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {showHeader && (
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {[...Array(columns)].map((_, i) => (
                <div key={`header-${i}`} className="px-4 py-3">
                  <Skeleton
                    width={`${60 + ((i * 17) % 40)}%`}
                    height={16}
                    animate={animate}
                    delay={i * 50}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          {[...Array(rows)].map((_, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="grid border-b border-gray-100 last:border-b-0"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {[...Array(columns)].map((_, colIndex) => (
                <div key={`cell-${rowIndex}-${colIndex}`} className="px-4 py-4">
                  <Skeleton
                    width={`${40 + Math.random() * 50}%`}
                    height={16}
                    animate={animate}
                    delay={(rowIndex * columns + colIndex) * 30}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between mt-4">
        <Skeleton width={120} height={20} animate={animate} />
        <div className="flex items-center gap-2">
          <Skeleton width={80} height={32} animate={animate} delay={100} />
          <Skeleton width={32} height={32} variant="rect" animate={animate} delay={200} />
          <Skeleton width={32} height={32} variant="rect" animate={animate} delay={300} />
        </div>
      </div>
    </div>
  );
}

// ============================================
// 卡片骨架屏
// ============================================

interface CardSkeletonProps {
  variant?: 'default' | 'metric' | 'chart' | 'list';
  className?: string;
  animate?: boolean;
}

export function CardSkeleton({
  variant = 'default',
  className = '',
  animate = true,
}: CardSkeletonProps) {
  const renderContent = () => {
    switch (variant) {
      case 'metric':
        return (
          <div className="p-6 border border-gray-200 rounded-lg bg-white">
            <div className="flex items-start justify-between mb-4">
              <Skeleton width={44} height={44} variant="rect" animate={animate} />
              <Skeleton width={64} height={24} animate={animate} delay={100} />
            </div>
            <Skeleton width={96} height={16} className="mb-2" animate={animate} delay={150} />
            <Skeleton width={80} height={32} className="mb-1" animate={animate} delay={200} />
            <Skeleton width={64} height={12} animate={animate} delay={250} />
            <Skeleton width="100%" height={80} className="mt-4" animate={animate} delay={300} />
          </div>
        );
      case 'chart':
        return (
          <div className="p-6 border border-gray-200 rounded-lg bg-white">
            <div className="flex items-center justify-between mb-4">
              <Skeleton width={150} height={20} animate={animate} />
              <Skeleton width={80} height={32} animate={animate} delay={100} />
            </div>
            <Skeleton width="100%" height={200} animate={animate} delay={200} />
          </div>
        );
      case 'list':
        return (
          <div className="p-6 border border-gray-200 rounded-lg bg-white">
            <Skeleton width={120} height={20} className="mb-4" animate={animate} />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton
                    width={40}
                    height={40}
                    variant="circle"
                    animate={animate}
                    delay={i * 50}
                  />
                  <div className="flex-1">
                    <Skeleton
                      width={`${50 + Math.random() * 30}%`}
                      height={16}
                      animate={animate}
                      delay={i * 50 + 25}
                    />
                    <Skeleton
                      width={`${30 + Math.random() * 20}%`}
                      height={12}
                      className="mt-1"
                      animate={animate}
                      delay={i * 50 + 50}
                    />
                  </div>
                  <Skeleton width={60} height={24} animate={animate} delay={i * 50 + 75} />
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div className="p-6 border border-gray-200 rounded-lg bg-white">
            <Skeleton width="60%" height={20} className="mb-4" animate={animate} />
            <Skeleton width="100%" height={100} animate={animate} delay={100} />
          </div>
        );
    }
  };

  return <div className={className}>{renderContent()}</div>;
}

// ============================================
// 列表骨架屏
// ============================================

interface ListSkeletonProps {
  items?: number;
  itemHeight?: number;
  showAvatar?: boolean;
  showAction?: boolean;
  className?: string;
  animate?: boolean;
}

export function ListSkeleton({
  items = 5,
  itemHeight = 64,
  showAvatar = true,
  showAction = true,
  className = '',
  animate = true,
}: ListSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {[...Array(items)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg"
          style={{ height: itemHeight }}
        >
          {showAvatar && (
            <Skeleton width={40} height={40} variant="circle" animate={animate} delay={i * 40} />
          )}
          <div className="flex-1 min-w-0">
            <Skeleton
              width={`${40 + ((i * 23) % 40)}%`}
              height={16}
              animate={animate}
              delay={i * 40 + 20}
            />
            <Skeleton
              width={`${60 + ((i * 13) % 30)}%`}
              height={12}
              className="mt-2"
              animate={animate}
              delay={i * 40 + 40}
            />
          </div>
          {showAction && <Skeleton width={80} height={32} animate={animate} delay={i * 40 + 60} />}
        </div>
      ))}
    </div>
  );
}

// ============================================
// 详情页骨架屏
// ============================================

interface DetailSkeletonProps {
  sections?: number;
  className?: string;
  animate?: boolean;
}

export function DetailSkeleton({
  sections = 3,
  className = '',
  animate = true,
}: DetailSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <Skeleton width={80} height={80} variant="circle" animate={animate} />
        <div className="flex-1">
          <Skeleton width={200} height={28} className="mb-2" animate={animate} delay={50} />
          <Skeleton width={300} height={16} animate={animate} delay={100} />
          <div className="flex items-center gap-2 mt-3">
            <Skeleton width={80} height={24} animate={animate} delay={150} />
            <Skeleton width={80} height={24} animate={animate} delay={200} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 border border-gray-200 rounded-lg">
            <Skeleton
              width={80}
              height={14}
              className="mb-2"
              animate={animate}
              delay={i * 50 + 100}
            />
            <Skeleton width={100} height={24} animate={animate} delay={i * 50 + 150} />
          </div>
        ))}
      </div>

      {/* Sections */}
      {[...Array(sections)].map((_, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-6">
          <Skeleton
            width={150}
            height={20}
            className="mb-4"
            animate={animate}
            delay={i * 100 + 200}
          />
          <Skeleton width="100%" height={150} animate={animate} delay={i * 100 + 250} />
        </div>
      ))}
    </div>
  );
}

// ============================================
// 表单骨架屏
// ============================================

interface FormSkeletonProps {
  fields?: number;
  showSubmit?: boolean;
  className?: string;
  animate?: boolean;
}

export function FormSkeleton({
  fields = 4,
  showSubmit = true,
  className = '',
  animate = true,
}: FormSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {[...Array(fields)].map((_, i) => (
        <div key={i}>
          <Skeleton width={100} height={14} className="mb-2" animate={animate} delay={i * 50} />
          <Skeleton width="100%" height={40} animate={animate} delay={i * 50 + 25} />
        </div>
      ))}
      {showSubmit && (
        <div className="pt-4">
          <Skeleton width="100%" height={44} animate={animate} delay={fields * 50} />
        </div>
      )}
    </div>
  );
}

// ============================================
// 统计网格骨架屏
// ============================================

interface StatsGridSkeletonProps {
  items?: number;
  columns?: number;
  className?: string;
  animate?: boolean;
}

export function StatsGridSkeleton({
  items = 4,
  columns = 4,
  className = '',
  animate = true,
}: StatsGridSkeletonProps) {
  return (
    <div
      className={cn('grid gap-4', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {[...Array(items)].map((_, i) => (
        <div key={i} className="p-4 border border-gray-200 rounded-lg bg-white">
          <Skeleton width={80} height={14} className="mb-2" animate={animate} delay={i * 40} />
          <Skeleton
            width={120}
            height={28}
            className="mb-1"
            animate={animate}
            delay={i * 40 + 20}
          />
          <Skeleton width={60} height={12} animate={animate} delay={i * 40 + 40} />
        </div>
      ))}
    </div>
  );
}

// ============================================
// 页面骨架屏
// ============================================

interface PageSkeletonProps {
  variant?: 'default' | 'dashboard' | 'list' | 'detail';
  className?: string;
  animate?: boolean;
}

export function PageSkeleton({
  variant = 'default',
  className = '',
  animate = true,
}: PageSkeletonProps) {
  const renderContent = () => {
    switch (variant) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton width={200} height={32} animate={animate} />
              <Skeleton width={120} height={36} animate={animate} delay={100} />
            </div>
            <StatsGridSkeleton items={4} animate={animate} delay={200} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CardSkeleton variant="chart" animate={animate} />
              <CardSkeleton variant="chart" animate={animate} delay={100} />
            </div>
            <TableSkeleton rows={5} animate={animate} delay={300} />
          </div>
        );
      case 'list':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton width={150} height={32} animate={animate} />
              <Skeleton width={100} height={36} animate={animate} delay={100} />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton width={200} height={40} animate={animate} delay={150} />
              <Skeleton width={120} height={40} animate={animate} delay={200} />
            </div>
            <ListSkeleton items={8} animate={animate} delay={250} />
          </div>
        );
      case 'detail':
        return <DetailSkeleton animate={animate} />;
      default:
        return (
          <div className="space-y-6">
            <Skeleton width="60%" height={32} animate={animate} />
            <Skeleton width="100%" height={400} animate={animate} delay={100} />
          </div>
        );
    }
  };

  return <div className={cn('p-6', className)}>{renderContent()}</div>;
}
