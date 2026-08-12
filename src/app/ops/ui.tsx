import type { ReactNode } from 'react';

type Tone = 'default' | 'good' | 'warn' | 'bad';

/** Compact number formatting for high-magnitude ops metrics (12345 -> 12.3k). */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1000) return String(n);
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** Shared, consistent table styling: bordered, sticky header, hover rows. */
export const tableCls = 'w-full text-sm border-collapse';
export const thCls =
  'py-2 pr-3 text-left font-medium text-slate-500 border-b border-slate-100 sticky top-0 bg-white z-10';
export const trCls = 'border-b border-slate-50 hover:bg-slate-50';

const TONE_TEXT: Record<Tone, string> = {
  default: 'text-slate-900',
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-red-600',
};

const TONE_BADGE: Record<Tone, string> = {
  default: 'bg-slate-100 text-slate-600',
  good: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-amber-50 text-amber-700',
  bad: 'bg-red-50 text-red-700',
};

export function PageHeader({
  title,
  subtitle,
  actions,
  updatedAt,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  updatedAt?: string;
}) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        {updatedAt && (
          <p className="text-xs text-slate-400 mt-1">
            最后更新于 {new Date(updatedAt).toLocaleTimeString('zh-CN', { hour12: false })}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}

export function Card({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${className ?? ''}`}
    >
      {title && <h2 className="text-sm font-semibold text-slate-700 mb-3">{title}</h2>}
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${TONE_TEXT[tone ?? 'default']}`}>{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TONE_BADGE[tone ?? 'default']}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-sm text-slate-400 py-8 text-center">
      No data available{message ? ` — ${message}` : ''}.
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </div>
  );
}
