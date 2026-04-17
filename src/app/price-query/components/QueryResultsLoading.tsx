'use client';

import { ChartSkeleton } from '@/components/ui';
import type { OracleProvider, Blockchain } from '@/lib/oracles';

interface QueryResultsLoadingProps {
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: Blockchain | null };
}

export function QueryResultsLoading({
  queryProgress,
  currentQueryTarget,
}: QueryResultsLoadingProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">{'priceQuery.loadingData'}</h3>
          <span className="text-xs text-gray-500">
            {queryProgress.completed} / {queryProgress.total}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300 bg-primary-600"
            style={{
              width:
                queryProgress.total > 0
                  ? `${(queryProgress.completed / queryProgress.total) * 100}%`
                  : '0%',
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Querying {currentQueryTarget.oracle} {currentQueryTarget.chain}
        </p>
      </div>
      <ChartSkeleton height={300} variant="price" showToolbar={true} />
    </div>
  );
}
