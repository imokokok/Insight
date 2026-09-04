'use client';

import { useState } from 'react';

import {
  Target,
  Clock,
  TrendingUp,
  Shield,
  Activity,
  Zap,
  History,
  Award,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  Globe,
  Sparkles,
} from 'lucide-react';

import {
  OracleLogo,
  ScoreRing,
  MiniRing,
  MetricRow,
} from '@/app/reputation/components/ReputationShared';
import { PROVIDER_PROFILES } from '@/app/reputation/constants/providerProfiles';
import type { OracleReputation } from '@/lib/oracles/services/reputationService';
import {
  type getScoreBadge,
  type formatTimeAgo,
  SCORE_WEIGHTS,
} from '@/lib/oracles/utils/reputationUtils';
import { cn } from '@/lib/utils';
import { type OracleProvider } from '@/types/oracle';

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

export function ProviderProfile({ provider }: { provider: string }) {
  const profile = PROVIDER_PROFILES[provider as OracleProvider];
  if (!profile) return null;

  return (
    <section className="border-y border-slate-900/15 bg-white/45 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="border border-blue-200 bg-blue-50 p-1.5">
          <Sparkles className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="text-sm font-black text-gray-900">Provider Profile</h2>
      </div>

      <p className="text-xs text-gray-500 font-semibold mb-2">{profile.tagline}</p>

      <p className="text-[13px] text-gray-600 leading-relaxed mb-4">{profile.description}</p>

      <div className="grid grid-cols-4 gap-0 divide-x divide-gray-100 border-t border-b border-gray-100 py-3 mb-4">
        {profile.features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.label} className="flex flex-col items-center first:pl-0 last:pr-0 px-1">
              <Icon className="w-3.5 h-3.5 text-gray-400 mb-1" />
              <span className="text-[13px] font-black text-gray-800 font-mono">{f.value}</span>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                {f.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {profile.highlights.map((h) => (
          <span
            key={h}
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-100"
          >
            {h}
          </span>
        ))}
      </div>
    </section>
  );
}

export function ScoreBreakdown({
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
    <section className="border-y border-slate-900/15 bg-white/45 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="border border-blue-200 bg-blue-50 p-1.5">
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-sm font-black text-gray-900">Score Composition</h2>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide score methodology' : 'Show score methodology'}
          className="p-1 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
        . Updated automatically every 15 minutes.
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
                title: 'Accuracy (30%)',
                desc: 'Proximity to consensus price with consistency bonus',
              },
              { color: 'bg-emerald-400', title: 'Uptime (20%)', desc: 'Successful response rate' },
              {
                color: 'bg-blue-700',
                title: 'Reliability (20%)',
                desc: 'Consistency of performance with stability bonus',
              },
              { color: 'bg-amber-400', title: 'Freshness (15%)', desc: 'Data update frequency' },
              {
                color: 'bg-slate-500',
                title: 'Latency (10%)',
                desc: 'Response speed (baseline-normalized per provider)',
              },
              {
                color: 'bg-red-500',
                title: 'Deviation (5%)',
                desc: 'Price deviation from consensus (unified curve)',
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
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="border-l-2 border-blue-600 bg-blue-50/35 p-5">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 border border-blue-200 bg-blue-50 p-1.5">
          <Info className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-sm text-gray-600">
          <p className="font-black text-gray-900 mb-2">How scores are calculated (V4)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {[
              {
                color: 'bg-blue-400',
                title: 'Accuracy (30%)',
                desc: 'Proximity to consensus price with consistency bonus',
              },
              { color: 'bg-emerald-400', title: 'Uptime (20%)', desc: 'Successful response rate' },
              {
                color: 'bg-blue-700',
                title: 'Reliability (20%)',
                desc: 'Consistency of performance with stability bonus',
              },
              { color: 'bg-amber-400', title: 'Freshness (15%)', desc: 'Data update frequency' },
              {
                color: 'bg-slate-500',
                title: 'Latency (10%)',
                desc: 'Response speed (baseline-normalized per provider)',
              },
              {
                color: 'bg-red-500',
                title: 'Deviation (5%)',
                desc: 'Price deviation from consensus (unified curve)',
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
          <p className="text-[11px] text-gray-500 mt-3 pt-3 border-t border-gray-100">
            <strong className="text-gray-700">Fair scoring principles:</strong> All providers are
            evaluated with unified deviation and latency penalty formulas. Each provider has a
            baseline latency reflecting its architecture (onchain: 1000-1500ms, API: 350-500ms), but
            the scoring curve is identical. A sample size confidence factor reduces scores when data
            points are insufficient, and coverage bonus rewards providers tested across more
            symbols.
          </p>
        </div>
      </div>
    </section>
  );
}

export function Sidebar({
  reputation,
  provider,
  providerName,
  badge,
  timeAgo,
}: {
  reputation: OracleReputation;
  provider: string;
  providerName: string;
  badge: ReturnType<typeof getScoreBadge>;
  timeAgo: ReturnType<typeof formatTimeAgo>;
}) {
  return (
    <aside>
      <div className="border-y border-slate-900/15 bg-white/45 p-5 lg:sticky lg:top-24">
        <div className="mb-4 flex items-center justify-between border-b border-slate-900/15 pb-3">
          <p className="editorial-index">01 — Read the score</p>
          <span className="font-mono text-[10px] text-slate-400">7 DAYS</span>
        </div>
        <div className="flex items-center gap-3 mb-5">
          <OracleLogo provider={provider as OracleProvider} size={36} />
          <div>
            <h2 className="text-xl font-black text-gray-900">{providerName}</h2>
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wide">
              {provider}
            </p>
          </div>
        </div>

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

        <div className="grid grid-cols-3 gap-2 mb-5">
          <MiniRing score={reputation.accuracy_score} label="Accuracy" />
          <MiniRing score={reputation.uptime_percentage} label="Uptime" />
          <MiniRing score={reputation.reliability_score} label="Reliability" />
        </div>

        <div className="border-y border-slate-900/10 bg-gray-50/80 p-3.5">
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
            color="#2563eb"
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
            maxVal={2000}
            color="#06b6d4"
            weight={10}
            invert
          />
          <MetricRow
            icon={Activity}
            label="Avg Deviation"
            value={reputation.avg_deviation_pct.toFixed(3)}
            suffix="%"
            maxVal={5}
            color={reputation.avg_deviation_pct > 0.5 ? '#ef4444' : '#10b981'}
            weight={10}
            invert
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

        <div className="mt-3 flex items-center justify-between border-l-2 border-blue-600 bg-blue-50/80 px-3.5 py-2.5">
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
    </aside>
  );
}
