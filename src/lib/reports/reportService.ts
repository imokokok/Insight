import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

import { calculatePercentageChange, sanitizeJsonValue } from './helpers';
import {
  calculateAnomalySummary,
  calculateAssetStats,
  calculateCoverageMatrix,
  calculateFailureBreakdown,
  calculateMetrics,
  calculateProtocolLiquidationRisks,
  calculateProviderRankings,
  calculateStablecoinDepegSummary,
  calculateWrappedAssetPegSummary,
  extractDeviationEvents,
  generateRecommendations,
  generateRiskImpacts,
  generateSummary,
} from './reportCalculations';

import type {
  AssetDailyStats,
  CoverageCell,
  DailyReportData,
  DailyReportMetrics,
  DeviationEvent,
  FailureBreakdown,
  HourlySnapshotInput,
  PreviousDayComparison,
  ProtocolLiquidationRisk,
  ProviderRanking,
  ReportSummary,
  RiskImpact,
  SnapshotRow,
  StablecoinDepegSummary,
  WrappedAssetPegSummary,
} from './types';

// Re-export types so external consumers importing from this file continue to work
export type {
  HourlySnapshotInput,
  DeviationEvent,
  ProviderRanking,
  ReportRiskLevel,
  StablecoinDepegSummary,
  WrappedAssetPegSummary,
  RiskImpact,
  ProtocolLiquidationScenario,
  ProtocolLiquidationRisk,
  DailyReportData,
  ReportSummary,
} from './types';

// Re-export constants
export { REPORT_ASSETS, REPORT_PROVIDERS } from './constants';

const logger = createLogger('ReportService');

class ReportService {
  async upsertHourlySnapshots(inputs: HourlySnapshotInput[]): Promise<number> {
    if (inputs.length === 0) return 0;

    const supabase = createServiceRoleClient();
    const rows = inputs.map((input) => ({
      snapshot_hour: input.snapshotHour.toISOString(),
      provider: input.provider,
      symbol: input.symbol,
      chain_id: input.chainId ?? 0,
      price: input.price,
      consensus_price: input.consensusPrice ?? null,
      deviation_pct: input.deviationPct ?? null,
      latency_ms: input.latencyMs ?? null,
      data_age_seconds: input.dataAgeSeconds ?? null,
      confidence: input.confidence ?? null,
      is_success: input.isSuccess,
      error_message: input.errorMessage ?? null,
    }));

    const { error } = await supabase.from('hourly_price_snapshots').upsert(rows, {
      onConflict: 'snapshot_hour,provider,symbol,chain_id',
    });

    if (error) {
      logger.error('Failed to upsert hourly snapshots', error);
      // Supabase PostgrestError is not a standard Error instance; normalize it
      // so upstream catch blocks get a readable message instead of [object Object].
      throw new Error(
        typeof error.message === 'string' ? error.message : 'Failed to upsert hourly snapshots'
      );
    }

    return rows.length;
  }

