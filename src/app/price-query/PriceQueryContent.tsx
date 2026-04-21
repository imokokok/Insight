'use client';

import { useRef, useCallback } from 'react';

import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary';
import { LiveStatusBar } from '@/components/ui';
import { useCommonShortcuts, useAllOnChainData } from '@/hooks';

import { QueryHeader, QueryForm, QueryResults } from './components';
import { type OnChainData } from './constants';
import { UnifiedQueryProvider, useUnifiedQuery } from './contexts';

function PriceQueryContentInner() {
  const filterInputRef = useRef<HTMLInputElement>(null);

  const query = useUnifiedQuery();

  const { selectedOracle, selectedSymbol, selectedChain } = query;
  const { queryResults, isLoading, queryDuration, queryErrors, refetch } = query;

  const onChainData = useAllOnChainData({
    selectedOracle,
    selectedSymbol,
    selectedChain,
    queryResults,
  });

  const debouncedSearchFocus = useCallback(() => {
    requestAnimationFrame(() => {
      filterInputRef.current?.focus();
    });
  }, []);

  useCommonShortcuts({
    onRefresh: refetch,
    onSearch: debouncedSearchFocus,
  });

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <div aria-live="polite" className="sr-only">
        {isLoading ? 'Loading data...' : `${queryResults.length} results`}
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <QueryHeader />
        <LiveStatusBar
          isConnected={queryErrors.length === 0 && !isLoading}
          latency={queryDuration ?? undefined}
          lastUpdate={
            queryResults.length > 0
              ? new Date(
                  queryResults.reduce((max, r) => Math.max(max, r.priceData?.timestamp || 0), 0)
                )
              : undefined
          }
        />
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <aside className="xl:w-[400px] xl:flex-shrink-0">
          <QueryForm />
        </aside>

        <main className="flex-1 min-w-0">
          <QueryResults onChainData={onChainData satisfies OnChainData} />
        </main>
      </div>
    </div>
  );
}

export default function PriceQueryContent() {
  return (
    <ErrorBoundary level="page" componentName="PriceQueryContent">
      <UnifiedQueryProvider>
        <PriceQueryContentInner />
      </UnifiedQueryProvider>
    </ErrorBoundary>
  );
}
