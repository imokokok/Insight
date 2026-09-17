'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Activity, AlertCircle, Gauge } from 'lucide-react';

import { Button } from '@/components/ui';
import { STABLECOIN_RISK_THRESHOLDS, WRAPPED_ASSET_RISK_THRESHOLDS } from '@/lib/risk/constants';
import type { RiskLevel } from '@/lib/risk/types';
import { getRiskLevel } from '@/lib/risk/utils';
import type { StablecoinDepegSnapshot } from '@/lib/stablecoins/monitor';
import { formatPrice } from '@/lib/utils/format';
import type { WrappedAssetSnapshot } from '@/lib/wrapped-assets/monitor';

import { pegMonitorConfigs } from './pegMonitorConfigs';
import { PegRiskCategoryNav, type PegRiskCategory } from './PegRiskCategoryNav';
import { RiskTrackerAssetList } from './RiskTrackerAssetList';
import { RiskTrackerDetailPanel } from './RiskTrackerDetailPanel';
import { RiskTrackerHero } from './RiskTrackerHero';

import type { HeatmapCell } from './RiskHeatmap';

type ValidTab = 'overview' | 'sources' | 'protocols';

type PegRiskSnapshot =
  | (StablecoinDepegSnapshot & { assetCategory: 'stablecoin' })
  | (WrappedAssetSnapshot & { assetCategory: 'wrapped' });

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

const VALID_TABS = new Set<ValidTab>(['overview', 'sources', 'protocols']);
const RISK_RANK: Record<RiskLevel, number> = {
  normal: 0,
  warning: 1,
  critical: 2,
  severe: 3,
};

const WRAPPED_TYPE_LABELS: Record<string, string> = {
  'wrapped-btc': 'Wrapped BTC',
  'wrapped-eth': 'Wrapped ETH',
  'lst-eth': 'Liquid Staking ETH',
};

function parseCategory(value: string | null): PegRiskCategory {
  if (value === 'stablecoins' || value === 'wrapped') return value;
  return 'all';
}

function parseTab(value: string | null): ValidTab {
  return value && VALID_TABS.has(value as ValidTab) ? (value as ValidTab) : 'overview';
}

function getDeviation(snapshot: PegRiskSnapshot): number {
  return snapshot.assetCategory === 'stablecoin'
    ? snapshot.maxDeviationPercent
    : snapshot.deviationPercent;
}

function getReferencePrice(snapshot: PegRiskSnapshot): number {
  return snapshot.assetCategory === 'stablecoin'
    ? snapshot.referencePrice
    : snapshot.underlyingReferencePrice;
}

function toStablecoinSnapshots(snapshots: StablecoinDepegSnapshot[]): PegRiskSnapshot[] {
  return snapshots.map((snapshot) => ({ ...snapshot, assetCategory: 'stablecoin' as const }));
}

function toWrappedSnapshots(snapshots: WrappedAssetSnapshot[]): PegRiskSnapshot[] {
  return snapshots.map((snapshot) => ({ ...snapshot, assetCategory: 'wrapped' as const }));
}

function sortByRisk(snapshots: PegRiskSnapshot[]): PegRiskSnapshot[] {
  return [...snapshots].sort(
    (a, b) =>
      RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] ||
      Math.abs(getDeviation(b)) - Math.abs(getDeviation(a))
  );
}

function getLatestTimestamp(
  stablecoins: StablecoinDepegSnapshot[],
  wrappedAssets: WrappedAssetSnapshot[]
): number | null {
  const timestamps = [...stablecoins, ...wrappedAssets].map((snapshot) => snapshot.lastUpdated);
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

async function fetchSnapshots<T>(endpoint: string): Promise<T[]> {
  const response = await fetch(endpoint);
  const result = (await response.json()) as ApiResult<T[]>;
  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.error?.message || `Failed to fetch ${endpoint}`);
  }
  return result.data;
}

