import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider } from '@/types/oracle';

const logger = createLogger('ReportService');

function sanitizeJsonValue(value: unknown): unknown {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonValue);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitizeJsonValue(v)])
    );
  }
  return value;
}

export const REPORT_ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'LINK'] as const;
export const REPORT_PROVIDERS: OracleProvider[] = [
  'chainlink',
  'pyth',
  'redstone',
  'api3',
  'dia',
  'winklink',
  'supra',
  'twap',
  'reflector',
  'flare',
] as OracleProvider[];

export interface HourlySnapshotInput {
  snapshotHour: Date;
  provider: OracleProvider;
  symbol: string;
  price: number;
  consensusPrice?: number | null;
  deviationPct?: number | null;
  latencyMs?: number | null;
  dataAgeSeconds?: number | null;
  confidence?: number | null;
  isSuccess: boolean;
  errorMessage?: string | null;
}

export interface DeviationEvent {
  provider: OracleProvider;
  symbol: string;
  hour: string;
  price: number;
  consensusPrice: number;
  deviationPct: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProviderRanking {
  provider: OracleProvider;
  totalQueries: number;
  successQueries: number;
  successRate: number;
  avgLatencyMs: number;
  avgDeviationPct: number;
  maxDeviationPct: number;
  anomalyCount: number;
  score: number;
}

export interface AssetDailyStats {
  symbol: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  avgConsensusPrice: number;
  maxDeviationPct: number;
  avgDeviationPct: number;
  volatilityPct: number;
  sampleCount: number;
}

export interface CoverageCell {
  provider: OracleProvider;
  symbol: string;
  total: number;
  success: number;
  failed: number;
  avgDeviationPct: number;
  maxDeviationPct: number;
}

export interface FailureBreakdown {
  provider: OracleProvider;
  symbol: string;
  failureCount: number;
  topError?: string;
}

export interface PreviousDayComparison {
  reportAvailable: boolean;
  successRateChangePct: number;
  avgDeviationChangePct: number;
  anomalyChangeCount: number;
  failedSnapshotsChangeCount: number;
}

export interface DailyReportMetrics {
  totalSnapshots: number;
  successfulSnapshots: number;
  failedSnapshots: number;
  overallSuccessRate: number;
  avgDeviationPct: number;
  maxDeviationPct: number;
  totalAnomalies: number;
  criticalEvents: number;
  highEvents: number;
  avgLatencyMs: number;
  activeProviders: number;
  activeAssets: number;
  activeHours: number;
}

export interface DailyReportData {
  reportDate: string;
  reportTitle: string;
  summary: string;
  highlights: string[];
  recommendations: string[];
  metrics: DailyReportMetrics;
  topAssets: AssetDailyStats[];
  providerRankings: ProviderRanking[];
  deviationEvents: DeviationEvent[];
  anomalySummary: {
    total: number;
    bySeverity: Record<'low' | 'medium' | 'high' | 'critical', number>;
    byProvider: Record<string, number>;
    byAsset: Record<string, number>;
  };
  coverageMatrix: CoverageCell[];
  failureBreakdown: FailureBreakdown[];
  previousDayComparison: PreviousDayComparison;
}

interface SnapshotRow {
  snapshot_hour: string;
  provider: string;
  symbol: string;
  price: number;
  consensus_price: number | null;
  deviation_pct: number | null;
  latency_ms: number | null;
  data_age_seconds: number | null;
  confidence: number | null;
  is_success: boolean;
  error_message: string | null;
}

function getSeverity(deviationPct: number): 'low' | 'medium' | 'high' | 'critical' {
  const absDev = Math.abs(deviationPct);
  if (absDev >= 2) return 'critical';
  if (absDev >= 1) return 'high';
  if (absDev >= 0.5) return 'medium';
  return 'low';
}

function scoreProvider(ranking: Omit<ProviderRanking, 'score'>): number {
  const successWeight = 30;
  const deviationWeight = 25;
  const latencyWeight = 20;
  const anomalyWeight = 15;
  const coverageWeight = 10;

  const successScore = ranking.successRate;
  const deviationScore = Math.max(0, 100 - (ranking.avgDeviationPct / 0.5) * 20);
  const latencyScore = Math.max(0, 100 - (ranking.avgLatencyMs / 1000) * 25);
  const anomalyScore = Math.max(0, 100 - ranking.anomalyCount * 5);
  const coverageScore = Math.min(100, (ranking.totalQueries / 24) * 100);

  return Number(
    (
      (successScore * successWeight +
        deviationScore * deviationWeight +
        latencyScore * latencyWeight +
        anomalyScore * anomalyWeight +
        coverageScore * coverageWeight) /
      100
    ).toFixed(2)
  );
}

export class ReportService {
  async upsertHourlySnapshots(inputs: HourlySnapshotInput[]): Promise<number> {
    if (inputs.length === 0) return 0;

    const supabase = createServiceRoleClient();
    const rows = inputs.map((input) => ({
      snapshot_hour: input.snapshotHour.toISOString(),
      provider: input.provider,
      symbol: input.symbol,
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
      onConflict: 'snapshot_hour,provider,symbol',
    });

    if (error) {
      logger.error('Failed to upsert hourly snapshots', error);
      throw error;
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

    const metrics = this.calculateMetrics(snapshots);
    const topAssets = this.calculateAssetStats(snapshots);
    const providerRankings = this.calculateProviderRankings(snapshots);
    const deviationEvents = this.extractDeviationEvents(snapshots);
    const anomalySummary = this.calculateAnomalySummary(snapshots, deviationEvents);
    const coverageMatrix = this.calculateCoverageMatrix(snapshots);
    const failureBreakdown = this.calculateFailureBreakdown(snapshots);
    const previousDayComparison = await this.calculatePreviousDayComparison(dateStr, metrics);
    const highlights = this.generateHighlights(
      metrics,
      topAssets,
      providerRankings,
      deviationEvents,
      failureBreakdown
    );
    const recommendations = this.generateRecommendations(
      metrics,
      providerRankings,
      topAssets,
      failureBreakdown,
      deviationEvents
    );
    const summary = this.generateSummary(
      dateStr,
      metrics,
      topAssets,
      providerRankings,
      deviationEvents,
      failureBreakdown,
      previousDayComparison
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
      highlights,
      recommendations,
      metrics,
      topAssets,
      providerRankings,
      deviationEvents,
      anomalySummary,
      coverageMatrix,
      failureBreakdown,
      previousDayComparison,
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
      highlights: report.highlights,
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

  private mapDbRowToReport(row: Record<string, unknown>): DailyReportData {
    const emptyComparison: PreviousDayComparison = {
      reportAvailable: false,
      successRateChangePct: 0,
      avgDeviationChangePct: 0,
      anomalyChangeCount: 0,
      failedSnapshotsChangeCount: 0,
    };

    return {
      reportDate: String(row.report_date),
      reportTitle: String(row.report_title),
      summary: String(row.summary),
      highlights: (row.highlights as string[]) ?? [],
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
    };
  }

  private calculateMetrics(snapshots: SnapshotRow[]): DailyReportMetrics {
    const total = snapshots.length;
    const successful = snapshots.filter((s) => s.is_success).length;
    const failed = total - successful;

    const successfulSnapshots = snapshots.filter(
      (s) => s.is_success && typeof s.deviation_pct === 'number'
    );

    const deviations = successfulSnapshots
      .map((s) => Math.abs(s.deviation_pct ?? 0))
      .filter((d) => Number.isFinite(d));

    const avgDeviation =
      deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;

    const maxDeviation = deviations.length > 0 ? Math.max(...deviations) : 0;

    const latencies = successfulSnapshots
      .map((s) => s.latency_ms)
      .filter((l): l is number => l !== null && l > 0);

    const avgLatency =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;

    const activeProviders = new Set(snapshots.map((s) => s.provider)).size;
    const activeAssets = new Set(snapshots.map((s) => s.symbol)).size;
    const activeHours = new Set(snapshots.map((s) => s.snapshot_hour.slice(0, 13))).size;

    const anomalies = this.extractDeviationEvents(snapshots);
    const criticalEvents = anomalies.filter((a) => a.severity === 'critical').length;
    const highEvents = anomalies.filter((a) => a.severity === 'high').length;

    return {
      totalSnapshots: total,
      successfulSnapshots: successful,
      failedSnapshots: failed,
      overallSuccessRate: total > 0 ? Number(((successful / total) * 100).toFixed(2)) : 0,
      avgDeviationPct: Number(avgDeviation.toFixed(4)),
      maxDeviationPct: Number(maxDeviation.toFixed(4)),
      totalAnomalies: anomalies.length,
      criticalEvents,
      highEvents,
      avgLatencyMs: avgLatency,
      activeProviders,
      activeAssets,
      activeHours,
    };
  }

  private calculateAssetStats(snapshots: SnapshotRow[]): AssetDailyStats[] {
    const bySymbol = new Map<string, SnapshotRow[]>();

    for (const s of snapshots) {
      if (!s.is_success) continue;
      const list = bySymbol.get(s.symbol) ?? [];
      list.push(s);
      bySymbol.set(s.symbol, list);
    }

    const stats: AssetDailyStats[] = [];

    for (const [symbol, rows] of bySymbol) {
      const prices = rows.map((r) => r.price).filter((p) => p > 0);
      const consensusPrices = rows
        .map((r) => r.consensus_price)
        .filter((p): p is number => p !== null && p > 0);
      const deviations = rows
        .map((r) => (r.deviation_pct != null ? Math.abs(r.deviation_pct) : null))
        .filter((d): d is number => d !== null && Number.isFinite(d));

      if (prices.length === 0) continue;

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const avgConsensusPrice =
        consensusPrices.length > 0
          ? consensusPrices.reduce((a, b) => a + b, 0) / consensusPrices.length
          : avgPrice;
      const maxDeviation = deviations.length > 0 ? Math.max(...deviations) : 0;
      const avgDeviation =
        deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;
      const volatilityPct =
        avgConsensusPrice > 0 ? ((maxPrice - minPrice) / avgConsensusPrice) * 100 : 0;

      stats.push({
        symbol,
        minPrice: Number(minPrice.toFixed(8)),
        maxPrice: Number(maxPrice.toFixed(8)),
        avgPrice: Number(avgPrice.toFixed(8)),
        avgConsensusPrice: Number(avgConsensusPrice.toFixed(8)),
        maxDeviationPct: Number(maxDeviation.toFixed(4)),
        avgDeviationPct: Number(avgDeviation.toFixed(4)),
        volatilityPct: Number(volatilityPct.toFixed(4)),
        sampleCount: rows.length,
      });
    }

    return stats.sort((a, b) => b.volatilityPct - a.volatilityPct);
  }

  private calculateProviderRankings(snapshots: SnapshotRow[]): ProviderRanking[] {
    const byProvider = new Map<string, SnapshotRow[]>();

    for (const s of snapshots) {
      const list = byProvider.get(s.provider) ?? [];
      list.push(s);
      byProvider.set(s.provider, list);
    }

    const rankings: ProviderRanking[] = [];

    for (const [provider, rows] of byProvider) {
      const total = rows.length;
      const successful = rows.filter((r) => r.is_success);
      const successRate = total > 0 ? (successful.length / total) * 100 : 0;

      const latencies = successful
        .map((r) => r.latency_ms)
        .filter((l): l is number => l !== null && l > 0);
      const avgLatency =
        latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : 0;

      const deviations = successful
        .map((r) => (r.deviation_pct != null ? Math.abs(r.deviation_pct) : null))
        .filter((d): d is number => d !== null && Number.isFinite(d));
      const avgDeviation =
        deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;
      const maxDeviation = deviations.length > 0 ? Math.max(...deviations) : 0;

      const anomalies = deviations.filter((d) => d >= 0.5).length;

      const ranking = {
        provider: provider as OracleProvider,
        totalQueries: total,
        successQueries: successful.length,
        successRate: Number(successRate.toFixed(2)),
        avgLatencyMs: avgLatency,
        avgDeviationPct: Number(avgDeviation.toFixed(4)),
        maxDeviationPct: Number(maxDeviation.toFixed(4)),
        anomalyCount: anomalies,
        score: 0,
      };

      rankings.push({ ...ranking, score: scoreProvider(ranking) });
    }

    return rankings.sort((a, b) => b.score - a.score);
  }

  private extractDeviationEvents(snapshots: SnapshotRow[]): DeviationEvent[] {
    const events: DeviationEvent[] = [];

    for (const s of snapshots) {
      if (!s.is_success || s.deviation_pct == null || s.consensus_price == null) continue;
      const absDev = Math.abs(s.deviation_pct);
      if (absDev < 0.5) continue;

      events.push({
        provider: s.provider as OracleProvider,
        symbol: s.symbol,
        hour: s.snapshot_hour,
        price: s.price,
        consensusPrice: s.consensus_price,
        deviationPct: Number(s.deviation_pct.toFixed(4)),
        severity: getSeverity(s.deviation_pct),
      });
    }

    return events.sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));
  }

  private calculateAnomalySummary(
    _snapshots: SnapshotRow[],
    deviationEvents: DeviationEvent[]
  ): DailyReportData['anomalySummary'] {
    const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const byProvider: Record<string, number> = {};
    const byAsset: Record<string, number> = {};

    for (const e of deviationEvents) {
      bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
      byProvider[e.provider] = (byProvider[e.provider] ?? 0) + 1;
      byAsset[e.symbol] = (byAsset[e.symbol] ?? 0) + 1;
    }

    return {
      total: deviationEvents.length,
      bySeverity: bySeverity as DailyReportData['anomalySummary']['bySeverity'],
      byProvider,
      byAsset,
    };
  }

  private calculateCoverageMatrix(snapshots: SnapshotRow[]): CoverageCell[] {
    const grouped = new Map<string, SnapshotRow[]>();

    for (const s of snapshots) {
      const key = `${s.provider}:${s.symbol}`;
      const list = grouped.get(key) ?? [];
      list.push(s);
      grouped.set(key, list);
    }

    const cells: CoverageCell[] = [];
    for (const [, rows] of grouped) {
      const total = rows.length;
      const success = rows.filter((r) => r.is_success).length;
      const failed = total - success;
      const deviations = rows
        .filter((r) => r.is_success && r.deviation_pct != null)
        .map((r) => Math.abs(r.deviation_pct!));
      const avgDeviation =
        deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;
      const maxDeviation = deviations.length > 0 ? Math.max(...deviations) : 0;

      cells.push({
        provider: rows[0].provider as OracleProvider,
        symbol: rows[0].symbol,
        total,
        success,
        failed,
        avgDeviationPct: Number(avgDeviation.toFixed(4)),
        maxDeviationPct: Number(maxDeviation.toFixed(4)),
      });
    }

    return cells.sort(
      (a, b) => a.provider.localeCompare(b.provider) || a.symbol.localeCompare(b.symbol)
    );
  }

  private calculateFailureBreakdown(snapshots: SnapshotRow[]): FailureBreakdown[] {
    const grouped = new Map<string, SnapshotRow[]>();

    for (const s of snapshots) {
      if (s.is_success) continue;
      const key = `${s.provider}:${s.symbol}`;
      const list = grouped.get(key) ?? [];
      list.push(s);
      grouped.set(key, list);
    }

    const breakdown: FailureBreakdown[] = [];
    for (const [, rows] of grouped) {
      const errors = rows.map((r) => r.error_message).filter((e): e is string => !!e);
      const topError =
        errors.length > 0
          ? Object.entries(
              errors.reduce<Record<string, number>>((acc, e) => {
                acc[e] = (acc[e] ?? 0) + 1;
                return acc;
              }, {})
            ).sort((a, b) => b[1] - a[1])[0][0]
          : undefined;

      breakdown.push({
        provider: rows[0].provider as OracleProvider,
        symbol: rows[0].symbol,
        failureCount: rows.length,
        topError,
      });
    }

    return breakdown.sort((a, b) => b.failureCount - a.failureCount);
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
        anomalyChangeCount: 0,
        failedSnapshotsChangeCount: 0,
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
      anomalyChangeCount: metrics.totalAnomalies - prevMetrics.totalAnomalies,
      failedSnapshotsChangeCount: metrics.failedSnapshots - prevMetrics.failedSnapshots,
    };
  }

  private generateRecommendations(
    metrics: DailyReportMetrics,
    providerRankings: ProviderRanking[],
    topAssets: AssetDailyStats[],
    failureBreakdown: FailureBreakdown[],
    deviationEvents: DeviationEvent[]
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.overallSuccessRate < 90) {
      recommendations.push(
        `Overall snapshot success rate (${metrics.overallSuccessRate.toFixed(1)}%) is below 90%. Review provider endpoint health and consider adding fallback feeds for the most affected asset/provider pairs.`
      );
    }

    if (metrics.criticalEvents > 0) {
      recommendations.push(
        `${metrics.criticalEvents} critical deviation event(s) (≥2%) occurred. Audit affected price feeds before using them as primary references for liquidations or collateral valuation.`
      );
    } else if (metrics.highEvents > 0) {
      recommendations.push(
        `${metrics.highEvents} high deviation event(s) (1-2%) occurred. Monitor these feeds closely and verify whether outliers correlate with exchange-specific volatility.`
      );
    }

    const worstProvider = providerRankings[providerRankings.length - 1];
    if (worstProvider && (worstProvider.successRate < 95 || worstProvider.avgDeviationPct >= 0.5)) {
      recommendations.push(
        `${worstProvider.provider} underperformed with a ${worstProvider.successRate.toFixed(1)}% success rate and ${worstProvider.avgDeviationPct.toFixed(3)}% average deviation. Evaluate its weight in consensus calculations.`
      );
    }

    if (failureBreakdown.length > 0) {
      const topFailure = failureBreakdown[0];
      recommendations.push(
        `The most frequent failure was ${topFailure.provider} / ${topFailure.symbol} (${topFailure.failureCount} times${topFailure.topError ? `: ${topFailure.topError}` : ''}). Investigate this feed pair first.`
      );
    }

    if (topAssets.length > 0) {
      const mostVolatile = topAssets[0];
      if (mostVolatile.volatilityPct > 5) {
        recommendations.push(
          `${mostVolatile.symbol} exhibited high intraday volatility (${mostVolatile.volatilityPct.toFixed(2)}%). Consider using TWAP or multi-source aggregation for this asset during volatile periods.`
        );
      }
    }

    if (metrics.avgLatencyMs > 2000) {
      recommendations.push(
        `Average feed latency is ${metrics.avgLatencyMs} ms. Latency above 2 seconds may introduce stale-price risk for time-sensitive applications.`
      );
    }

    if (deviationEvents.length === 0 && metrics.overallSuccessRate >= 95) {
      recommendations.push(
        'All monitored providers stayed close to consensus with high uptime. Maintain current monitoring cadence and watch for any new feed degradation.'
      );
    }

    return recommendations;
  }

