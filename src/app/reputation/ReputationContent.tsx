'use client';

import { useMemo } from 'react';

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
} from 'lucide-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { useReputations } from '@/hooks/data/useReputations';
import { oracleColors, providerNames } from '@/lib/constants';
import type { OracleReputation } from '@/lib/oracles/services/reputationService';
import { type OracleProvider } from '@/types/oracle';

function getScoreColor(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 75) return '#3b82f6';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function getScoreBadge(score: number): { label: string; bgClass: string; textClass: string } {
  if (score >= 90)
    return { label: 'Excellent', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
  if (score >= 75) return { label: 'Good', bgClass: 'bg-blue-50', textClass: 'text-blue-700' };
  if (score >= 60) return { label: 'Fair', bgClass: 'bg-amber-50', textClass: 'text-amber-700' };
  if (score >= 40) return { label: 'Poor', bgClass: 'bg-orange-50', textClass: 'text-orange-700' };
  return { label: 'Unrated', bgClass: 'bg-gray-50', textClass: 'text-gray-500' };
}

function ScoreBar({ value, maxValue, color }: { value: number; maxValue: number; color: string }) {
  const pct = Math.min(Math.max((value / maxValue) * 100, 0), 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function TimeAgo({ isoString }: { isoString: string | null }) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return <span className="text-emerald-600">just now</span>;
  if (minutes < 60) return <span className="text-emerald-600">{minutes}m ago</span>;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return <span className="text-gray-500">{hours}h ago</span>;
  const days = Math.floor(hours / 24);
  return <span className="text-gray-400">{days}d ago</span>;
}

function ReputationCard({ reputation }: { reputation: OracleReputation }) {
  const badge = getScoreBadge(reputation.overall_score);
  const provider = reputation.provider as OracleProvider;
  const color = oracleColors[provider] || '#888888';

  return (
    <Link
      href={`/reputation/${encodeURIComponent(provider)}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              {providerNames[provider] || provider}
            </h3>
            <p className="text-xs text-gray-500">{provider}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
          {reputation.last_calculated_at && reputation.overall_score > 0 && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5 whitespace-nowrap">
              <History className="w-2.5 h-2.5" />
              <TimeAgo isoString={reputation.last_calculated_at} />
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span
            className="text-2xl font-bold font-mono"
            style={{ color: getScoreColor(reputation.overall_score) }}
          >
            {reputation.overall_score.toFixed(0)}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${badge.bgClass} ${badge.textClass}`}
          >
            {badge.label}
          </span>
        </div>
      </div>

      <ScoreBar
        value={reputation.overall_score}
        maxValue={100}
        color={getScoreColor(reputation.overall_score)}
      />

      {reputation.overall_score > 0 && (
        <p className="text-[10px] text-gray-400 mt-1.5">
          Based on {reputation.total_queries} queries over the past 7 days
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Target className="w-3 h-3 text-blue-400" />
          <span className="text-gray-500">Accuracy</span>
          <span className="font-mono font-medium text-gray-700">
            {reputation.accuracy_score.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span className="text-gray-500">Uptime</span>
          <span className="font-mono font-medium text-gray-700">
            {reputation.uptime_percentage.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-purple-400" />
          <span className="text-gray-500">Latency</span>
          <span className="font-mono font-medium text-gray-700">{reputation.avg_latency_ms}ms</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Database className="w-3 h-3 text-cyan-400" />
          <span className="text-gray-500">Symbols</span>
          <span className="font-mono font-medium text-gray-700">
            {reputation.supported_symbols_count}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ReputationContentInner() {
  const { data, isLoading, error } = useReputations();

  const reputations = useMemo(() => data?.data ?? [], [data?.data]);
  const isCalculating = data?.calculating ?? false;
  const calcMessage = data?.message;

  const sortedReputations = useMemo(() => {
    if (!reputations) return [];
    return [...reputations].sort((a, b) => b.overall_score - a.overall_score);
  }, [reputations]);

  const allUnrated = reputations.length > 0 && reputations.every((r) => r.overall_score <= 0);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Award className="w-7 h-7 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Oracle Reputation</h1>
            <p className="text-sm text-gray-500 mt-1">
              Persistent reliability scoring and historical performance tracking for all oracle
              providers
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 mb-1">
              How does this differ from Cross-Oracle Ranking?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-amber-700">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                <span>
                  <strong>Cross-Oracle:</strong> Real-time snapshot of current prices — per symbol,
                  per query
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <span>
                  <strong>Reputation:</strong> Rolling 7-day aggregate across all symbols — stores
                  every result in database
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                <span>Disappears on page refresh</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <span>Scores persist and evolve over time, updated every 6 hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCalculating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              {calcMessage || 'Recalculation in progress...'}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Pulling data from all oracle providers. Scores will update automatically here.
            </p>
          </div>
        </div>
      )}

      {allUnrated && !isCalculating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center gap-3">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedReputations.map((rep) => (
            <ReputationCard key={rep.provider} reputation={rep} />
          ))}
        </div>
      )}

      {!isLoading && !error && sortedReputations.length === 0 && !isCalculating && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Award className="w-12 h-12 mb-4 text-gray-300" />
          <p className="text-sm font-medium">Initializing...</p>
          <p className="text-xs mt-1">
            The system is preparing to collect reputation data automatically.
          </p>
        </div>
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
