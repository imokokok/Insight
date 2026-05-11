'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import {
  ArrowLeft,
  Target,
  Clock,
  TrendingUp,
  Shield,
  Activity,
  Zap,
  History,
  Award,
  BarChart3,
  Info,
  Layers,
  Globe,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
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
import type {
  OracleReputation,
  ReputationTrendPoint,
} from '@/lib/oracles/services/reputationService';
import {
  getScoreColor,
  getScoreBadge,
  formatTimeAgo,
  SCORE_WEIGHTS,
} from '@/lib/oracles/utils/reputationUtils';
import { cn } from '@/lib/utils';
import { type OracleProvider } from '@/types/oracle';

/* ─── Score Ring ─── */

function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(score / 100, 1);
  const color = getScoreColor(score);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black font-mono tracking-tighter" style={{ color }}>
          {score.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

/* ─── Mini Ring ─── */

function MiniRing({ score, label, size = 64 }: { score: number; label: string; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(score / 100, 1);
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p)}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-black font-mono" style={{ color }}>
            {score.toFixed(0)}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ─── Metric Row ─── */

function MetricRow({
  icon: Icon,
  label,
  value,
  suffix = '',
  maxVal,
  color,
  weight,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  suffix?: string;
  maxVal?: number;
  color: string;
  weight?: number;
}) {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  const pct = maxVal ? Math.min((num / maxVal) * 100, 100) : 0;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-bold text-gray-700">{label}</span>
          {weight !== undefined && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
              {weight}%
            </span>
          )}
        </div>
        <span className="text-xs font-mono font-black" style={color ? { color } : undefined}>
          {typeof value === 'number' ? value.toFixed(1) : value}
          {suffix}
        </span>
      </div>
      {maxVal ? (
        <div className="w-full bg-gray-100 rounded-full h-1">
          <div
            className="h-1 rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ─── Charts ─── */

function TrendCharts({
  trend,
  providerColor,
}: {
  trend: ReputationTrendPoint[];
  providerColor: string;
}) {
  if (trend.length < 2) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm font-black text-gray-900">Performance Trend</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-14 text-gray-400">
          <Activity className="w-10 h-10 mb-3 text-gray-300" />
          <p className="text-sm font-bold">
            Trend charts appear after accumulating multiple data points
          </p>
          <p className="text-xs text-gray-300 mt-1">Data is collected every hour</p>
        </div>
      </div>
    );
  }

  const chartData = trend.map((p) => ({
    date: p.snapshot_time,
    successRate: Number(p.success_rate.toFixed(1)),
    deviation: Number(p.avg_deviation_pct.toFixed(4)),
    latency: p.avg_latency_ms,
    queries: p.query_count,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50">
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>
          <h3 className="text-sm font-black text-gray-900">Performance Trend</h3>
        </div>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
          {trend.length} data points
        </span>
      </div>

      <div className="space-y-6">
        <TrendArea
          title="Success Rate"
          data={chartData}
          dataKey="successRate"
          color="#10b981"
          gradientId="sG"
          yDomain={[0, 100]}
          unit="%"
        />
        <TrendArea
          title="Avg Deviation (%)"
          data={chartData}
          dataKey="deviation"
          color="#f59e0b"
          gradientId="dG"
          unit="%"
        />
        <TrendLine
          title="Avg Latency (ms)"
          data={chartData}
          dataKey="latency"
          color={providerColor}
          unit="ms"
        />
      </div>
    </div>
  );
}

function TrendArea({
  title,
  data,
  dataKey,
  color,
  gradientId,
  yDomain,
  unit,
}: {
  title: string;
  data: Array<Record<string, number | string>>;
  dataKey: string;
  color: string;
  gradientId: string;
  yDomain?: [number, number];
  unit: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.12} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
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
            domain={yDomain}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <RechartsTooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
            formatter={(value) => [`${value}${unit}`, '']}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            name={title}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendLine({
  title,
  data,
  dataKey,
  color,
  unit,
}: {
  title: string;
  data: Array<Record<string, number | string>>;
  dataKey: string;
  color: string;
  unit: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data}>
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
            width={36}
          />
          <RechartsTooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
            formatter={(value) => [`${value}${unit}`, '']}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 2.5, fill: color, strokeWidth: 1.5, stroke: '#fff' }}
            name={title}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Radar ─── */

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
  const maxRadius = 72;

  const getPoint = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: center + radius * Math.cos(rad), y: center + radius * Math.sin(rad) };
  };

  const levels = [0.25, 0.5, 0.75, 1.0];
  const dataPoints = axes.map((a) => getPoint(a.angle, (a.value / 100) * maxRadius));
  const polygonPath = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {levels.map((level, i) => {
          const points = axes.map((a) => getPoint(a.angle, level * maxRadius));
          return (
            <polygon
              key={i}
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={1}
              opacity={0.5}
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
                className="text-[9px] fill-gray-500 font-black"
              >
                {axis.label}
              </text>
            </g>
          );
        })}
        <polygon
          points={polygonPath}
          fill="rgba(59, 130, 246, 0.06)"
          stroke="#3b82f6"
          strokeWidth={2}
        />
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#3b82f6" stroke="white" strokeWidth={1.5} />
        ))}
      </svg>
    </div>
  );
}

