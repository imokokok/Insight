'use client';

import { ChartSkeleton } from '@/components/ui';

import { useQueryDataStable } from '../contexts';

export function QueryResultsLoading() {
  const { queryProgress, currentQueryTarget } = useQueryDataStable();

  return (
    <div className="space-y-6">
      <div className="border-y border-slate-200 bg-white/70 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Loading data...</h3>
          <span className="text-xs text-slate-500">
            {queryProgress.completed} / {queryProgress.total}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden bg-slate-200"
          role="progressbar"
          aria-label="Oracle query progress"
          aria-valuemin={0}
          aria-valuemax={Math.max(queryProgress.total, 1)}
          aria-valuenow={queryProgress.completed}
        >
          <div
            className="h-full bg-blue-600 transition-[width] duration-300"
            style={{
              width: `${queryProgress.total > 0 ? Math.min(100, (queryProgress.completed / queryProgress.total) * 100) : 0}%`,
            }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Querying {currentQueryTarget.oracle} {currentQueryTarget.chain}
        </p>
      </div>
      <ChartSkeleton height={300} variant="price" showToolbar={true} />
    </div>
  );
}
