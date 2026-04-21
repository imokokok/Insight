'use client';

import { TrendingUp } from 'lucide-react';

import { EmptyStateEnhanced, SegmentedControl } from '@/components/ui';

import { useUnifiedQuery } from '../contexts';

export function QueryResultsEmpty() {
  const { selectedSymbol, setSelectedSymbol, selectedOracle, selectedChain } = useUnifiedQuery();

  const getEmptyStateContent = () => {
    if (selectedOracle && !selectedChain) {
      return {
        type: 'custom' as const,
        title: 'Please select a blockchain',
        description: `You've selected ${selectedOracle} oracle. Please choose a specific blockchain to view price data.`,
      };
    }
    return {
      type: 'search' as const,
      title: `No results for ${selectedSymbol}`,
      description: 'Try selecting a different symbol or oracle',
    };
  };

  const emptyStateContent = getEmptyStateContent();

  return (
    <EmptyStateEnhanced
      type={emptyStateContent.type}
      title={emptyStateContent.title}
      description={emptyStateContent.description}
      size="lg"
      variant="page"
    >
      {!selectedOracle && (
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
      )}
    </EmptyStateEnhanced>
  );
}
