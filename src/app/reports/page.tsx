import { type Metadata } from 'next';

import { reportService } from '@/lib/reports/reportService';

import ReportsContent from './ReportsContent';

export const metadata: Metadata = {
  title: 'Daily Oracle Reports - Insight',
  description:
    'Daily summaries of oracle price performance, cross-provider deviations, and risk highlights across the Insight network.',
};

// Reports are historical and update as new snapshots arrive (every 15 min); cache the rendered list.
export const revalidate = 300; // 5 minutes

export default async function ReportsPage() {
  // Prefetch up to 365 summaries on the server. Only the columns the
  // list view actually needs are selected (report_date, summary,
  // metrics, deviation_events), avoiding transfer of the large
  // nested arrays (coverageMatrix, providerRankings, topAssets, ...).
  const reports = await reportService.listReportSummaries(365);
  return <ReportsContent initialReports={reports} />;
}
