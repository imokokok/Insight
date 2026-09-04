'use client';

import { memo, useMemo } from 'react';

import {
  CheckCircle2,
  AlertTriangle,
  Shield,
  Activity,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { type FeedHealthLevel } from '@/lib/analytics/feedBehavior';
import { type RiskLevel } from '@/lib/analytics/riskMetrics';
import { formatPrice } from '@/lib/utils/format';

interface OracleSnapshotData {
  symbol: string;
  oracleCount: number;
  consensusPrice: number | null;
  priceSpread: number;
  riskLevel: RiskLevel;
  riskScore: number;
  anomalyCount: number;
  feedHealthLevel: FeedHealthLevel;
  feedHealthAvg: number;
  acceleratingCount: number;
}

interface ChainSnapshotData {
  chainCount: number;
  avgPrice: number | null;
  priceSpread: number;
  riskLevel: RiskLevel;
  riskScore: number;
  consistencyRating: string;
  feedHealthLevel: FeedHealthLevel;
  feedHealthAvg: number;
  anomalyCount: number;
}

interface MarketSnapshotSummaryProps {
  dimension: 'oracle' | 'chain';
  oracleData?: OracleSnapshotData;
  chainData?: ChainSnapshotData;
  isLoading: boolean;
}

function getRiskBadge(level: RiskLevel): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: typeof Shield;
} {
  switch (level) {
    case 'low':
      return {
        label: 'Low Risk',
        bgClass: 'bg-emerald-50/80',
        textClass: 'text-emerald-700',
        borderClass: 'border-emerald-100',
        icon: CheckCircle2,
      };
    case 'medium':
      return {
        label: 'Medium Risk',
        bgClass: 'bg-amber-50/80',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-100',
        icon: AlertTriangle,
      };
    case 'high':
      return {
        label: 'High Risk',
        bgClass: 'bg-orange-50/80',
        textClass: 'text-orange-700',
        borderClass: 'border-orange-100',
        icon: AlertTriangle,
      };
    case 'critical':
      return {
        label: 'Critical Risk',
        bgClass: 'bg-red-50/80',
        textClass: 'text-red-700',
        borderClass: 'border-red-100',
        icon: AlertTriangle,
      };
    default:
      return {
        label: 'Unknown',
        bgClass: 'bg-slate-50',
        textClass: 'text-slate-700',
        borderClass: 'border-slate-100',
        icon: Shield,
      };
  }
}

function getHealthBadge(level: FeedHealthLevel): {
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  icon: typeof Activity;
} {
  switch (level) {
    case 'healthy':
      return {
        label: 'Healthy',
        colorClass: 'text-emerald-600',
        bgClass: 'bg-emerald-50/80',
        borderClass: 'border-emerald-100',
        icon: CheckCircle2,
      };
    case 'fair':
      return {
        label: 'Fair',
        colorClass: 'text-blue-600',
        bgClass: 'bg-blue-50/80',
        borderClass: 'border-blue-100',
        icon: Activity,
      };
    case 'degraded':
      return {
        label: 'Degraded',
        colorClass: 'text-amber-600',
        bgClass: 'bg-amber-50/80',
        borderClass: 'border-amber-100',
        icon: AlertTriangle,
      };
    case 'critical':
      return {
        label: 'Critical',
        colorClass: 'text-red-600',
        bgClass: 'bg-red-50/80',
        borderClass: 'border-red-100',
        icon: AlertTriangle,
      };
    default:
      return {
        label: 'Unknown',
        colorClass: 'text-slate-600',
        bgClass: 'bg-slate-50',
        borderClass: 'border-slate-100',
        icon: Activity,
      };
  }
}

function getTrend(spread: number): {
  label: string;
  icon: typeof Minus;
  colorClass: string;
} {
  if (spread < 0.1) {
    return { label: 'Tight', icon: TrendingDown, colorClass: 'text-emerald-600' };
  }
  if (spread < 0.5) {
    return { label: 'Normal', icon: Minus, colorClass: 'text-amber-600' };
  }
  return { label: 'Wide', icon: TrendingUp, colorClass: 'text-red-600' };
}

function generateOracleSummary(data: OracleSnapshotData): string {
  const parts: string[] = [];

  if (data.consensusPrice) {
    parts.push(
      `${data.oracleCount} oracles quoting ${data.symbol} at consensus ${formatPrice(data.consensusPrice)}`
    );
  } else {
    parts.push(`${data.oracleCount} oracles reporting for ${data.symbol}`);
  }

  if (data.priceSpread < 0.1) {
    parts.push('prices highly consistent');
  } else if (data.priceSpread < 0.5) {
    parts.push('minor price divergence detected');
  } else if (data.priceSpread < 1.0) {
    parts.push('notable price divergence across oracles');
  } else {
    parts.push('significant price divergence — exercise caution');
  }

  if (data.anomalyCount > 0) {
    parts.push(`${data.anomalyCount} anomal${data.anomalyCount > 1 ? 'ies' : 'y'} flagged`);
  }

  if (data.acceleratingCount > 0) {
    parts.push(
      `${data.acceleratingCount} oracle${data.acceleratingCount > 1 ? 's' : ''} with accelerating deviation`
    );
  }

  return parts.join(' · ');
}