  private generateHighlights(
    metrics: DailyReportMetrics,
    topAssets: AssetDailyStats[],
    providerRankings: ProviderRanking[],
    deviationEvents: DeviationEvent[],
    failureBreakdown: FailureBreakdown[]
  ): string[] {
    const highlights: string[] = [];

    if (metrics.criticalEvents > 0) {
      highlights.push(
        `${metrics.criticalEvents} critical deviation event${metrics.criticalEvents > 1 ? 's' : ''} detected — oracles diverged ≥2% from consensus, indicating elevated liquidation risk.`
      );
    } else if (metrics.highEvents > 0) {
      highlights.push(
        `${metrics.highEvents} high-severity deviation event${metrics.highEvents > 1 ? 's' : ''} detected (1-2% from consensus). Price feeds remain usable but warrant monitoring.`
      );
    } else {
      highlights.push(
        'No severe deviation events (≥1%) detected. Oracle networks demonstrated strong consensus throughout the day.'
      );
    }

    if (topAssets.length > 0) {
      const mostVolatile = topAssets[0];
      highlights.push(
        `${mostVolatile.symbol} showed the highest intraday volatility at ${mostVolatile.volatilityPct.toFixed(2)}% between min/max consensus prices.`
      );

      const mostDeviated = topAssets
        .slice()
        .sort((a, b) => b.avgDeviationPct - a.avgDeviationPct)[0];
      if (mostDeviated.avgDeviationPct > 0) {
        highlights.push(
          `${mostDeviated.symbol} had the largest average deviation from consensus (${mostDeviated.avgDeviationPct.toFixed(3)}%), suggesting the most disagreement among providers.`
        );
      }
    }

    if (providerRankings.length > 0) {
      const best = providerRankings[0];
      const worst = providerRankings[providerRankings.length - 1];
      highlights.push(
        `${best.provider} ranked #1 with ${best.successRate.toFixed(1)}% uptime and ${best.avgDeviationPct.toFixed(3)}% average deviation.`
      );
      if (worst.avgDeviationPct >= 0.5 || worst.successRate < 95) {
        highlights.push(
          `${worst.provider} lagged behind with ${worst.avgDeviationPct.toFixed(3)}% average deviation and ${worst.successRate.toFixed(1)}% success rate.`
        );
      }
    }

    if (metrics.failedSnapshots > 0) {
      const failureRate =
        metrics.totalSnapshots > 0 ? (metrics.failedSnapshots / metrics.totalSnapshots) * 100 : 0;
      highlights.push(
        `${metrics.failedSnapshots} price snapshots failed (${failureRate.toFixed(1)}%), primarily due to provider timeouts or stale feeds.`
      );
      if (failureBreakdown.length > 0) {
        const top = failureBreakdown[0];
        highlights.push(
          `Most failures clustered on ${top.provider} / ${top.symbol} (${top.failureCount} failures).`
        );
      }
    } else {
      highlights.push(
        'All hourly snapshots were collected successfully across every active provider.'
      );
    }

    if (metrics.avgLatencyMs > 0) {
      highlights.push(
        `Average feed latency was ${metrics.avgLatencyMs} ms across ${metrics.activeHours} active hourly window${metrics.activeHours > 1 ? 's' : ''}.`
      );
    }

    if (deviationEvents.length > 0) {
      const worst = deviationEvents[0];
      highlights.push(
        `The largest single deviation was ${worst.provider} / ${worst.symbol} at ${Math.abs(worst.deviationPct).toFixed(3)}% during ${new Date(worst.hour).toISOString().slice(11, 16)} UTC.`
      );
    }

    return highlights;
  }

