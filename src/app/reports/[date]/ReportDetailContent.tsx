'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  BarChart3,
  Award,
  Zap,
  Shield,
  Globe,
  Share2,
  Twitter,
  FileDigit,
  ChevronRight,
  Lightbulb,
  Grid3X3,
  XCircle,
  ArrowLeftRight,
} from 'lucide-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { CompactStatCard } from '@/components/ui/CompactStatCard';
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
        icon: AlertTriangle,
        cls: 'bg-red-50 border-red-200 text-red-800',
        badge: 'bg-red-100 text-red-700 border-red-200',
        indicator: 'bg-red-500',
      };
    case 'high':
      return {
        label: 'High',
        icon: AlertTriangle,
        cls: 'bg-orange-50 border-orange-200 text-orange-800',
        badge: 'bg-orange-100 text-orange-700 border-orange-200',
        indicator: 'bg-orange-500',
      };
    case 'medium':
      return {
        label: 'Medium',
        icon: Activity,
        cls: 'bg-amber-50 border-amber-200 text-amber-800',
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        indicator: 'bg-amber-500',
      };
    default:
      return {
        label: 'Low',
        icon: CheckCircle2,
        cls: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        indicator: 'bg-emerald-500',
      };
  }
}

function SectionTitle({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function ProviderRankingCard({ ranking, rank }: { ranking: ProviderRanking; rank: number }) {
  const color = oracleColors[ranking.provider] ?? '#888888';
  const medalColor =
    rank === 1
      ? 'text-amber-500'
      : rank === 2
        ? 'text-gray-400'
        : rank === 3
          ? 'text-amber-700'
          : 'text-gray-500';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-gray-300 transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-gray-100"
            style={{ backgroundColor: `${color}10` }}
          >
            <span className={cn('text-lg font-black font-mono', medalColor)}>{rank}</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {providerNames[ranking.provider] ?? ranking.provider}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-500 font-medium">
                {ranking.successRate.toFixed(1)}% uptime
              </span>
              <span className="text-[10px] text-gray-300">·</span>
              <span className="text-[10px] text-gray-500 font-medium">
                {ranking.totalQueries} queries
              </span>
            </div>
          </div>
        </div>
        <div
          className="flex-shrink-0 w-13 h-13 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: `${color}10`,
            boxShadow: `0 0 0 2px ${color}30`,
          }}
        >
          <span className="text-sm font-black font-mono" style={{ color }}>
            {ranking.score.toFixed(0)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
          <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
            Avg Dev
          </div>
          <div className="text-xs font-bold text-gray-900 font-mono">
            {ranking.avgDeviationPct.toFixed(3)}%
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
          <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
            Max Dev
          </div>
          <div className="text-xs font-bold text-gray-900 font-mono">
            {ranking.maxDeviationPct.toFixed(3)}%
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
          <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
            Latency
          </div>
          <div className="text-xs font-bold text-gray-900 font-mono">{ranking.avgLatencyMs}ms</div>
        </div>
      </div>
    </div>
  );
}

