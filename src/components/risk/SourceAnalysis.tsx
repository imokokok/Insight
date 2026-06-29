'use client';

import { ArrowDown, ArrowUp, BarChart3, CheckCircle2, Globe, Shield } from 'lucide-react';

import type { SourcePriceSnapshot } from '@/lib/risk/types';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';

interface SourceAnalysisProps {
  sources: SourcePriceSnapshot[];
  referencePrice: number;
  symbol: string;
  className?: string;
}

interface SourceStats {
  highest: SourcePriceSnapshot | null;
  lowest: SourcePriceSnapshot | null;
  mostDeviated: SourcePriceSnapshot | null;
  mostConsensus: SourcePriceSnapshot | null;
  averageDeviation: number;
  onChainCount: number;
  apiCount: number;
}

function analyzeSources(sources: SourcePriceSnapshot[]): SourceStats {
  if (sources.length === 0) {
    return {
      highest: null,
      lowest: null,
      mostDeviated: null,
      mostConsensus: null,
      averageDeviation: 0,
      onChainCount: 0,
      apiCount: 0,
    };
  }

  const sortedByPrice = [...sources].sort((a, b) => b.price - a.price);
  const sortedByDeviation = [...sources].sort(
    (a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent)
  );
  const sortedByConsensus = [...sources].sort(
    (a, b) => Math.abs(a.deviationPercent) - Math.abs(b.deviationPercent)
  );

  const averageDeviation =
    sources.reduce((sum, s) => sum + Math.abs(s.deviationPercent), 0) / sources.length;

  const onChainCount = sources.filter((s) => s.verification?.type === 'on-chain').length;
  const apiCount = sources.filter((s) => s.verification?.type === 'api').length;

  return {
    highest: sortedByPrice[0] ?? null,
    lowest: sortedByPrice[sortedByPrice.length - 1] ?? null,
    mostDeviated: sortedByDeviation[0] ?? null,
    mostConsensus: sortedByConsensus[0] ?? null,
    averageDeviation,
    onChainCount,
    apiCount,
  };
}

function SourceStatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  className,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  return (
    <div className={cn('bg-gray-50 rounded-xl p-4 border border-gray-100', className)}>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-white rounded-lg shadow-sm text-gray-500">{icon}</div>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-base font-bold text-gray-900">{value}</span>
        {trend && (
          <span
            className={cn(
              'text-xs',
              trend === 'up'
                ? 'text-red-500'
                : trend === 'down'
                  ? 'text-emerald-500'
                  : 'text-gray-400'
            )}
          >
            {trend === 'up' ? (
              <ArrowUp className="w-3 h-3 inline" />
            ) : trend === 'down' ? (
              <ArrowDown className="w-3 h-3 inline" />
            ) : null}
          </span>
        )}
      </div>
      <div className="text-xs text-gray-400 mt-1 truncate" title={subtext}>
        {subtext}
      </div>
    </div>
  );
}

export function SourceAnalysis({ sources, className }: SourceAnalysisProps) {
  const stats = analyzeSources(sources);

  return (
    <div className={cn('space-y-5', className)}>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SourceStatCard
          label="Highest Price"
          value={stats.highest ? formatPrice(stats.highest.price) : '-'}
          subtext={stats.highest ? `${stats.highest.provider} @ ${stats.highest.chain}` : 'No data'}
          icon={<ArrowUp className="w-4 h-4" />}
          trend="up"
        />
        <SourceStatCard
          label="Lowest Price"
          value={stats.lowest ? formatPrice(stats.lowest.price) : '-'}
          subtext={stats.lowest ? `${stats.lowest.provider} @ ${stats.lowest.chain}` : 'No data'}
          icon={<ArrowDown className="w-4 h-4" />}
          trend="down"
        />
        <SourceStatCard
          label="Most Deviated"
          value={
            stats.mostDeviated
              ? `${stats.mostDeviated.deviationPercent > 0 ? '+' : ''}${stats.mostDeviated.deviationPercent.toFixed(3)}%`
              : '-'
          }
          subtext={
            stats.mostDeviated
              ? `${stats.mostDeviated.provider} @ ${stats.mostDeviated.chain}`
              : 'No data'
          }
          icon={<BarChart3 className="w-4 h-4" />}
        />
        <SourceStatCard
          label="Closest to Consensus"
          value={
            stats.mostConsensus
              ? `${stats.mostConsensus.deviationPercent > 0 ? '+' : ''}${stats.mostConsensus.deviationPercent.toFixed(3)}%`
              : '-'
          }
          subtext={
            stats.mostConsensus
              ? `${stats.mostConsensus.provider} @ ${stats.mostConsensus.chain}`
              : 'No data'
          }
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
      </div>

      {/* Deviation distribution */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Deviation Distribution</h4>
        <div className="space-y-3">
          {sources
            .slice()
            .sort((a, b) => b.deviationPercent - a.deviationPercent)
            .map((source) => {
              const maxAbs = Math.max(...sources.map((s) => Math.abs(s.deviationPercent)), 0.01);
              const width = Math.min((Math.abs(source.deviationPercent) / maxAbs) * 100, 100);
              const isPositive = source.deviationPercent >= 0;

              return (
                <div key={source.sourceId} className="flex items-center gap-3">
                  <div className="w-32 sm:w-40 shrink-0">
                    <div className="text-xs font-medium text-gray-700 truncate">
                      {source.provider}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">{source.chain}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isPositive ? 'bg-red-400' : 'bg-emerald-400'
                        )}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                  <div
                    className={cn(
                      'w-20 text-right text-xs font-mono font-medium shrink-0',
                      isPositive ? 'text-red-600' : 'text-emerald-600'
                    )}
                  >
                    {source.deviationPercent > 0 ? '+' : ''}
                    {source.deviationPercent.toFixed(3)}%
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Methodology and verification */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary-600" />
            Consensus Methodology
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            Reference price is computed as the filtered median across {sources.length} active
            sources, excluding outliers using the interquartile range (IQR) method. Each source
            deviation is measured against this consensus price.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            {stats.onChainCount >= stats.apiCount ? (
              <Shield className="w-4 h-4 text-emerald-600" />
            ) : (
              <Globe className="w-4 h-4 text-blue-600" />
            )}
            Source Verification
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">On-chain sources</span>
              <span className="font-semibold text-gray-900">{stats.onChainCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">API sources</span>
              <span className="font-semibold text-gray-900">{stats.apiCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Average absolute deviation</span>
              <span className="font-semibold text-gray-900">
                {stats.averageDeviation.toFixed(3)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
