import { reportService } from './reportService';

export interface AnomalyAggregationInput {
  days: number;
}

export interface AnomalyEventRecord extends Record<string, unknown> {
  reportDate: string;
}

export interface AnomalyImpactRecord extends Record<string, unknown> {
  reportDate: string;
}

export interface AnomalyReportSummary {
  reportDate: string;
  totalAnomalies: number;
  criticalEvents: number;
  highEvents: number;
}

export interface AnomalyAggregationResult {
  periodDays: number;
  dateRange: {
    start: string;
    end: string;
  };
  totalEvents: number;
  bySeverity: Record<string, number>;
  byProvider: Record<string, number>;
  byAsset: Record<string, number>;
  allEvents: AnomalyEventRecord[];
  allImpacts: AnomalyImpactRecord[];
  reports: AnomalyReportSummary[];
}

/**
 * Aggregate anomaly events across daily reports.
 * Shared between the v1/anomalies API route and the MCP get_anomalies tool.
 */
export async function aggregateAnomalies(
  input: AnomalyAggregationInput
): Promise<AnomalyAggregationResult> {
  const { days } = input;
  const reports = await reportService.listReports(days);

  const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const byProvider: Record<string, number> = {};
  const byAsset: Record<string, number> = {};
  let totalEvents = 0;

  const allEvents: AnomalyEventRecord[] = [];
  const allImpacts: AnomalyImpactRecord[] = [];
  const reportSummaries: AnomalyReportSummary[] = [];

  for (const report of reports) {
    const summary = report.anomalySummary;
    totalEvents += summary.total;

    for (const [severity, count] of Object.entries(summary.bySeverity)) {
      bySeverity[severity] = (bySeverity[severity] ?? 0) + count;
    }
    for (const [provider, count] of Object.entries(summary.byProvider)) {
      byProvider[provider] = (byProvider[provider] ?? 0) + count;
    }
    for (const [asset, count] of Object.entries(summary.byAsset)) {
      byAsset[asset] = (byAsset[asset] ?? 0) + count;
    }

    for (const event of report.deviationEvents) {
      allEvents.push({ ...event, reportDate: report.reportDate });
    }
    for (const impact of report.riskImpacts) {
      allImpacts.push({ ...impact, reportDate: report.reportDate });
    }

    reportSummaries.push({
      reportDate: report.reportDate,
      totalAnomalies: summary.total,
      criticalEvents: summary.bySeverity.critical ?? 0,
      highEvents: summary.bySeverity.high ?? 0,
    });
  }

  return {
    periodDays: days,
    dateRange: {
      start: reports[reports.length - 1]?.reportDate,
      end: reports[0]?.reportDate,
    },
    totalEvents,
    bySeverity,
    byProvider,
    byAsset,
    allEvents,
    allImpacts,
    reports: reportSummaries,
  };
}
