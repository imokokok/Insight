import type { ReactNode } from 'react';

export type Tone = 'default' | 'good' | 'warn' | 'bad' | 'info';

/** Compact number formatting for high-magnitude ops metrics (12345 -> 12.3k). */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1000) return String(n);
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** Percentage formatting with one decimal (100 -> 100%, 99.4 -> 99.4%). */
export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

/** Human relative time in zh-CN ("2 分钟前"); falls back to empty string. */
export function relativeTime(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return `${s} 秒前`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

/** Shared, consistent table styling: bordered, sticky header, hover rows (token-driven). */
export const tableCls = 'w-full text-sm border-collapse';
export const thCls =
  'py-2 pr-3 text-left font-medium text-gray-500 border-b border-gray-200 sticky top-0 bg-gray-50 z-10';
export const trCls = 'border-b border-gray-100 hover:bg-gray-50';

// Tone → token-based text/badge classes. Keeps the console on the product palette.
const TONE_TEXT: Record<Tone, string> = {
  default: 'text-gray-900',
  good: 'text-success-700',
  warn: 'text-warning-700',
  bad: 'text-danger-700',
  info: 'text-primary-700',
};

const TONE_BADGE: Record<Tone, string> = {
  default: 'bg-gray-100 text-gray-600',
  good: 'bg-success-50 text-success-700',
  warn: 'bg-warning-50 text-warning-700',
  bad: 'bg-danger-50 text-danger-700',
  info: 'bg-primary-50 text-primary-700',
};

export const TONE_DOT: Record<Tone, string> = {
  default: 'bg-gray-400',
  good: 'bg-success-500',
  warn: 'bg-warning-500',
  bad: 'bg-danger-500',
  info: 'bg-primary-500',
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
  const abs = updatedAt ? new Date(updatedAt).toLocaleTimeString('zh-CN', { hour12: false }) : '';
  const rel = relativeTime(updatedAt);
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        {updatedAt && (
          <p className="text-xs text-gray-400 mt-1" title={abs}>
            最后更新于 {rel}
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
      className={`bg-white rounded-card shadow-card border border-gray-200 p-5 ${className ?? ''}`}
    >
      {title && <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>}
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
  delta,
  spark,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  /** Signed change vs previous period; rendered as ▲/▼ with tone color. */
  delta?: number;
  /** Mini sparkline series (any scale); rendered as a thin line under the value. */
  spark?: number[];
}) {
  const t = tone ?? 'default';
  const deltaNode =
    delta == null ? null : delta > 0 ? (
      <span className="text-success-600">▲ {formatCompact(Math.abs(delta))}</span>
    ) : delta < 0 ? (
      <span className="text-danger-600">▼ {formatCompact(Math.abs(delta))}</span>
    ) : (
      <span className="text-gray-400">▬ 0</span>
    );
  return (
    <div className="bg-white rounded-card shadow-card border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">{label}</div>
        {tone && tone !== 'default' && (
          <span className={`inline-block w-2 h-2 rounded-full ${TONE_DOT[t]}`} />
        )}
      </div>
      <div className={`text-2xl font-semibold mt-1 font-mono tabular-nums ${TONE_TEXT[t]}`}>
        {value}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {deltaNode && <span className="font-mono tabular-nums">{deltaNode}</span>}
        {hint && <span className="text-gray-400">{hint}</span>}
      </div>
      {spark && spark.length > 1 && <Sparkline points={spark} tone={t} />}
    </div>
  );
}

/** Dependency-free mini sparkline (server component, no client JS). */
export function Sparkline({ points, tone = 'info' }: { points: number[]; tone?: Tone }) {
  const W = 120;
  const H = 26;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const n = points.length;
  const x = (i: number) => (i / Math.max(1, n - 1)) * W;
  const y = (v: number) => H - 2 - ((v - min) / span) * (H - 4);
  const poly = points.map((p, i) => `${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
  const stroke =
    tone === 'good'
      ? '#059669'
      : tone === 'bad'
        ? '#dc2626'
        : tone === 'warn'
          ? '#d97706'
          : '#2563eb';
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-7 mt-2"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline points={poly} fill="none" stroke={stroke} strokeWidth={1.5} />
    </svg>
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
    <div className="text-sm text-gray-400 py-8 text-center">
      暂无数据{message ? ` — ${message}` : ''}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded ${className ?? 'h-4 w-full'}`} />;
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
    >
      {message}
    </div>
  );
}
