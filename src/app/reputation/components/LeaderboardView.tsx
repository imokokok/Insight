import Link from 'next/link';

import { CheckCircle2, Minus, XCircle, Crown, Medal, ChevronRight } from 'lucide-react';

import { OracleLogo, ScoreRing } from '@/app/reputation/components/ReputationShared';
import { oracleColors, providerNames } from '@/lib/constants';
import type { OracleReputation } from '@/lib/oracles/services/reputationService';
import { formatTimeAgo } from '@/lib/oracles/utils/reputationUtils';
import { cn } from '@/lib/utils';
import { type OracleProvider } from '@/types/oracle';

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

        <div className="w-36 flex-shrink-0 flex items-center gap-2.5">
          <OracleLogo provider={provider} size={22} />
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
              {providerNames[provider] || provider}
            </div>
            <div className="text-[10px] text-gray-400 font-mono">{provider}</div>
          </div>
        </div>

        <div className="w-12 flex-shrink-0 flex justify-center">
          <ScoreRing score={reputation.overall_score} size={40} />
        </div>

        <div className="w-24 flex-shrink-0">
          <RiskBadge score={reputation.overall_score} />
        </div>

        <div className="flex-1 grid grid-cols-5 gap-2">
          <MetricCell label="Accuracy" value={reputation.accuracy_score.toFixed(1)} />
          <MetricCell label="Uptime" value={`${reputation.uptime_percentage.toFixed(1)}%`} />
          <MetricCell label="Reliability" value={reputation.reliability_score.toFixed(1)} />
          <MetricCell label="Latency" value={`${reputation.avg_latency_ms}ms`} />
          <MetricCell label="Freshness" value={reputation.freshness_score.toFixed(1)} />
        </div>

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

        <div className="w-16 flex-shrink-0 text-right">
          {timeAgo ? (
            <span className={cn('text-[10px] font-medium', timeAgo.color)}>{timeAgo.text}</span>
          ) : (
            <span className="text-[10px] text-gray-300">—</span>
          )}
        </div>

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

export { RiskBadge, LeaderboardRow, MetricCell };
