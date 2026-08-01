'use client';

import { useRef, useCallback } from 'react';

import { ErrorBoundary } from '@/components/error-boundary';
import { LiveStatusBar } from '@/components/ui';
import { useCommonShortcuts, useAllOnChainData } from '@/hooks';

import { QueryHeader, QueryForm, QueryResults, QuickLinksPanel } from './components';
import { type OnChainData } from './constants';
import { UnifiedQueryProvider, useQueryDataStable, useQueryParams } from './contexts';
import { ORACLE_UPDATE_FREQUENCIES } from './utils/freshnessUtils';

const DEFAULT_FRESHNESS_THRESHOLD_MS = 30 * 1000;

function getFreshnessThresholdMs(results: { provider: string }[]): number {
  if (results.length === 0) return DEFAULT_FRESHNESS_THRESHOLD_MS;

  const seconds = results
    .map((r) => ORACLE_UPDATE_FREQUENCIES[r.provider as keyof typeof ORACLE_UPDATE_FREQUENCIES])
    .filter((freq): freq is number => typeof freq === 'number' && freq > 0);

  if (seconds.length === 0) return DEFAULT_FRESHNESS_THRESHOLD_MS;

  // Use the slowest expected update interval among the queried providers so the
  // overall "last update" badge reflects the least strict oracle. For a single
  // source this is simply that oracle's own frequency.
  return Math.max(...seconds) * 1000;
}

function PriceQueryContentInner() {
  const filterInputRef = useRef<HTMLInputElement>(null);

  const { selectedOracle, selectedSymbol, selectedChain } = useQueryParams();
  const { queryResults, isLoading, queryDuration, queryErrors, refetch } = useQueryDataStable();

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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div aria-live="polite" className="sr-only">
          {isLoading ? 'Loading data...' : `${queryResults.length} results`}
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <QueryHeader />
          <LiveStatusBar
            isConnected={queryErrors.length === 0 && !isLoading}
            latency={queryDuration ?? undefined}
            freshnessThreshold={getFreshnessThresholdMs(queryResults)}
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
            <div className="xl:sticky xl:top-4 space-y-4">
              <QueryForm />
              <QuickLinksPanel symbol={selectedSymbol} />
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <QueryResults onChainData={onChainData satisfies OnChainData} />
          </main>
        </div>
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
