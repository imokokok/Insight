'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  Share2,
  ShieldCheck,
} from 'lucide-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { providerNames } from '@/lib/constants';
import { type ReportSummary } from '@/lib/reports/reportService';

const ITEMS_PER_PAGE = 10;

type SummaryMetrics = ReportSummary['metrics'];

function StatusBadge({ metrics }: { metrics: SummaryMetrics }) {
  if (metrics.criticalEvents > 0) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        {metrics.criticalEvents} critical
      </div>
    );
  }
  if (metrics.highEvents > 0) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        {metrics.highEvents} high risk
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Stable
    </div>
  );
}

function Header({
  reportCount,
  providerCount,
  assetCount,
}: {
  reportCount: number;
  providerCount: number;
  assetCount: number;
}) {
  const [copied, setCopied] = useState(false);

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
    <div className="mb-12">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold text-gray-950 tracking-tight mb-2">
            Daily Oracle Reports
          </h1>
          <p className="text-[15px] text-gray-500 leading-relaxed">
            Automated cross-oracle consensus summaries updated hourly from integrated oracle
            networks. Track provider uptime, price deviations, and risk highlights across monitored
            assets.
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {copied ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          {copied ? 'Copied' : 'Share'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-px bg-gray-200 rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-white min-w-[180px] flex-1">
          <div className="p-2 bg-gray-50 rounded-lg">
            <FileText className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-950">{reportCount}</p>
            <p className="text-xs text-gray-500">Reports published</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4 bg-white min-w-[180px] flex-1">
          <div className="p-2 bg-gray-50 rounded-lg">
            <Globe className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-950">{providerCount}</p>
            <p className="text-xs text-gray-500">Oracle providers</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4 bg-white min-w-[180px] flex-1">
          <div className="p-2 bg-gray-50 rounded-lg">
            <Calendar className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <NextReportDate />
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4 bg-white min-w-[180px] flex-1">
          <div className="p-2 bg-gray-50 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-950">{assetCount}</p>
            <p className="text-xs text-gray-500">Tracked assets</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NextReportDate() {
  const label = useMemo(() => {
    const now = new Date();
    const next = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 3)
    );
    return next.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  return (
    <>
      <p className="text-sm font-semibold text-gray-950">{label}</p>
      <p className="text-xs text-gray-500">Next report</p>
    </>
  );
}

function ReportRow({ report }: { report: ReportSummary }) {
  const date = new Date(report.reportDate);
  const topEvent = report.topDeviationEvent;

  return (
    <Link
      href={`/reports/${report.reportDate}`}
      className="group grid grid-cols-12 gap-4 px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 items-center"
    >
      <div className="col-span-12 sm:col-span-3 lg:col-span-2">
        <p className="text-sm font-medium text-gray-950">
          {date.toLocaleDateString('en-US', {
            timeZone: 'UTC',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
        <p className="text-xs text-gray-500">
          {date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' })}
        </p>
      </div>

      <div className="col-span-12 sm:col-span-2 lg:col-span-1">
        <StatusBadge metrics={report.metrics} />
      </div>

      <div className="col-span-12 sm:col-span-7 lg:col-span-7">
        <p className="text-sm text-gray-700 line-clamp-1 leading-relaxed">{report.summary}</p>
        {topEvent && (
          <p className="text-xs text-gray-500 mt-1">
            {providerNames[topEvent.provider] ?? topEvent.provider} · {topEvent.symbol}{' '}
            <span className="font-mono">{Math.abs(topEvent.deviationPct).toFixed(3)}%</span>
          </p>
        )}
      </div>

      <div className="col-span-6 sm:col-span-6 lg:col-span-1">
        <p className="text-xs text-gray-500 mb-1 lg:hidden">Success rate</p>
        <p className="text-sm font-semibold text-gray-950 font-tabular">
          {report.metrics.overallSuccessRate.toFixed(1)}%
        </p>
      </div>

      <div className="col-span-6 sm:col-span-6 lg:col-span-1 text-right">
        <p className="text-xs text-gray-500 mb-1 lg:hidden">Avg deviation</p>
        <p className="text-sm font-semibold text-gray-950 font-tabular">
          {report.metrics.avgDeviationPct.toFixed(3)}%
        </p>
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
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
      <p className="text-xs text-gray-500">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function ReportsContentInner({ initialReports }: { initialReports: ReportSummary[] }) {
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return initialReports.slice(start, start + ITEMS_PER_PAGE);
  }, [initialReports, currentPage]);

  const totalPages = useMemo(
    () => Math.ceil(initialReports.length / ITEMS_PER_PAGE),
    [initialReports.length]
  );

  const reportCount = initialReports.length;
  const latestReport = initialReports[0];
  const providerCount = latestReport?.metrics.activeProviders ?? 0;
  const assetCount = latestReport?.metrics.activeAssets ?? 0;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Header reportCount={reportCount} providerCount={providerCount} assetCount={assetCount} />

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">All reports</h2>
            {initialReports.length > 0 && (
              <span className="text-xs text-gray-500">
                {paginatedReports.length} of {initialReports.length}
              </span>
            )}
          </div>

          {initialReports.length === 0 ? (
            <EmptyStateEnhanced
              type="new"
              title="No reports yet"
              description="Daily reports will appear here once the scheduled hourly snapshot collection begins."
              size="md"
              variant="card"
            />
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-7">Summary</div>
                  <div className="col-span-1">Success rate</div>
                  <div className="col-span-1 text-right">Avg deviation</div>
                </div>
                <div>
                  {paginatedReports.map((report) => (
                    <ReportRow key={report.reportDate} report={report} />
                  ))}
                </div>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ReportsContent({ initialReports }: { initialReports: ReportSummary[] }) {
  return (
    <ErrorBoundary level="page" componentName="ReportsContent">
      <ReportsContentInner initialReports={initialReports} />
    </ErrorBoundary>
  );
}
