import { cache } from 'react';

import { notFound } from 'next/navigation';

import { type Metadata } from 'next';

import { reportService, type DailyReportData } from '@/lib/reports/reportService';

import ReportDetailContent from './ReportDetailContent';

interface ReportDetailPageProps {
  params: Promise<{ date: string }>;
}

// Dedupe the Supabase query across generateMetadata and the page
// render within a single request. Without this, getReportByDate is
// called twice per page view (metadata + render), doubling DB load.
const getReportCached = cache(async (date: string): Promise<DailyReportData | null> => {
  return reportService.getReportByDate(date).catch(() => null);
});

export async function generateMetadata({ params }: ReportDetailPageProps): Promise<Metadata> {
  const { date } = await params;
  const report = await getReportCached(date);

  if (!report) {
    return {
      title: 'Report Not Found - Insight',
    };
  }

  return {
    title: `${report.reportTitle} - Insight`,
    description: report.summary,
  };
}

// Historical reports are immutable; today's report updates as new snapshots arrive (every 15 min).
// Revalidate every 15 minutes — past dates will be served from the ISR cache.
export const revalidate = 900;

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { date } = await params;
  const report = await getReportCached(date);

  if (!report) {
    notFound();
  }

  return <ReportDetailContent initialReport={report} />;
}
