'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  Globe,
  Info,
  Lightbulb,
  Minus,
  Radio,
  Share2,
  Shield,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { chainNames, providerNames, oracleColors } from '@/lib/constants';
import {
  type DailyReportData,
  type ProviderRanking,
  type ProtocolLiquidationRisk,
  type ProtocolLiquidationScenario,
  type ReportRiskLevel,
  type RiskImpact,
  type StablecoinDepegSummary,
  type WrappedAssetPegSummary,
} from '@/lib/reports/reportService';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';
import type { Blockchain } from '@/types/oracle';

interface ReportDetailContentProps {
  initialReport: DailyReportData;
}

function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'critical':
      return {
        label: 'Critical',
        dot: 'bg-red-500',
        text: 'text-red-700',
        bg: 'bg-red-50',
        border: 'border-red-100',
      };
    case 'high':
      return {
        label: 'High',
        dot: 'bg-orange-500',
        text: 'text-orange-700',
        bg: 'bg-orange-50',
        border: 'border-orange-100',
      };
    case 'medium':
      return {
        label: 'Medium',
        dot: 'bg-amber-500',
        text: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-100',
      };
    default:
      return {
        label: 'Low',
        dot: 'bg-emerald-500',
        text: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
      };
  }
}

function StatusBadge({ metrics }: { metrics: DailyReportData['metrics'] }) {
  if (metrics.criticalEvents > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-100 text-[11px] font-medium">
        <AlertTriangle className="w-3 h-3" />
        {metrics.criticalEvents} critical events
      </span>
    );
  }
  if (metrics.highEvents > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 border border-orange-100 text-[11px] font-medium">
        <AlertTriangle className="w-3 h-3" />
        {metrics.highEvents} high risk events
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-medium">
      <CheckCircle2 className="w-3 h-3" />
      Stable
    </span>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('bg-white rounded-xl border border-gray-200 shadow-sm', className)}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <Icon className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ElementType;
  tone?: 'neutral' | 'good' | 'bad' | 'warning';
}) {
  const toneClass = {
    neutral: 'bg-gray-50 text-gray-500',
    good: 'bg-emerald-50 text-emerald-600',
    bad: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-600',
  }[tone];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-semibold text-gray-950 font-tabular">{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className={cn('p-2 rounded-lg', toneClass)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

function ProviderRankingTable({ rankings }: { rankings: ProviderRanking[] }) {
  const maxScore = useMemo(() => Math.max(1, ...rankings.map((r) => r.score)), [rankings]);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider w-16">
              Rank
            </th>
            <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
              Provider
            </th>
            <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider w-40">
              Score
            </th>
            <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
              Success
            </th>
            <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
              Avg Dev
            </th>
            <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
              Latency
            </th>
            <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider w-24">
              Anomalies
            </th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((ranking, index) => {
            const color = oracleColors[ranking.provider] ?? '#9CA3AF';
            const scorePct = (ranking.score / maxScore) * 100;
            const devTone =
              ranking.avgDeviationPct >= 0.5
                ? 'text-red-600'
                : ranking.avgDeviationPct >= 0.2
                  ? 'text-amber-600'
                  : 'text-emerald-600';
            return (
              <tr
                key={ranking.provider}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
              >
                <td className="px-5 py-3.5">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-semibold',
                      index < 3 ? 'bg-gray-100 text-gray-900' : 'text-gray-500'
                    )}
                  >
                    {index + 1}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium text-gray-900">
                      {providerNames[ranking.provider] ?? ranking.provider}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900 font-tabular w-8">
                      {ranking.score.toFixed(0)}
                    </span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${scorePct}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span
                    className={cn(
                      'text-sm font-tabular',
                      ranking.successRate >= 99
                        ? 'text-emerald-600'
                        : ranking.successRate >= 95
                          ? 'text-amber-600'
                          : 'text-red-600'
                    )}
                  >
                    {ranking.successRate.toFixed(1)}%
                  </span>
                </td>
                <td className={cn('px-5 py-3.5 text-right text-sm font-tabular', devTone)}>
                  {ranking.avgDeviationPct.toFixed(3)}%
                </td>
                <td className="px-5 py-3.5 text-right text-sm text-gray-700 font-tabular">
                  {ranking.avgLatencyMs}ms
                </td>
                <td className="px-5 py-3.5 text-right">
                  {ranking.anomalyCount > 0 ? (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700">
                      {ranking.anomalyCount}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AssetTable({ assets }: { assets: DailyReportData['topAssets'] }) {
  const maxVolatility = useMemo(
    () => Math.max(0.01, ...assets.map((a) => a.volatilityPct)),
    [assets]
  );

  if (assets.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        No asset data available for this report.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider w-24">
              Asset
            </th>
            <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider w-36">
              Consensus
            </th>
            <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
              Range vs Consensus
            </th>
            <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider w-40">
              Volatility
            </th>
            <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider w-28">
              Max Dev
            </th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const volatilityPct = Math.min(100, (asset.volatilityPct / maxVolatility) * 100);
            const rangeWidthPct =
              asset.avgConsensusPrice > 0
                ? Math.min(100, ((asset.maxPrice - asset.minPrice) / asset.avgConsensusPrice) * 100)
                : 0;
            const volTone =
              asset.volatilityPct >= 1
                ? 'bg-red-500'
                : asset.volatilityPct >= 0.5
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';
            return (
              <tr
                key={asset.symbol}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
              >
                <td className="px-5 py-3.5 font-medium text-gray-900">{asset.symbol}</td>
                <td className="px-5 py-3.5 text-right text-gray-700 font-tabular">
                  {formatPrice(asset.avgConsensusPrice)}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-tabular w-20 text-right">
                      {formatPrice(asset.minPrice)}
                    </span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                      <div
                        className="h-full rounded-full bg-gray-300"
                        style={{ width: `${rangeWidthPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 font-tabular w-20">
                      {formatPrice(asset.maxPrice)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[40px]">
                      <div
                        className={cn('h-full rounded-full transition-all', volTone)}
                        style={{ width: `${volatilityPct}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-xs font-semibold font-tabular w-14 text-right',
                        asset.volatilityPct >= 1
                          ? 'text-red-600'
                          : asset.volatilityPct >= 0.5
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      )}
                    >
                      {asset.volatilityPct.toFixed(2)}%
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span
                    className={cn(
                      'text-sm font-tabular',
                      asset.maxDeviationPct >= 1
                        ? 'text-red-600'
                        : asset.maxDeviationPct >= 0.5
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                    )}
                  >
                    {asset.maxDeviationPct.toFixed(3)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeviationEvents({ report }: { report: DailyReportData }) {
  const { deviationEvents: events, anomalySummary } = report;

  const topProviders = useMemo(() => {
    return Object.entries(anomalySummary.byProvider)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [anomalySummary.byProvider]);

  const topAssets = useMemo(() => {
    return Object.entries(anomalySummary.byAsset)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [anomalySummary.byAsset]);

  if (events.length === 0) {
    return (
      <div className="flex items-start gap-3 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">No material deviations</p>
          <p className="text-xs text-emerald-600/80 mt-0.5">
            All monitored providers stayed within tolerance of the consensus price.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact anomaly source summary */}
      {(topProviders.length > 0 || topAssets.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Top affected providers
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topProviders.map(([provider, count]) => (
                <span
                  key={provider}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white border border-gray-200 text-gray-700"
                >
                  {providerNames[provider as keyof typeof providerNames] ?? provider}
                  <span className="text-gray-400">·</span>
                  <span className="font-tabular">{count}</span>
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Top affected assets
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topAssets.map(([asset, count]) => (
                <span
                  key={asset}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white border border-gray-200 text-gray-700"
                >
                  {asset}
                  <span className="text-gray-400">·</span>
                  <span className="font-tabular">{count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {events.slice(0, 8).map((event, index) => {
          const config = getSeverityConfig(event.severity);
          return (
            <div
              key={`${event.provider}-${event.symbol}-${event.hour}-${index}`}
              className={cn(
                'flex items-center justify-between rounded-lg border px-4 py-3',
                config.bg,
                config.border
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', config.dot)} />
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium truncate', config.text)}>
                    {providerNames[event.provider] ?? event.provider} · {event.symbol}
                  </p>
                  <p className={cn('text-xs truncate opacity-80', config.text)}>
                    {formatPrice(event.price)} vs consensus {formatPrice(event.consensusPrice)}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold font-tabular text-gray-900 flex-shrink-0">
                {event.deviationPct > 0 ? '+' : ''}
                {event.deviationPct.toFixed(3)}%
              </span>
            </div>
          );
        })}
        {events.length > 8 && (
          <p className="text-xs text-gray-500 text-center py-2">+{events.length - 8} more events</p>
        )}
      </div>
    </div>
  );
}

function AnomalyBreakdown({ report }: { report: DailyReportData }) {
  const total = report.anomalySummary.total || 1;
  const severityOrder = ['critical', 'high', 'medium', 'low'] as const;

  return (
    <div className="space-y-3">
      {severityOrder.map((severity) => {
        const count = report.anomalySummary.bySeverity[severity] ?? 0;
        const config = getSeverityConfig(severity);
        const pct = Math.round((count / total) * 100);
        return (
          <div key={severity}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', config.dot)} />
                <span className="text-sm text-gray-700">{config.label}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 font-tabular">{count}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', config.dot)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PreviousDayComparison({
  comparison,
}: {
  comparison: DailyReportData['previousDayComparison'];
}) {
  if (!comparison || !comparison.reportAvailable) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">No previous day data available.</p>
    );
  }

  const items = [
    {
      label: 'Success rate',
      value: comparison.successRateChangePct,
      unit: 'pp',
      goodWhenPositive: true,
    },
    {
      label: 'Avg deviation',
      value: comparison.avgDeviationChangePct,
      unit: 'pp',
      goodWhenPositive: false,
    },
    { label: 'Anomalies', value: comparison.anomalyChangePct, unit: '%', goodWhenPositive: false },
    {
      label: 'Failed snapshots',
      value: comparison.failedSnapshotsChangePct,
      unit: '%',
      goodWhenPositive: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => {
        const isPositive = item.value > 0;
        const isNegative = item.value < 0;
        const isGood = item.goodWhenPositive ? isPositive : isNegative;
        const color = isGood
          ? 'text-emerald-600'
          : isNegative || isPositive
            ? 'text-red-600'
            : 'text-gray-500';
        const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
        return (
          <div key={item.label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              {item.label}
            </p>
            <div
              className={cn('flex items-center gap-1 text-sm font-semibold font-tabular', color)}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>
                {isPositive ? '+' : ''}
                {item.value.toFixed(item.unit === 'pp' || item.unit === '%' ? 2 : 0)}
                {item.unit}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HealthScoreGauge({ report }: { report: DailyReportData }) {
  const { metrics } = report;
  const score = useMemo(() => {
    const successScore = metrics.overallSuccessRate;
    const deviationScore = Math.max(0, 100 - (metrics.avgDeviationPct / 0.5) * 100);
    const anomalyScore =
      metrics.totalSnapshots > 0
        ? Math.max(0, 100 - (metrics.totalAnomalies / metrics.totalSnapshots) * 500)
        : 100;
    return Math.round(successScore * 0.5 + deviationScore * 0.3 + anomalyScore * 0.2);
  }, [metrics]);

  const config =
    score >= 95
      ? { label: 'Healthy', color: 'text-emerald-600', bg: 'bg-emerald-500' }
      : score >= 85
        ? { label: 'Good', color: 'text-emerald-600', bg: 'bg-emerald-500' }
        : score >= 70
          ? { label: 'Fair', color: 'text-amber-600', bg: 'bg-amber-500' }
          : { label: 'At Risk', color: 'text-red-600', bg: 'bg-red-500' };

  const circumference = 2 * Math.PI * 36;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" className="fill-none stroke-gray-100" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r="36"
            className={cn('fill-none transition-all duration-500', config.bg)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-xl font-bold font-tabular', config.color)}>{score}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Health</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', config.color)}>{config.label}</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          Composite score based on {metrics.overallSuccessRate.toFixed(1)}% success rate,{' '}
          {metrics.avgDeviationPct.toFixed(3)}% avg deviation, and {metrics.totalAnomalies}{' '}
          anomalies.
        </p>
      </div>
    </div>
  );
}

function getCategoryConfig(category: RiskImpact['category']) {
  switch (category) {
    case 'liquidation':
      return { label: 'Liquidation', icon: ShieldAlert };
    case 'stablecoin_depeg':
      return { label: 'Stablecoin', icon: Coins };
    case 'wrapped_asset':
      return { label: 'Wrapped', icon: ArrowLeftRight };
    case 'oracle_reliability':
      return { label: 'Reliability', icon: Radio };
    case 'systemic':
      return { label: 'Systemic', icon: Globe };
  }
}

function getReportRiskLevelConfig(level: ReportRiskLevel) {
  switch (level) {
    case 'severe':
      return {
        label: 'Severe',
        dot: 'bg-purple-500',
        text: 'text-purple-700',
        bg: 'bg-purple-50',
        border: 'border-purple-100',
      };
    case 'critical':
      return {
        label: 'Critical',
        dot: 'bg-red-500',
        text: 'text-red-700',
        bg: 'bg-red-50',
        border: 'border-red-100',
      };
    case 'warning':
      return {
        label: 'Warning',
        dot: 'bg-amber-500',
        text: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-100',
      };
    default:
      return {
        label: 'Normal',
        dot: 'bg-emerald-500',
        text: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
      };
  }
}

function PegSummaryPanel({
  stablecoins,
  wrappedAssets,
}: {
  stablecoins: StablecoinDepegSummary[];
  wrappedAssets: WrappedAssetPegSummary[];
}) {
  const hasData = stablecoins.length > 0 || wrappedAssets.length > 0;

  if (!hasData) {
    return (
      <div className="flex items-start gap-3 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">No material peg deviations</p>
          <p className="text-xs text-emerald-600/80 mt-0.5">
            Stablecoins and wrapped assets stayed within normal deviation bands today.
          </p>
        </div>
      </div>
    );
  }

  const renderCard = (item: StablecoinDepegSummary | WrappedAssetPegSummary) => {
    const config = getReportRiskLevelConfig(item.riskLevel);
    return (
      <div
        key={item.symbol}
        className={cn('rounded-lg border px-4 py-3', config.bg, config.border)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', config.dot)} />
            <p className={cn('text-sm font-semibold truncate', config.text)}>{item.symbol}</p>
          </div>
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider flex-shrink-0',
              config.bg,
              config.text
            )}
          >
            {config.label}
          </span>
        </div>
        <p className={cn('text-sm mt-2', config.text)}>
          Max deviation:{' '}
          <span className="font-mono font-semibold">{item.maxDeviationPercent.toFixed(2)}%</span>
        </p>
        {item.affectedProtocols.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {item.affectedProtocols.slice(0, 4).map((entity) => (
              <span
                key={entity}
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border',
                  config.bg,
                  config.border,
                  config.text
                )}
              >
                {entity}
              </span>
            ))}
            {item.affectedProtocols.length > 4 && (
              <span className={cn('text-[10px]', config.text)}>
                +{item.affectedProtocols.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {stablecoins.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">Stablecoin depeg</h3>
            <span className="text-xs text-gray-500">{stablecoins.length} flagged</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stablecoins.map((s) => renderCard(s))}
          </div>
        </div>
      )}

      {wrappedAssets.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Wrapped / LST peg</h3>
            <span className="text-xs text-gray-500">{wrappedAssets.length} flagged</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {wrappedAssets.map((w) => renderCard(w))}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskImpactSummary({ impacts }: { impacts: RiskImpact[] }) {
  if (impacts.length === 0) {
    return (
      <div className="flex items-start gap-3 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">No user-risk impacts identified</p>
          <p className="text-xs text-emerald-600/80 mt-0.5">
            Oracle data stayed within tolerance bands that would typically affect DeFi positions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {impacts.map((impact, index) => {
        const config = getSeverityConfig(impact.severity);
        const categoryConfig = getCategoryConfig(impact.category);
        return (
          <div
            key={`${impact.category}-${impact.title}-${index}`}
            className={cn('rounded-lg border px-4 py-3', config.bg, config.border)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <categoryConfig.icon className={cn('w-4 h-4 flex-shrink-0', config.text)} />
                <p className={cn('text-sm font-medium truncate', config.text)}>{impact.title}</p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider flex-shrink-0',
                  config.bg,
                  config.text
                )}
              >
                {config.label}
              </span>
            </div>
            <p className={cn('text-sm mt-2 leading-relaxed', config.text)}>{impact.description}</p>
            {impact.affectedEntities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {impact.affectedEntities.slice(0, 4).map((entity) => (
                  <span
                    key={entity}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border',
                      config.bg,
                      config.border,
                      config.text
                    )}
                  >
                    {entity}
                  </span>
                ))}
                {impact.affectedEntities.length > 4 && (
                  <span className={cn('text-[10px]', config.text)}>
                    +{impact.affectedEntities.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProtocolLiquidationRiskPanel({ risks }: { risks: ProtocolLiquidationRisk[] }) {
  if (risks.length === 0) {
    return (
      <div className="flex items-start gap-3 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">No liquidation stress-test data</p>
          <p className="text-xs text-emerald-600/80 mt-0.5">
            No integrated lending protocols could be stress-tested for this report period.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 leading-relaxed">
        Representative positions across integrated lending protocols are stress-tested at 1%, 3%,
        and 5% oracle deviation. Joint-deviation scenarios (all collaterals drop and all borrows
        rise together) are the primary risk indicator; single-asset drops are shown for reference.
      </p>
      <div className="space-y-3">
        {risks.slice(0, 6).map((risk) => (
          <ProtocolLiquidationRiskCard key={risk.protocolId} risk={risk} />
        ))}
      </div>
    </div>
  );
}

function ProtocolLiquidationRiskCard({ risk }: { risk: ProtocolLiquidationRisk }) {
  const jointScenarios = risk.scenarios
    .filter((s) => s.isJoint)
    .sort((a, b) => a.deviationPercent - b.deviationPercent);
  const singleScenarios = risk.scenarios
    .filter((s) => !s.isJoint)
    .sort((a, b) => a.deviationPercent - b.deviationPercent);

  const hfColor =
    risk.currentHealthFactor < 1
      ? 'text-gray-500'
      : risk.currentHealthFactor < 1.05
        ? 'text-red-600'
        : risk.currentHealthFactor < 1.2
          ? 'text-amber-600'
          : 'text-emerald-600';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{risk.protocolName}</h3>
            <span className="text-xs text-gray-500">
              {chainNames[risk.chain as Blockchain] ?? risk.chain}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {risk.collaterals.map((c) => `${c.amount} ${c.symbol}`).join(' + ')} collateral /{' '}
            {risk.borrows.map((b) => `${b.amount} ${b.symbol}`).join(' + ')} debt
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Current HF</p>
          <p className={cn('text-sm font-semibold font-mono', hfColor)}>
            {risk.currentHealthFactor.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ScenarioTable title="Joint deviation" scenarios={jointScenarios} variant="primary" />
        <ScenarioTable title="Single-asset drop" scenarios={singleScenarios} variant="secondary" />
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        Joint liquidation threshold: {Math.abs(risk.jointCriticalDeviationPercent).toFixed(2)}%
        major-equiv
        {risk.worstSingleAssetDeviation && (
          <span className="hidden sm:inline">
            {' '}
            · Worst single-asset move: {risk.worstSingleAssetDeviation.symbol}{' '}
            {risk.worstSingleAssetDeviation.direction === 'down' ? '↓' : '↑'}
            {Math.abs(risk.worstSingleAssetDeviation.criticalDeviationPercent).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

function ScenarioStatusBadge({ status }: { status: ProtocolLiquidationScenario['status'] }) {
  const config = {
    safe: { label: 'Safe', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    warning: { label: 'Warning', bg: 'bg-amber-100', text: 'text-amber-700' },
    critical: { label: 'Critical', bg: 'bg-red-100', text: 'text-red-700' },
    liquidated: { label: 'Liquidated', bg: 'bg-gray-800', text: 'text-white' },
  }[status];

  return (
    <span
      className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', config.bg, config.text)}
    >
      {config.label}
    </span>
  );
}

function ScenarioTable({
  title,
  scenarios,
  variant,
}: {
  title: string;
  scenarios: ProtocolLiquidationScenario[];
  variant: 'primary' | 'secondary';
}) {
  if (scenarios.length === 0) return null;
  const isPrimary = variant === 'primary';

  return (
    <div
      className={cn(
        'rounded-lg p-3',
        isPrimary ? 'bg-primary-50/50 border border-primary-100' : 'bg-gray-50'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <h4
          className={cn('text-xs font-semibold', isPrimary ? 'text-primary-900' : 'text-gray-500')}
        >
          {title}
        </h4>
        {isPrimary && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700">
            Primary
          </span>
        )}
      </div>
      <div className="space-y-2">
        {scenarios.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 w-16">{s.label}</span>
              <ScenarioStatusBadge status={s.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                HF <span className="font-mono text-gray-900">{s.healthFactor.toFixed(2)}</span>
              </span>
              {s.status !== 'safe' && (
                <span>
                  Buffer{' '}
                  <span className="font-mono text-gray-900">
                    {s.distanceToLiquidationPercent.toFixed(2)}%
                  </span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Recommendations({ recommendations }: { recommendations: string[] }) {
  if (!recommendations || recommendations.length === 0) {
    return <p className="text-sm text-gray-500">No recommendations for this period.</p>;
  }

  return (
    <ul className="space-y-3">
      {recommendations.map((text, index) => (
        <li key={index} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
          <span className="flex-shrink-0 w-5 h-5 rounded-md bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-semibold">
            {index + 1}
          </span>
          {text}
        </li>
      ))}
    </ul>
  );
}

function CoverageMatrix({ matrix }: { matrix: DailyReportData['coverageMatrix'] }) {
  const [showAll, setShowAll] = useState(true);

  const abnormalCells = useMemo(
    () =>
      matrix.filter((m) => m.failed > 0 || m.avgDeviationPct >= 0.5 || m.maxDeviationPct >= 0.5),
    [matrix]
  );

  const visibleMatrix = showAll ? matrix : abnormalCells;

  const providers = useMemo(
    () => [...new Set(visibleMatrix.map((m) => m.provider))].sort(),
    [visibleMatrix]
  );
  const assets = useMemo(
    () => [...new Set(visibleMatrix.map((m) => m.symbol))].sort(),
    [visibleMatrix]
  );

  if (matrix.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">No coverage data available.</p>;
  }

  if (abnormalCells.length === 0) {
    return (
      <div className="flex items-start gap-3 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">No coverage anomalies</p>
          <p className="text-xs text-emerald-600/80 mt-0.5">
            All provider/asset pairs stayed within tolerance with no failed snapshots.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {showAll ? (
            <>Showing all {matrix.length} provider/asset pairs.</>
          ) : (
            <>
              Showing {abnormalCells.length} anomalous pair
              {abnormalCells.length > 1 ? 's' : ''}.{' '}
              <button
                onClick={() => setShowAll(true)}
                className="text-gray-900 underline hover:text-primary-600"
              >
                Show all
              </button>
            </>
          )}
        </p>
        <button
          onClick={() => setShowAll((prev) => !prev)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show anomalies only
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show all
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left font-medium text-gray-500 px-4 py-3 sticky left-0 bg-gray-50">
                Provider
              </th>
              {assets.map((asset) => (
                <th
                  key={asset}
                  className="text-center font-medium text-gray-500 px-3 py-3 min-w-[70px]"
                >
                  {asset}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <tr key={provider} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white">
                  {providerNames[provider] ?? provider}
                </td>
                {assets.map((asset) => {
                  const cell = matrix.find((m) => m.provider === provider && m.symbol === asset);
                  const isVisible = visibleMatrix.some(
                    (m) => m.provider === provider && m.symbol === asset
                  );
                  return (
                    <td key={asset} className="px-3 py-3 text-center align-middle">
                      {cell && isVisible ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={cn(
                              'font-tabular font-semibold',
                              cell.failed > 0 ? 'text-amber-600' : 'text-emerald-600'
                            )}
                          >
                            {cell.success}/{cell.total}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {cell.avgDeviationPct.toFixed(2)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FailureBreakdown({ breakdown }: { breakdown: DailyReportData['failureBreakdown'] }) {
  if (!breakdown || breakdown.length === 0) return null;

  return (
    <SectionCard title="Failure breakdown" icon={XCircle} className="mt-6">
      <div className="space-y-3">
        {breakdown.slice(0, 10).map((item) => (
          <div
            key={`${item.provider}-${item.symbol}`}
            className="flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {providerNames[item.provider] ?? item.provider} · {item.symbol}
              </p>
              {item.topError && <p className="text-xs text-gray-500 truncate">{item.topError}</p>}
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-100 flex-shrink-0">
              {item.failureCount}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export default function ReportDetailContent({ initialReport }: ReportDetailContentProps) {
  const report = initialReport;
  const [copied, setCopied] = useState(false);

  const dateLabel = new Date(report.reportDate).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <ErrorBoundary level="page" componentName="ReportDetailContent">
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Breadcrumb */}
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to reports
          </Link>

          {/* Header */}
          <header className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {dateLabel}
                  </span>
                  <StatusBadge metrics={report.metrics} />
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-950 tracking-tight mb-3">
                  {report.reportTitle}
                </h1>
                <p className="text-[15px] text-gray-600 leading-relaxed">{report.summary}</p>
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 self-start"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {copied ? 'Copied' : 'Share'}
              </button>
            </div>
          </header>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <MetricCard
              label="Success rate"
              value={`${report.metrics.overallSuccessRate.toFixed(1)}%`}
              subtext={`${report.metrics.successfulSnapshots.toLocaleString()} of ${report.metrics.totalSnapshots.toLocaleString()} snapshots`}
              icon={Shield}
              tone={
                report.metrics.overallSuccessRate >= 99
                  ? 'good'
                  : report.metrics.overallSuccessRate >= 95
                    ? 'neutral'
                    : 'warning'
              }
            />
            <MetricCard
              label="Avg deviation"
              value={`${report.metrics.avgDeviationPct.toFixed(3)}%`}
              subtext="Across all providers"
              icon={BarChart3}
              tone={
                report.metrics.avgDeviationPct < 0.2
                  ? 'good'
                  : report.metrics.avgDeviationPct < 0.5
                    ? 'neutral'
                    : 'warning'
              }
            />
            <MetricCard
              label="Anomalies"
              value={String(report.metrics.totalAnomalies)}
              subtext={`${report.metrics.criticalEvents} critical, ${report.metrics.highEvents} high`}
              icon={AlertTriangle}
              tone={
                report.metrics.totalAnomalies === 0
                  ? 'good'
                  : report.metrics.criticalEvents > 0
                    ? 'bad'
                    : 'warning'
              }
            />
            <MetricCard
              label="Active providers"
              value={String(report.metrics.activeProviders)}
              subtext={`${report.metrics.activeAssets} assets monitored`}
              icon={Globe}
              tone="neutral"
            />
          </div>

          {/* Feedback overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <SectionCard title="Network health" icon={Shield}>
              <HealthScoreGauge report={report} />
            </SectionCard>

            <SectionCard title="Anomaly breakdown" icon={AlertTriangle}>
              <AnomalyBreakdown report={report} />
            </SectionCard>

            <SectionCard title="Day-over-day" icon={ArrowLeftRight}>
              <PreviousDayComparison comparison={report.previousDayComparison} />
            </SectionCard>
          </div>

          {/* User risk impact summary */}
          <SectionCard title="User risk impact summary" icon={ShieldAlert} className="mb-6">
            <RiskImpactSummary impacts={report.riskImpacts ?? []} />
          </SectionCard>

          {/* Stablecoin & wrapped asset peg summary */}
          <SectionCard title="Peg & depeg summary" icon={Coins} className="mb-6">
            <PegSummaryPanel
              stablecoins={report.stablecoinDepeg ?? []}
              wrappedAssets={report.wrappedAssetPeg ?? []}
            />
          </SectionCard>

          {/* Lending liquidation stress test */}
          <SectionCard title="Lending liquidation stress test" icon={TrendingDown} className="mb-6">
            <ProtocolLiquidationRiskPanel risks={report.protocolLiquidationRisks ?? []} />
          </SectionCard>

          {/* Action-oriented recommendations */}
          <SectionCard title="Recommendations" icon={Lightbulb} className="mb-6">
            <Recommendations recommendations={report.recommendations} />
          </SectionCard>

          {/* Full-width data tables */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Provider performance</h2>
            </div>
            <ProviderRankingTable rankings={report.providerRankings} />
          </section>

          <section className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Asset performance</h2>
            </div>
            <AssetTable assets={report.topAssets} />
          </section>

          {/* Deviation events with source summary */}
          <SectionCard title="Deviation events" icon={AlertTriangle} className="mb-6">
            <DeviationEvents report={report} />
          </SectionCard>

          {/* Coverage matrix */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Provider × asset coverage</h2>
            </div>
            <CoverageMatrix matrix={report.coverageMatrix} />
          </section>

          <FailureBreakdown breakdown={report.failureBreakdown} />

          {/* Footer note */}
          <footer className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 leading-relaxed">
              Generated automatically by Insight from hourly cross-oracle snapshots collected
              throughout the day. Data is collected from public oracle feeds and may not represent
              full intraday price history. For real-time data, visit the{' '}
              <Link
                href="/price-insight"
                className="text-gray-900 underline hover:text-primary-600 transition-colors"
              >
                Price Insight dashboard
              </Link>
              .
            </p>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
}