  private generateSummary(
    dateStr: string,
    metrics: DailyReportMetrics,
    topAssets: AssetDailyStats[],
    providerRankings: ProviderRanking[],
    deviationEvents: DeviationEvent[],
    failureBreakdown: FailureBreakdown[],
    previousDayComparison: PreviousDayComparison
  ): string {
    const dateLabel = new Date(dateStr).toLocaleDateString('en-US', {
      timeZone: 'UTC',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const parts: string[] = [
      `On ${dateLabel}, Insight monitored ${metrics.activeAssets} assets across ${metrics.activeProviders} oracle providers, capturing ${metrics.totalSnapshots} hourly price snapshots over ${metrics.activeHours} active hourly window${metrics.activeHours > 1 ? 's' : ''}.`,
    ];

    if (metrics.overallSuccessRate >= 99) {
      parts.push(
        `Data collection was highly reliable with a ${metrics.overallSuccessRate.toFixed(1)}% success rate.`
      );
    } else if (metrics.overallSuccessRate >= 95) {
      parts.push(
        `Data collection was stable with a ${metrics.overallSuccessRate.toFixed(1)}% success rate.`
      );
    } else {
      parts.push(
        `Data collection experienced some instability, achieving a ${metrics.overallSuccessRate.toFixed(1)}% success rate with ${metrics.failedSnapshots} failed snapshots.`
      );
    }

    if (previousDayComparison.reportAvailable) {
      const srChange = previousDayComparison.successRateChangePct;
      const devChange = previousDayComparison.avgDeviationChangePct;
      const changeParts: string[] = [];
      if (srChange !== 0) {
        changeParts.push(
          `success rate ${srChange > 0 ? 'improved' : 'declined'} by ${Math.abs(srChange).toFixed(1)} percentage points`
        );
      }
      if (devChange !== 0) {
        changeParts.push(
          `average deviation ${devChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(devChange).toFixed(3)} percentage points`
        );
      }
      if (changeParts.length > 0) {
        parts.push(`Compared to the previous day, ${changeParts.join(' and ')}.`);
      }
    }

    if (topAssets.length > 0) {
      const top = topAssets[0];
      parts.push(
        `${top.symbol} recorded the widest price range, from ${formatPrice(top.minPrice)} to ${formatPrice(top.maxPrice)}, with ${top.volatilityPct.toFixed(2)}% intraday volatility.`
      );

      const mostDeviated = topAssets
        .slice()
        .sort((a, b) => b.avgDeviationPct - a.avgDeviationPct)[0];
      if (mostDeviated.avgDeviationPct > 0) {
        parts.push(
          `${mostDeviated.symbol} showed the largest average deviation from consensus (${mostDeviated.avgDeviationPct.toFixed(3)}%), indicating the most provider disagreement.`
        );
      }
    }

    if (deviationEvents.length > 0) {
      const worst = deviationEvents[0];
      parts.push(
        `Cross-oracle deviation analysis flagged ${deviationEvents.length} event${deviationEvents.length > 1 ? 's' : ''}; the largest was ${worst.provider} / ${worst.symbol} diverging ${Math.abs(worst.deviationPct).toFixed(3)}% from consensus at ${new Date(worst.hour).toISOString().slice(11, 16)} UTC.`
      );
    } else {
      parts.push(
        'Cross-oracle deviation analysis found all providers closely aligned with consensus, with no material divergence events.'
      );
    }

    if (failureBreakdown.length > 0) {
      const top = failureBreakdown[0];
      parts.push(
        `The most frequent failure cluster was ${top.provider} / ${top.symbol} (${top.failureCount} failures${top.topError ? `: ${top.topError}` : ''}).`
      );
    }

    if (providerRankings.length > 0) {
      const best = providerRankings[0];
      const worst = providerRankings[providerRankings.length - 1];
      parts.push(
        `${best.provider} led the daily ranking with a composite score of ${best.score.toFixed(1)}, while ${worst.provider} scored the lowest at ${worst.score.toFixed(1)}.`
      );
    }

    if (metrics.avgLatencyMs > 0) {
      parts.push(`Average feed latency was ${metrics.avgLatencyMs} ms.`);
    }

    return parts.join(' ');
  }
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '$0.00';

  const abs = Math.abs(value);
  if (abs >= 1000) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (abs >= 1)
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  if (abs >= 0.0001)
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 10 })}`;
}

export const reportService = new ReportService();
