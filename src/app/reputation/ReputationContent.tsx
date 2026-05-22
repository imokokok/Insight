'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import {
  Award,
  Target,
  Clock,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  Loader2,
  ArrowUp,
  ArrowDown,
  Filter,
  Zap,
  Shield,
  Crown,
  Medal,
  RefreshCw,
  LayoutGrid,
  List,
  Star,
} from 'lucide-react';

import { OracleLogo } from '@/app/reputation/components/ReputationShared';
import { ErrorBoundary } from '@/components/error-boundary';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { useReputations, useRecalculateReputation } from '@/hooks/data/useReputations';
import { providerNames } from '@/lib/constants';
import type { OracleReputation } from '@/lib/oracles/services/reputationService';
import { getScoreColor, formatTimeAgo } from '@/lib/oracles/utils/reputationUtils';
import { cn } from '@/lib/utils';
import { type OracleProvider } from '@/types/oracle';

import { RiskBadge, LeaderboardRow } from './components/LeaderboardView';
import {
  GlobalStats,
  TopThree,
  NextUpdateCountdown,
  ComparisonInfo,
} from './components/ReputationStats';

type SortField =
  | 'overall_score'
  | 'accuracy_score'
  | 'uptime_percentage'
  | 'reliability_score'
  | 'freshness_score'
  | 'avg_latency_ms'
  | 'avg_deviation_pct';
type SortDir = 'asc' | 'desc';
type ViewMode = 'leaderboard' | 'table';

