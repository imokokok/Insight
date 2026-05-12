'use client';

import { useMemo, useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';

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
  Info,
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
  CheckCircle2,
  XCircle,
  Minus,
  Activity,
  Gauge,
  type LucideIcon,
} from 'lucide-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { useReputations, useRecalculateReputation } from '@/hooks/data/useReputations';
import { oracleColors, providerNames } from '@/lib/constants';
import type { OracleReputation } from '@/lib/oracles/services/reputationService';
import { getScoreColor, formatTimeAgo } from '@/lib/oracles/utils/reputationUtils';
import { cn } from '@/lib/utils';
import { type OracleProvider } from '@/types/oracle';

/* ─── Oracle Logo ─── */

const ORACLE_LOGO_MAP: Record<string, string> = {
  chainlink: '/logos/oracles/chainlink.svg',
  pyth: '/logos/oracles/pyth.svg',
  api3: '/logos/oracles/api3.svg',
  redstone: '/logos/oracles/redstone.svg',
  dia: '/logos/oracles/dia.svg',
  winklink: '/logos/oracles/winklink.svg',
  supra: '/logos/oracles/supra.svg',
  twap: '/logos/oracles/twap.svg',
  reflector: '/logos/oracles/reflector.svg',
  flare: '/logos/oracles/flare.svg',
};

function OracleLogo({
  provider,
  size = 20,
  className = '',
}: {
  provider: OracleProvider;
  size?: number;
  className?: string;
}) {
  const src = ORACLE_LOGO_MAP[provider];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={`${providerNames[provider] || provider} logo`}
      width={size}
      height={size}
      className={cn('rounded-full object-contain flex-shrink-0', className)}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

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

/* ─── Utilities ─── */

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

/* ─── Score Ring ─── */

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const stroke = 4;
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
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-black font-mono" style={{ color }}>
          {score.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

/* ─── Risk Badge ─── */

function RiskBadge({ score }: { score: number }) {
  if (score >= 90) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        LOW RISK
      </span>
    );
  }
  if (score >= 70) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Minus className="w-3 h-3" />
        MEDIUM
      </span>
    );
  }
  if (score > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" />
        HIGH RISK
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-200">
      <Minus className="w-3 h-3" />
      UNRATED
    </span>
  );
}

/* ─── Leaderboard Row ─── */

