'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import {
  ArrowLeft,
  Target,
  Clock,
  TrendingUp,
  Shield,
  Database,
  AlertTriangle,
  Activity,
  Zap,
  History,
} from 'lucide-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { useReputationDetail } from '@/hooks/data/useReputations';
import { oracleColors, providerNames } from '@/lib/constants';
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

function TimeAgo({ isoString }: { isoString: string | null }) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return <span className="text-emerald-600">just now</span>;
  if (minutes < 60) return <span>{minutes}m ago</span>;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return <span>{hours}h ago</span>;
  const days = Math.floor(hours / 24);
  return <span>{days}d ago</span>;
}

function RadialScore({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score / 100, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ marginTop: '-64px' }}>
        <span className="text-lg font-bold font-mono" style={{ color: getScoreColor(score) }}>
          {score.toFixed(0)}
        </span>
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function MetricRow({
  icon: Icon,
  label,
  value,
  suffix = '',
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  suffix?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <span className="text-sm text-gray-600 flex-1">{label}</span>
      <span
        className="text-sm font-mono font-semibold text-gray-900"
        style={color ? { color } : undefined}
      >
        {typeof value === 'number' ? value.toFixed(1) : value}
        {suffix}
      </span>
    </div>
  );
}

function ProviderReputationContentInner({ provider }: { provider: string }) {
  const { data: reputation, isLoading, error } = useReputationDetail(provider);

  const providerName = providerNames[provider as OracleProvider] || provider;
  const color = oracleColors[provider as OracleProvider] || '#888888';

  const badge = useMemo(
    () => (reputation ? getScoreBadge(reputation.overall_score) : getScoreBadge(0)),
    [reputation]
  );

  if (isLoading) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary-500 animate-pulse" />
            <span className="text-sm text-gray-500">Loading reputation data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reputation) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
        <Link
          href="/reputation"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reputation
        </Link>
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <AlertTriangle className="w-12 h-12 mb-4 text-amber-300" />
          <p className="text-sm font-medium">No data for {providerName}</p>
          <p className="text-xs mt-1">
            Reputation data is generated automatically. Scores appear after the first calculation
            run.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <Link
        href="/reputation"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Reputation
      </Link>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-[400px] lg:flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6 lg:sticky lg:top-20">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{providerName}</h1>
                <p className="text-xs text-gray-500">{provider}</p>
              </div>
            </div>

            <div className="flex items-center justify-center mb-6">
              <div className="text-center">
                <span
                  className="text-5xl font-bold font-mono"
                  style={{ color: getScoreColor(reputation.overall_score) }}
                >
                  {reputation.overall_score.toFixed(0)}
                </span>
                <span
                  className={`block mt-2 text-sm font-medium px-3 py-1 rounded-full mx-auto w-fit ${badge.bgClass} ${badge.textClass}`}
                >
                  {badge.label}
                </span>
                <p className="text-xs text-gray-500 mt-2">Overall Reputation Score</p>
                {reputation.last_calculated_at && reputation.overall_score > 0 && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                    <History className="w-3 h-3" />
                    Updated <TimeAgo isoString={reputation.last_calculated_at} />
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <RadialScore score={reputation.accuracy_score} label="Accuracy" />
              <RadialScore score={reputation.uptime_percentage} label="Uptime" />
              <RadialScore score={reputation.reliability_score} label="Reliability" />
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-0">
              <MetricRow
                icon={Target}
                label="Accuracy Score"
                value={reputation.accuracy_score}
                suffix="%"
              />
              <MetricRow
                icon={Shield}
                label="Reliability Score"
                value={reputation.reliability_score}
                suffix="%"
              />
              <MetricRow
                icon={TrendingUp}
                label="Uptime"
                value={reputation.uptime_percentage}
                suffix="%"
              />
              <MetricRow
                icon={Zap}
                label="Freshness Score"
                value={reputation.freshness_score}
                suffix="%"
              />
              <MetricRow
                icon={Clock}
                label="Avg Latency"
                value={reputation.avg_latency_ms}
                suffix="ms"
              />
              <MetricRow
                icon={Activity}
                label="Avg Deviation"
                value={reputation.avg_deviation_pct.toFixed(3)}
                suffix="%"
                color={reputation.avg_deviation_pct > 0.5 ? '#ef4444' : '#10b981'}
              />
              <MetricRow
                icon={Database}
                label="Supported Symbols"
                value={reputation.supported_symbols_count}
              />
              <MetricRow
                icon={Database}
                label="Supported Chains"
                value={reputation.supported_chains_count}
              />
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-700">
                  Total Queries: {reputation.total_queries}
                  {reputation.failed_queries > 0 && (
                    <span className="text-red-500 ml-2">({reputation.failed_queries} failed)</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              How the Reputation Score is Calculated
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              Unlike the real-time ranking in Cross-Oracle comparison (which reflects only the
              current moment), this score is a{' '}
              <strong className="text-gray-800">rolling 7-day aggregate</strong> based on{' '}
              <strong className="text-gray-800">
                {reputation.total_queries} historical queries
              </strong>
              . New data is automatically collected every 6 hours and the score evolves over time.
            </p>

            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Score Composition</h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-gray-600 flex-shrink-0">Accuracy</span>
                  <div className="w-full bg-gray-100 rounded-full h-2 flex-1">
                    <div className="h-2 rounded-full bg-blue-400" style={{ width: '25%' }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">25%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-gray-600 flex-shrink-0">Uptime</span>
                  <div className="w-full bg-gray-100 rounded-full h-2 flex-1">
                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: '20%' }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">20%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-gray-600 flex-shrink-0">Reliability</span>
                  <div className="w-full bg-gray-100 rounded-full h-2 flex-1">
                    <div className="h-2 rounded-full bg-violet-400" style={{ width: '20%' }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">20%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-gray-600 flex-shrink-0">Freshness</span>
                  <div className="w-full bg-gray-100 rounded-full h-2 flex-1">
                    <div className="h-2 rounded-full bg-amber-400" style={{ width: '15%' }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">15%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-gray-600 flex-shrink-0">Latency</span>
                  <div className="w-full bg-gray-100 rounded-full h-2 flex-1">
                    <div className="h-2 rounded-full bg-cyan-400" style={{ width: '10%' }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">10%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-xs text-gray-600 flex-shrink-0">Deviation</span>
                  <div className="w-full bg-gray-100 rounded-full h-2 flex-1">
                    <div className="h-2 rounded-full bg-rose-400" style={{ width: '10%' }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">10%</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
              <p className="text-xs text-amber-700 font-medium mb-1">Historical Trend Charts</p>
              <p className="text-xs text-amber-600">
                Trend graphics showing score evolution over time become available after accumulating
                multiple data points across several days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProviderReputationContent({ provider }: { provider: string }) {
  return (
    <ErrorBoundary level="page" componentName={`ProviderReputation-${provider}`}>
      <ProviderReputationContentInner provider={provider} />
    </ErrorBoundary>
  );
}