function TableView({ reputations }: { reputations: OracleReputation[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-10">
                #
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Provider
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20">
                Score
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20">
                Risk
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Accuracy
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Uptime
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Reliability
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Latency
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Freshness
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Queries
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-16">
                Updated
              </th>
              <th className="px-4 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {reputations.map((rep, i) => {
              const provider = rep.provider as OracleProvider;
              const timeAgo = formatTimeAgo(rep.last_calculated_at);
              return (
                <tr
                  key={provider}
                  className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    {i === 0 && <Crown className="w-4 h-4 text-amber-500" />}
                    {i === 1 && <Medal className="w-4 h-4 text-slate-400" />}
                    {i === 2 && <Medal className="w-4 h-4 text-orange-400" />}
                    {i > 2 && (
                      <span className="text-xs font-bold text-gray-400 font-mono">{i + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/reputation/${encodeURIComponent(provider)}`}
                      className="flex items-center gap-2 group"
                    >
                      <OracleLogo provider={provider} size={20} />
                      <div>
                        <div className="font-bold text-gray-900 text-sm group-hover:text-primary-600 transition-colors">
                          {providerNames[provider] || provider}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">{provider}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/reputation/${encodeURIComponent(provider)}`}>
                      <span
                        className="font-black font-mono text-sm"
                        style={{ color: getScoreColor(rep.overall_score) }}
                      >
                        {rep.overall_score.toFixed(1)}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge score={rep.overall_score} />
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-gray-700">
                    {rep.accuracy_score.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-gray-700">
                    {rep.uptime_percentage.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-gray-700">
                    {rep.reliability_score.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-gray-700">
                    {rep.avg_latency_ms}ms
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-gray-700">
                    {rep.freshness_score.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-gray-700">
                    {rep.total_queries.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {timeAgo ? (
                      <span className={cn('text-[10px] font-medium', timeAgo.color)}>
                        {timeAgo.text}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/reputation/${encodeURIComponent(provider)}`}>
                      <ChevronRight className="w-4 h-4 text-gray-300 hover:text-gray-500 transition-colors" />
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

function ReputationContentInner() {
  const { data, isLoading, error } = useReputations();
  const recalculate = useRecalculateReputation();

  const reputations = useMemo(() => data?.data ?? [], [data?.data]);
  const isCalculating = data?.calculating ?? false;
  const calcMessage = data?.message;
  const nextRecalcAt = data?.nextRecalcAt;

  const [sortField, setSortField] = useState<SortField>('overall_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('leaderboard');

  const sorted = useMemo(() => {
    return [...reputations].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [reputations, sortField, sortDir]);

  const maxQueries = useMemo(
    () => Math.max(...reputations.map((r) => r.total_queries), 1),
    [reputations]
  );
  const allUnrated = reputations.length > 0 && reputations.every((r) => r.overall_score <= 0);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'avg_latency_ms' || field === 'avg_deviation_pct' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-200/30">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Oracle Reputation</h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              Persistent reliability scoring and historical performance tracking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCalculating && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span className="text-xs font-bold text-blue-700">
                {calcMessage || 'Recalculating...'}
              </span>
            </div>
          )}
          {!isCalculating && (
            <>
              <NextUpdateCountdown nextRecalcAt={nextRecalcAt} />
              <button
                onClick={() => recalculate.mutate()}
                disabled={recalculate.isPending || isCalculating}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  recalculate.isPending || isCalculating
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200'
                )}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', recalculate.isPending && 'animate-spin')} />
                {recalculate.isPending ? 'Calculating...' : 'Refresh'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-6">
        <ComparisonInfo />
      </div>

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
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">No reputation data available</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Make sure the database migration has been applied in Supabase SQL Editor.
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-500 animate-pulse" />
            <span className="text-sm text-gray-500 font-bold">Loading reputation data...</span>
          </div>
        </div>
      )}

      {!isLoading && sorted.length > 0 && (
        <>
          <GlobalStats reputations={sorted} />

          <div className="mt-8 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Top Performers
              </h2>
            </div>
            <TopThree reputations={sorted} />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-6 mb-4">
            <div className="flex items-center gap-1 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-gray-400 mr-1" />
              <span className="text-[10px] text-gray-500 mr-1.5 font-bold">Sort by:</span>
              {(
                [
                  ['overall_score', 'Score', Award],
                  ['accuracy_score', 'Accuracy', Target],
                  ['uptime_percentage', 'Uptime', TrendingUp],
                  ['reliability_score', 'Reliability', Shield],
                  ['freshness_score', 'Freshness', Zap],
                  ['avg_latency_ms', 'Latency', Clock],
                  ['avg_deviation_pct', 'Deviation', BarChart3],
                ] as const
              ).map(([field, label, Icon]) => {
                const active = sortField === field;
                const DirIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <button
                    key={field}
                    onClick={() => toggleSort(field as SortField)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                      active
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-gray-500 hover:bg-gray-50 border border-transparent'
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                    {active ? (
                      <DirIcon className="w-2.5 h-2.5 text-primary-500" />
                    ) : (
                      <ArrowDown className="w-2.5 h-2.5 text-gray-300" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-bold">
                {sorted.filter((r) => r.overall_score > 0).length} rated · {sorted.length} total
              </span>
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('leaderboard')}
                  className={cn(
                    'p-1.5 rounded-md transition-all',
                    viewMode === 'leaderboard'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'p-1.5 rounded-md transition-all',
                    viewMode === 'table'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'leaderboard' ? (
            <div className="space-y-1.5">
              {sorted.map((rep, i) => (
                <LeaderboardRow
                  key={rep.provider}
                  reputation={rep}
                  rank={i + 1}
                  maxQueries={maxQueries}
                />
              ))}
            </div>
          ) : (
            <TableView reputations={sorted} />
          )}
        </>
      )}

      {!isLoading && !error && sorted.length === 0 && !isCalculating && (
        <EmptyStateEnhanced
          type="new"
          title="Initializing..."
          description="The system is preparing to collect reputation data automatically."
          size="lg"
          variant="page"
        />
      )}
    </div>
  );
}

export default function ReputationContent() {
  return (
    <ErrorBoundary level="page" componentName="ReputationContent">
      <ReputationContentInner />
    </ErrorBoundary>
  );
}