export function PegRiskContent({
  initialStablecoins,
  initialWrappedAssets,
}: {
  initialStablecoins: StablecoinDepegSnapshot[];
  initialWrappedAssets: WrappedAssetSnapshot[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [stablecoins, setStablecoins] = useState(initialStablecoins);
  const [wrappedAssets, setWrappedAssets] = useState(initialWrappedAssets);
  const [category, setCategory] = useState<PegRiskCategory>(() =>
    parseCategory(searchParams.get('category'))
  );
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(searchParams.get('symbol'));
  const [activeTab, setActiveTab] = useState<ValidTab>(() => parseTab(searchParams.get('tab')));
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(
    initialStablecoins.length === 0 && initialWrappedAssets.length === 0
  );
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(
    getLatestTimestamp(initialStablecoins, initialWrappedAssets)
  );

  const allSnapshots = useMemo(
    () => sortByRisk([...toStablecoinSnapshots(stablecoins), ...toWrappedSnapshots(wrappedAssets)]),
    [stablecoins, wrappedAssets]
  );

  const categorySnapshots = useMemo(() => {
    if (category === 'stablecoins') {
      return allSnapshots.filter((snapshot) => snapshot.assetCategory === 'stablecoin');
    }
    if (category === 'wrapped') {
      return allSnapshots.filter((snapshot) => snapshot.assetCategory === 'wrapped');
    }
    return allSnapshots;
  }, [allSnapshots, category]);

  const visibleSnapshots = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categorySnapshots;
    return categorySnapshots.filter(
      (snapshot) =>
        snapshot.symbol.toLowerCase().includes(query) ||
        snapshot.displayName.toLowerCase().includes(query)
    );
  }, [categorySnapshots, searchQuery]);

  const selectedSnapshot = useMemo(
    () =>
      categorySnapshots.find((snapshot) => snapshot.symbol === selectedSymbol) ??
      categorySnapshots[0],
    [categorySnapshots, selectedSymbol]
  );

  const fetchData = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const [stablecoinResult, wrappedResult] = await Promise.allSettled([
      fetchSnapshots<StablecoinDepegSnapshot>('/api/stablecoin-depeg'),
      fetchSnapshots<WrappedAssetSnapshot>('/api/wrapped-assets'),
    ]);

    const failures: string[] = [];
    if (stablecoinResult.status === 'fulfilled') {
      setStablecoins(stablecoinResult.value);
    } else {
      failures.push(`Stablecoins: ${stablecoinResult.reason.message}`);
    }

    if (wrappedResult.status === 'fulfilled') {
      setWrappedAssets(wrappedResult.value);
    } else {
      failures.push(`Wrapped assets: ${wrappedResult.reason.message}`);
    }

    if (failures.length > 0) setError(failures.join(' · '));
    if (stablecoinResult.status === 'fulfilled' || wrappedResult.status === 'fulfilled') {
      setLastUpdatedAt(Date.now());
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let initialFetchTimer: number | null = null;
    if (initialStablecoins.length === 0 || initialWrappedAssets.length === 0) {
      initialFetchTimer = window.setTimeout(() => fetchData(), 0);
    }

    const interval = window.setInterval(() => {
      if (!document.hidden) fetchData(true);
    }, 60000);

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchData(true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (initialFetchTimer !== null) window.clearTimeout(initialFetchTimer);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, initialStablecoins.length, initialWrappedAssets.length]);

  const updateUrl = useCallback(
    (nextCategory: PegRiskCategory, symbol: string | null, tab: ValidTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextCategory === 'all') params.delete('category');
      else params.set('category', nextCategory);

      if (symbol) params.set('symbol', symbol);
      else params.delete('symbol');

      if (tab === 'overview') params.delete('tab');
      else params.set('tab', tab);

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleCategoryChange = useCallback(
    (nextCategory: PegRiskCategory) => {
      const candidates =
        nextCategory === 'all'
          ? allSnapshots
          : allSnapshots.filter((snapshot) =>
              nextCategory === 'stablecoins'
                ? snapshot.assetCategory === 'stablecoin'
                : snapshot.assetCategory === 'wrapped'
            );
      const nextSymbol = candidates[0]?.symbol ?? null;
      setCategory(nextCategory);
      setSelectedSymbol(nextSymbol);
      setActiveTab('overview');
      setSearchQuery('');
      updateUrl(nextCategory, nextSymbol, 'overview');
    },
    [allSnapshots, updateUrl]
  );

  const handleSelectSymbol = useCallback(
    (symbol: string) => {
      setSelectedSymbol(symbol);
      setActiveTab('overview');
      updateUrl(category, symbol, 'overview');
    },
    [category, updateUrl]
  );

  const handleTabChange = useCallback(
    (tabId: string) => {
      const nextTab = parseTab(tabId);
      setActiveTab(nextTab);
      updateUrl(category, selectedSnapshot?.symbol ?? null, nextTab);
    },
    [category, selectedSnapshot?.symbol, updateUrl]
  );

  const counts = useMemo(
    () => ({
      all: allSnapshots.length,
      stablecoins: stablecoins.length,
      wrapped: wrappedAssets.length,
    }),
    [allSnapshots.length, stablecoins.length, wrappedAssets.length]
  );

  const alertCounts = useMemo(() => {
    const countAlerts = (items: PegRiskSnapshot[]) =>
      items.filter((snapshot) => snapshot.riskLevel !== 'normal').length;
    return {
      all: countAlerts(allSnapshots),
      stablecoins: countAlerts(
        allSnapshots.filter((snapshot) => snapshot.assetCategory === 'stablecoin')
      ),
      wrapped: countAlerts(allSnapshots.filter((snapshot) => snapshot.assetCategory === 'wrapped')),
    };
  }, [allSnapshots]);

  const summaryStats = useMemo(() => {
    const activeAlerts = categorySnapshots.filter(
      (snapshot) => snapshot.riskLevel !== 'normal'
    ).length;
    const highestRisk = categorySnapshots.reduce<RiskLevel>((highest, snapshot) => {
      return RISK_RANK[snapshot.riskLevel] > RISK_RANK[highest] ? snapshot.riskLevel : highest;
    }, 'normal');
    const maxDeviation = [...categorySnapshots].sort(
      (a, b) => Math.abs(getDeviation(b)) - Math.abs(getDeviation(a))
    )[0];
    const affectedProtocols = new Set(
      categorySnapshots.flatMap((snapshot) =>
        snapshot.affectedProtocols.map((protocol) => protocol.protocolId)
      )
    ).size;

    return [
      {
        id: 'alerts',
        label: 'Active alerts',
        value: String(activeAlerts),
        subtext: activeAlerts === 0 ? 'All pegs within range' : 'Warning or higher',
        level: highestRisk,
        icon: 'alert' as const,
      },
      {
        id: 'deviation',
        label: 'Max deviation',
        value: maxDeviation
          ? `${getDeviation(maxDeviation) > 0 ? '+' : ''}${getDeviation(maxDeviation).toFixed(2)}%`
          : '—',
        subtext: maxDeviation?.symbol,
        icon: 'deviation' as const,
      },
      {
        id: 'protocols',
        label: 'Protocols exposed',
        value: String(affectedProtocols),
        subtext: 'Across selected assets',
        icon: 'protocols' as const,
      },
    ];
  }, [categorySnapshots]);

  const selectedCategorySnapshots = useMemo(() => {
    if (!selectedSnapshot) return [];
    return allSnapshots.filter(
      (snapshot) => snapshot.assetCategory === selectedSnapshot.assetCategory
    );
  }, [allSnapshots, selectedSnapshot]);

  const selectedThresholds =
    selectedSnapshot?.assetCategory === 'wrapped'
      ? WRAPPED_ASSET_RISK_THRESHOLDS
      : STABLECOIN_RISK_THRESHOLDS;

  const heatmapRows = useMemo(
    () =>
      selectedCategorySnapshots.map((snapshot) => ({
        id: snapshot.symbol,
        label: snapshot.symbol,
      })),
    [selectedCategorySnapshots]
  );

  const heatmapCols = useMemo(() => {
    const columns = new Map<string, string>();
    selectedCategorySnapshots.forEach((snapshot) => {
      snapshot.sources.forEach((source) => {
        const sourceName =
          source.category === 'market' && source.dexName ? source.dexName : source.provider;
        const id = `${sourceName}:${source.chain}`;
        columns.set(id, `${sourceName} @ ${source.chain}`);
      });
    });
    return Array.from(columns, ([id, label]) => ({ id, label }));
  }, [selectedCategorySnapshots]);

  const heatmapCells = useMemo<HeatmapCell[]>(
    () =>
      selectedCategorySnapshots.flatMap((snapshot) =>
        snapshot.sources.map((source) => {
          const sourceName =
            source.category === 'market' && source.dexName ? source.dexName : source.provider;
          return {
            rowId: snapshot.symbol,
            colId: `${sourceName}:${source.chain}`,
            value: source.deviationPercent,
            label: `${sourceName} @ ${source.chain}: ${formatPrice(source.price)}`,
            riskLevel: getRiskLevel(source.deviationPercent, selectedThresholds),
            verificationType: source.verification?.type,
            sourceChain: source.chain,
            dexName: source.dexName,
          };
        })
      ),
    [selectedCategorySnapshots, selectedThresholds]
  );

  if (loading && allSnapshots.length === 0) {
    return (
      <div className="editorial-workspace flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Activity className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />
          <p className="text-slate-600">Loading peg risk data...</p>
        </div>
      </div>
    );
  }

  if (error && allSnapshots.length === 0) {
    return (
      <div className="editorial-workspace flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md border-y border-red-200 bg-white/60 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Failed to load peg risk</h2>
          <p className="mb-4 text-sm text-slate-600">{error}</p>
          <Button onClick={() => fetchData()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="editorial-workspace evidence-workbench risk-workbench min-h-screen">
      <RiskTrackerHero
        title="One place to watch every asset that promises a peg."
        description="Assess stablecoins, wrapped assets, and liquid-staking tokens in one shared risk surface. Start with the market-wide signal, then inspect the oracle sources and protocol exposure behind it."
        eyebrow="Peg Risk"
        icon={<Gauge className="h-5 w-5" />}
        stats={summaryStats}
      />

      <PegRiskCategoryNav
        activeCategory={category}
        counts={counts}
        alertCounts={alertCounts}
        onChange={handleCategoryChange}
      />

      <div className="editorial-frame mx-auto max-w-[1440px] px-5 pb-20 pt-7 sm:px-8 lg:px-12 lg:pb-28">
        {error && (
          <div className="mb-6 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Some peg data could not be refreshed. Showing the latest available snapshot. {error}
          </div>
        )}

        <div className="editorial-workbench-grid grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-12">
          <aside>
            <div className="workbench-section-heading mb-4 flex items-center justify-between border-b border-slate-900/15 pb-3">
              <p className="editorial-index">03 — Select the asset</p>
              <span className="font-mono text-[10px] text-slate-400">INPUT</span>
            </div>
            <RiskTrackerAssetList
              snapshots={visibleSnapshots}
              selectedSymbol={selectedSnapshot?.symbol ?? null}
              searchQuery={searchQuery}
              lastUpdatedAt={lastUpdatedAt}
              getDeviationValue={getDeviation}
              getAssetSubtext={(snapshot) =>
                snapshot.assetCategory === 'stablecoin'
                  ? `Stablecoin · Ref ${formatPrice(snapshot.referencePrice)}`
                  : WRAPPED_TYPE_LABELS[snapshot.type]
              }
              onSearchChange={setSearchQuery}
              onSelect={handleSelectSymbol}
            />
          </aside>

          <section className="min-w-0" aria-label="Peg risk evidence">
            <div className="workbench-section-heading mb-4 flex items-center justify-between border-b border-slate-900/15 pb-3">
              <p className="editorial-index">04 — Inspect the evidence</p>
              <span className="font-mono text-[10px] text-slate-400">ANALYSIS</span>
            </div>
            {selectedSnapshot ? (
              <RiskTrackerDetailPanel
                snapshot={selectedSnapshot}
                activeTab={activeTab}
                page={selectedSnapshot.assetCategory}
                refreshing={refreshing}
                thresholds={selectedThresholds}
                heatmapRows={heatmapRows}
                heatmapCols={heatmapCols}
                heatmapCells={heatmapCells}
                typeLabels={WRAPPED_TYPE_LABELS}
                getDeviationValue={getDeviation}
                getReferencePrice={getReferencePrice}
                renderOverview={(snapshot) =>
                  snapshot.assetCategory === 'stablecoin'
                    ? pegMonitorConfigs.stablecoin.renderOverview(snapshot)
                    : pegMonitorConfigs.wrapped.renderOverview(snapshot)
                }
                onTabChange={handleTabChange}
                onRefresh={() => fetchData(true)}
              />
            ) : (
              <div className="border-y border-slate-900/15 bg-white/45 px-6 py-16 text-center text-sm text-slate-500">
                No peg assets are available in this category.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
