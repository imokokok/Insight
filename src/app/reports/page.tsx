import { unstable_cache } from 'next/cache';

import { type Metadata } from 'next';

import { reportService } from '@/lib/reports/reportService';

import ReportsContent from './ReportsContent';

export const metadata: Metadata = {
  title: 'Daily Oracle Reports - Insight',
  description:
    'Daily summaries of oracle price performance, cross-provider deviations, and risk highlights across the Insight network.',
};

// The archive depends on Supabase and must be rendered at request time so a
// deployment never depends on database availability. Cache the bounded query
// for five minutes to retain ISR-like response speed across requests.
export const dynamic = 'force-dynamic';

const getReportSummariesCached = unstable_cache(
  () => reportService.listReportSummaries(365),
  ['report-summaries'],
  { revalidate: 300, tags: ['daily-reports'] }
);

export default async function ReportsPage() {
  // Prefetch up to 365 summaries on the server. Only the columns the
  // list view actually needs are selected (report_date, summary,
  // metrics, deviation_events), avoiding transfer of the large
  // nested arrays (coverageMatrix, providerRankings, topAssets, ...).
  const reports = await getReportSummariesCached();
  return <ReportsContent initialReports={reports} />;
}
