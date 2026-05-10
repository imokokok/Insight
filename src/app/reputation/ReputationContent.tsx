'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';

import Link from 'next/link';

import {
  Award,
  Target,
  Clock,
  TrendingUp,
  Database,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  Loader2,
  Info,
  History,
  ArrowUp,
  ArrowDown,
  Filter,
  Zap,
  Shield,
  Crown,
  Medal,
  RefreshCw,
} from 'lucide-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { useReputations, useRecalculateReputation } from '@/hooks/data/useReputations';
import { oracleColors, providerNames } from '@/lib/constants';
import type { OracleReputation } from '@/lib/oracles/services/reputationService';
import { getScoreColor, getScoreBadge, formatTimeAgo } from '@/lib/oracles/utils/reputationUtils';
import { cn } from '@/lib/utils';
import { type OracleProvider } from '@/types/oracle';

type SortField =
  | 'overall_score'
  | 'accuracy_score'
  | 'uptime_percentage'
  | 'reliability_score'
  | 'freshness_score'
  | 'avg_latency_ms'
  | 'avg_deviation_pct';
type SortDir = 'asc' | 'desc';

function ScoreRing({
  score,
  size = 56,
  strokeWidth = 4,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score / 100, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold font-mono" style={{ color: getScoreColor(score) }}>
          {score.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
        <Crown className="w-3 h-3 text-amber-500" />
        <span className="text-xs font-semibold text-amber-700">#1</span>
      </div>
    );
  if (rank === 2)
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200">
        <Medal className="w-3 h-3 text-gray-400" />
        <span className="text-xs font-semibold text-gray-600">#2</span>
      </div>
    );
  if (rank === 3)
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200">
        <Medal className="w-3 h-3 text-orange-400" />
        <span className="text-xs font-semibold text-orange-600">#3</span>
      </div>
    );
  return (
    <div className="flex items-center px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100">
      <span className="text-xs font-medium text-gray-500">#{rank}</span>
    </div>
  );
}

