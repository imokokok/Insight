'use client';

import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import {
  MiniMetricBar,
  ProviderIdentity,
  ReputationGauge,
  ScoreBadge,
} from '@/app/reputation/components/ReputationShared';
import { TYPE_CONFIG, type ProviderType } from '@/app/reputation/constants/providerProfiles';
import { PROVIDER_TYPE_CONFIG } from '@/lib/oracles/services/reputationService';
import type { OracleReputation } from '@/lib/oracles/services/reputationService';
import { getDeviationPillClass, getLatencyPillClass } from '@/lib/oracles/utils/reputationUtils';
import { cn } from '@/lib/utils';
import { type OracleProvider } from '@/types/oracle';

export type SortKey = 'score' | 'accuracy' | 'uptime' | 'latency' | 'deviation' | 'coverage';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

interface ReputationComparisonTableProps {
  providers: OracleProvider[];
  reputationMap: Map<string, OracleReputation>;
  sort: SortState;
  onSort: (key: SortKey) => void;
}

export function ReputationComparisonTable({
  providers,
  reputationMap,
  sort,
  onSort,
}: ReputationComparisonTableProps) {
  const headers: { key: SortKey; label: string; width?: string }[] = [
    { key: 'score', label: 'Reputation', width: 'w-[52px]' },
    { key: 'accuracy', label: 'Accuracy', width: 'w-[110px]' },
    { key: 'uptime', label: 'Uptime', width: 'w-[110px]' },
    { key: 'latency', label: 'Latency', width: 'w-[100px]' },
    { key: 'deviation', label: 'Deviation', width: 'w-[110px]' },
    { key: 'coverage', label: 'Coverage', width: 'w-[100px]' },
  ];

  const SortIcon = ({ active, direction }: { active: boolean; direction: SortDirection }) => (
    <span
      className={cn(
        'ml-1 text-[10px] transition-colors',
        active ? 'text-blue-600' : 'text-slate-300'
      )}
    >
      {active ? (direction === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  );

  return (
    <div className="overflow-hidden border-y border-slate-900/15 bg-white/45">
      <div className="overflow-x-auto">
        {/* min-w kept at 820px (tightened from 900px) to reduce horizontal
            scroll distance on small screens while preserving column density. */}
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-slate-900/15 bg-slate-100/60">
              <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[260px]">
                Provider
              </th>
              {headers.map((h) => (
                <th
                  key={h.key}
                  className={cn(
                    'px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500',
                    h.width
                  )}
                  aria-sort={
                    sort.key === h.key
                      ? sort.direction === 'desc'
                        ? 'descending'
                        : 'ascending'
                      : 'none'
                  }
                >
                  <button
                    type="button"
                    onClick={() => onSort(h.key)}
                    className="inline-flex items-center transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {h.label}
                    <SortIcon active={sort.key === h.key} direction={sort.direction} />
                  </button>
                </th>
              ))}
              <th className="text-right px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[100px]">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {providers.map((provider) => {
              const rep = reputationMap.get(provider);
              const providerType = (PROVIDER_TYPE_CONFIG[provider]?.type || 'api') as ProviderType;
              const typeConf = TYPE_CONFIG[providerType];
              const hasScore = rep && rep.overall_score > 0;

              const latencyScore = rep ? Math.max(0, 100 - rep.avg_latency_ms / 20) : 0;
              const latencyPill = getLatencyPillClass(latencyScore);
              const deviationPill =
                rep && rep.avg_deviation_pct !== undefined
                  ? getDeviationPillClass(rep.avg_deviation_pct)
                  : null;

              return (
                <tr key={provider} className="group hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-4">
                    <Link href={`/reputation/${encodeURIComponent(provider)}`} className="block">
                      <ProviderIdentity
                        provider={provider}
                        size={38}
                        showType
                        typeLabel={typeConf.label}
                        typeColor={typeConf.color}
                      />
                    </Link>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-3">
                      <ReputationGauge
                        score={hasScore ? rep.overall_score : 0}
                        size={44}
                        showLabel
                      />
                      <div className="hidden sm:block">
                        {hasScore ? (
                          <ScoreBadge score={rep.overall_score} />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">
                            Awaiting data
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <MiniMetricBar
                      value={rep?.accuracy_score ?? 0}
                      max={100}
                      color="#3b82f6"
                      suffix="%"
                    />
                  </td>
                  <td className="px-3 py-4">
                    <MiniMetricBar
                      value={rep?.uptime_percentage ?? 100}
                      max={100}
                      color="#10b981"
                      suffix="%"
                    />
                  </td>
                  <td className="px-3 py-4">
                    {rep && rep.avg_latency_ms > 0 ? (
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
                          latencyPill.textClass,
                          latencyPill.bgClass
                        )}
                      >
                        {Math.round(rep.avg_latency_ms)} ms
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    {deviationPill ? (
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
                          deviationPill.textClass,
                          deviationPill.bgClass
                        )}
                      >
                        {rep!.avg_deviation_pct!.toFixed(3)}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-col gap-0.5 text-[11px]">
                      <span className="font-semibold text-slate-700">
                        {rep?.supported_symbols_count ?? 0} symbols
                      </span>
                      <span className="text-slate-400">
                        {rep?.supported_chains_count ?? 0} chains
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/reputation/${encodeURIComponent(provider)}`}
                      className={cn(
                        'inline-flex items-center gap-1 border px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                        'bg-slate-50 text-slate-600 border border-slate-100',
                        'group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200'
                      )}
                    >
                      Analyze
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
