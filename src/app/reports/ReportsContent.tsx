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

import { EditorialWorkspaceHeader } from '@/components/editorial';
import { ErrorBoundary } from '@/components/error-boundary';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { providerNames } from '@/lib/constants';
import { type ReportSummary } from '@/lib/reports/reportService';

const ITEMS_PER_PAGE = 10;

type SummaryMetrics = ReportSummary['metrics'];

function StatusBadge({ metrics }: { metrics: SummaryMetrics }) {
  if (metrics.criticalEvents > 0) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded-md border border-red-100">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        {metrics.criticalEvents} critical
      </div>
    );
  }
  if (metrics.highEvents > 0) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        {metrics.highEvents} high risk
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Stable
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subvalue,
}: {
  icon: typeof FileText;
  label: string;
  value: React.ReactNode;
  subvalue?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 border-b border-r border-slate-900/10 bg-white/35 p-4 last:border-r-0 lg:border-b-0 lg:p-5">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center border border-blue-200 bg-blue-50">
        <Icon className="h-3.5 w-3.5 text-blue-600" />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900 tracking-tight tabular-nums">{value}</p>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        {subvalue && <div className="mt-0.5">{subvalue}</div>}
      </div>
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
    <div className="mb-8">
      <EditorialWorkspaceHeader
        index="05"
        stage="Review"
        eyebrow="A dated archive of cross-oracle observations. Each report records what the network saw, when it saw it, and where reliability changed."
        title="Turn daily observations into an audit trail."
        description="Review provider availability, consensus quality, deviation events, and asset coverage as a sequence of evidence—not a collection of snapshots."
        evidence={['Dated observations', 'Risk events', 'Reliability history']}
        action={
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 border border-slate-900/20 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {copied ? 'Copied' : 'Share archive'}
          </button>
        }
      />

      <div className="mb-3 flex items-center justify-between border-b border-slate-900/15 pb-3">
        <p className="editorial-index">01 — Archive coverage</p>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
          UTC record
        </span>
      </div>
      <div className="grid grid-cols-1 border-y border-slate-900/15 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={FileText} label="Reports published" value={reportCount} />
        <MetricCard icon={Globe} label="Oracle providers" value={providerCount} />
        <MetricCard
          icon={Calendar}
          label="Next report"
          value={<NextReportLabel />}
          subvalue={<span className="text-xs text-slate-400">UTC 03:00</span>}
        />
        <MetricCard icon={ShieldCheck} label="Tracked assets" value={assetCount} />
      </div>
    </div>
  );
}

function NextReportLabel() {
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

  return <span className="text-base font-semibold text-slate-900 tabular-nums">{label}</span>;
}

function ReportRow({ report }: { report: ReportSummary }) {
  const date = new Date(report.reportDate);
  const topEvent = report.topDeviationEvent;

  return (
    <Link
      href={`/reports/${report.reportDate}`}
      className="group grid grid-cols-12 gap-4 px-5 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 items-center"
    >
      <div className="col-span-12 sm:col-span-3 lg:col-span-2">
        <p className="text-sm font-semibold text-slate-950">
          {date.toLocaleDateString('en-US', {
            timeZone: 'UTC',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
        <p className="text-xs text-slate-500">
          {date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' })}
        </p>
      </div>

      <div className="col-span-12 sm:col-span-2 lg:col-span-1">
        <StatusBadge metrics={report.metrics} />
      </div>

      <div className="col-span-12 sm:col-span-7 lg:col-span-7">
        <p className="text-sm text-slate-700 line-clamp-1 leading-relaxed">{report.summary}</p>
        {topEvent && (
          <p className="text-xs text-slate-500 mt-1">
            {providerNames[topEvent.provider] ?? topEvent.provider} · {topEvent.symbol}{' '}
            <span className="font-mono font-medium text-slate-700">
              {Math.abs(topEvent.deviationPct).toFixed(3)}%
            </span>
          </p>
        )}
      </div>

      <div className="col-span-6 sm:col-span-6 lg:col-span-1">
        <p className="text-xs text-slate-500 mb-1 lg:hidden">Success rate</p>
        <p className="text-sm font-bold text-slate-950 tabular-nums">
          {report.metrics.overallSuccessRate.toFixed(1)}%
        </p>
      </div>

      <div className="col-span-6 sm:col-span-6 lg:col-span-1 text-right">
        <p className="text-xs text-slate-500 mb-1 lg:hidden">Avg deviation</p>
        <p className="text-sm font-bold text-slate-950 tabular-nums">
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
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-500">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-1 border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
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
    <div className="editorial-workspace min-h-screen">
      <div className="editorial-frame mx-auto max-w-[1440px] px-5 pb-20 pt-4 sm:px-8 lg:px-12 lg:pb-28">
        <Header reportCount={reportCount} providerCount={providerCount} assetCount={assetCount} />

        <section>
          <div className="mb-4 flex items-end justify-between border-b border-slate-900/15 pb-3">
            <div>
              <p className="editorial-index mb-1">02 — Open the record</p>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">Daily reports</h2>
            </div>
            {initialReports.length > 0 && (
              <span className="text-xs font-semibold text-slate-500">
                {paginatedReports.length} of {initialReports.length}
              </span>
            )}
          </div>

          {initialReports.length === 0 ? (
            <EmptyStateEnhanced
              type="new"
              title="No reports yet"
              description="Daily reports will appear here once the scheduled snapshot collection begins."
              size="md"
              variant="card"
            />
          ) : (
            <>
              <div className="overflow-hidden border-y border-slate-900/15 bg-white/45">
                <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-100/60 border-b border-slate-900/15 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
