'use client';

import { memo, useMemo } from 'react';

import { CheckCircle2, AlertTriangle, Shield, Activity, Minus } from 'lucide-react';

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
  icon: typeof Shield;
} {
  switch (level) {
    case 'low':
      return {
        label: 'Low Risk',
        bgClass: 'bg-emerald-50',
        textClass: 'text-emerald-700',
        icon: CheckCircle2,
      };
    case 'medium':
      return {
        label: 'Medium Risk',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-700',
        icon: AlertTriangle,
      };
    case 'high':
      return {
        label: 'High Risk',
        bgClass: 'bg-orange-50',
        textClass: 'text-orange-700',
        icon: AlertTriangle,
      };
    case 'critical':
      return {
        label: 'Critical Risk',
        bgClass: 'bg-red-50',
        textClass: 'text-red-700',
        icon: AlertTriangle,
      };
    default:
      return {
        label: 'Unknown',
        bgClass: 'bg-gray-50',
        textClass: 'text-gray-700',
        icon: Shield,
      };
  }
}

function getHealthIcon(level: FeedHealthLevel) {
  switch (level) {
    case 'healthy':
      return { icon: CheckCircle2, color: 'text-emerald-500' };
    case 'fair':
      return { icon: Activity, color: 'text-blue-500' };
    case 'degraded':
      return { icon: AlertTriangle, color: 'text-amber-500' };
    case 'critical':
      return { icon: AlertTriangle, color: 'text-red-500' };
    default:
      return { icon: Activity, color: 'text-gray-500' };
  }
}

function generateOracleSummary(data: OracleSnapshotData): string {
  const parts: string[] = [];

  if (data.consensusPrice) {
    parts.push(
      `${data.oracleCount} oracles quoting ${data.symbol} at consensus $${formatPrice(data.consensusPrice)}`
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
    parts.push(`${data.chainCount} chains reporting at avg $${formatPrice(data.avgPrice)}`);
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
        keyMetrics: [
          {
            label: 'Spread',
            value: `${oracleData.priceSpread.toFixed(3)}%`,
            trend:
              oracleData.priceSpread < 0.1
                ? ('low' as const)
                : oracleData.priceSpread < 0.5
                  ? ('medium' as const)
                  : ('high' as const),
          },
          {
            label: 'Anomalies',
            value: String(oracleData.anomalyCount),
            trend: oracleData.anomalyCount === 0 ? ('low' as const) : ('high' as const),
          },
          {
            label: 'Feed Health',
            value: `${oracleData.feedHealthAvg.toFixed(0)}/100`,
            trend:
              oracleData.feedHealthAvg >= 80
                ? ('low' as const)
                : oracleData.feedHealthAvg >= 60
                  ? ('medium' as const)
                  : ('high' as const),
          },
        ],
      };
    }
    if (dimension === 'chain' && chainData) {
      return {
        text: generateChainSummary(chainData),
        riskLevel: chainData.riskLevel,
        riskScore: chainData.riskScore,
        feedHealthLevel: chainData.feedHealthLevel,
        feedHealthAvg: chainData.feedHealthAvg,
        keyMetrics: [
          {
            label: 'Spread',
            value: `${chainData.priceSpread.toFixed(3)}%`,
            trend:
              chainData.priceSpread < 0.1
                ? ('low' as const)
                : chainData.priceSpread < 0.5
                  ? ('medium' as const)
                  : ('high' as const),
          },
          {
            label: 'Consistency',
            value: chainData.consistencyRating,
            trend:
              chainData.consistencyRating === 'Excellent' || chainData.consistencyRating === 'Good'
                ? ('low' as const)
                : ('high' as const),
          },
          {
            label: 'Feed Health',
            value: `${chainData.feedHealthAvg.toFixed(0)}/100`,
            trend:
              chainData.feedHealthAvg >= 80
                ? ('low' as const)
                : chainData.feedHealthAvg >= 60
                  ? ('medium' as const)
                  : ('high' as const),
          },
        ],
      };
    }
    return null;
  }, [dimension, oracleData, chainData]);

  if (isLoading || !summary) return null;

  const riskBadge = getRiskBadge(summary.riskLevel);
  const healthInfo = getHealthIcon(summary.feedHealthLevel);
  const RiskIcon = riskBadge.icon;
  const HealthIcon = healthInfo.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Summary text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Market Snapshot
            </span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{summary.text}</p>
        </div>

        {/* Key indicators */}
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          {/* Risk badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${riskBadge.bgClass} ${riskBadge.textClass}`}
          >
            <RiskIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{riskBadge.label}</span>
            <span className="text-xs font-mono opacity-75">{summary.riskScore}</span>
          </div>

          {/* Feed health badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50`}>
            <HealthIcon className={`w-3.5 h-3.5 ${healthInfo.color}`} />
            <span className="text-xs font-medium text-gray-700 capitalize">
              {summary.feedHealthLevel}
            </span>
          </div>
        </div>
      </div>

      {/* Key metrics strip */}
      <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-100">
        {summary.keyMetrics.map((metric) => {
          const trendIcon =
            metric.trend === 'low'
              ? CheckCircle2
              : metric.trend === 'medium'
                ? Minus
                : AlertTriangle;
          const trendColor =
            metric.trend === 'low'
              ? 'text-emerald-500'
              : metric.trend === 'medium'
                ? 'text-amber-500'
                : 'text-red-500';
          const TrendIcon = trendIcon;
          return (
            <div key={metric.label} className="flex items-center gap-1.5">
              <TrendIcon className={`w-3 h-3 ${trendColor}`} />
              <span className="text-xs text-gray-500">{metric.label}:</span>
              <span className="text-xs font-mono font-medium text-gray-800">{metric.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const MarketSnapshotSummary = memo(MarketSnapshotSummaryComponent);
MarketSnapshotSummary.displayName = 'MarketSnapshotSummary';