/* ─── Score Breakdown ─── */

function ScoreBreakdown({
  reputation,
  latencyScore,
  deviationScore,
}: {
  reputation: OracleReputation;
  latencyScore: number;
  deviationScore: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-50">
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <h2 className="text-sm font-black text-gray-900">Score Composition</h2>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
      <p className="text-xs text-gray-600 mb-4">
        Rolling 7-day aggregate based on{' '}
        <strong className="text-gray-900">
          {reputation.total_queries.toLocaleString()} historical queries
        </strong>
        . Updated automatically every hour.
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
                <span className="w-16 text-xs text-gray-700 flex-shrink-0 font-black">
                  {item.label}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 relative">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(score, 100)}%`, backgroundColor: item.color }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-7 text-right font-mono font-black">
                  {item.weight}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {[
              {
                color: 'bg-blue-400',
                title: 'Accuracy (25%)',
                desc: 'Proximity to consensus price',
              },
              { color: 'bg-emerald-400', title: 'Uptime (20%)', desc: 'Successful response rate' },
              {
                color: 'bg-violet-400',
                title: 'Reliability (20%)',
                desc: 'Consistency of performance',
              },
              { color: 'bg-amber-400', title: 'Freshness (15%)', desc: 'Data update frequency' },
              { color: 'bg-cyan-400', title: 'Latency (10%)', desc: 'Response speed' },
              {
                color: 'bg-rose-400',
                title: 'Deviation (10%)',
                desc: 'Price deviation from consensus',
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-2">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', item.color)} />
                <span className="text-xs text-gray-600">
                  <strong className="text-gray-800">{item.title}:</strong> {item.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── How It Works ─── */

function HowItWorks() {
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-5">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-blue-50 flex-shrink-0">
          <Info className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-sm text-gray-600">
          <p className="font-black text-gray-900 mb-2">How scores are calculated</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {[
              {
                color: 'bg-blue-400',
                title: 'Accuracy (25%)',
                desc: 'Proximity to consensus price',
              },
              { color: 'bg-emerald-400', title: 'Uptime (20%)', desc: 'Successful response rate' },
              {
                color: 'bg-violet-400',
                title: 'Reliability (20%)',
                desc: 'Consistency of performance',
              },
              { color: 'bg-amber-400', title: 'Freshness (15%)', desc: 'Data update frequency' },
              { color: 'bg-cyan-400', title: 'Latency (10%)', desc: 'Response speed' },
              {
                color: 'bg-rose-400',
                title: 'Deviation (10%)',
                desc: 'Price deviation from consensus',
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-2">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', item.color)} />
                <span className="text-xs">
                  <strong className="text-gray-800">{item.title}:</strong> {item.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar ─── */

function Sidebar({
  reputation,
  provider,
  providerName,
  color,
  badge,
  timeAgo,
}: {
  reputation: OracleReputation;
  provider: string;
  providerName: string;
  color: string;
  badge: ReturnType<typeof getScoreBadge>;
  timeAgo: ReturnType<typeof formatTimeAgo>;
}) {
  return (
    <div className="lg:w-[380px] lg:flex-shrink-0">
      <div className="bg-white rounded-xl border border-gray-200/60 p-5 lg:sticky lg:top-20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${color}22` }}
          />
          <div>
            <h1 className="text-xl font-black text-gray-900">{providerName}</h1>
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wide">
              {provider}
            </p>
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center justify-center mb-5">
          <div className="text-center">
            <ScoreRing score={reputation.overall_score} />
            <span
              className={cn(
                'inline-flex items-center mt-2.5 text-xs font-black px-3 py-1 rounded-full',
                badge.bgClass,
                badge.textClass
              )}
            >
              {badge.label}
            </span>
            <p className="text-xs text-gray-500 mt-1.5 font-bold">Overall Reputation Score</p>
            {timeAgo && (
              <p className="text-[10px] text-gray-400 mt-1 flex items-center justify-center gap-1">
                <History className="w-3 h-3" />
                Updated <span className={timeAgo.color}>{timeAgo.text}</span>
              </p>
            )}
          </div>
        </div>

        {/* Sub Scores */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <MiniRing score={reputation.accuracy_score} label="Accuracy" />
          <MiniRing score={reputation.uptime_percentage} label="Uptime" />
          <MiniRing score={reputation.reliability_score} label="Reliability" />
        </div>

        {/* Metrics */}
        <div className="bg-gray-50/80 rounded-lg p-3.5 border border-gray-100">
          <MetricRow
            icon={Target}
            label="Accuracy"
            value={reputation.accuracy_score}
            suffix="%"
            maxVal={100}
            color="#3b82f6"
            weight={25}
          />
          <MetricRow
            icon={TrendingUp}
            label="Uptime"
            value={reputation.uptime_percentage}
            suffix="%"
            maxVal={100}
            color="#10b981"
            weight={20}
          />
          <MetricRow
            icon={Shield}
            label="Reliability"
            value={reputation.reliability_score}
            suffix="%"
            maxVal={100}
            color="#8b5cf6"
            weight={20}
          />
          <MetricRow
            icon={Zap}
            label="Freshness"
            value={reputation.freshness_score}
            suffix="%"
            maxVal={100}
            color="#f59e0b"
            weight={15}
          />
          <MetricRow
            icon={Clock}
            label="Latency"
            value={reputation.avg_latency_ms}
            suffix="ms"
            color="#06b6d4"
            weight={10}
          />
          <MetricRow
            icon={Activity}
            label="Avg Deviation"
            value={reputation.avg_deviation_pct.toFixed(3)}
            suffix="%"
            color={reputation.avg_deviation_pct > 0.5 ? '#ef4444' : '#10b981'}
            weight={10}
          />
          <MetricRow
            icon={Layers}
            label="Symbols"
            value={reputation.supported_symbols_count}
            color="#6b7280"
          />
          <MetricRow
            icon={Globe}
            label="Chains"
            value={reputation.supported_chains_count}
            color="#6b7280"
          />
        </div>

        {/* Query Stats */}
        <div className="mt-3 flex items-center justify-between px-3.5 py-2.5 bg-blue-50/80 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs text-blue-700 font-black">
              {reputation.total_queries.toLocaleString()} queries
            </span>
          </div>
          {reputation.failed_queries > 0 && (
            <span className="text-xs text-red-500 font-black">
              {reputation.failed_queries} failed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─── */

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
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-500 animate-pulse" />
            <span className="text-sm text-gray-500 font-black">Loading reputation data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reputation) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
        <Link
          href="/reputation"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 mb-6 group font-bold px-3 py-2 rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50/50 transition-all"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
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
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <Link
        href="/reputation"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 mb-6 group font-bold px-3 py-2 rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50/50 transition-all"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Reputation
      </Link>

      <div className="flex flex-col lg:flex-row gap-6">
        <Sidebar
          reputation={reputation}
          provider={provider}
          providerName={providerName}
          color={color}
          badge={badge}
          timeAgo={timeAgo}
        />

        <div className="flex-1 min-w-0 space-y-5">
          <ScoreBreakdown
            reputation={reputation}
            latencyScore={latencyScore}
            deviationScore={deviationScore}
          />

          <TrendCharts trend={trend} providerColor={color} />

          <HowItWorks />
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
