import type { SafetyBufferAnalysis } from '@/lib/protocols/protocolHealth';

interface SafetyBufferBreakdownProps {
  safetyBuffer: SafetyBufferAnalysis;
}

export function SafetyBufferBreakdown({ safetyBuffer }: SafetyBufferBreakdownProps) {
  const hasLiveRisk = safetyBuffer.liveDepegRiskPercent > 0;
  const items = [
    {
      label: 'Theoretical Buffer',
      value: `${safetyBuffer.theoreticalBufferPercent.toFixed(2)}%`,
      sub: 'before deductions',
    },
    {
      label: 'Oracle Deviation',
      value: `${safetyBuffer.oracleAvgDeviationPercent.toFixed(2)}%`,
      sub: 'avg consensus',
    },
  ];

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

  const gridCols = hasLiveRisk ? 'grid-cols-4' : 'grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-2 mb-3`}>
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
  );
}
