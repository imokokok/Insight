'use client';

import { TrendingUp, Link2 } from 'lucide-react';

import { EmptyStateEnhanced, SegmentedControl } from '@/components/ui';

import { useQueryParams } from '../contexts';

export function QueryResultsEmpty() {
  const { selectedSymbol, setSelectedSymbol, selectedOracle, needsChainSelection } =
    useQueryParams();

  const getEmptyStateContent = () => {
    if (needsChainSelection) {
      return {
        type: 'custom' as const,
        title: 'Please select a blockchain',
        description: `You've selected ${selectedOracle} oracle. Please choose a specific blockchain to view price data.`,
        icon: <Link2 className="w-12 h-12 text-amber-400" />,
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
    <div className="query-empty-stage editorial-panel">
      <div className="query-loading-topline">
        <span className="workbench-kicker">02 / Observation record</span>
        <span className="font-mono text-xs text-slate-500">AWAITING A VALID SOURCE</span>
      </div>
      <EmptyStateEnhanced
        type={emptyStateContent.type}
        title={emptyStateContent.title}
        description={emptyStateContent.description}
        size="lg"
        variant="page"
        icon={emptyStateContent.icon}
      >
        {!selectedOracle && (
          <div className="mt-8 w-full max-w-md border-t border-slate-100 pt-6">
            <p className="mb-4 flex items-center justify-center gap-1 text-xs text-slate-500">
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              Popular tokens
            </p>
            <div className="flex items-center justify-center overflow-x-auto">
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
    </div>
  );
}
