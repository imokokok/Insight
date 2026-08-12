import { EmptyState } from '../ui';

export interface TrendPoint {
  hour: string;
  signed: number;
  unsigned: number;
}

/**
 * Lightweight, dependency-free SVG trend chart for the Safety tab: signed vs
 * unsigned pre-trade checks per hour. Pure server component (no client JS).
 */
export default function TrendChart({ trend }: { trend: TrendPoint[] }) {
  if (trend.length === 0) {
    return <EmptyState message="no pre-trade checks in window" />;
  }

  const W = 680;
  const H = 180;
  const padX = 12;
  const padY = 14;
  const max = Math.max(1, ...trend.map((t) => t.signed + t.unsigned));
  const n = trend.length;
  const baseY = H - padY;

  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (W - padX * 2);
  const y = (v: number) => baseY - (v / max) * (H - padY * 2);

  const line = (key: 'signed' | 'unsigned') =>
    trend.map((t, i) => `${x(i).toFixed(1)},${y(t[key]).toFixed(1)}`).join(' ');

  const area = (key: 'signed' | 'unsigned') => {
    const top = trend.map((t, i) => `${x(i).toFixed(1)},${y(t[key]).toFixed(1)}`).join(' ');
    return `M ${x(0).toFixed(1)},${baseY} L ${top} L ${x(n - 1).toFixed(1)},${baseY} Z`;
  };

  const firstHour = trend[0].hour.slice(5, 13);
  const lastHour = trend[n - 1].hour.slice(5, 13);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44" role="img" aria-label="签名趋势">
        <line x1={padX} y1={baseY} x2={W - padX} y2={baseY} stroke="#e2e8f0" strokeWidth={1} />
        <path d={area('signed')} fill="#d1fae5" stroke="none" />
        <path d={area('unsigned')} fill="#fee2e2" stroke="none" />
        <polyline points={line('signed')} fill="none" stroke="#10b981" strokeWidth={1.5} />
        <polyline points={line('unsigned')} fill="none" stroke="#ef4444" strokeWidth={1.5} />
      </svg>
      <div className="flex items-center justify-between mt-1 text-xs text-slate-400">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" /> 已签名
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500" /> 未签名
          </span>
        </span>
        <span>
          {firstHour} → {lastHour}
        </span>
      </div>
    </div>
  );
}
