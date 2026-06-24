'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Calendar,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  Share2,
} from 'lucide-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { apiClient } from '@/lib/api';
import { providerNames } from '@/lib/constants';
import { type DailyReportData } from '@/lib/reports/reportService';
import { cn } from '@/lib/utils';

interface ReportsApiResponse {
  success: boolean;
  data: DailyReportData[];
  meta: {
    limit: number;
    offset: number;
    count: number;
  };
}

const ITEMS_PER_PAGE = 12;

async function fetchReports(): Promise<DailyReportData[]> {
  const response = await apiClient.get<ReportsApiResponse>('/api/reports?limit=365');
  return response.data.data ?? [];
}

function useReports() {
  return useQuery<DailyReportData[], Error>({
    queryKey: ['daily-reports'],
    queryFn: fetchReports,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'medium':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    default:
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
}

function ReportStatusBadge({ metrics }: { metrics: DailyReportData['metrics'] }) {
  const hasCritical = metrics.criticalEvents > 0;
  const hasHigh = metrics.highEvents > 0;

  if (hasCritical) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border-red-200">
        <AlertTriangle className="w-3 h-3" />
        {metrics.criticalEvents} Critical
      </div>
    );
  }

  if (hasHigh) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border-orange-200">
        <AlertTriangle className="w-3 h-3" />
        {metrics.highEvents} High Risk
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
      <CheckCircle2 className="w-3 h-3" />
      Stable
    </div>
  );
}

function ReportCard({ report }: { report: DailyReportData }) {
  const date = new Date(report.reportDate);
  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const topEvent = report.deviationEvents[0];

  return (
    <Link
      href={`/reports/${report.reportDate}`}
      className="group flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
    >
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 shadow-md shadow-slate-300/30">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                {date.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                <Calendar className="w-3 h-3" />
                {dateLabel}
              </div>
            </div>
          </div>
          <ReportStatusBadge metrics={report.metrics} />
        </div>

        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mb-4 flex-1">
          {report.summary}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
            <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">
              Providers
            </div>
            <div className="text-sm font-bold text-gray-900 font-mono">
              {report.metrics.activeProviders}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
            <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">
              Success
            </div>
            <div className="text-sm font-bold text-gray-900 font-mono">
              {report.metrics.overallSuccessRate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
            <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">
              Avg Dev
            </div>
            <div className="text-sm font-bold text-gray-900 font-mono">
              {report.metrics.avgDeviationPct.toFixed(3)}%
            </div>
          </div>
        </div>

        {topEvent ? (
          <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3 mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${getSeverityColor(
                  topEvent.severity
                )}`}
              >
                {topEvent.severity}
              </span>
              <span className="text-xs font-medium text-gray-700">
                {providerNames[topEvent.provider] ?? topEvent.provider} · {topEvent.symbol}
              </span>
            </div>
            <div className="text-xs text-gray-600 font-mono">
              {Math.abs(topEvent.deviationPct).toFixed(3)}% from consensus
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">
              All providers aligned with consensus
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-500 font-medium">
              {report.metrics.totalAnomalies} anomalies
            </span>
            <span className="text-[10px] text-gray-500 font-medium">
              {report.topAssets.length} assets
            </span>
          </div>
          <span className="flex items-center gap-0.5 text-xs font-bold text-gray-500 group-hover:text-slate-700 transition-colors">
            View
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Prev
      </button>
      <span className="text-xs font-medium text-gray-500 px-3">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ShareReportButton({ url }: { url: string }) {
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

  return (
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
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}

function ReportsContentInner() {
  const { data: reports, isLoading, error } = useReports();
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedReports = useMemo(() => {
    if (!reports) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return reports.slice(start, start + ITEMS_PER_PAGE);
  }, [reports, currentPage]);

  const totalPages = useMemo(() => {
    if (!reports) return 0;
    return Math.ceil(reports.length / ITEMS_PER_PAGE);
  }, [reports]);

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
            <span className="text-sm text-gray-600 font-medium">Loading reports...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reports || reports.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
        <Header />
        <EmptyStateEnhanced
          type="new"
          title="No Reports Yet"
          description="Daily reports will appear here once the cron job starts collecting snapshots. The first report will be generated at 03:00 UTC."
          size="lg"
          variant="page"
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen">
      <Header />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              About Daily Reports
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            Every day at 03:00 UTC, Insight captures a cross-oracle price snapshot for key crypto
            assets and publishes an aggregated report. Reports measure consensus alignment, provider
            uptime, latency, and deviation events across all 10 integrated oracle networks:
            Chainlink, Pyth, RedStone, API3, DIA, WINkLink, Supra, TWAP, Reflector, and Flare.
          </p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg shadow-slate-300/40 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-slate-300" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Latest Update
            </span>
          </div>
          <p className="text-2xl font-black">{reports.length}</p>
          <p className="text-xs text-slate-300 mt-0.5">
            {reports.length === 1 ? 'report published' : 'reports published'} since launch
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">All Reports</h2>
        <ShareReportButton url={typeof window !== 'undefined' ? window.location.href : ''} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {paginatedReports.map((report) => (
          <ReportCard key={report.reportDate} report={report} />
        ))}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}

function Header() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 shadow-md shadow-slate-300/30">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Daily Oracle Reports</h1>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">
            Automated transparency reports for cross-oracle price consensus
          </p>
        </div>
      </div>
      <button
        onClick={handleCopy}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all self-start sm:self-auto',
          copied
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
        )}
      >
        <Share2 className="w-3.5 h-3.5" />
        {copied ? 'Copied!' : 'Share page'}
      </button>
    </div>
  );
}

export default function ReportsContent() {
  return (
    <ErrorBoundary level="page" componentName="ReportsContent">
      <ReportsContentInner />
    </ErrorBoundary>
  );
}
