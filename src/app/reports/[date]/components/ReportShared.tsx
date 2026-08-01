'use client';

import { useState } from 'react';

import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Info, Lightbulb } from 'lucide-react';

import type { DailyReportData, ReportRiskLevel } from '@/lib/reports/reportService';
import { cn } from '@/lib/utils';

export function StatusBadge({ metrics }: { metrics: DailyReportData['metrics'] }) {
  if (metrics.criticalEvents > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-100 text-[11px] font-medium">
        <AlertTriangle className="w-3 h-3" />
        {metrics.criticalEvents} critical events
      </span>
    );
  }
  if (metrics.highEvents > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 border border-orange-100 text-[11px] font-medium">
        <AlertTriangle className="w-3 h-3" />
        {metrics.highEvents} high risk events
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-medium">
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
    <section className={cn('bg-white rounded-xl border border-gray-200 shadow-sm', className)}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <Icon className="w-4 h-4 text-gray-500" />
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
    <section className={cn('bg-white rounded-xl border border-gray-200 shadow-sm', className)}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <Icon className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">
        {open ? children : summary}
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
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
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-semibold text-gray-950 font-tabular">{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className={cn('p-2 rounded-lg', toneClass)}>
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
        'mt-4 px-3 py-2.5 rounded-lg border text-xs leading-relaxed flex items-start gap-2',
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
      <div className="flex items-start gap-3 text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p className="text-sm">No key takeaways for this period.</p>
      </div>
    );
  }

  const maxItems = report.metrics.criticalEvents > 0 || report.metrics.highEvents > 0 ? 5 : 3;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-gray-900">Key takeaways</h2>
      </div>
      <ul className="space-y-3">
        {takeaways.slice(0, maxItems).map((text, index) => (
          <li key={index} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
            <span className="flex-shrink-0 w-5 h-5 rounded-md bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-semibold">
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
        dot: 'bg-purple-500',
        text: 'text-purple-700',
        bg: 'bg-purple-50',
        border: 'border-purple-100',
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
