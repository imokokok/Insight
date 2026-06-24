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
  Globe,
  Lightbulb,
  Minus,
  Share2,
  Shield,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { providerNames, oracleColors } from '@/lib/constants';
import { type DailyReportData, type ProviderRanking } from '@/lib/reports/reportService';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';

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
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
              Rank
            </th>
            <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
              Provider
            </th>
            <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
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
          </tr>
        </thead>
        <tbody>
          {rankings.map((ranking, index) => {
            const color = oracleColors[ranking.provider] ?? '#9CA3AF';
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
                <td className="px-5 py-3.5 text-right font-semibold text-gray-900 font-tabular">
                  {ranking.score.toFixed(0)}
                </td>
                <td className="px-5 py-3.5 text-right text-gray-700 font-tabular">
                  {ranking.successRate.toFixed(1)}%
                </td>
                <td className="px-5 py-3.5 text-right text-gray-700 font-tabular">
                  {ranking.avgDeviationPct.toFixed(3)}%
                </td>
                <td className="px-5 py-3.5 text-right text-gray-700 font-tabular">
                  {ranking.avgLatencyMs}ms
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
            <th className="text-left font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
              Asset
            </th>
            <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
              Consensus
            </th>
            <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
              Range
            </th>
            <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
              Volatility
            </th>
            <th className="text-right font-medium text-gray-500 px-5 py-3 text-xs uppercase tracking-wider">
              Max Dev
            </th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr
              key={asset.symbol}
              className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
            >
              <td className="px-5 py-3.5 font-medium text-gray-900">{asset.symbol}</td>
              <td className="px-5 py-3.5 text-right text-gray-700 font-tabular">
                {formatPrice(asset.avgConsensusPrice)}
              </td>
              <td className="px-5 py-3.5 text-right text-gray-500 text-xs font-tabular">
                {formatPrice(asset.minPrice)} – {formatPrice(asset.maxPrice)}
              </td>
              <td className="px-5 py-3.5 text-right">
                <span
                  className={cn(
                    'text-xs font-semibold font-tabular',
                    asset.volatilityPct >= 1
                      ? 'text-red-600'
                      : asset.volatilityPct >= 0.5
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                  )}
                >
                  {asset.volatilityPct.toFixed(2)}%
                </span>
              </td>
              <td className="px-5 py-3.5 text-right text-gray-700 font-tabular">
                {asset.maxDeviationPct.toFixed(3)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeviationEvents({ events }: { events: DailyReportData['deviationEvents'] }) {
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

function Highlights({ highlights }: { highlights: string[] }) {
  return (
    <ul className="space-y-3">
      {highlights.map((highlight, index) => (
        <li key={index} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
          {highlight}
        </li>
      ))}
    </ul>
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
  const providers = useMemo(() => [...new Set(matrix.map((m) => m.provider))].sort(), [matrix]);
  const assets = useMemo(() => [...new Set(matrix.map((m) => m.symbol))].sort(), [matrix]);

  if (providers.length === 0 || assets.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">No coverage data available.</p>;
  }

  return (
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
                return (
                  <td key={asset} className="px-3 py-3 text-center align-middle">
                    {cell ? (
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

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            <div className="lg:col-span-8 space-y-6">
              <SectionCard title="Key highlights" icon={Shield}>
                <Highlights highlights={report.highlights} />
              </SectionCard>

              <SectionCard title="Recommendations" icon={Lightbulb}>
                <Recommendations recommendations={report.recommendations} />
              </SectionCard>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900">Provider performance</h2>
                </div>
                <ProviderRankingTable rankings={report.providerRankings} />
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900">Asset performance</h2>
                </div>
                <AssetTable assets={report.topAssets} />
              </section>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <SectionCard title="Anomaly breakdown" icon={AlertTriangle}>
                <AnomalyBreakdown report={report} />
              </SectionCard>

              <SectionCard title="Day-over-day" icon={ArrowLeftRight}>
                <PreviousDayComparison comparison={report.previousDayComparison} />
              </SectionCard>

              <SectionCard title="Deviation events" icon={AlertTriangle}>
                <DeviationEvents events={report.deviationEvents} />
              </SectionCard>
            </div>
          </div>

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
