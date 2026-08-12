import { EmptyState, formatCompact } from '../ui';

export interface TrendPoint {
  hour: string;
  signed: number;
  unsigned: number;
}

/**
 * Lightweight, dependency-free SVG trend chart for the Safety tab: signed vs
 * unsigned pre-trade checks per hour. Pure server component (no client JS).
 * Now includes y-axis gridlines + scale, x-axis time ticks, and a native
 * <title> tooltip on every point.
 */
export default function TrendChart({ trend }: { trend: TrendPoint[] }) {
  if (trend.length === 0) {
    return <EmptyState message="no pre-trade checks in window" />;
  }

  const W = 680;
  const H = 200;
  const padX = 28;
  const padTop = 16;
  const padBottom = 22;
  const baseY = H - padBottom;
  const topY = padTop;
  const max = Math.max(1, ...trend.map((t) => t.signed + t.unsigned));
  const n = trend.length;

  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (W - padX * 2);
  const y = (v: number) => baseY - (v / max) * (baseY - topY);

  const line = (key: 'signed' | 'unsigned') =>
    trend.map((t, i) => `${x(i).toFixed(1)},${y(t[key]).toFixed(1)}`).join(' ');

  const area = (key: 'signed' | 'unsigned') => {
    const top = trend.map((t, i) => `${x(i).toFixed(1)},${y(t[key]).toFixed(1)}`).join(' ');
    return `M ${x(0).toFixed(1)},${baseY} L ${top} L ${x(n - 1).toFixed(1)},${baseY} Z`;
  };

  // y gridlines at 0 / 25% / 50% / 75% / 100% of max
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    v: max * f,
    gy: baseY - f * (baseY - topY),
  }));

  const firstHour = trend[0].hour.slice(5, 13);
  const lastHour = trend[n - 1].hour.slice(5, 13);
  const midHour = trend[Math.floor(n / 2)].hour.slice(5, 13);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="签名趋势">
        {/* y gridlines + scale */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padX} y1={t.gy} x2={W - padX} y2={t.gy} stroke="#e5e7eb" strokeWidth={1} />
            <text
              x={padX - 6}
              y={t.gy + 3}
              textAnchor="end"
              fontSize={10}
              fill="#9ca3af"
              className="font-mono"
            >
              {formatCompact(Math.round(t.v))}
            </text>
          </g>
        ))}

        <path d={area('signed')} fill="#d1fae5" stroke="none" />
        <path d={area('unsigned')} fill="#fee2e2" stroke="none" />
        <polyline points={line('signed')} fill="none" stroke="#10b981" strokeWidth={1.5} />
        <polyline points={line('unsigned')} fill="none" stroke="#ef4444" strokeWidth={1.5} />

        {/* data points with native tooltips */}
        {trend.map((t, i) => (
          <circle key={i} cx={x(i)} cy={y(t.signed)} r={2.5} fill="#10b981">
            <title>{`${t.hour} · 已签名 ${t.signed}`}</title>
          </circle>
        ))}
        {trend.map((t, i) => (
          <circle key={`u${i}`} cx={x(i)} cy={y(t.unsigned)} r={2.5} fill="#ef4444">
            <title>{`${t.hour} · 未签名 ${t.unsigned}`}</title>
          </circle>
        ))}

        {/* x axis time ticks */}
        <text x={padX} y={H - 6} fontSize={10} fill="#9ca3af" className="font-mono">
          {firstHour}
        </text>
        <text
          x={W / 2}
          y={H - 6}
          fontSize={10}
          fill="#9ca3af"
          textAnchor="middle"
          className="font-mono"
        >
          {midHour}
        </text>
        <text
          x={W - padX}
          y={H - 6}
          fontSize={10}
          fill="#9ca3af"
          textAnchor="end"
          className="font-mono"
        >
          {lastHour}
        </text>
      </svg>
      <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-success-500" /> 已签名
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-danger-500" /> 未签名
          </span>
        </span>
        <span>每小时</span>
      </div>
    </div>
  );
}