function AssetStatsTable({ assets }: { assets: DailyReportData['topAssets'] }) {
  if (assets.length === 0) {
    return (
      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 border border-gray-100">
        No asset data available for this report period.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">
              Asset
            </th>
            <th className="text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">
              Avg Consensus
            </th>
            <th className="text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">
              Range
            </th>
            <th className="text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">
              Volatility
            </th>
            <th className="text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider px-4 py-3">
              Max Deviation
            </th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr
              key={asset.symbol}
              className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
            >
              <td className="px-4 py-3">
                <span className="text-sm font-bold text-gray-900">{asset.symbol}</span>
                <span className="text-[10px] text-gray-400 ml-2">({asset.sampleCount} snaps)</span>
              </td>
              <td className="px-4 py-3 text-right text-sm font-mono text-gray-800">
                {formatPrice(asset.avgConsensusPrice)}
              </td>
              <td className="px-4 py-3 text-right text-xs font-mono text-gray-600">
                {formatPrice(asset.minPrice)} - {formatPrice(asset.maxPrice)}
              </td>
              <td className="px-4 py-3 text-right">
                <span
                  className={cn(
                    'text-xs font-bold font-mono',
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
              <td className="px-4 py-3 text-right text-xs font-mono text-gray-600">
                {asset.maxDeviationPct.toFixed(3)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeviationEventsList({ events }: { events: DailyReportData['deviationEvents'] }) {
  if (events.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-emerald-800">No material deviations</p>
          <p className="text-xs text-emerald-600 mt-0.5 leading-relaxed">
            All monitored providers stayed within 0.5% of the consensus price throughout the
            reporting period.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.slice(0, 8).map((event, index) => {
        const config = getSeverityConfig(event.severity);
        const Icon = config.icon;
        return (
          <div
            key={`${event.provider}-${event.symbol}-${event.hour}-${index}`}
            className={`rounded-xl border p-4 ${config.cls}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold">
                      {providerNames[event.provider] ?? event.provider} · {event.symbol}
                    </span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${config.badge}`}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    Price {formatPrice(event.price)} diverged{' '}
                    {Math.abs(event.deviationPct).toFixed(3)}% from consensus{' '}
                    {formatPrice(event.consensusPrice)}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'text-sm font-black font-mono flex-shrink-0',
                  event.deviationPct > 0 ? 'text-red-600' : 'text-slate-600'
                )}
              >
                {event.deviationPct > 0 ? '+' : ''}
                {event.deviationPct.toFixed(3)}%
              </span>
            </div>
          </div>
        );
      })}
      {events.length > 8 && (
        <p className="text-xs text-gray-500 text-center py-2">
          +{events.length - 8} more deviation events
        </p>
      )}
    </div>
  );
}

function Highlights({ highlights }: { highlights: string[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <SectionTitle icon={Zap} title="Key Highlights" />
      <ul className="space-y-3">
        {highlights.map((highlight, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
            <p className="text-sm text-gray-700 leading-relaxed">{highlight}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Recommendations({ recommendations }: { recommendations: string[] }) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <SectionTitle icon={Lightbulb} title="Actionable Recommendations" />
      <ul className="space-y-3">
        {recommendations.map((recommendation, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
              {index + 1}
            </span>
            <p className="text-sm text-gray-700 leading-relaxed">{recommendation}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviousDayComparison({
  comparison,
}: {
  comparison: DailyReportData['previousDayComparison'];
}) {
  if (!comparison || !comparison.reportAvailable) return null;

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
    {
      label: 'Anomalies',
      value: comparison.anomalyChangeCount,
      unit: '',
      goodWhenPositive: false,
    },
    {
      label: 'Failed snapshots',
      value: comparison.failedSnapshotsChangeCount,
      unit: '',
      goodWhenPositive: false,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <SectionTitle icon={ArrowLeftRight} title="Day-over-Day Change" />
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
          return (
            <div key={item.label} className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                {item.label}
              </p>
              <p className={cn('text-sm font-black font-mono', color)}>
                {isPositive ? '+' : ''}
                {item.value.toFixed(item.unit === 'pp' ? 2 : 0)}
                {item.unit}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CoverageMatrix({ matrix }: { matrix: DailyReportData['coverageMatrix'] }) {
  const providers = useMemo(() => [...new Set(matrix.map((m) => m.provider))].sort(), [matrix]);
  const assets = useMemo(() => [...new Set(matrix.map((m) => m.symbol))].sort(), [matrix]);

  if (providers.length === 0 || assets.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <SectionTitle icon={Grid3X3} title="Provider × Asset Coverage" />
        <p className="text-sm text-gray-500 text-center py-8">No coverage data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-x-auto">
      <SectionTitle icon={Grid3X3} title="Provider × Asset Coverage" />
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="text-left font-bold text-gray-500 p-2 sticky left-0 bg-white">
              Provider
            </th>
            {assets.map((asset) => (
              <th key={asset} className="text-center font-bold text-gray-500 p-2 min-w-[72px]">
                {asset}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {providers.map((provider) => (
            <tr key={provider} className="border-t border-gray-100">
              <td className="p-2 font-medium text-gray-700 sticky left-0 bg-white">
                {providerNames[provider] ?? provider}
              </td>
              {assets.map((asset) => {
                const cell = matrix.find((m) => m.provider === provider && m.symbol === asset);
                return (
                  <td key={asset} className="p-2 text-center align-middle">
                    {cell ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={cn(
                            'font-mono font-bold',
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
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <SectionTitle icon={XCircle} title="Failure Breakdown" />
      <div className="space-y-3">
        {breakdown.slice(0, 10).map((item) => (
          <div
            key={`${item.provider}-${item.symbol}`}
            className="flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800">
                {providerNames[item.provider] ?? item.provider} · {item.symbol}
              </p>
              {item.topError && <p className="text-xs text-gray-500 truncate">{item.topError}</p>}
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-100 flex-shrink-0">
              {item.failureCount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ report }: { report: DailyReportData }) {
  const TrendIcon =
    report.metrics.avgDeviationPct < 0.2
      ? TrendingUp
      : report.metrics.avgDeviationPct < 0.5
        ? Minus
        : TrendingDown;

  return (
    <div className="bg-slate-50 rounded-xl border border-gray-200 p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Daily Summary
        </span>
      </div>
      <h2 className="text-xl font-black text-slate-700 mb-3">{report.reportTitle}</h2>
      <p className="text-sm text-slate-600 leading-relaxed mb-5 flex-1">{report.summary}</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-slate-700">
          <TrendIcon className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">
            Avg deviation {report.metrics.avgDeviationPct.toFixed(3)}%
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-slate-700">
          <Shield className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">
            {report.metrics.overallSuccessRate.toFixed(1)}% success rate
          </span>
        </div>
      </div>
    </div>
  );
}

function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const tweetText = encodeURIComponent(
    `${title}\n\nCross-oracle deviation & risk summary via @InsightOracle`
  );
  const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all',
          copied
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
        )}
      >
        <Share2 className="w-3.5 h-3.5" />
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-all"
      >
        <Twitter className="w-3.5 h-3.5" />
        Tweet
      </a>
    </div>
  );
}

function Breadcrumb({ dateLabel }: { dateLabel: string }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-5">
      <Link href="/reports" className="hover:text-slate-600 transition-colors font-medium">
        Reports
      </Link>
      <ChevronRight className="w-3 h-3" />
      <span className="text-gray-900 font-medium">{dateLabel}</span>
    </nav>
  );
}

export default function ReportDetailContent({ initialReport }: ReportDetailContentProps) {
  const report = initialReport;
  const dateLabel = new Date(report.reportDate).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <ErrorBoundary level="page" componentName="ReportDetailContent">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
        <Breadcrumb dateLabel={dateLabel} />

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Oracle Daily Report
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">{dateLabel}</p>
            </div>
          </div>
          <ShareButtons url={pageUrl} title={report.reportTitle} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="lg:col-span-1">
            <SummaryCard report={report} />
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm h-full">
              <SectionTitle icon={Globe} title="Network Metrics" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <CompactStatCard
                  title="Total Snapshots"
                  value={report.metrics.totalSnapshots.toLocaleString()}
                  breakdown={[
                    { label: 'Success', value: report.metrics.successfulSnapshots },
                    { label: 'Failed', value: report.metrics.failedSnapshots },
                  ]}
                />
                <CompactStatCard
                  title="Success Rate"
                  value={`${report.metrics.overallSuccessRate.toFixed(1)}%`}
                />
                <CompactStatCard
                  title="Max Deviation"
                  value={`${report.metrics.maxDeviationPct.toFixed(3)}%`}
                />
                <CompactStatCard
                  title="Anomalies"
                  value={String(report.metrics.totalAnomalies)}
                  breakdown={[
                    { label: 'Critical', value: report.metrics.criticalEvents },
                    { label: 'High', value: report.metrics.highEvents },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                <CompactStatCard title="Avg Latency" value={`${report.metrics.avgLatencyMs}ms`} />
                <CompactStatCard
                  title="Active Providers"
                  value={String(report.metrics.activeProviders)}
                />
                <CompactStatCard
                  title="Active Assets"
                  value={String(report.metrics.activeAssets)}
                />
                <CompactStatCard
                  title="Avg Deviation"
                  value={`${report.metrics.avgDeviationPct.toFixed(3)}%`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="lg:col-span-2">
            <Highlights highlights={report.highlights} />
          </div>
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm h-full">
              <SectionTitle icon={Activity} title="Anomaly Breakdown" />
              <div className="space-y-3">
                {Object.entries(report.anomalySummary.bySeverity).map(([severity, count]) => {
                  const config = getSeverityConfig(severity);
                  const total = report.anomalySummary.total || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={severity}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${config.indicator}`} />
                          <span className="text-xs font-medium text-gray-700">{config.label}</span>
                        </div>
                        <span className="text-sm font-bold font-mono text-gray-800">{count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', config.indicator)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">
                  Most affected assets
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(report.anomalySummary.byAsset)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([asset, count]) => (
                      <span
                        key={asset}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-100"
                      >
                        {asset}: {count}
                      </span>
                    ))}
                </div>
              </div>
            </div>
            <PreviousDayComparison comparison={report.previousDayComparison} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="lg:col-span-2">
            <Recommendations recommendations={report.recommendations} />
          </div>
          <div className="lg:col-span-1">
            <FailureBreakdown breakdown={report.failureBreakdown} />
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <SectionTitle icon={Award} title="Provider Performance Rankings" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {report.providerRankings.map((ranking, index) => (
                <ProviderRankingCard key={ranking.provider} ranking={ranking} rank={index + 1} />
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <CoverageMatrix matrix={report.coverageMatrix} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <SectionTitle icon={BarChart3} title="Asset Performance" />
            <AssetStatsTable assets={report.topAssets} />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <SectionTitle icon={AlertTriangle} title="Deviation Events" />
            <DeviationEventsList events={report.deviationEvents} />
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-3">
            <FileDigit className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 leading-relaxed">
                This report was generated automatically by Insight at 03:00 UTC based on a single
                daily cross-oracle snapshot. Data is collected from public oracle feeds and may not
                represent the full intraday price history. For real-time data, visit the{' '}
                <Link href="/price-insight" className="text-slate-600 hover:underline font-medium">
                  Price Insight
                </Link>{' '}
                dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
