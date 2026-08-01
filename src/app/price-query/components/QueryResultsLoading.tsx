'use client';

import { ChartSkeleton } from '@/components/ui';

import { useQueryDataStable } from '../contexts';

export function QueryResultsLoading() {
  const { queryProgress, currentQueryTarget } = useQueryDataStable();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Loading data...</h3>
          <span className="text-xs text-slate-500">
            {queryProgress.completed} / {queryProgress.total}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-300 bg-blue-600"
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
