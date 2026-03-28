'use client';

import { cn } from '@/lib/utils';

interface ChartSkeletonProps {
  type?:
    | 'pie'
    | 'trend'
    | 'bar'
    | 'chain'
    | 'protocol'
    | 'asset'
    | 'comparison'
    | 'benchmark'
    | 'correlation';
  height?: number | string;
  className?: string;
}

export default function ChartSkeleton({
  type = 'pie',
  height = 360,
  className,
}: ChartSkeletonProps) {
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  const renderPieSkeleton = () => (
    <div className="flex items-center justify-center h-full">
      <div className="relative">
        <div className="w-48 h-48 rounded-full bg-gray-200 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-white" />
      </div>
      <div className="ml-8 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-10 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderTrendSkeleton = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative bg-gray-50 rounded-lg overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[...Array(5)].map((_, i) => (
            <line
              key={`hline-${i}`}
              x1="0"
              y1={60 + i * 50}
              x2="800"
              y2={60 + i * 50}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          <path
            d="M 0 200 Q 100 150, 200 180 T 400 120 T 600 160 T 800 100"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="2"
          />
          <path
            d="M 0 200 Q 100 150, 200 180 T 400 120 T 600 160 T 800 100 L 800 300 L 0 300 Z"
            fill="url(#trendGradient)"
          />
        </svg>
      </div>
      <div className="flex justify-between mt-2 px-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-2 w-8 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );

  const renderBarSkeleton = () => (
    <div className="h-full flex items-end justify-around px-4 pb-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div
            className="w-10 bg-gray-200 rounded-t animate-pulse"
            style={{ height: `${80 + Math.random() * 120}px` }}
          />
          <div className="h-2 w-8 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );

  const renderGridSkeleton = () => (
    <div className="h-full grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-gray-200" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
          <div className="h-4 w-full bg-gray-200 rounded mb-2" />
          <div className="h-2 w-3/4 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );

  const renderComparisonSkeleton = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative bg-gray-50 rounded-lg overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
          {[...Array(5)].map((_, i) => (
            <line
              key={`hline-${i}`}
              x1="0"
              y1={60 + i * 50}
              x2="800"
              y2={60 + i * 50}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          <path
            d="M 0 180 Q 150 120, 300 160 T 600 100 T 800 140"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="2"
          />
          <path
            d="M 0 220 Q 150 180, 300 200 T 600 160 T 800 180"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
        </svg>
      </div>
      <div className="flex justify-center gap-6 mt-4">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderCorrelationSkeleton = () => (
    <div className="h-full flex items-center justify-center p-4">
      <div className="grid grid-cols-5 gap-1">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="w-12 h-12 rounded bg-gray-200 animate-pulse"
            style={{ opacity: 0.3 + Math.random() * 0.7 }}
          />
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'pie':
        return renderPieSkeleton();
      case 'trend':
        return renderTrendSkeleton();
      case 'bar':
        return renderBarSkeleton();
      case 'chain':
      case 'protocol':
      case 'asset':
        return renderGridSkeleton();
      case 'comparison':
      case 'benchmark':
        return renderComparisonSkeleton();
      case 'correlation':
        return renderCorrelationSkeleton();
      default:
        return renderPieSkeleton();
    }
  };

  return (
    <div className={cn('bg-white rounded-lg', className)} style={{ height: heightStyle }}>
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 px-1">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      {renderContent()}
    </div>
  );
}
