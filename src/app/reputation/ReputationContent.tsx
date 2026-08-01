'use client';

import { useMemo, useState } from 'react';

import { AlertTriangle, BarChart3, Loader2 } from 'lucide-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import {
  useReputations,
  useRecalculateReputation,
  type ReputationListData,
} from '@/hooks/data/useReputations';
import { providerNames } from '@/lib/constants';
import { PROVIDER_TYPE_CONFIG } from '@/lib/oracles/services/reputationService';
import { type OracleProvider } from '@/types/oracle';

import {
  ReputationComparisonTable,
  type SortState,
  type SortKey,
} from './components/ReputationComparisonTable';
import { ReputationFilterBar, type FilterType } from './components/ReputationFilterBar';
import { ReputationHero } from './components/ReputationHero';
import { ReputationMetricStrip } from './components/ReputationMetricStrip';
import { TypeLegend } from './components/ReputationStats';
import { PROVIDER_PROFILES } from './constants/providerProfiles';

function ReputationContentInner({ initialData }: { initialData?: ReputationListData }) {
  const { data, isLoading, error } = useReputations({ initialData });
  const recalculate = useRecalculateReputation();

  const reputations = useMemo(() => data?.data ?? [], [data?.data]);
  const isCalculating = data?.calculating ?? false;
  const calcMessage = data?.message;
  const nextRecalcAt = data?.nextRecalcAt;

  const [filterType, setFilterType] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'score', direction: 'desc' });

  const reputationMap = useMemo(() => {
    const map = new Map<string, (typeof reputations)[0]>();
    for (const r of reputations) {
      map.set(r.provider, r);
    }
    return map;
  }, [reputations]);

  const typeCounts = useMemo(() => {
    let onchain = 0;
    let api = 0;
    let hybrid = 0;
    for (const r of reputations) {
      const t = PROVIDER_TYPE_CONFIG[r.provider as OracleProvider]?.type || 'api';
      if (t === 'onchain') onchain++;
      else if (t === 'api') api++;
      else hybrid++;
    }
    return { onchain, api, hybrid };
  }, [reputations]);

  const filteredProviders = useMemo(() => {
    // Drive the provider list from the reputation payload so the page
    // follows whatever the API actually returned (which may exclude
    // providers that have no reputation row yet). PROVIDER_PROFILES is
    // used only as a metadata lookup table, not as the list source.
    let entries = reputations.map((r) => r.provider as OracleProvider);

    if (filterType !== 'all') {
      entries = entries.filter((p) => PROVIDER_TYPE_CONFIG[p]?.type === filterType);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter(
        (p) =>
          p.toLowerCase().includes(q) ||
          (providerNames[p] || '').toLowerCase().includes(q) ||
          (PROVIDER_PROFILES[p]?.tagline ?? '').toLowerCase().includes(q)
      );
    }

    entries.sort((a, b) => {
      const repA = reputationMap.get(a);
      const repB = reputationMap.get(b);
      let valA = 0;
      let valB = 0;

      switch (sort.key) {
        case 'score':
          valA = repA?.overall_score ?? 0;
          valB = repB?.overall_score ?? 0;
          break;
        case 'accuracy':
          valA = repA?.accuracy_score ?? 0;
          valB = repB?.accuracy_score ?? 0;
          break;
        case 'uptime':
          valA = repA?.uptime_percentage ?? 0;
          valB = repB?.uptime_percentage ?? 0;
          break;
        case 'latency':
          valA = repA?.avg_latency_ms ?? Infinity;
          valB = repB?.avg_latency_ms ?? Infinity;
          break;
        case 'deviation':
          valA = repA?.avg_deviation_pct ?? Infinity;
          valB = repB?.avg_deviation_pct ?? Infinity;
          break;
        case 'coverage':
          valA = (repA?.supported_symbols_count ?? 0) + (repA?.supported_chains_count ?? 0);
          valB = (repB?.supported_symbols_count ?? 0) + (repB?.supported_chains_count ?? 0);
          break;
      }

      if (sort.direction === 'asc') return valA - valB;
      return valB - valA;
    });

    return entries;
  }, [filterType, search, sort, reputationMap, reputations]);

  const ratedCount = reputations.filter((r) => r.overall_score > 0).length;
  const allUnrated = reputations.length > 0 && reputations.every((r) => r.overall_score <= 0);

  const aggregate = useMemo(() => {
    const scored = reputations.filter((r) => r.overall_score > 0);
    const avgScore =
      scored.length > 0 ? scored.reduce((sum, r) => sum + r.overall_score, 0) / scored.length : 0;
    const totalQueries = reputations.reduce((sum, r) => sum + r.total_queries, 0);
    const maxSymbols = Math.max(...reputations.map((r) => r.supported_symbols_count), 0);
    return {
      averageScore: avgScore,
      totalQueries,
      totalSymbols: maxSymbols,
    };
  }, [reputations]);

  const handleSortHeader = (key: SortKey) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ReputationHero
          isCalculating={isCalculating}
          calcMessage={calcMessage}
          nextRecalcAt={nextRecalcAt}
          onRefresh={() => recalculate.mutate()}
          refreshPending={recalculate.isPending}
        />

        {/* Loading state — single render path */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500 animate-pulse" />
              <span className="text-sm text-slate-500 font-bold">Loading oracle data...</span>
            </div>
          </div>
        )}

        {/* Error state — single render path */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800">No reputation data available</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Make sure the database migration has been applied in Supabase SQL Editor.
              </p>
            </div>
          </div>
        )}

        {/* Empty state — single render path. There are no provider rows at
            all, so the MetricStrip/FilterBar/Table are NOT rendered here. */}
        {!isLoading && !error && reputations.length === 0 && (
          <EmptyStateEnhanced
            type="new"
            title="No Oracle Providers"
            description="Oracle provider profiles will appear here once reputation data is calculated."
            size="lg"
            variant="page"
          />
        )}

        {/* Data state — only render the directory when there is data to show. */}
        {!isLoading && !error && reputations.length > 0 && (
          <>
            {/* Providers exist but none have a positive score yet — surface a
                "waiting for calculation" notice above the table. The Hero's
                refresh area already reflects an active `isCalculating` run. */}
            {allUnrated && !isCalculating && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-blue-800">Waiting for calculation...</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Data is being processed in the background. Scores will appear shortly.
                  </p>
                </div>
              </div>
            )}

            <ReputationMetricStrip
              providerCount={reputations.length}
              ratedCount={ratedCount}
              averageScore={aggregate.averageScore}
              totalQueries={aggregate.totalQueries}
              totalSymbols={aggregate.totalSymbols}
            />

            <ReputationFilterBar
              search={search}
              onSearchChange={setSearch}
              filterType={filterType}
              onFilterTypeChange={setFilterType}
              onchainCount={typeCounts.onchain}
              apiCount={typeCounts.api}
              hybridCount={typeCounts.hybrid}
            />

            <div className="flex items-center justify-between mb-4">
              <TypeLegend
                onchainCount={typeCounts.onchain}
                apiCount={typeCounts.api}
                hybridCount={typeCounts.hybrid}
              />
              <span className="text-[11px] text-slate-400 font-medium">
                {filteredProviders.length} of {reputations.length} providers
              </span>
            </div>

            <ReputationComparisonTable
              providers={filteredProviders}
              reputationMap={reputationMap}
              sort={sort}
              onSort={handleSortHeader}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function ReputationContent({ initialData }: { initialData?: ReputationListData }) {
  return (
    <ErrorBoundary level="page" componentName="ReputationContent">
      <ReputationContentInner initialData={initialData} />
    </ErrorBoundary>
  );
}
