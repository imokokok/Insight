'use client';

import { useState } from 'react';

import Link from 'next/link';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Globe,
  Grid3X3,
  Radio,
  Share2,
  Shield,
  ShieldAlert,
  TrendingDown,
  XCircle,
} from 'lucide-react';

import { ErrorBoundary } from '@/components/error-boundary';
import type { DailyReportData } from '@/lib/reports/reportService';

import {
  AssetTable,
  AssetTableInsight,
  CoverageMatrix,
  CoverageMatrixInsight,
  FailureBreakdown,
  FailureBreakdownInsight,
  ProviderRankingTable,
  ProviderRankingTableInsight,
} from './components/ReportDataTables';
import {
  HealthScoreGauge,
  NetworkHealthInsight,
  OracleHealthSummary,
  ProtocolLiquidationRiskPanel,
  ProtocolLiquidationRiskPanelInsight,
} from './components/ReportHealthPanel';
import {
  AnomalyBreakdown,
  AnomalyBreakdownInsight,
  DeviationEvents,
  DeviationEventsInsight,
  PreviousDayComparison,
  PreviousDayComparisonInsight,
  UnifiedRiskPanel,
  UnifiedRiskPanelInsight,
} from './components/ReportRiskPanels';
import {
  CollapsibleSummarySection,
  KeyTakeaways,
  MetricCard,
  SectionCard,
  StatusBadge,
} from './components/ReportShared';
import {
  AssetPerformancePreview,
  DeviationEventsPreview,
  FailureBreakdownPreview,
  LiquidationRiskPreview,
  ProviderPerformancePreview,
  RiskSummaryPreview,
} from './ReportDetailPreviews';

interface ReportDetailContentProps {
  initialReport: DailyReportData;
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              subtext={`${report.metrics.activeAssets} assets tracked`}
              icon={Globe}
              tone="neutral"
            />
          </div>

          {/* Key takeaways */}
          <div className="mb-10">
            <KeyTakeaways report={report} />
          </div>

          {/* Feedback overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <SectionCard title="Network health" icon={Shield}>
              <HealthScoreGauge report={report} />
              <OracleHealthSummary report={report} />
              <NetworkHealthInsight report={report} />
            </SectionCard>

            <SectionCard title="Anomaly breakdown" icon={AlertTriangle}>
              <AnomalyBreakdown report={report} />
              <AnomalyBreakdownInsight report={report} />
            </SectionCard>

            <SectionCard title="Day-over-day" icon={ArrowLeftRight}>
              <PreviousDayComparison comparison={report.previousDayComparison} />
              <PreviousDayComparisonInsight comparison={report.previousDayComparison} />
            </SectionCard>
          </div>

          {/* Unified risk summary */}
          <CollapsibleSummarySection
            title="Risk summary"
            icon={ShieldAlert}
            className="mb-6"
            summary={<RiskSummaryPreview report={report} />}
          >
            <UnifiedRiskPanel report={report} />
            <UnifiedRiskPanelInsight report={report} />
          </CollapsibleSummarySection>

          {/* Deviation events */}
          <CollapsibleSummarySection
            title="Deviation events"
            icon={AlertTriangle}
            className="mb-6"
            summary={<DeviationEventsPreview report={report} />}
          >
            <DeviationEvents report={report} />
            <DeviationEventsInsight report={report} />
          </CollapsibleSummarySection>

          {/* Lending liquidation stress test */}
          <CollapsibleSummarySection
            title="Lending liquidation stress test"
            icon={TrendingDown}
            className="mb-6"
            summary={<LiquidationRiskPreview risks={report.protocolLiquidationRisks ?? []} />}
          >
            <ProtocolLiquidationRiskPanel risks={report.protocolLiquidationRisks ?? []} />
            <ProtocolLiquidationRiskPanelInsight risks={report.protocolLiquidationRisks ?? []} />
          </CollapsibleSummarySection>

          {/* Detailed data tables with summary preview */}
          <CollapsibleSummarySection
            title="Provider performance"
            icon={Radio}
            className="mb-6"
            summary={<ProviderPerformancePreview rankings={report.providerRankings} />}
          >
            <ProviderRankingTable rankings={report.providerRankings} />
            <ProviderRankingTableInsight rankings={report.providerRankings} />
          </CollapsibleSummarySection>

          <CollapsibleSummarySection
            title="Asset performance"
            icon={BarChart3}
            className="mb-6"
            summary={<AssetPerformancePreview assets={report.topAssets} />}
          >
            <AssetTable assets={report.topAssets} />
            <AssetTableInsight assets={report.topAssets} />
          </CollapsibleSummarySection>

          <SectionCard title="Provider × asset coverage" icon={Grid3X3} className="mb-6">
            <CoverageMatrix matrix={report.coverageMatrix} />
            <CoverageMatrixInsight matrix={report.coverageMatrix} />
          </SectionCard>

          {report.failureBreakdown && report.failureBreakdown.length > 0 && (
            <CollapsibleSummarySection
              title="Failure breakdown"
              icon={XCircle}
              className="mb-6"
              summary={<FailureBreakdownPreview breakdown={report.failureBreakdown} />}
            >
              <FailureBreakdown breakdown={report.failureBreakdown} />
              <FailureBreakdownInsight breakdown={report.failureBreakdown} />
            </CollapsibleSummarySection>
          )}

          {/* Footer note */}
          <footer className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 leading-relaxed">
              Generated automatically by Insight from hourly cross-oracle snapshots collected
              throughout the day. Data is collected from public oracle feeds and may not represent
              full intraday price history. For current data, visit the{' '}
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