function LeaderboardRow({
  reputation,
  rank,
  maxQueries,
}: {
  reputation: OracleReputation;
  rank: number;
  maxQueries: number;
}) {
  const provider = reputation.provider as OracleProvider;
  const color = oracleColors[provider] || '#888888';
  const timeAgo = formatTimeAgo(reputation.last_calculated_at);
  const isTop3 = rank <= 3;

  return (
    <Link href={`/reputation/${encodeURIComponent(provider)}`} className="group block">
      <div
        className={cn(
          'relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200',
          'bg-white hover:bg-gray-50/80 border-gray-200/60 hover:border-gray-300',
          isTop3 && 'bg-gradient-to-r from-amber-50/30 to-transparent border-amber-200/40'
        )}
      >
        {/* Rank */}
        <div className="w-8 flex-shrink-0 flex justify-center">
          {rank === 1 && <Crown className="w-5 h-5 text-amber-500" />}
          {rank === 2 && <Medal className="w-4 h-4 text-slate-400" />}
          {rank === 3 && <Medal className="w-4 h-4 text-orange-400" />}
          {rank > 3 && (
            <span className="text-xs font-bold text-gray-400 font-mono w-5 text-center">
              {rank}
            </span>
          )}
        </div>

        {/* Provider */}
        <div className="w-36 flex-shrink-0 flex items-center gap-2.5">
          <OracleLogo provider={provider} size={22} />
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
              {providerNames[provider] || provider}
            </div>
            <div className="text-[10px] text-gray-400 font-mono">{provider}</div>
          </div>
        </div>

        {/* Score Ring */}
        <div className="w-12 flex-shrink-0 flex justify-center">
          <ScoreRing score={reputation.overall_score} size={40} />
        </div>

        {/* Risk Badge */}
        <div className="w-24 flex-shrink-0">
          <RiskBadge score={reputation.overall_score} />
        </div>

        {/* Metrics */}
        <div className="flex-1 grid grid-cols-5 gap-2">
          <MetricCell label="Accuracy" value={reputation.accuracy_score.toFixed(1)} />
          <MetricCell label="Uptime" value={`${reputation.uptime_percentage.toFixed(1)}%`} />
          <MetricCell label="Reliability" value={reputation.reliability_score.toFixed(1)} />
          <MetricCell label="Latency" value={`${reputation.avg_latency_ms}ms`} />
          <MetricCell label="Freshness" value={reputation.freshness_score.toFixed(1)} />
        </div>

        {/* Activity */}
        <div className="w-20 flex-shrink-0">
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
            <span>Queries</span>
            <span className="font-mono font-bold">{reputation.total_queries.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1">
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: `${maxQueries > 0 ? (reputation.total_queries / maxQueries) * 100 : 0}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>

        {/* Time */}
        <div className="w-16 flex-shrink-0 text-right">
          {timeAgo ? (
            <span className={cn('text-[10px] font-medium', timeAgo.color)}>{timeAgo.text}</span>
          ) : (
            <span className="text-[10px] text-gray-300">—</span>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>
    </Link>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{label}</div>
      <div className="text-xs font-mono font-black text-gray-800 mt-0.5">{value}</div>
    </div>
  );
}

/* ─── Table View ─── */

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

/* ─── Global Stats ─── */

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
        color="bg-blue-500"
        label="Average Score"
        value={avgScoreAnim.toFixed(1)}
        sub={`${rated.length} rated providers`}
        valueColor={getScoreColor(avgScore)}
      />
      <StatCard
        icon={Crown}
        color="bg-amber-500"
        label="Top Provider"
        value={top ? providerNames[top.provider as OracleProvider] || top.provider : '--'}
        sub={top ? `Score ${top.overall_score.toFixed(0)}` : undefined}
        topProvider={top ? (top.provider as OracleProvider) : undefined}
      />
      <StatCard
        icon={Clock}
        color="bg-cyan-500"
        label="Average Latency"
        value={`${avgLatencyAnim.toFixed(0)}ms`}
        sub="response time"
      />
      <StatCard
        icon={Activity}
        color="bg-emerald-500"
        label="Total Queries"
        value={Math.round(totalQueriesAnim).toLocaleString()}
        sub="7-day aggregate"
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  color,
  label,
  value,
  sub,
  valueColor,
  topProvider,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  topProvider?: OracleProvider;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-4 hover:shadow-sm transition-all duration-200">
      <div className="flex items-center gap-2.5 mb-2">
        <div className={cn('p-1.5 rounded-lg', color.replace('bg-', 'bg-opacity-10 bg-'))}>
          {topProvider ? (
            <OracleLogo provider={topProvider} size={20} />
          ) : (
            <Icon className={cn('w-4 h-4', color.replace('bg-', 'text-'))} />
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

/* ─── Top 3 Podium ─── */

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

/* ─── Next Update ─── */

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

/* ─── Comparison Info ─── */

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

/* ─── Main ─── */

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
      {/* Header */}
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

      {/* Info */}
      <div className="mb-6">
        <ComparisonInfo />
      </div>

      {/* Banners */}
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

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-500 animate-pulse" />
            <span className="text-sm text-gray-500 font-bold">Loading reputation data...</span>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && sorted.length > 0 && (
        <>
          {/* Global Stats */}
          <GlobalStats reputations={sorted} />

          {/* Top 3 Podium */}
          <div className="mt-8 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Top Performers
              </h2>
            </div>
            <TopThree reputations={sorted} />
          </div>

          {/* Toolbar */}
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

          {/* View */}
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

      {/* Empty */}
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
