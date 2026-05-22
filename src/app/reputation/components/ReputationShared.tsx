import { type LucideIcon } from 'lucide-react';

import { oracleColors, providerNames } from '@/lib/constants';
import { getScoreColor } from '@/lib/oracles/utils/reputationUtils';
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

export { ORACLE_LOGO_MAP };

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
