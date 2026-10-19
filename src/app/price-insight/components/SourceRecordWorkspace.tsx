'use client';

import { ArrowRight } from 'lucide-react';

import { LiveStatusBar } from '@/components/ui';
import { useAllOnChainData } from '@/hooks/oracles/useAllOnChainData';
import type { Blockchain, OracleProvider } from '@/types/oracle';

import { QueryForm, QueryResults, QuickLinksPanel } from '../source-record/components';
import UnifiedExportSection from '../source-record/components/UnifiedExportSection';
import {
  UnifiedQueryProvider,
  useQueryDataStable,
  useQueryParams,
} from '../source-record/contexts';
import { ORACLE_UPDATE_FREQUENCIES } from '../source-record/utils/freshnessUtils';

import type { OnChainData } from '../source-record/constants';

interface SourceRecordWorkspaceProps {
  onCompare: (selection: {
    symbol: string;
    provider: OracleProvider | null;
    chain: Blockchain | null;
  }) => void;
}

const DEFAULT_FRESHNESS_THRESHOLD_MS = 30_000;

function getFreshnessThresholdMs(results: { provider: string }[]): number {
  const frequencies = results
    .map(
      (result) =>
        ORACLE_UPDATE_FREQUENCIES[result.provider as keyof typeof ORACLE_UPDATE_FREQUENCIES]
    )
    .filter((frequency): frequency is number => typeof frequency === 'number' && frequency > 0);

  return frequencies.length > 0 ? Math.max(...frequencies) * 1_000 : DEFAULT_FRESHNESS_THRESHOLD_MS;
}

function SourceRecordContent({ onCompare }: SourceRecordWorkspaceProps) {
  const { selectedOracle, selectedSymbol, selectedChain } = useQueryParams();
  const { queryResults, isLoading, queryDuration, queryErrors, stats } = useQueryDataStable();

  const onChainData = useAllOnChainData({
    selectedOracle,
    selectedSymbol,
    selectedChain,
    queryResults,
    enabled: !isLoading,
  });

  return (
    <div className="pt-7">
      <div aria-live="polite" className="sr-only">
        {isLoading ? 'Loading source record...' : `${queryResults.length} source records`}
      </div>

      <div className="editorial-status-rail mb-7 flex flex-col gap-3 border-y border-slate-900/15 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="editorial-index">Live source record</p>
        <LiveStatusBar
          isConnected={queryErrors.length === 0 && !isLoading}
          latency={queryDuration ?? undefined}
          freshnessThreshold={getFreshnessThresholdMs(queryResults)}
          lastUpdate={
            queryResults.length > 0
              ? new Date(
                  queryResults.reduce(
                    (latest, result) => Math.max(latest, result.priceData?.timestamp ?? 0),
                    0
                  )
                )
              : undefined
          }
        />
      </div>

      <div className="editorial-workbench-grid grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-12">
        <aside>
          <div className="workbench-section-heading mb-4 flex items-center justify-between border-b border-slate-900/15 pb-3">
            <p className="editorial-index">01 — Define the source</p>
            <span className="font-mono text-[10px] text-slate-400">INPUT</span>
          </div>
          <div className="space-y-4 xl:sticky xl:top-24">
            <QueryForm />
            <QuickLinksPanel symbol={selectedSymbol} />
          </div>
        </aside>

        <section className="min-w-0" aria-label="Single-source oracle evidence">
          <div className="workbench-section-heading mb-4 flex items-center justify-between border-b border-slate-900/15 pb-3">
            <p className="editorial-index">02 — Inspect the source record</p>
            <span className="font-mono text-[10px] text-slate-400">EVIDENCE</span>
          </div>
          <div className="mb-4 flex flex-col gap-3 border-y border-slate-900/10 bg-white/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-slate-600">
              Verify one reported price with its source, network, freshness and available on-chain
              context before comparing or acting on it.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <UnifiedExportSection
                loading={isLoading}
                queryResults={queryResults}
                selectedSymbol={selectedSymbol}
                avgPrice={stats.avgPrice}
                maxPrice={stats.maxPrice}
                minPrice={stats.minPrice}
                priceRange={stats.priceRange}
                standardDeviation={stats.standardDeviation}
                standardDeviationPercent={stats.standardDeviationPercent}
              />
              <button
                type="button"
                onClick={() =>
                  onCompare({
                    symbol: selectedSymbol,
                    provider: selectedOracle,
                    chain: selectedChain,
                  })
                }
                className="inline-flex min-h-10 items-center gap-1.5 bg-blue-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Compare this asset <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <QueryResults onChainData={onChainData satisfies OnChainData} />
        </section>
      </div>
    </div>
  );
}

export function SourceRecordWorkspace({ onCompare }: SourceRecordWorkspaceProps) {
  return (
    <UnifiedQueryProvider>
      <SourceRecordContent onCompare={onCompare} />
    </UnifiedQueryProvider>
  );
}
