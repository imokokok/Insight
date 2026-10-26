import { unstable_cache } from 'next/cache';

import { type Metadata } from 'next';

import { reportService } from '@/lib/reports/reportService';
import { createLogger } from '@/lib/utils/logger';

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

const logger = createLogger('reports-page');

async function getReportSummariesForPage() {
  try {
    return { reports: await getReportSummariesCached(), unavailable: false };
  } catch (error) {
    // Reports are useful evidence, not a prerequisite for the public archive
    // shell. Preserve a navigable page when Supabase is briefly unavailable.
    logger.warn('Unable to load report summaries', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { reports: [], unavailable: true };
  }
}

export default async function ReportsPage() {
  // Prefetch up to 365 summaries on the server. Only the columns the
  // list view actually needs are selected (report_date, summary,
  // metrics, deviation_events), avoiding transfer of the large
  // nested arrays (coverageMatrix, providerRankings, topAssets, ...).
  const { reports, unavailable } = await getReportSummariesForPage();
  return <ReportsContent initialReports={reports} initialDataUnavailable={unavailable} />;
}
