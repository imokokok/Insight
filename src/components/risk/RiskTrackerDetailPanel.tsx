'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';
import type { AffectedProtocol, RiskLevel, SourcePriceSnapshot } from '@/lib/risk/types';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';

import { AffectedProtocolCard } from './AffectedProtocolCard';
import { DeviationTrendChart } from './DeviationTrendChart';
import { RiskAssessmentCard } from './RiskAssessmentCard';
import { RiskBadge } from './RiskBadge';
import { RiskHeatmap } from './RiskHeatmap';
import { RiskTabs } from './RiskTabs';
import { SourceAnalysis } from './SourceAnalysis';

import type { HeatmapCell } from './RiskHeatmap';

type ValidTab = 'overview' | 'sources' | 'protocols';

interface RiskSnapshotBase {
  symbol: string;
  displayName: string;
  riskLevel: RiskLevel;
  durationSeconds: number;
  sources: SourcePriceSnapshot[];
  affectedProtocols: AffectedProtocol[];
  lastUpdated: number;
}

interface RiskTrackerDetailPanelProps<T extends RiskSnapshotBase> {
  snapshot: T;
  activeTab: ValidTab;
  page: 'stablecoin' | 'wrapped';
  refreshing: boolean;
  thresholds: { warning: number; critical: number; severe: number };
  heatmapRows: { id: string; label: string }[];
  heatmapCols: { id: string; label: string }[];
  heatmapCells: HeatmapCell[];
  typeLabels?: Record<string, string>;
  getDeviationValue: (snapshot: T) => number;
  getReferencePrice: (snapshot: T) => number;
  renderOverview: (snapshot: T) => React.ReactNode;
  onTabChange: (tabId: string) => void;
  onRefresh: () => void;
}

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
};

export function RiskTrackerDetailPanel<T extends RiskSnapshotBase>({
  snapshot,
  activeTab,
  page,
  refreshing,
  thresholds,
  heatmapRows,
  heatmapCols,
  heatmapCells,
  typeLabels,
  getDeviationValue,
  getReferencePrice,
  renderOverview,
  onTabChange,
  onRefresh,
}: RiskTrackerDetailPanelProps<T>) {
  const deviation = getDeviationValue(snapshot);
  const referencePrice = getReferencePrice(snapshot);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sources', label: 'Price Sources' },
    {
      id: 'protocols',
      label: 'Affected Protocols',
      badge: snapshot.affectedProtocols.length,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              {snapshot.symbol} · {snapshot.displayName}
            </h2>
            {typeLabels && typeLabels[(snapshot as { type?: string }).type ?? ''] && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {typeLabels[(snapshot as { type?: string }).type ?? '']}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Reference {formatPrice(referencePrice)} · Updated{' '}
            {new Date(snapshot.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div
              className={cn(
                'text-xl font-bold font-mono',
                deviation > 0 ? 'text-red-600' : 'text-emerald-600'
              )}
            >
              {deviation > 0 ? '+' : ''}
              {deviation.toFixed(3)}%
            </div>
            <div className="text-xs text-slate-400">deviation</div>
          </div>
          <RiskBadge level={snapshot.riskLevel} className="self-center" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh data"
            className="shrink-0"
          >
            <RefreshCw className={cn('w-4 h-4 text-slate-500', refreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <RiskTabs tabs={tabs} activeTab={activeTab} onChange={onTabChange} />

      {/* Tab content */}
      <div className="p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={activeTab} {...pageTransition}>
            {activeTab === 'overview' && (
              <div className="space-y-5">
                <RiskAssessmentCard
                  assetSymbol={snapshot.symbol}
                  riskLevel={snapshot.riskLevel}
                  deviationPercent={deviation}
                  durationSeconds={snapshot.durationSeconds}
                  affectedProtocolCount={snapshot.affectedProtocols.length}
                  type={page === 'stablecoin' ? 'stablecoin' : 'wrapped'}
                />

                {renderOverview(snapshot)}

                <DeviationTrendChart symbol={snapshot.symbol} />

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Cross-Source Deviation Heatmap
                  </h3>
                  <RiskHeatmap
                    rows={heatmapRows}
                    cols={heatmapCols}
                    cells={heatmapCells}
                    thresholds={thresholds}
                    valueFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`}
                  />
                </div>
              </div>
            )}

            {activeTab === 'sources' && (
              <SourceAnalysis
                sources={snapshot.sources}
                referencePrice={referencePrice}
                symbol={snapshot.symbol}
              />
            )}

            {activeTab === 'protocols' && (
              <div className="space-y-4">
                {snapshot.affectedProtocols.length === 0 ? (
                  <p className="text-sm text-slate-500">No protocols currently list this asset.</p>
                ) : (
                  snapshot.affectedProtocols.map((protocol) => (
                    <AffectedProtocolCard
                      key={`${protocol.protocolId}-${protocol.assetRole}`}
                      protocol={protocol}
                      assetSymbol={snapshot.symbol}
                      riskLevel={snapshot.riskLevel}
                      liveDeviationPercent={deviation}
                    />
                  ))
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