function ReputationCard({ reputation, rank }: { reputation: OracleReputation; rank: number }) {
  const badge = getScoreBadge(reputation.overall_score);
  const provider = reputation.provider as OracleProvider;
  const color = oracleColors[provider] || '#888888';
  const timeAgo = formatTimeAgo(reputation.last_calculated_at);

  return (
    <Link href={`/reputation/${encodeURIComponent(provider)}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all duration-200 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            backgroundImage: `linear-gradient(to right, ${color}, ${color}88)`,
          }}
        />

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <RankBadge rank={rank} />
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 0 2px white, 0 0 0 4px ${color}33`,
                }}
              />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {providerNames[provider] || provider}
                </h3>
                <p className="text-[10px] text-gray-400 font-mono">{provider}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all" />
            {timeAgo && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5 whitespace-nowrap">
                <History className="w-2.5 h-2.5" />
                <span className={timeAgo.color}>{timeAgo.text}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <ScoreRing score={reputation.overall_score} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-xs text-gray-500">Overall Score</span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded ${badge.bgClass} ${badge.textClass}`}
              >
                {badge.label}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(reputation.overall_score, 100)}%`,
                  backgroundColor: getScoreColor(reputation.overall_score),
                }}
              />
            </div>
            {reputation.overall_score > 0 && (
              <p className="text-[10px] text-gray-400 mt-1">
                {reputation.total_queries} queries · 7-day rolling
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col items-center gap-0.5 p-2 bg-blue-50/50 rounded-lg">
            <Target className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] text-gray-500">Accuracy</span>
            <span className="text-xs font-mono font-semibold text-gray-700">
              {reputation.accuracy_score.toFixed(1)}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5 p-2 bg-emerald-50/50 rounded-lg">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-gray-500">Uptime</span>
            <span className="text-xs font-mono font-semibold text-gray-700">
              {reputation.uptime_percentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5 p-2 bg-purple-50/50 rounded-lg">
            <Shield className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] text-gray-500">Reliability</span>
            <span className="text-xs font-mono font-semibold text-gray-700">
              {reputation.reliability_score.toFixed(1)}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5 p-2 bg-cyan-50/50 rounded-lg">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] text-gray-500">Latency</span>
            <span className="text-xs font-mono font-semibold text-gray-700">
              {reputation.avg_latency_ms}ms
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SummaryStats({ reputations }: { reputations: OracleReputation[] }) {
  const rated = reputations.filter((r) => r.overall_score > 0);
  const avgScore =
    rated.length > 0 ? rated.reduce((sum, r) => sum + r.overall_score, 0) / rated.length : 0;
  const topProvider =
    rated.length > 0
      ? rated.reduce((best, r) => (r.overall_score > best.overall_score ? r : best), rated[0])
      : null;
  const avgLatency =
    rated.length > 0
      ? Math.round(rated.reduce((sum, r) => sum + r.avg_latency_ms, 0) / rated.length)
      : 0;
  const totalQueries = rated.reduce((sum, r) => sum + r.total_queries, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-blue-50">
            <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Avg Score
          </span>
        </div>
        <p className="text-2xl font-bold font-mono" style={{ color: getScoreColor(avgScore) }}>
          {avgScore.toFixed(1)}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">across {rated.length} rated providers</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-amber-50">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Top Provider
          </span>
        </div>
        <p className="text-lg font-bold text-gray-900 truncate">
          {topProvider
            ? providerNames[topProvider.provider as OracleProvider] || topProvider.provider
            : '--'}
        </p>
        {topProvider && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            Score:{' '}
            <span style={{ color: getScoreColor(topProvider.overall_score) }}>
              {topProvider.overall_score.toFixed(0)}
            </span>
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-cyan-50">
            <Zap className="w-3.5 h-3.5 text-cyan-500" />
          </div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Avg Latency
          </span>
        </div>
        <p className="text-2xl font-bold font-mono text-gray-900">{avgLatency}ms</p>
        <p className="text-[10px] text-gray-400 mt-0.5">response time</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-emerald-50">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total Queries
          </span>
        </div>
        <p className="text-2xl font-bold font-mono text-gray-900">
          {totalQueries.toLocaleString()}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">7-day aggregate</p>
      </div>
    </div>
  );
}

function NextUpdateCountdown({ nextRecalcAt }: { nextRecalcAt: string | null | undefined }) {
  const [remaining, setRemaining] = useState<string>('');

  const computeRemaining = useCallback(() => {
    if (!nextRecalcAt) return '';
    const diff = new Date(nextRecalcAt).getTime() - Date.now();
    if (diff <= 0) return 'soon';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '<1m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, [nextRecalcAt]);

  useEffect(() => {
    setRemaining(computeRemaining());
    const timer = setInterval(() => setRemaining(computeRemaining()), 30000);
    return () => clearInterval(timer);
  }, [computeRemaining]);

  if (!nextRecalcAt || !remaining) return null;

  return (
    <span className="text-[10px] text-gray-400 flex items-center gap-1">
      <Clock className="w-3 h-3" />
      Next update in {remaining}
    </span>
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

  const sortedReputations = useMemo(() => {
    if (!reputations) return [];
    return [...reputations].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (sortField === 'avg_latency_ms') {
        return sortDir === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [reputations, sortField, sortDir]);

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
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200/50">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Oracle Reputation</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Persistent reliability scoring and historical performance tracking
            </p>
          </div>
        </div>
        {isCalculating && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
            <span className="text-xs font-medium text-blue-700">
              {calcMessage || 'Recalculating...'}
            </span>
          </div>
        )}
        {!isCalculating && (
          <div className="flex items-center gap-3">
            <NextUpdateCountdown nextRecalcAt={nextRecalcAt} />
            <button
              onClick={() => recalculate.mutate()}
              disabled={recalculate.isPending || isCalculating}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                recalculate.isPending || isCalculating
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200'
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', recalculate.isPending && 'animate-spin')} />
              {recalculate.isPending ? 'Calculating...' : 'Refresh Now'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600">
            <p className="font-semibold text-slate-800 mb-1.5">
              How does this differ from Cross-Oracle Ranking?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>
                  <strong>Cross-Oracle:</strong> Real-time snapshot — per symbol, per query
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                <span>
                  <strong>Reputation:</strong> Rolling 7-day aggregate across all symbols
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span>Disappears on page refresh</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                <span>Persists in database, updated every hour</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {allUnrated && !isCalculating && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Waiting for calculation...</p>
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
            <p className="text-sm font-medium text-amber-800">No reputation data available</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Make sure the database migration has been applied in Supabase SQL Editor.
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-primary-500 animate-pulse" />
            <span className="text-sm text-gray-500">Loading reputation data...</span>
          </div>
        </div>
      )}

      {!isLoading && sortedReputations.length > 0 && (
        <>
          <SummaryStats reputations={sortedReputations} />

          <div className="flex items-center justify-between mt-6 mb-4">
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 mr-2">Sort by:</span>
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
                const isActive = sortField === field;
                const DirIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <button
                    key={field}
                    onClick={() => toggleSort(field as SortField)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-gray-500 hover:bg-gray-50 border border-transparent'
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                    {isActive ? (
                      <DirIcon className="w-2.5 h-2.5 text-primary-500" />
                    ) : (
                      <ArrowDown className="w-2.5 h-2.5 text-gray-300" />
                    )}
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-gray-400">
              {sortedReputations.filter((r) => r.overall_score > 0).length} rated ·{' '}
              {sortedReputations.length} total
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedReputations.map((rep, index) => (
              <ReputationCard key={rep.provider} reputation={rep} rank={index + 1} />
            ))}
          </div>
        </>
      )}

      {!isLoading && !error && sortedReputations.length === 0 && !isCalculating && (
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
