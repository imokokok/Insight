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
  Activity,
  Zap,
  History,
  Award,
  BarChart3,
  Info,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

import { ErrorBoundary } from '@/components/error-boundary';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { useReputationDetail } from '@/hooks/data/useReputations';
import { oracleColors, providerNames } from '@/lib/constants';
import type { ReputationTrendPoint } from '@/lib/oracles/services/reputationService';
import {
  getScoreColor,
  getScoreBadge,
  formatTimeAgo,
  SCORE_WEIGHTS,
} from '@/lib/oracles/utils/reputationUtils';
import { type OracleProvider } from '@/types/oracle';

function RadialScore({
  score,
  label,
  size = 90,
  strokeWidth = 5,
}: {
  score: number;
  label: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score / 100, 1);
  const offset = circumference * (1 - progress);
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1.5">
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
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold font-mono" style={{ color }}>
            {score.toFixed(0)}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-500">{label}</span>
    </div>
  );
}

function MetricBar({
  icon: Icon,
  label,
  value,
  suffix = '',
  maxVal,
  color,
  weight,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  suffix?: string;
  maxVal?: number;
  color: string;
  weight?: number;
}) {
  const numVal = typeof value === 'number' ? value : parseFloat(String(value));
  const pct = maxVal ? Math.min((numVal / maxVal) * 100, 100) : 0;

  return (
    <div className="py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-600">{label}</span>
          {weight !== undefined && (
            <span className="text-[10px] text-gray-400 bg-gray-50 px-1 py-0.5 rounded">
              {weight}%
            </span>
          )}
        </div>
        <span className="text-sm font-mono font-semibold" style={color ? { color } : undefined}>
          {typeof value === 'number' ? value.toFixed(1) : value}
          {suffix}
        </span>
      </div>
      {maxVal ? (
        <div className="w-full bg-gray-100 rounded-full h-1.5 ml-5">
          <div
            className="h-1.5 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, backgroundColor: color || '#3b82f6' }}
          />
        </div>
      ) : null}
    </div>
  );
}

function TrendChart({
  trend,
  providerColor,
}: {
  trend: ReputationTrendPoint[];
  providerColor: string;
}) {
  if (trend.length < 2) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Performance Trend</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <BarChart3 className="w-8 h-8 mb-2" />
          <p className="text-xs">Trend charts appear after accumulating multiple data points</p>
          <p className="text-[10px] text-gray-300 mt-1">Data is collected every 6 hours</p>
        </div>
      </div>
    );
  }

  const chartData = trend.map((point) => ({
    date: point.snapshot_time,
    successRate: Number(point.success_rate.toFixed(1)),
    deviation: Number(point.avg_deviation_pct.toFixed(4)),
    latency: point.avg_latency_ms,
    queries: point.query_count,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Performance Trend</h3>
        </div>
        <span className="text-[10px] text-gray-400">{trend.length} data points</span>
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
            Success Rate
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <RechartsTooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
              />
              <Area
                type="monotone"
                dataKey="successRate"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#successGradient)"
                name="Success %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
            Avg Deviation (%)
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="deviationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <RechartsTooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
              />
              <Area
                type="monotone"
                dataKey="deviation"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#deviationGradient)"
                name="Deviation %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
            Avg Latency (ms)
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <RechartsTooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
              />
              <Line
                type="monotone"
                dataKey="latency"
                stroke={providerColor}
                strokeWidth={2}
                dot={{ r: 3, fill: providerColor }}
                name="Latency ms"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function RadarChart({
  accuracy,
  uptime,
  reliability,
  freshness,
  latencyScore,
  deviationScore,
}: {
  accuracy: number;
  uptime: number;
  reliability: number;
  freshness: number;
  latencyScore: number;
  deviationScore: number;
}) {
  const axes = [
    { label: 'Accuracy', value: accuracy, angle: -90 },
    { label: 'Uptime', value: uptime, angle: -30 },
    { label: 'Reliability', value: reliability, angle: 30 },
    { label: 'Freshness', value: freshness, angle: 90 },
    { label: 'Latency', value: latencyScore, angle: 150 },
    { label: 'Deviation', value: deviationScore, angle: -150 },
  ];

  const size = 200;
  const center = size / 2;
  const maxRadius = 75;

  const getPoint = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const levels = [0.25, 0.5, 0.75, 1.0];

  const dataPoints = axes.map((axis) => getPoint(axis.angle, (axis.value / 100) * maxRadius));
  const polygonPath = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {levels.map((level, i) => {
          const points = axes.map((axis) => getPoint(axis.angle, level * maxRadius));
          const path = points.map((p) => `${p.x},${p.y}`).join(' ');
          return (
            <polygon
              key={i}
              points={path}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={1}
              opacity={0.6}
            />
          );
        })}
        {axes.map((axis, i) => {
          const outer = getPoint(axis.angle, maxRadius);
          const labelPos = getPoint(axis.angle, maxRadius + 18);
          return (
            <g key={i}>
              <line
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="#e5e7eb"
                strokeWidth={0.5}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[9px] fill-gray-500"
              >
                {axis.label}
              </text>
            </g>
          );
        })}
        <polygon
          points={polygonPath}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3b82f6"
          strokeWidth={2}
        />
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#3b82f6" />
        ))}
      </svg>
    </div>
  );
}