function generateChainSummary(data: ChainSnapshotData): string {
  const parts: string[] = [];

  if (data.avgPrice) {
    parts.push(`${data.chainCount} chains reporting at avg ${formatPrice(data.avgPrice)}`);
  } else {
    parts.push(`${data.chainCount} chains reporting`);
  }

  if (data.priceSpread < 0.1) {
    parts.push('cross-chain prices highly aligned');
  } else if (data.priceSpread < 0.5) {
    parts.push('minor cross-chain price variance');
  } else if (data.priceSpread < 1.0) {
    parts.push('notable cross-chain price divergence');
  } else {
    parts.push('significant cross-chain price spread — check for arbitrage or feed issues');
  }

  if (data.anomalyCount > 0) {
    parts.push(`${data.anomalyCount} feed anomal${data.anomalyCount > 1 ? 'ies' : 'y'}`);
  }

  return parts.join(' · ');
}

function MetricCard({
  label,
  value,
  subtext,
  trend,
}: {
  label: string;
  value: string;
  subtext?: string;
  trend?: { icon: typeof Minus; colorClass: string; label: string };
}) {
  const TrendIcon = trend?.icon ?? Minus;
  return (
    <div className="border-l border-slate-900/10 p-4 flex flex-col justify-between min-w-[140px] first:border-l-0">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </span>
      <div className="mt-2">
        <div className="text-xl font-semibold text-slate-900 tabular-nums tracking-tight">
          {value}
        </div>
        {(subtext || trend) && (
          <div className="flex items-center gap-1.5 mt-1">
            {trend && <TrendIcon className={`w-3 h-3 ${trend.colorClass}`} />}
            <span className="text-xs text-slate-500">{trend ? trend.label : subtext}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MarketSnapshotSummaryComponent({
  dimension,
  oracleData,
  chainData,
  isLoading,
}: MarketSnapshotSummaryProps) {
  const summary = useMemo(() => {
    if (dimension === 'oracle' && oracleData) {
      return {
        text: generateOracleSummary(oracleData),
        riskLevel: oracleData.riskLevel,
        riskScore: oracleData.riskScore,
        feedHealthLevel: oracleData.feedHealthLevel,
        feedHealthAvg: oracleData.feedHealthAvg,
        consensusPrice: oracleData.consensusPrice,
        spread: oracleData.priceSpread,
        anomalyCount: oracleData.anomalyCount,
      };
    }
    if (dimension === 'chain' && chainData) {
      return {
        text: generateChainSummary(chainData),
        riskLevel: chainData.riskLevel,
        riskScore: chainData.riskScore,
        feedHealthLevel: chainData.feedHealthLevel,
        feedHealthAvg: chainData.feedHealthAvg,
        consensusPrice: chainData.avgPrice,
        spread: chainData.priceSpread,
        anomalyCount: chainData.anomalyCount,
      };
    }
    return null;
  }, [dimension, oracleData, chainData]);

  if (isLoading || !summary) return null;

  const riskBadge = getRiskBadge(summary.riskLevel);
  const healthBadge = getHealthBadge(summary.feedHealthLevel);
  const RiskIcon = riskBadge.icon;
  const HealthIcon = healthBadge.icon;
  const spreadTrend = getTrend(summary.spread);

  return (
    <div className="editorial-panel grid grid-cols-1 border-y border-slate-900/15 bg-white/35 mb-8 lg:grid-cols-12">
      {/* Summary panel */}
      <div className="border-b border-slate-900/10 p-5 lg:col-span-5 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Market Snapshot
          </span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{summary.text}</p>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <div
            className={`inline-flex items-center gap-1.5 border-l-2 px-2.5 py-1 ${riskBadge.textClass} ${riskBadge.borderClass}`}
          >
            <RiskIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{riskBadge.label}</span>
            <span className="text-xs font-mono opacity-80">{summary.riskScore}</span>
          </div>
          <div
            className={`inline-flex items-center gap-1.5 border-l-2 px-2.5 py-1 ${healthBadge.colorClass} ${healthBadge.borderClass}`}
          >
            <HealthIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold capitalize">{healthBadge.label}</span>
            <span className="text-xs font-mono opacity-80">
              {summary.feedHealthAvg.toFixed(0)}/100
            </span>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3">
        <MetricCard
          label={dimension === 'oracle' ? 'Consensus Price' : 'Average Price'}
          value={summary.consensusPrice ? formatPrice(summary.consensusPrice) : '—'}
          subtext={dimension === 'oracle' ? 'Across selected oracles' : 'Across selected chains'}
        />
        <MetricCard
          label="Price Spread"
          value={`${summary.spread.toFixed(3)}%`}
          trend={spreadTrend}
        />
        <MetricCard
          label="Anomalies"
          value={String(summary.anomalyCount)}
          subtext={summary.anomalyCount === 0 ? 'No anomalies detected' : 'Requires attention'}
        />
      </div>
    </div>
  );
}

export const MarketSnapshotSummary = memo(MarketSnapshotSummaryComponent);
MarketSnapshotSummary.displayName = 'MarketSnapshotSummary';
