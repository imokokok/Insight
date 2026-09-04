'use client';

import { useState } from 'react';

import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Info, Lightbulb } from 'lucide-react';

import type { DailyReportData, ReportRiskLevel } from '@/lib/reports/reportService';
import { cn } from '@/lib/utils';

export function StatusBadge({ metrics }: { metrics: DailyReportData['metrics'] }) {
  if (metrics.criticalEvents > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 border-l-2 border-red-500 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700">
        <AlertTriangle className="w-3 h-3" />
        {metrics.criticalEvents} critical events
      </span>
    );
  }
  if (metrics.highEvents > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 border-l-2 border-orange-500 bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-700">
        <AlertTriangle className="w-3 h-3" />
        {metrics.highEvents} high risk events
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 border-l-2 border-emerald-500 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
      <CheckCircle2 className="w-3 h-3" />
      Stable
    </span>
  );
}

export function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('border-y border-slate-900/15 bg-white/45', className)}>
      <div className="flex items-center gap-2 border-b border-slate-900/10 px-5 py-4">
        <Icon className="w-4 h-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function CollapsibleSummarySection({
  title,
  icon: Icon,
  summary,
  children,
  className,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn('border-y border-slate-900/15 bg-white/45', className)}>
      <div className="flex items-center gap-2 border-b border-slate-900/10 px-5 py-4">
        <Icon className="w-4 h-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">
        {open ? children : summary}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="mt-4 inline-flex items-center gap-1.5 border-b border-slate-400 pb-1 text-xs font-medium text-gray-600 transition-colors hover:border-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {open ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show all
            </>
          )}
        </button>
      </div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ElementType;
  tone?: 'neutral' | 'good' | 'bad' | 'warning';
}) {
  const toneClass = {
    neutral: 'bg-gray-50 text-gray-500',
    good: 'bg-emerald-50 text-emerald-600',
    bad: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-600',
  }[tone];

  return (
    <div className="border-b border-r border-slate-900/10 bg-white/35 p-5 last:border-r-0 lg:border-b-0">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-semibold text-gray-950 font-tabular">{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className={cn('border border-current/10 p-2', toneClass)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export function PanelInsight({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warning' | 'bad';
}) {
  const toneClasses = {
    neutral: 'bg-gray-50 text-gray-700 border-gray-100',
    good: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    bad: 'bg-red-50 text-red-700 border-red-100',
  }[tone];

  return (
    <div
      className={cn(
        'mt-4 flex items-start gap-2 border-l-2 px-3 py-2.5 text-xs leading-relaxed',
        toneClasses
      )}
    >
      <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-70" />
      <span>{children}</span>
    </div>
  );
}

export function KeyTakeaways({ report }: { report: DailyReportData }) {
  const takeaways = report.recommendations ?? [];
  if (takeaways.length === 0) {
    return (
      <div className="flex items-start gap-3 border-y border-gray-200 bg-gray-50 p-4 text-gray-600">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p className="text-sm">No key takeaways for this period.</p>
      </div>
    );
  }

  const maxItems = report.metrics.criticalEvents > 0 || report.metrics.highEvents > 0 ? 5 : 3;

  return (
    <div className="border-y border-slate-900/15 bg-white/45 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-gray-900">Key takeaways</h2>
      </div>
      <ul className="space-y-3">
        {takeaways.slice(0, maxItems).map((text, index) => (
          <li key={index} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center border border-slate-200 bg-gray-100 text-[10px] font-semibold text-gray-600">
              {index + 1}
            </span>
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function getReportRiskLevelConfig(level: ReportRiskLevel) {
  switch (level) {
    case 'severe':
      return {
        label: 'Severe',
        dot: 'bg-red-700',
        text: 'text-red-800',
        bg: 'bg-red-50',
        border: 'border-red-200',
      };
    case 'critical':
      return {
        label: 'Critical',
        dot: 'bg-red-500',
        text: 'text-red-700',
        bg: 'bg-red-50',
        border: 'border-red-100',
      };
    case 'warning':
      return {
        label: 'Warning',
        dot: 'bg-amber-500',
        text: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-100',
      };
    default:
      return {
        label: 'Normal',
        dot: 'bg-emerald-500',
        text: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
      };
  }
}
