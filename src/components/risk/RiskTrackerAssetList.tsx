'use client';

import { Clock, Search } from 'lucide-react';

import { RiskBadge } from '@/components/risk/RiskBadge';
import type { RiskLevel, SourcePriceSnapshot } from '@/lib/risk/types';
import { formatDuration } from '@/lib/risk/utils';
import { cn } from '@/lib/utils';

interface RiskSnapshotBase {
  symbol: string;
  displayName: string;
  riskLevel: RiskLevel;
  durationSeconds: number;
  sources: SourcePriceSnapshot[];
  lastUpdated: number;
}

interface RiskTrackerAssetListProps<T extends RiskSnapshotBase> {
  snapshots: T[];
  selectedSymbol: string | null;
  searchQuery: string;
  lastUpdatedAt: number | null;
  getDeviationValue: (snapshot: T) => number;
  getAssetSubtext?: (snapshot: T) => React.ReactNode;
  onSearchChange: (query: string) => void;
  onSelect: (symbol: string) => void;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function RiskTrackerAssetList<T extends RiskSnapshotBase>({
  snapshots,
  selectedSymbol,
  searchQuery,
  lastUpdatedAt,
  getDeviationValue,
  getAssetSubtext,
  onSearchChange,
  onSelect,
}: RiskTrackerAssetListProps<T>) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:sticky lg:top-6">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Tracked Assets</h2>
          {lastUpdatedAt && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimestamp(lastUpdatedAt)}
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search assets..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      <div className="divide-y divide-slate-100 max-h-[calc(100vh-260px)] overflow-y-auto">
        {snapshots.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            No assets match your search.
          </div>
        ) : (
          snapshots.map((snapshot) => {
            const deviation = getDeviationValue(snapshot);
            const isSelected = selectedSymbol === snapshot.symbol;
            return (
              <button
                key={snapshot.symbol}
                onClick={() => onSelect(snapshot.symbol)}
                className={cn(
                  'w-full px-4 py-3.5 text-left transition-colors hover:bg-slate-50',
                  isSelected
                    ? 'bg-blue-50/60 border-l-4 border-blue-500'
                    : 'border-l-4 border-transparent'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900">{snapshot.symbol}</span>
                  <RiskBadge level={snapshot.riskLevel} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    {getAssetSubtext ? getAssetSubtext(snapshot) : snapshot.displayName}
                  </span>
                  <span
                    className={cn(
                      'font-mono font-medium',
                      deviation > 0 ? 'text-red-600' : 'text-emerald-600'
                    )}
                  >
                    {deviation > 0 ? '+' : ''}
                    {deviation.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {snapshot.durationSeconds > 0
                      ? formatDuration(snapshot.durationSeconds)
                      : 'Just now'}
                  </span>
                  <span>{snapshot.sources.length} sources</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