function ProviderReputationContentInner({ provider }: { provider: string }) {
  const { data, isLoading, error } = useReputationDetail(provider, {
    includeTrend: true,
    trendDays: 30,
  });

  const providerName = providerNames[provider as OracleProvider] || provider;
  const color = oracleColors[provider as OracleProvider] || '#888888';

  const reputation = data?.reputation ?? null;
  const trend = data?.trend ?? [];

  const badge = useMemo(
    () => (reputation ? getScoreBadge(reputation.overall_score) : getScoreBadge(0)),
    [reputation]
  );

  const timeAgo = formatTimeAgo(reputation?.last_calculated_at ?? null);

  const latencyScore = reputation ? Math.max(0, 100 - reputation.avg_latency_ms / 10) : 0;
  const deviationScore = reputation ? Math.max(0, 100 - reputation.avg_deviation_pct * 100) : 0;

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
        <EmptyStateEnhanced
          type="data"
          title={`No data for ${providerName}`}
          description="Reputation data is generated automatically. Scores appear after the first calculation run."
          size="lg"
          variant="page"
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <Link
        href="/reputation"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Reputation
      </Link>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-[380px] lg:flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6 lg:sticky lg:top-20">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 0 2px white, 0 0 0 4px ${color}33`,
                }}
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{providerName}</h1>
                <p className="text-xs text-gray-400 font-mono">{provider}</p>
              </div>
            </div>

            <div className="flex items-center justify-center mb-5">
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg width={140} height={140} className="transform -rotate-90">
                    <circle cx={70} cy={70} r={60} fill="none" stroke="#e5e7eb" strokeWidth={8} />
                    <circle
                      cx={70}
                      cy={70}
                      r={60}
                      fill="none"
                      stroke={getScoreColor(reputation.overall_score)}
                      strokeWidth={8}
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 60}
                      strokeDashoffset={
                        2 * Math.PI * 60 * (1 - Math.min(reputation.overall_score / 100, 1))
                      }
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className="text-4xl font-bold font-mono"
                      style={{ color: getScoreColor(reputation.overall_score) }}
                    >
                      {reputation.overall_score.toFixed(0)}
                    </span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center mt-2 text-sm font-medium px-3 py-1 rounded-full ${badge.bgClass} ${badge.textClass}`}
                >
                  {badge.label}
                </span>
                <p className="text-xs text-gray-500 mt-2">Overall Reputation Score</p>
                {timeAgo && (
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center justify-center gap-1">
                    <History className="w-3 h-3" />
                    Updated <span className={timeAgo.color}>{timeAgo.text}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <RadialScore score={reputation.accuracy_score} label="Accuracy" />
              <RadialScore score={reputation.uptime_percentage} label="Uptime" />
              <RadialScore score={reputation.reliability_score} label="Reliability" />
            </div>

            <div className="bg-gray-50/80 rounded-lg p-3 space-y-0">
              <MetricBar
                icon={Target}
                label="Accuracy"
                value={reputation.accuracy_score}
                suffix="%"
                maxVal={100}
                color="#3b82f6"
                weight={25}
              />
              <MetricBar
                icon={TrendingUp}
                label="Uptime"
                value={reputation.uptime_percentage}
                suffix="%"
                maxVal={100}
                color="#10b981"
                weight={20}
              />
              <MetricBar
                icon={Shield}
                label="Reliability"
                value={reputation.reliability_score}
                suffix="%"
                maxVal={100}
                color="#8b5cf6"
                weight={20}
              />
              <MetricBar
                icon={Zap}
                label="Freshness"
                value={reputation.freshness_score}
                suffix="%"
                maxVal={100}
                color="#f59e0b"
                weight={15}
              />
              <MetricBar
                icon={Clock}
                label="Latency"
                value={reputation.avg_latency_ms}
                suffix="ms"
                color="#06b6d4"
                weight={10}
              />
              <MetricBar
                icon={Activity}
                label="Avg Deviation"
                value={reputation.avg_deviation_pct.toFixed(3)}
                suffix="%"
                color={reputation.avg_deviation_pct > 0.5 ? '#ef4444' : '#10b981'}
                weight={10}
              />
              <MetricBar
                icon={Database}
                label="Symbols"
                value={reputation.supported_symbols_count}
                color="#6b7280"
              />
              <MetricBar
                icon={Database}
                label="Chains"
                value={reputation.supported_chains_count}
                color="#6b7280"
              />
            </div>

            <div className="mt-4 flex items-center justify-between px-3 py-2 bg-blue-50/80 rounded-lg">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs text-blue-700 font-medium">
                  {reputation.total_queries} queries
                </span>
              </div>
              {reputation.failed_queries > 0 && (
                <span className="text-xs text-red-500 font-medium">
                  {reputation.failed_queries} failed
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Score Composition</h2>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Rolling 7-day aggregate based on{' '}
              <strong className="text-gray-800">
                {reputation.total_queries} historical queries
              </strong>
              . Updated automatically every 6 hours.
            </p>

            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-shrink-0">
                <RadarChart
                  accuracy={reputation.accuracy_score}
                  uptime={reputation.uptime_percentage}
                  reliability={reputation.reliability_score}
                  freshness={reputation.freshness_score}
                  latencyScore={latencyScore}
                  deviationScore={deviationScore}
                />
              </div>

              <div className="flex-1 w-full space-y-3">
                {SCORE_WEIGHTS.map((item) => {
                  const scoreMap: Record<string, number> = {
                    accuracy: reputation.accuracy_score,
                    uptime: reputation.uptime_percentage,
                    reliability: reputation.reliability_score,
                    freshness: reputation.freshness_score,
                    latency: latencyScore,
                    deviation: deviationScore,
                  };
                  const score = scoreMap[item.key] ?? 0;

                  return (
                    <div key={item.key} className="flex items-center gap-3">
                      <span className="w-20 text-xs text-gray-600 flex-shrink-0 font-medium">
                        {item.label}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 relative">
                        <div
                          className="h-2 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(score, 100)}%`, backgroundColor: item.color }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right font-mono">
                        {item.weight}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <TrendChart trend={trend} providerColor={color} />

          <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600">
                <p className="font-semibold text-slate-800 mb-1.5">How scores are calculated</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <span>
                      <strong>Accuracy (25%):</strong> Proximity to consensus price
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span>
                      <strong>Uptime (20%):</strong> Successful response rate
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                    <span>
                      <strong>Reliability (20%):</strong> Consistency of performance
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    <span>
                      <strong>Freshness (15%):</strong> Data update frequency
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                    <span>
                      <strong>Latency (10%):</strong> Response speed
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                    <span>
                      <strong>Deviation (10%):</strong> Price deviation from consensus
                    </span>
                  </div>
                </div>
              </div>
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
