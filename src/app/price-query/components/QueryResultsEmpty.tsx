'use client';

import { TrendingUp } from 'lucide-react';

import { EmptyStateEnhanced, SegmentedControl } from '@/components/ui';

import { useQueryParams, useQueryData } from '../contexts';

export function QueryResultsEmpty() {
  const { selectedSymbol, setSelectedSymbol } = useQueryParams();
  const { queryResults } = useQueryData();

  return (
    <EmptyStateEnhanced
      type="search"
      title={`No results for ${selectedSymbol}`}
      description="Try selecting a different symbol or oracle"
      size="lg"
      variant="page"
    >
      <div className="mt-8 pt-6 border-t border-gray-100 w-full max-w-md">
        <p className="text-xs text-gray-400 mb-4 flex items-center justify-center gap-1">
          <TrendingUp className="w-3 h-3" aria-hidden="true" />
          Popular tokens
        </p>
        <div className="flex items-center justify-center">
          <SegmentedControl
            options={['BTC', 'ETH', 'BNB', 'AVAX', 'MATIC', 'USDT', 'USDC'].map((token) => ({
              value: token,
              label: token,
            }))}
            value={selectedSymbol}
            onChange={(value) => setSelectedSymbol(value as string)}
            size="sm"
          />
        </div>
      </div>
    </EmptyStateEnhanced>
  );
}