  async generateDailyReport(dateStr: string): Promise<DailyReportData> {
    logger.info(`Generating daily report for ${dateStr}`);
    const supabase = createServiceRoleClient();
    const reportDate = new Date(dateStr);
    const nextDay = new Date(reportDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const startAt = reportDate.toISOString();
    const endAt = nextDay.toISOString();

    const { data: rawSnapshots, error } = await supabase
      .from('hourly_price_snapshots')
      .select('*')
      .gte('snapshot_hour', startAt)
      .lt('snapshot_hour', endAt)
      .order('snapshot_hour', { ascending: true });

    if (error) {
      logger.error(`Failed to load snapshots for ${dateStr}`, error);
      throw error;
    }

    const snapshots: SnapshotRow[] = (rawSnapshots ?? []) as SnapshotRow[];

    if (snapshots.length === 0) {
      logger.warn(`No hourly snapshots found for ${dateStr}, generating empty report`);
    }

    const metrics = calculateMetrics(snapshots);
    const topAssets = calculateAssetStats(snapshots);
    const providerRankings = calculateProviderRankings(snapshots);
    const deviationEvents = extractDeviationEvents(snapshots);
    const anomalySummary = calculateAnomalySummary(snapshots, deviationEvents);
    const coverageMatrix = calculateCoverageMatrix(snapshots);
    const failureBreakdown = calculateFailureBreakdown(snapshots);
    const previousDayComparison = await this.calculatePreviousDayComparison(dateStr, metrics);
    const riskImpacts = generateRiskImpacts(
      deviationEvents,
      failureBreakdown,
      providerRankings,
      topAssets
    );
    const protocolLiquidationRisks = await calculateProtocolLiquidationRisks(snapshots);
    const stablecoinDepeg = calculateStablecoinDepegSummary(snapshots);
    const wrappedAssetPeg = calculateWrappedAssetPegSummary(snapshots);
    const recommendations = generateRecommendations(
      metrics,
      providerRankings,
      deviationEvents,
      riskImpacts,
      protocolLiquidationRisks,
      stablecoinDepeg,
      wrappedAssetPeg
    );
    const summary = generateSummary(
      dateStr,
      metrics,
      deviationEvents,
      previousDayComparison,
      riskImpacts,
      protocolLiquidationRisks,
      stablecoinDepeg,
      wrappedAssetPeg
    );

    const reportData: DailyReportData = {
      reportDate: dateStr,
      reportTitle: `Oracle Daily Report — ${new Date(dateStr).toLocaleDateString('en-US', {
        timeZone: 'UTC',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`,
      summary,
      recommendations,
      metrics,
      topAssets,
      providerRankings,
      deviationEvents,
      anomalySummary,
      coverageMatrix,
      failureBreakdown,
      previousDayComparison,
      riskImpacts,
      protocolLiquidationRisks,
      stablecoinDepeg,
      wrappedAssetPeg,
    };

    logger.info(
      `Persisting daily report for ${dateStr}: ${reportData.metrics.totalSnapshots} snapshots, ${reportData.metrics.overallSuccessRate}% success rate`
    );
    await this.persistReport(reportData);

    return reportData;
  }

  async persistReport(report: DailyReportData): Promise<void> {
    const supabase = createServiceRoleClient();

    const payload = {
      report_date: report.reportDate,
      report_title: report.reportTitle,
      summary: report.summary,
      recommendations: report.recommendations,
      metrics: sanitizeJsonValue(report.metrics) as DailyReportMetrics,
      top_assets: sanitizeJsonValue(report.topAssets) as AssetDailyStats[],
      provider_rankings: sanitizeJsonValue(report.providerRankings) as ProviderRanking[],
      deviation_events: sanitizeJsonValue(report.deviationEvents) as DeviationEvent[],
      anomaly_summary: sanitizeJsonValue(
        report.anomalySummary
      ) as DailyReportData['anomalySummary'],
      coverage_matrix: sanitizeJsonValue(report.coverageMatrix) as CoverageCell[],
      failure_breakdown: sanitizeJsonValue(report.failureBreakdown) as FailureBreakdown[],
      previous_day_comparison: sanitizeJsonValue(
        report.previousDayComparison
      ) as PreviousDayComparison,
      risk_impacts: sanitizeJsonValue(report.riskImpacts) as RiskImpact[],
      protocol_liquidation_risks: sanitizeJsonValue(
        report.protocolLiquidationRisks
      ) as ProtocolLiquidationRisk[],
      stablecoin_depeg: sanitizeJsonValue(report.stablecoinDepeg) as StablecoinDepegSummary[],
      wrapped_asset_peg: sanitizeJsonValue(report.wrappedAssetPeg) as WrappedAssetPegSummary[],
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('daily_reports')
      .upsert(payload, { onConflict: 'report_date' });

    if (error) {
      logger.error(`Failed to persist daily report ${report.reportDate}`, error);
      throw error;
    }
  }

  async getReportByDate(dateStr: string): Promise<DailyReportData | null> {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('report_date', dateStr)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error(`Failed to load report ${dateStr}`, error);
      throw error;
    }

    if (!data) return null;

    return this.mapDbRowToReport(data as Record<string, unknown>);
  }

  async listReports(limit: number = 30, offset: number = 0): Promise<DailyReportData[]> {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .order('report_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to list daily reports', error);
      throw error;
    }

    return (data ?? []).map((row: Record<string, unknown>) => this.mapDbRowToReport(row));
  }

