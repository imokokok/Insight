'use client';

import { useMemo } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { motion } from 'framer-motion';
import { Activity, ArrowRight, BarChart3, Clock, Database, Globe, Zap } from 'lucide-react';

import { useReputations } from '@/hooks/data/useReputations';
import { providerNames } from '@/lib/constants';
import type { OracleReputation } from '@/lib/oracles/services/reputationService';
import { type OracleProvider, ORACLE_PROVIDER_VALUES } from '@/types/oracle';

function getStatusFromScore(score: number): 'healthy' | 'degraded' | 'down' {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'degraded';
  return 'down';
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

function formatPercent(num: number): string {
  return `${num.toFixed(1)}%`;
}

function formatRelativeTime(timestamp: string | number | null | undefined, now: number): string {
  if (!timestamp) return '—';
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  if (!time || time <= 0) return '—';
  const seconds = Math.floor((now - time) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface AggregateMetrics {
  avgScore: number;
  totalSymbols: number;
  totalChains: number;
  avgUptime: number;
  avgDeviation: number;
  totalQueries: number;
  failedQueries: number;
  lastCalculatedAt: string | null;
}

export function OracleHealthGrid({ now }: { now: number }) {
  const { data: reputationData, isLoading } = useReputations();

  const { providers, statusMap, detailsMap, counts, aggregates } = useMemo(() => {
    const reputations = reputationData?.data ?? [];
    const map = new Map<string, { score: number; status: 'healthy' | 'degraded' | 'down' }>();
    const detailsMap = new Map<string, OracleReputation>();
    for (const r of reputations) {
      const score = r.overall_score;
      map.set(r.provider, { score, status: getStatusFromScore(score) });
      detailsMap.set(r.provider, r);
    }

    const list =
      reputations.length > 0
        ? reputations.map((r) => r.provider as OracleProvider)
        : ([...ORACLE_PROVIDER_VALUES] as OracleProvider[]);

    const getStatus = (provider: OracleProvider) => {
      const rep = map.get(provider);
      if (rep) return rep;
      if (isLoading) return { score: 0, status: 'healthy' as const };
      return { score: 0, status: 'down' as const };
    };

    let healthy = 0;
    let degraded = 0;
    let down = 0;
    for (const provider of list) {
      const { status } = getStatus(provider);
      if (status === 'healthy') healthy++;
      else if (status === 'degraded') degraded++;
      else down++;
    }

    const aggregates: AggregateMetrics = {
      avgScore: 0,
      totalSymbols: 0,
      totalChains: 0,
      avgUptime: 0,
      avgDeviation: 0,
      totalQueries: 0,
      failedQueries: 0,
      lastCalculatedAt: null,
    };

    if (reputations.length > 0) {
      const scored = reputations.filter((r) => r.overall_score > 0);
      aggregates.avgScore =
        scored.length > 0 ? scored.reduce((sum, r) => sum + r.overall_score, 0) / scored.length : 0;
      aggregates.totalSymbols = reputations.reduce(
        (sum, r) => sum + (r.supported_symbols_count ?? 0),
        0
      );
      aggregates.totalChains = reputations.reduce(
        (sum, r) => sum + (r.supported_chains_count ?? 0),
        0
      );
      aggregates.avgUptime =
        scored.length > 0
          ? scored.reduce((sum, r) => sum + (r.uptime_percentage ?? 0), 0) / scored.length
          : 0;
      aggregates.avgDeviation =
        scored.length > 0
          ? scored.reduce((sum, r) => sum + (r.avg_deviation_pct ?? 0), 0) / scored.length
          : 0;
      aggregates.totalQueries = reputations.reduce((sum, r) => sum + (r.total_queries ?? 0), 0);
      aggregates.failedQueries = reputations.reduce((sum, r) => sum + (r.failed_queries ?? 0), 0);
      aggregates.lastCalculatedAt = reputations
        .map((r) => r.last_calculated_at)
        .filter(Boolean)
        .sort()
        .pop() as string | null;
    }

    return {
      providers: list,
      statusMap: map,
      detailsMap,
      counts: { healthy, degraded, down, total: list.length },
      aggregates,
    };
  }, [reputationData?.data, isLoading]);

  const getStatus = (provider: OracleProvider) => {
    const rep = statusMap.get(provider);
    if (rep) return rep;
    if (isLoading) return { score: 0, status: 'healthy' as const };
    return { score: 0, status: 'down' as const };
  };

  const statusConfig = {
    healthy: {
      dot: 'bg-emerald-500',
      ring: 'ring-emerald-500/30',
      bg: 'bg-emerald-50/50',
      badge: 'bg-emerald-100 text-emerald-700',
      label: 'Healthy',
      text: 'text-emerald-700',
      border: 'border-emerald-100',
    },
    degraded: {
      dot: 'bg-amber-500',
      ring: 'ring-amber-500/30',
      bg: 'bg-amber-50/50',
      badge: 'bg-amber-100 text-amber-700',
      label: 'Degraded',
      text: 'text-amber-700',
      border: 'border-amber-100',
    },
    down: {
      dot: 'bg-rose-500',
      ring: 'ring-rose-500/30',
      bg: 'bg-rose-50/50',
      badge: 'bg-rose-100 text-rose-700',
      label: 'Down',
      text: 'text-rose-700',
      border: 'border-rose-100',
    },
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="border-y border-slate-900/15 bg-white/30 p-5 sm:p-6 lg:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border-l-2 border-blue-600 bg-blue-50">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Oracle Network Health
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Transparent reputation scores across active providers
            </p>
          </div>
        </div>
        <Link
          href="/reputation"
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          View Directory
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-900/10 border-y border-slate-900/10 mb-6">
        {(['healthy', 'degraded', 'down'] as const).map((status) => {
          const config = statusConfig[status];
          const count = counts[status];
          const percentage = counts.total > 0 ? (count / counts.total) * 100 : 0;
          return (
            <div key={status} className={`flex flex-col px-3 py-3 sm:px-4 ${config.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                  <span className={`text-xs font-semibold ${config.text}`}>{config.label}</span>
                </div>
                <div
                  className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${config.text}`}
                >
                  {count}
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-slate-200/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${config.dot}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {counts.total > 0 ? `${percentage.toFixed(0)}% of network` : '—'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-slate-900/10 border-y border-slate-900/10 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0 mb-6">
        {[
          {
            icon: BarChart3,
            label: 'Avg Health',
            value: aggregates.avgScore > 0 ? aggregates.avgScore.toFixed(0) : '—',
            suffix: '/100',
          },
          {
            icon: Database,
            label: 'Symbols Covered',
            value: aggregates.totalSymbols > 0 ? formatNumber(aggregates.totalSymbols) : '—',
          },
          {
            icon: Globe,
            label: 'Chains Covered',
            value: aggregates.totalChains > 0 ? formatNumber(aggregates.totalChains) : '—',
          },
          {
            icon: Clock,
            label: 'Avg Uptime',
            value: aggregates.avgUptime > 0 ? formatPercent(aggregates.avgUptime) : '—',
          },
          {
            icon: Zap,
            label: 'Total Queries',
            value: aggregates.totalQueries > 0 ? formatNumber(aggregates.totalQueries) : '—',
          },
          {
            icon: Activity,
            label: 'Avg Deviation',
            value: aggregates.avgDeviation > 0 ? `${aggregates.avgDeviation.toFixed(3)}%` : '—',
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="flex items-center gap-2 px-3 py-3 bg-white/20">
              <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-500 font-medium">{metric.label}</div>
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {metric.value}
                  {metric.suffix ? (
                    <span className="text-slate-400 text-xs">{metric.suffix}</span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-900/10">
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Provider
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Health
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Uptime
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Deviation
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Coverage
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Success Rate
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Last Update
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/10">
            {providers.map((provider) => {
              const { score, status } = getStatus(provider);
              const config = statusConfig[status];
              const details = detailsMap.get(provider);
              const totalQueries = details?.total_queries ?? 0;
              const failedQueries = details?.failed_queries ?? 0;
              const successRate =
                totalQueries > 0 ? ((totalQueries - failedQueries) / totalQueries) * 100 : 0;

              return (
                <tr key={provider} className="hover:bg-blue-50/35 transition-colors group">
                  <td className="px-3 py-3">
                    <Link
                      href={`/reputation/${provider}`}
                      className="flex items-center gap-2.5 min-w-0"
                    >
                      <div className={`relative rounded-full p-0.5 ring-2 ${config.ring}`}>
                        <Image
                          src={`/logos/oracles/${provider}.svg`}
                          alt={providerNames[provider] ?? provider}
                          width={28}
                          height={28}
                          className="w-6 h-6 object-contain"
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 capitalize truncate">
                        {providerNames[provider] ?? provider}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    {score > 0 ? (
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${config.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        {score.toFixed(0)}/100
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-medium text-slate-700">
                      {details && details.uptime_percentage > 0
                        ? formatPercent(details.uptime_percentage)
                        : '—'}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-medium text-slate-700">
                      {details && details.avg_deviation_pct > 0
                        ? `${details.avg_deviation_pct.toFixed(3)}%`
                        : '—'}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-medium text-slate-700">
                      {details ? (
                        <span>
                          {formatNumber(details.supported_symbols_count ?? 0)} sym
                          <span className="text-slate-400 mx-1">·</span>
                          {formatNumber(details.supported_chains_count ?? 0)} chn
                        </span>
                      ) : (
                        '—'
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {totalQueries > 0 ? (
                      <span
                        className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full ${
                          successRate >= 99
                            ? 'bg-emerald-100 text-emerald-700'
                            : successRate >= 95
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {formatPercent(successRate)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {formatRelativeTime(details?.last_calculated_at, now)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}
