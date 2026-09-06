'use client';

import { useRef, useCallback } from 'react';

import { ErrorBoundary } from '@/components/error-boundary';
import { LiveStatusBar } from '@/components/ui';
import { useAllOnChainData } from '@/hooks/oracles/useAllOnChainData';
import { useCommonShortcuts } from '@/hooks/ui/useKeyboardShortcuts';

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
    <div className="editorial-workspace min-h-screen">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 pb-20 pt-4 sm:px-8 lg:px-12 lg:pb-28">
        <div aria-live="polite" className="sr-only">
          {isLoading ? 'Loading data...' : `${queryResults.length} results`}
        </div>

        <QueryHeader />

        <div className="editorial-status-rail my-7 flex flex-col gap-3 border-y border-slate-900/15 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="editorial-index">Live query status</p>
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

        <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-12">
          <aside>
            <div className="mb-4 flex items-center justify-between border-b border-slate-900/15 pb-3">
              <p className="editorial-index">01 — Define the query</p>
              <span className="font-mono text-[10px] text-slate-400">INPUT</span>
            </div>
            <div className="space-y-4 xl:sticky xl:top-24">
              <QueryForm />
              <QuickLinksPanel symbol={selectedSymbol} />
            </div>
          </aside>

          <section className="min-w-0" aria-label="Price query evidence">
            <div className="mb-4 flex items-center justify-between border-b border-slate-900/15 pb-3">
              <p className="editorial-index">02 — Inspect the evidence</p>
              <span className="font-mono text-[10px] text-slate-400">OUTPUT</span>
            </div>
            <QueryResults onChainData={onChainData satisfies OnChainData} />
          </section>
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