  /**
   * Lightweight listing that selects only the columns the reports
   * list view actually renders. Avoids fetching large JSON arrays
   * (top_assets, provider_rankings, coverage_matrix, etc.) which
   * dominate the row size. Returns a trimmed ReportSummary.
   */
  async listReportSummaries(limit: number = 30, offset: number = 0): Promise<ReportSummary[]> {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('daily_reports')
      .select('report_date, summary, metrics, deviation_events')
      .order('report_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to list daily report summaries', error);
      throw error;
    }

    return (data ?? []).map((row: Record<string, unknown>) => {
      const metrics = (row.metrics as DailyReportMetrics | null) ?? ({} as DailyReportMetrics);
      const deviationEvents = (row.deviation_events as DeviationEvent[] | null) ?? [];
      return {
        reportDate: String(row.report_date),
        summary: String(row.summary ?? ''),
        metrics: {
          criticalEvents: metrics.criticalEvents ?? 0,
          highEvents: metrics.highEvents ?? 0,
          overallSuccessRate: metrics.overallSuccessRate ?? 0,
          avgDeviationPct: metrics.avgDeviationPct ?? 0,
          activeProviders: metrics.activeProviders ?? 0,
          activeAssets: metrics.activeAssets ?? 0,
        },
        topDeviationEvent: deviationEvents[0] ?? null,
      };
    });
  }

  private mapDbRowToReport(row: Record<string, unknown>): DailyReportData {
    const emptyComparison: PreviousDayComparison = {
      reportAvailable: false,
      successRateChangePct: 0,
      avgDeviationChangePct: 0,
      anomalyChangePct: 0,
      failedSnapshotsChangePct: 0,
    };

    return {
      reportDate: String(row.report_date),
      reportTitle: String(row.report_title),
      summary: String(row.summary),
      recommendations: (row.recommendations as string[]) ?? [],
      metrics: (row.metrics as DailyReportMetrics) ?? ({} as DailyReportMetrics),
      topAssets: (row.top_assets as AssetDailyStats[]) ?? [],
      providerRankings: (row.provider_rankings as ProviderRanking[]) ?? [],
      deviationEvents: (row.deviation_events as DeviationEvent[]) ?? [],
      anomalySummary:
        (row.anomaly_summary as DailyReportData['anomalySummary']) ??
        ({} as DailyReportData['anomalySummary']),
      coverageMatrix: (row.coverage_matrix as CoverageCell[]) ?? [],
      failureBreakdown: (row.failure_breakdown as FailureBreakdown[]) ?? [],
      previousDayComparison:
        (row.previous_day_comparison as PreviousDayComparison) ?? emptyComparison,
      riskImpacts: (row.risk_impacts as RiskImpact[]) ?? [],
      protocolLiquidationRisks: (row.protocol_liquidation_risks as ProtocolLiquidationRisk[]) ?? [],
      stablecoinDepeg: (row.stablecoin_depeg as StablecoinDepegSummary[]) ?? [],
      wrappedAssetPeg: (row.wrapped_asset_peg as WrappedAssetPegSummary[]) ?? [],
    };
  }

  private async calculatePreviousDayComparison(
    dateStr: string,
    metrics: DailyReportMetrics
  ): Promise<PreviousDayComparison> {
    const prev = new Date(dateStr);
    prev.setUTCDate(prev.getUTCDate() - 1);
    const prevDateStr = prev.toISOString().slice(0, 10);

    let previousReport: DailyReportData | null = null;
    try {
      previousReport = await this.getReportByDate(prevDateStr);
    } catch {
      previousReport = null;
    }

    if (!previousReport) {
      return {
        reportAvailable: false,
        successRateChangePct: 0,
        avgDeviationChangePct: 0,
        anomalyChangePct: 0,
        failedSnapshotsChangePct: 0,
      };
    }

    const prevMetrics = previousReport.metrics;

    return {
      reportAvailable: true,
      successRateChangePct: Number(
        (metrics.overallSuccessRate - prevMetrics.overallSuccessRate).toFixed(2)
      ),
      avgDeviationChangePct: Number(
        (metrics.avgDeviationPct - prevMetrics.avgDeviationPct).toFixed(4)
      ),
      anomalyChangePct: Number(
        calculatePercentageChange(metrics.totalAnomalies, prevMetrics.totalAnomalies).toFixed(2)
      ),
      failedSnapshotsChangePct: Number(
        calculatePercentageChange(metrics.failedSnapshots, prevMetrics.failedSnapshots).toFixed(2)
      ),
    };
  }
}

export const reportService = new ReportService();
