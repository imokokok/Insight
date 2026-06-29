'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { Activity, AlertCircle, Anchor, Clock, LayoutGrid, List, ShieldAlert } from 'lucide-react';

import {
  AffectedProtocolCard,
  RiskAssessmentCard,
  RiskBadge,
  RiskHeatmap,
  RiskSummaryHeader,
  RiskTabs,
  SourceAnalysis,
} from '@/components/risk';
import { Button } from '@/components/ui';
import type { RiskLevel } from '@/lib/risk/types';
import { formatDuration } from '@/lib/risk/utils';
import type { StablecoinDepegSnapshot } from '@/lib/stablecoins/monitor';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';

export default function StablecoinDepegContent() {
  const [snapshots, setSnapshots] = useState<StablecoinDepegSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const hasInitializedRef = useRef(false);
  const searchParams = useSearchParams();
  const urlSymbol = searchParams.get('symbol');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stablecoin-depeg');
      const result = await response.json();
      if (!result.success) throw new Error(result.error?.message || 'Failed to fetch');
      setSnapshots(result.data);
      if (result.data.length > 0 && !hasInitializedRef.current) {
        const initialSymbol =
          urlSymbol &&
          result.data.some(
            (s: StablecoinDepegSnapshot) => s.symbol.toUpperCase() === urlSymbol.toUpperCase()
          )
            ? urlSymbol.toUpperCase()
            : result.data[0].symbol;
        setSelectedSymbol(initialSymbol);
        hasInitializedRef.current = true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [urlSymbol]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData, urlSymbol]);

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

  const selectedSnapshot = useMemo(
    () => snapshots.find((s) => s.symbol === selectedSymbol) || snapshots[0],
    [snapshots, selectedSymbol]
  );

  const impactSummary = useMemo(() => {
    if (!selectedSnapshot) return null;
    const collateral = selectedSnapshot.affectedProtocols.filter(
      (p) => p.assetRole === 'collateral' || p.assetRole === 'both'
    ).length;
    const borrow = selectedSnapshot.affectedProtocols.filter(
      (p) => p.assetRole === 'borrow' || p.assetRole === 'both'
    ).length;
    return { collateral, borrow };
  }, [selectedSnapshot]);

  const heatmapRows = useMemo(
    () => snapshots.map((s) => ({ id: s.symbol, label: s.symbol })),
    [snapshots]
  );

  const heatmapCols = useMemo(() => {
    const colSet = new Map<string, string>();
    snapshots.forEach((s) => {
      s.sources.forEach((src) => {
        const id = `${src.provider}:${src.chain}`;
        colSet.set(id, `${src.provider} @ ${src.chain}`);
      });
    });
    return Array.from(colSet.entries()).map(([id, label]) => ({
      id,
      label: label.split('@').pop()?.trim() || label,
    }));
  }, [snapshots]);

  const heatmapCells = useMemo(() => {
    const cells: {
      rowId: string;
      colId: string;
      value: number;
      label: string;
      riskLevel: RiskLevel;
    }[] = [];
    snapshots.forEach((s) => {
      s.sources.forEach((src) => {
        cells.push({
          rowId: s.symbol,
          colId: `${src.provider}:${src.chain}`,
          value: src.deviationPercent,
          label: `${src.provider} @ ${src.chain}: ${formatPrice(src.price)}`,
          riskLevel: s.riskLevel,
        });
      });
    });
    return cells;
  }, [snapshots]);

  const summaryStats = useMemo(
    () => [
      {
        id: 'alerts',
        label: 'Active Alerts',
        value: stats.activeAlerts.toString(),
        subtext: 'Warning or higher',
        level: stats.alertLevel,
        icon: 'alert' as const,
      },
      {
        id: 'deviation',
        label: 'Max Deviation',
        value: stats.maxDeviation
          ? `${stats.maxDeviation.maxDeviationPercent > 0 ? '+' : ''}${stats.maxDeviation.maxDeviationPercent.toFixed(2)}%`
          : '-',
        subtext: stats.maxDeviation?.symbol,
        icon: 'deviation' as const,
      },
      {
        id: 'protocols',
        label: 'Protocols',
        value: stats.affectedProtocols.toString(),
        subtext: 'Potentially affected',
        icon: 'protocols' as const,
      },
    ],
    [stats]
  );

  const tabs = useMemo(
    () => [
      { id: 'overview', label: 'Overview', icon: LayoutGrid },
      { id: 'sources', label: 'Price Sources', icon: List },
      {
        id: 'protocols',
        label: 'Affected Protocols',
        icon: ShieldAlert,
        badge: selectedSnapshot?.affectedProtocols.length ?? 0,
      },
    ],
    [selectedSnapshot]
  );

  if (loading && snapshots.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading stablecoin depeg monitoring data...</p>
        </div>
      </div>
    );
  }

  if (error && snapshots.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-red-200 p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RiskSummaryHeader
          title="Stablecoin Depeg Monitor"
          description="Real-time monitoring of USDC, USDT, DAI and other major stablecoins across oracle providers and chains, mapped to DeFi protocols that accept them as collateral or borrow assets."
          icon={<ShieldAlert className="w-6 h-6 text-primary-700" />}
          stats={summaryStats}
          className="mb-6"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Asset list */}
          <div className="lg:col-span-3 xl:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden lg:sticky lg:top-6">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-900">Monitored Assets</h2>
              </div>
              <div className="divide-y divide-gray-100 max-h-[calc(100vh-220px)] overflow-y-auto">
                {snapshots.map((snapshot) => (
                  <button
                    key={snapshot.symbol}
                    onClick={() => {
                      setSelectedSymbol(snapshot.symbol);
                      setActiveTab('overview');
                    }}
                    className={cn(
                      'w-full px-4 py-3.5 text-left transition-colors hover:bg-gray-50',
                      selectedSymbol === snapshot.symbol
                        ? 'bg-primary-50/60 border-l-4 border-primary-500'
                        : 'border-l-4 border-transparent'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900">{snapshot.symbol}</span>
                      <RiskBadge level={snapshot.riskLevel} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        Ref {formatPrice(snapshot.referencePrice)}
                      </span>
                      <span
                        className={cn(
                          'font-mono font-medium',
                          snapshot.maxDeviationPercent > 0 ? 'text-red-600' : 'text-emerald-600'
                        )}
                      >
                        {snapshot.maxDeviationPercent > 0 ? '+' : ''}
                        {snapshot.maxDeviationPercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {snapshot.durationSeconds > 0
                          ? formatDuration(snapshot.durationSeconds)
                          : 'Just now'}
                      </span>
                      <span>{snapshot.sources.length} sources</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-9 xl:col-span-9">
            {selectedSnapshot && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Panel header */}
                <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {selectedSnapshot.symbol} · {selectedSnapshot.displayName}
                      </h2>
                      <p className="text-xs text-gray-500">
                        Target peg ${formatPrice(selectedSnapshot.targetPeg)} · Reference{' '}
                        {formatPrice(selectedSnapshot.referencePrice)} · Updated{' '}
                        {new Date(selectedSnapshot.lastUpdated).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div
                        className={cn(
                          'text-xl font-bold font-mono',
                          selectedSnapshot.maxDeviationPercent > 0
                            ? 'text-red-600'
                            : 'text-emerald-600'
                        )}
                      >
                        {selectedSnapshot.maxDeviationPercent > 0 ? '+' : ''}
                        {selectedSnapshot.maxDeviationPercent.toFixed(3)}%
                      </div>
                      <div className="text-xs text-gray-400">max deviation</div>
                    </div>
                    <RiskBadge level={selectedSnapshot.riskLevel} className="self-center" />
                  </div>
                </div>

                {/* Tabs */}
                <RiskTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

                {/* Tab content */}
                <div className="p-5">
                  {activeTab === 'overview' && (
                    <div className="space-y-5">
                      <RiskAssessmentCard
                        assetSymbol={selectedSnapshot.symbol}
                        riskLevel={selectedSnapshot.riskLevel}
                        deviationPercent={selectedSnapshot.maxDeviationPercent}
                        durationSeconds={selectedSnapshot.durationSeconds}
                        affectedProtocolCount={selectedSnapshot.affectedProtocols.length}
                        type="stablecoin"
                      />

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Metric
                          label="Reference Price"
                          value={formatPrice(selectedSnapshot.referencePrice)}
                        />
                        <Metric
                          label="Max Deviation"
                          value={`${selectedSnapshot.maxDeviationPercent > 0 ? '+' : ''}${selectedSnapshot.maxDeviationPercent.toFixed(3)}%`}
                        />
                        <Metric
                          label="Source Spread"
                          value={`${selectedSnapshot.spreadPercent.toFixed(3)}%`}
                        />
                        <Metric
                          label="Duration"
                          value={formatDuration(selectedSnapshot.durationSeconds)}
                        />
                      </div>

                      {impactSummary && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <ImpactCard
                            title="Collateral Exposure"
                            count={impactSummary.collateral}
                            description={`Protocols where ${selectedSnapshot.symbol} is accepted as collateral. A depeg discount erodes position Health Factor.`}
                            icon={<Anchor className="w-4 h-4" />}
                          />
                          <ImpactCard
                            title="Borrow Exposure"
                            count={impactSummary.borrow}
                            description={`Protocols where ${selectedSnapshot.symbol} can be borrowed. A depeg premium increases the real value of debt.`}
                            icon={<ShieldAlert className="w-4 h-4" />}
                          />
                        </div>
                      )}

                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                          Cross-Source Deviation Heatmap
                        </h3>
                        <RiskHeatmap
                          rows={heatmapRows}
                          cols={heatmapCols}
                          cells={heatmapCells}
                          valueFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'sources' && (
                    <SourceAnalysis
                      sources={selectedSnapshot.sources}
                      referencePrice={selectedSnapshot.referencePrice}
                      symbol={selectedSnapshot.symbol}
                    />
                  )}

                  {activeTab === 'protocols' && (
                    <div className="space-y-4">
                      {selectedSnapshot.affectedProtocols.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No protocols currently list this asset.
                        </p>
                      ) : (
                        selectedSnapshot.affectedProtocols.map((protocol) => (
                          <AffectedProtocolCard
                            key={`${protocol.protocolId}-${protocol.assetRole}`}
                            protocol={protocol}
                            assetSymbol={selectedSnapshot.symbol}
                            riskLevel={selectedSnapshot.riskLevel}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-base font-semibold text-gray-900 font-mono">{value}</div>
    </div>
  );
}

function ImpactCard({
  title,
  count,
  description,
  icon,
}: {
  title: string;
  count: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-white rounded-lg shadow-sm text-gray-500">{icon}</div>
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{count}</div>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
