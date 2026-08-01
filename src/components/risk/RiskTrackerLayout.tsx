'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { motion } from 'framer-motion';
import { Activity, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui';
import type { AffectedProtocol, RiskLevel, SourcePriceSnapshot } from '@/lib/risk/types';
import { getRiskLevel } from '@/lib/risk/utils';
import { formatPrice } from '@/lib/utils/format';

import { ImpactCard } from './ImpactCard';
import { MetricCard } from './MetricCard';
import { RiskTrackerAssetList } from './RiskTrackerAssetList';
import { RiskTrackerDetailPanel } from './RiskTrackerDetailPanel';
import { RiskTrackerHero } from './RiskTrackerHero';

import type { HeatmapCell } from './RiskHeatmap';

const VALID_TABS = ['overview', 'sources', 'protocols'] as const;
type ValidTab = (typeof VALID_TABS)[number];

interface RiskSnapshotBase {
  symbol: string;
  displayName: string;
  riskLevel: RiskLevel;
  durationSeconds: number;
  sources: SourcePriceSnapshot[];
  affectedProtocols: AffectedProtocol[];
  lastUpdated: number;
}

interface RiskSummaryStat {
  id: string;
  label: string;
  value: string;
  subtext?: string;
  level?: RiskLevel;
  icon: 'alert' | 'deviation' | 'protocols';
}

interface RiskTrackerLayoutProps<T extends RiskSnapshotBase> {
  page: 'stablecoin' | 'wrapped';
  title: string;
  description: string;
  apiEndpoint: string;
  thresholds: { warning: number; critical: number; severe: number };
  heroIcon: React.ReactNode;
  heroEyebrow?: string;
  initialSnapshots: T[];
  typeLabels?: Record<string, string>;
  getAssetSubtext?: (snapshot: T) => React.ReactNode;
  getDeviationValue: (snapshot: T) => number;
  getReferencePrice: (snapshot: T) => number;
  renderOverview: (snapshot: T) => React.ReactNode;
}

export function RiskTrackerLayout<T extends RiskSnapshotBase>({
  page,
  title,
  description,
  apiEndpoint,
  thresholds,
  heroIcon,
  heroEyebrow,
  initialSnapshots,
  typeLabels,
  getAssetSubtext,
  getDeviationValue,
  getReferencePrice,
  renderOverview,
}: RiskTrackerLayoutProps<T>) {
  const [snapshots, setSnapshots] = useState<T[]>(initialSnapshots);
  const [loading, setLoading] = useState(initialSnapshots.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ValidTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(
    initialSnapshots.length > 0 ? Date.now() : null
  );
  const hasInitializedRef = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlSymbol = searchParams.get('symbol');
  const urlTab = searchParams.get('tab');

  const resolveInitialSymbol = useCallback(
    (data: T[]) => {
      if (data.length === 0) return null;
      if (urlSymbol && data.some((s) => s.symbol.toUpperCase() === urlSymbol.toUpperCase())) {
        return urlSymbol.toUpperCase();
      }
      return data[0].symbol;
    },
    [urlSymbol]
  );

  const resolveInitialTab = useCallback((): ValidTab => {
    if (urlTab && VALID_TABS.includes(urlTab as ValidTab)) {
      return urlTab as ValidTab;
    }
    return 'overview';
  }, [urlTab]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      setActiveTab(resolveInitialTab());
    }
  }, [resolveInitialTab]);

  const fetchData = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const response = await fetch(apiEndpoint);
        const result = await response.json();
        if (!result.success) throw new Error(result.error?.message || 'Failed to fetch');
        setSnapshots(result.data);
        setLastUpdatedAt(Date.now());
        if (result.data.length > 0 && !hasInitializedRef.current) {
          setSelectedSymbol(resolveInitialSymbol(result.data));
          hasInitializedRef.current = true;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!isBackground) setLoading(false);
        else setRefreshing(false);
      }
    },
    [apiEndpoint, resolveInitialSymbol]
  );

  useEffect(() => {
    if (initialSnapshots.length > 0 && !hasInitializedRef.current) {
      setSelectedSymbol(resolveInitialSymbol(initialSnapshots));
      setLastUpdatedAt(Date.now());
      hasInitializedRef.current = true;
    }
  }, [initialSnapshots, resolveInitialSymbol]);

  useEffect(() => {
    const hasInitialData = initialSnapshots.length > 0;
    if (!hasInitialData) {
      fetchData();
    }

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchData(true);
    }, 60000);

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (!document.hidden) {
        fetchData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, initialSnapshots.length]);

  const updateUrl = useCallback(
    (symbol: string | null, tab: ValidTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (symbol) {
        params.set('symbol', symbol);
      } else {
        params.delete('symbol');
      }
      if (tab && tab !== 'overview') {
        params.set('tab', tab);
      } else {
        params.delete('tab');
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleSelectSymbol = useCallback(
    (symbol: string) => {
      setSelectedSymbol(symbol);
      setActiveTab('overview');
      updateUrl(symbol, 'overview');
    },
    [updateUrl]
  );

  const handleTabChange = useCallback(
    (tabId: string) => {
      const tab = tabId as ValidTab;
      setActiveTab(tab);
      updateUrl(selectedSymbol, tab);
    },
    [selectedSymbol, updateUrl]
  );

  const filteredSnapshots = useMemo(() => {
    if (!searchQuery.trim()) return snapshots;
    const q = searchQuery.toLowerCase();
    return snapshots.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.displayName.toLowerCase().includes(q)
    );
  }, [snapshots, searchQuery]);

  const selectedSnapshot = useMemo(
    () => snapshots.find((s) => s.symbol === selectedSymbol) || snapshots[0],
    [snapshots, selectedSymbol]
  );

  const stats = useMemo(() => {
    const activeAlerts = snapshots.filter(
      (s) => s.riskLevel === 'warning' || s.riskLevel === 'critical' || s.riskLevel === 'severe'
    ).length;
    const maxDeviation = snapshots.length > 0 ? snapshots[0] : null;
    const affectedProtocols = new Set(
      snapshots.flatMap((s) => s.affectedProtocols.map((p) => p.protocolId))
    ).size;

    const alertLevel: RiskLevel =
      snapshots.find((s) => s.riskLevel === 'severe')?.riskLevel ||
      snapshots.find((s) => s.riskLevel === 'critical')?.riskLevel ||
      snapshots.find((s) => s.riskLevel === 'warning')?.riskLevel ||
      'normal';

    return { activeAlerts, maxDeviation, affectedProtocols, alertLevel };
  }, [snapshots]);

  const summaryStats = useMemo<RiskSummaryStat[]>(
    () => [
      {
        id: 'alerts',
        label: 'Active Alerts',
        value: stats.activeAlerts.toString(),
        subtext: 'Warning or higher',
        level: stats.alertLevel,
        icon: 'alert',
      },
      {
        id: 'deviation',
        label: 'Max Deviation',
        value: stats.maxDeviation
          ? `${getDeviationValue(stats.maxDeviation) > 0 ? '+' : ''}${getDeviationValue(stats.maxDeviation).toFixed(2)}%`
          : '-',
        subtext: stats.maxDeviation?.symbol,
        icon: 'deviation',
      },
      {
        id: 'protocols',
        label: 'Protocols',
        value: stats.affectedProtocols.toString(),
        subtext: 'Potentially affected',
        icon: 'protocols',
      },
    ],
    [stats, getDeviationValue]
  );

  const heatmapRows = useMemo(
    () => snapshots.map((s) => ({ id: s.symbol, label: s.symbol })),
    [snapshots]
  );

  const heatmapCols = useMemo(() => {
    const colSet = new Map<string, string>();
    snapshots.forEach((s) => {
      s.sources.forEach((src) => {
        const sourceName = src.category === 'market' && src.dexName ? src.dexName : src.provider;
        const id = `${sourceName}:${src.chain}`;
        colSet.set(id, `${sourceName} @ ${src.chain}`);
      });
    });
    return Array.from(colSet.entries()).map(([id, label]) => ({ id, label }));
  }, [snapshots]);

  const heatmapCells = useMemo<HeatmapCell[]>(() => {
    const cells: HeatmapCell[] = [];
    snapshots.forEach((s) => {
      s.sources.forEach((src) => {
        const sourceName = src.category === 'market' && src.dexName ? src.dexName : src.provider;
        cells.push({
          rowId: s.symbol,
          colId: `${sourceName}:${src.chain}`,
          value: src.deviationPercent,
          label: `${sourceName} @ ${src.chain}: ${formatPrice(src.price)}`,
          riskLevel: getRiskLevel(src.deviationPercent, thresholds),
          verificationType: src.verification?.type,
          sourceChain: src.chain,
          dexName: src.dexName,
        });
      });
    });
    return cells;
  }, [snapshots, thresholds]);

  const handleManualRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  if (loading && snapshots.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-600">Loading {page} tracking data...</p>
        </div>
      </div>
    );
  }

  if (error && snapshots.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-red-200 p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Failed to Load</h2>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <Button onClick={() => fetchData()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-slate-50"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }}
    >
      <RiskTrackerHero
        title={title}
        description={description}
        eyebrow={heroEyebrow}
        icon={heroIcon}
        stats={summaryStats}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 xl:col-span-3">
            <RiskTrackerAssetList
              snapshots={filteredSnapshots}
              selectedSymbol={selectedSymbol}
              searchQuery={searchQuery}
              lastUpdatedAt={lastUpdatedAt}
              getDeviationValue={getDeviationValue}
              getAssetSubtext={getAssetSubtext}
              onSearchChange={setSearchQuery}
              onSelect={handleSelectSymbol}
            />
          </div>

          <div className="lg:col-span-9 xl:col-span-9">
            {selectedSnapshot && (
              <RiskTrackerDetailPanel
                snapshot={selectedSnapshot}
                activeTab={activeTab}
                page={page}
                refreshing={refreshing}
                thresholds={thresholds}
                heatmapRows={heatmapRows}
                heatmapCols={heatmapCols}
                heatmapCells={heatmapCells}
                typeLabels={typeLabels}
                getDeviationValue={getDeviationValue}
                getReferencePrice={getReferencePrice}
                renderOverview={renderOverview}
                onTabChange={handleTabChange}
                onRefresh={handleManualRefresh}
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export { MetricCard, ImpactCard };
