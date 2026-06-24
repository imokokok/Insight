import { type LucideIcon } from 'lucide-react';

import { oracleColors, providerNames } from '@/lib/constants';
import { getScoreBadge, getScoreColor } from '@/lib/oracles/utils/reputationUtils';
import { cn } from '@/lib/utils';
import { type OracleProvider } from '@/types/oracle';

const ORACLE_LOGO_MAP: Record<string, string> = {
  chainlink: '/logos/oracles/chainlink.svg',
  pyth: '/logos/oracles/pyth.svg',
  api3: '/logos/oracles/api3.svg',
  redstone: '/logos/oracles/redstone.svg',
  dia: '/logos/oracles/dia.svg',
  winklink: '/logos/oracles/winklink.svg',
  supra: '/logos/oracles/supra.svg',
  twap: '/logos/oracles/twap.svg',
  reflector: '/logos/oracles/reflector.svg',
  flare: '/logos/oracles/flare.svg',
};

export function OracleLogo({
  provider,
  size = 20,
  className = '',
}: {
  provider: OracleProvider;
  size?: number;
  className?: string;
}) {
  const src = ORACLE_LOGO_MAP[provider];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={`${providerNames[provider] || provider} logo`}
      width={size}
      height={size}
      className={cn('rounded-full object-contain flex-shrink-0', className)}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

export function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const stroke = size > 60 ? 8 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(score / 100, 1);
  const color = getScoreColor(score);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-black font-mono tracking-tighter ${size > 60 ? 'text-4xl' : 'text-[10px]'}`}
          style={{ color }}
        >
          {size > 60 ? score.toFixed(0) : score.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

export function MiniRing({
  score,
  label,
  size = 64,
}: {
  score: number;
  label: string;
  size?: number;
}) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(score / 100, 1);
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p)}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-black font-mono" style={{ color }}>
            {score.toFixed(0)}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function MetricRow({
  icon: Icon,
  label,
  value,
  suffix = '',
  maxVal,
  color,
  weight,
  invert,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  suffix?: string;
  maxVal?: number;
  color: string;
  weight?: number;
  invert?: boolean;
}) {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  const rawPct = maxVal ? Math.min((num / maxVal) * 100, 100) : 0;
  const pct = invert ? 100 - rawPct : rawPct;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-bold text-gray-700">{label}</span>
          {weight !== undefined && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
              {weight}%
            </span>
          )}
        </div>
        <span className="text-xs font-mono font-black" style={color ? { color } : undefined}>
          {typeof value === 'number' ? value.toFixed(1) : value}
          {suffix}
        </span>
      </div>
      {maxVal ? (
        <div className="w-full bg-gray-100 rounded-full h-1">
          <div
            className="h-1 rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function getProviderColor(provider: string): string {
  return oracleColors[provider as OracleProvider] || '#888888';
}

// ------------------------------------------------------------------
// Modern reputation dashboard components (2026 redesign)
// ------------------------------------------------------------------

export function ReputationGauge({
  score,
  size = 44,
  stroke = 5,
  showLabel = false,
}: {
  score: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(score / 100, 0), 1);
  const color = getScoreColor(score);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {showLabel && (
        <span
          className="absolute inset-0 flex items-center justify-center text-[10px] font-black font-mono"
          style={{ color }}
        >
          {score.toFixed(0)}
        </span>
      )}
    </div>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const badge = getScoreBadge(score);
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border',
        badge.bgClass,
        badge.textClass,
        badge.bgClass.replace('bg-', 'border-').replace('50', '200')
      )}
    >
      {badge.label}
    </span>
  );
}

export function MiniMetricBar({
  value,
  max = 100,
  color,
  label,
  suffix = '',
  invert = false,
}: {
  value: number;
  max?: number;
  color?: string;
  label?: string;
  suffix?: string;
  invert?: boolean;
}) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const displayPct = invert ? 100 - pct : pct;
  const barColor = color || getScoreColor(invert ? 100 - displayPct : displayPct);

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-gray-500">{label}</span>
          <span className="text-[10px] font-mono font-semibold text-gray-700">
            {value.toFixed(value % 1 === 0 ? 0 : 1)}
            {suffix}
          </span>
        </div>
      )}
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${displayPct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

export function StatusPill({
  value,
  thresholds,
  labels,
  suffix = '',
}: {
  value: number;
  thresholds: number[];
  labels: string[];
  suffix?: string;
}) {
  let idx = thresholds.findIndex((t) => value < t);
  if (idx === -1) idx = thresholds.length;
  const label = labels[Math.min(idx, labels.length - 1)] || labels[labels.length - 1];
  const color = getScoreColor(100 - idx * (100 / labels.length));

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ color, backgroundColor: `${color}15` }}
    >
      {value.toFixed(value % 1 === 0 ? 0 : 2)}
      {suffix} · {label}
    </span>
  );
}

export function ProviderIdentity({
  provider,
  size = 32,
  showType = false,
  typeLabel,
  typeColor,
}: {
  provider: OracleProvider;
  size?: number;
  showType?: boolean;
  typeLabel?: string;
  typeColor?: string;
}) {
  const color = getProviderColor(provider);
  return (
    <div className="flex items-center gap-3">
      <div
        className="rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-gray-100"
        style={{ width: size, height: size, backgroundColor: `${color}10` }}
      >
        <OracleLogo provider={provider} size={Math.round(size * 0.55)} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">
          {providerNames[provider] || provider}
        </p>
        {showType && typeLabel && (
          <p className="text-[11px] font-medium truncate" style={{ color: typeColor || color }}>
            {typeLabel}
          </p>
        )}
      </div>
    </div>
  );
}

export function SparklineBar({
  data,
  color = '#3b82f6',
  height = 24,
  width = 72,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (!data.length) {
    return <div className="text-[10px] text-gray-300 font-medium">—</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1 || 1);

  const path = data
    .map((d, i) => {
      const x = i * step;
      const y = height - ((d - min) / range) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}
