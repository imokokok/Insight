import type { SafetyBufferAnalysis } from '@/lib/protocols/protocolHealth';
import { formatPrice } from '@/lib/utils/format';

interface SafetyBufferBreakdownProps {
  safetyBuffer: SafetyBufferAnalysis;
  liquidationPriceBand?: {
    center: number;
    lower: number;
    upper: number;
    adversePercent: number;
    favorablePercent: number;
    unknown: boolean;
  };
}

export function SafetyBufferBreakdown({
  safetyBuffer,
  liquidationPriceBand,
}: SafetyBufferBreakdownProps) {
  const hasLiveRisk = safetyBuffer.liveDepegRiskPercent > 0;
  const items = [
    {
      label: 'Theoretical Buffer',
      value: `${safetyBuffer.theoreticalBufferPercent.toFixed(2)}%`,
      sub: 'before deductions',
    },
  ];

  // Oracle uncertainty row reflects the live cross-oracle consensus deviation
  // when available; otherwise the provider-history reputation average. Hidden
  // when no oracle signal exists (the unverified placeholder band covers it).
  if (safetyBuffer.consensusSource !== 'none') {
    const live = safetyBuffer.consensusSource === 'live';
    const oracleUsed = live
      ? safetyBuffer.liveConsensusDeviationPercent
      : safetyBuffer.oracleAvgDeviationPercent;
    items.push({
      label: 'Oracle Deviation',
      value: `${oracleUsed.toFixed(2)}%`,
      sub: live
        ? Object.entries(safetyBuffer.liveConsensusDeviations)
            .map(([s, d]) => `${s} ${d.toFixed(2)}%`)
            .join(', ') || 'live cross-oracle consensus'
        : 'provider history avg',
    });
  }

  // Add live depeg/peg risk row if present
  if (hasLiveRisk) {
    items.push({
      label: 'Live Depeg Risk',
      value: `${safetyBuffer.liveDepegRiskPercent.toFixed(2)}%`,
      sub: Object.entries(safetyBuffer.liveDepegBreakdown)
        .map(([s, d]) => `${s} ${d.toFixed(2)}%`)
        .join(', '),
    });
  }

  items.push({
    label: 'Effective Buffer',
    value: `${safetyBuffer.bufferPercent.toFixed(2)}%`,
    sub: 'real safety',
  });

  const gridCols =
    items.length <= 2 ? 'grid-cols-2' : items.length === 3 ? 'grid-cols-3' : 'grid-cols-4';
  const hasBand = safetyBuffer.bandHalfWidthPercent > 0;

  return (
    <div className="mb-3">
      <div className={`grid ${gridCols} gap-2`}>
        {items.map((item) => (
          <div
            key={item.label}
            className={`bg-white/60 rounded-md border p-2.5 text-center ${
              item.label === 'Live Depeg Risk'
                ? 'border-amber-200/60'
                : item.label === 'Effective Buffer'
                  ? 'border-primary-200/40'
                  : 'border-black/5'
            }`}
          >
            <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">
              {item.label}
            </span>
            <span
              className={`text-sm font-bold font-mono ${
                item.label === 'Live Depeg Risk'
                  ? 'text-amber-600'
                  : item.label === 'Effective Buffer'
                    ? 'text-primary-600'
                    : 'text-gray-900'
              }`}
            >
              {item.value}
            </span>
            <span className="text-[9px] text-gray-400 block truncate" title={item.sub}>
              {item.sub}
            </span>
          </div>
        ))}
      </div>

      {hasBand && (
        <div className="mt-2 rounded-md border border-purple-200/60 bg-purple-50/60 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-purple-700">
              Oracle Uncertainty Band
            </span>
            <span
              className="text-sm font-bold font-mono text-purple-700"
              title={
                safetyBuffer.bandUnknown
                  ? 'Conservative placeholder — oracle health could not be verified'
                  : 'Adverse (earlier-liquidation) half-width; favorable side is ~half'
              }
            >
              ±{safetyBuffer.bandHalfWidthPercent.toFixed(2)}%{safetyBuffer.bandUnknown ? ' *' : ''}
            </span>
          </div>
          {liquidationPriceBand && liquidationPriceBand.center > 0 && (
            <p className="mt-1 text-[11px] leading-snug text-purple-600/90">
              Displayed liq. price{' '}
              <span className="font-mono">{formatPrice(liquidationPriceBand.center)}</span> may
              actually be anywhere in{' '}
              <span className="font-mono">
                {formatPrice(liquidationPriceBand.lower)} –{' '}
                {formatPrice(liquidationPriceBand.upper)}
              </span>
              {safetyBuffer.bandUnknown && (
                <span className="ml-1 rounded bg-purple-100/70 px-1 text-[9px] text-purple-600">
                  unverified
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
