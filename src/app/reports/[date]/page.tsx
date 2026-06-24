import { notFound } from 'next/navigation';

import { type Metadata } from 'next';

import { reportService } from '@/lib/reports/reportService';

import ReportDetailContent from './ReportDetailContent';

interface ReportDetailPageProps {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: ReportDetailPageProps): Promise<Metadata> {
  const { date } = await params;
  const report = await reportService.getReportByDate(date).catch(() => null);

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

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { date } = await params;
  const report = await reportService.getReportByDate(date).catch(() => null);

  if (!report) {
    notFound();
  }

  return <ReportDetailContent initialReport={report} />;
}
