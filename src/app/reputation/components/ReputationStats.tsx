'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';

import Link from 'next/link';

import { Crown, Medal, Clock, Gauge, Database, Timer, Info, type LucideIcon } from 'lucide-react';

import { OracleLogo, ScoreRing } from '@/app/reputation/components/ReputationShared';
import { oracleColors, providerNames } from '@/lib/constants';
import type { OracleReputation } from '@/lib/oracles/services/reputationService';
import { getScoreColor } from '@/lib/oracles/utils/reputationUtils';
import { cn } from '@/lib/utils';
import { type OracleProvider } from '@/types/oracle';

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  const targetRef = useRef(target);
  const valueRef = useRef(0);

  useLayoutEffect(() => {
    valueRef.current = value;
  });

  useEffect(() => {
    fromRef.current = valueRef.current;
    targetRef.current = target;
    startRef.current = null;
    let raf: number;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(fromRef.current + (targetRef.current - fromRef.current) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function GlobalStats({ reputations }: { reputations: OracleReputation[] }) {
  const rated = reputations.filter((r) => r.overall_score > 0);
  const avgScore =
    rated.length > 0 ? rated.reduce((s, r) => s + r.overall_score, 0) / rated.length : 0;
  const top =
    rated.length > 0
      ? rated.reduce((b, r) => (r.overall_score > b.overall_score ? r : b), rated[0])
      : null;
  const avgLatency =
    rated.length > 0
      ? Math.round(rated.reduce((s, r) => s + r.avg_latency_ms, 0) / rated.length)
      : 0;
  const totalQueries = rated.reduce((s, r) => s + r.total_queries, 0);

  const avgScoreAnim = useCountUp(avgScore);
  const avgLatencyAnim = useCountUp(avgLatency);
  const totalQueriesAnim = useCountUp(totalQueries);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={Gauge}
        gradient="from-blue-500 to-indigo-600"
        label="Average Score"
        value={avgScoreAnim.toFixed(1)}
        sub={`${rated.length} rated providers`}
        valueColor={getScoreColor(avgScore)}
      />
      <StatCard
        icon={Crown}
        gradient="from-amber-400 to-orange-500"
        label="Top Provider"
        value={top ? providerNames[top.provider as OracleProvider] || top.provider : '--'}
        sub={top ? `Score ${top.overall_score.toFixed(0)}` : undefined}
        topProvider={top ? (top.provider as OracleProvider) : undefined}
      />
      <StatCard
        icon={Timer}
        gradient="from-cyan-400 to-blue-500"
        label="Average Latency"
        value={`${avgLatencyAnim.toFixed(0)}ms`}
        sub="response time"
      />
      <StatCard
        icon={Database}
        gradient="from-emerald-400 to-teal-600"
        label="Total Queries"
        value={Math.round(totalQueriesAnim).toLocaleString()}
        sub="7-day aggregate"
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  gradient,
  label,
  value,
  sub,
  valueColor,
  topProvider,
}: {
  icon: LucideIcon;
  gradient: string;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  topProvider?: OracleProvider;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-4 hover:shadow-sm transition-all duration-200">
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br shadow-sm',
            gradient
          )}
        >
          {topProvider ? (
            <OracleLogo provider={topProvider} size={20} />
          ) : (
            <Icon className="w-4 h-4 text-white" />
          )}
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p
        className="text-xl font-black font-mono tracking-tight"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{sub}</p>}
    </div>
  );
}

function TopThree({ reputations }: { reputations: OracleReputation[] }) {
  const top3 = reputations.slice(0, 3);
  if (top3.length === 0) return null;

  const positions = [
    {
      rank: 2,
      className: 'order-1',
      height: 'h-48',
      crown: <Medal className="w-5 h-5 text-slate-400" />,
    },
    {
      rank: 1,
      className: 'order-2',
      height: 'h-60',
      crown: <Crown className="w-7 h-7 text-amber-500" />,
    },
    {
      rank: 3,
      className: 'order-3',
      height: 'h-40',
      crown: <Medal className="w-5 h-5 text-orange-400" />,
    },
  ];

  return (
    <div className="flex items-end justify-center gap-4 md:gap-6 py-2">
      {positions.map((pos) => {
        const rep = top3[pos.rank - 1];
        if (!rep) return null;
        const provider = rep.provider as OracleProvider;
        const color = oracleColors[provider] || '#888888';
        return (
          <Link
            key={provider}
            href={`/reputation/${encodeURIComponent(provider)}`}
            className={cn('flex flex-col items-center group', pos.className)}
          >
            <div className="mb-2">{pos.crown}</div>
            <div className="mb-2">
              <OracleLogo provider={provider} size={pos.rank === 1 ? 32 : 28} />
            </div>
            <div className="mb-2">
              <ScoreRing score={rep.overall_score} size={pos.rank === 1 ? 80 : 64} />
            </div>
            <div className="text-center mb-2">
              <div className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                {providerNames[provider] || provider}
              </div>
              <div className="text-[10px] text-gray-400 font-mono">
                {rep.total_queries.toLocaleString()} queries
              </div>
            </div>
            <div
              className={cn(
                'w-20 md:w-28 rounded-t-xl transition-all duration-300 group-hover:opacity-90',
                pos.height
              )}
              style={{
                background: `linear-gradient(to top, ${color}25, ${color}08)`,
                borderTop: `2px solid ${color}`,
              }}
            />
          </Link>
        );
      })}
    </div>
  );
}

function NextUpdateCountdown({ nextRecalcAt }: { nextRecalcAt: string | null | undefined }) {
  const computeRemaining = useCallback(() => {
    if (!nextRecalcAt) return '';
    const diff = new Date(nextRecalcAt).getTime() - Date.now();
    if (diff <= 0) return 'soon';
    const m = Math.floor(diff / 60000);
    if (m < 1) return '<1m';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }, [nextRecalcAt]);

  const [remaining, setRemaining] = useState(computeRemaining);

  useEffect(() => {
    if (!nextRecalcAt) return;
    const t = setInterval(() => setRemaining(computeRemaining), 30000);
    return () => clearInterval(t);
  }, [nextRecalcAt, computeRemaining]);

  if (!nextRecalcAt || !remaining) return null;
  return (
    <span className="text-[11px] text-gray-400 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 font-medium">
      <Clock className="w-3 h-3" />
      Next update in {remaining}
    </span>
  );
}

function ComparisonInfo() {
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-4">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-blue-50 flex-shrink-0">
          <Info className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-sm text-gray-600">
          <p className="font-bold text-gray-900 mb-1.5">
            How does this differ from Cross-Oracle Ranking?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0 mt-1.5" />
              <span>
                <strong className="text-gray-800">Cross-Oracle:</strong> Real-time snapshot — per
                symbol, per query
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
              <span>
                <strong className="text-gray-800">Reputation:</strong> Rolling 7-day aggregate
                across all symbols
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0 mt-1.5" />
              <span>Disappears on page refresh</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
              <span>Persists in database, updated every hour</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { useCountUp, GlobalStats, StatCard, TopThree, NextUpdateCountdown, ComparisonInfo };
