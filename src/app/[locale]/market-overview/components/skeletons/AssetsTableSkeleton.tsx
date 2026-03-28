'use client';

import { TrendingUp } from 'lucide-react';

interface AssetsTableSkeletonProps {
  rows?: number;
}

export default function AssetsTableSkeleton({ rows = 8 }: AssetsTableSkeletonProps) {
  return (
    <div className="overflow-hidden">
      <div className="pb-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-300" />
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="mt-3">
        <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-14 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-14 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
        </div>

        {[...Array(rows)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded bg-gray-200 animate-pulse" />
              <div>
                <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-2 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center">
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex items-center">
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
