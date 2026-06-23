import type { SafetyBufferAnalysis } from '@/lib/protocols/protocolHealth';

interface SafetyBufferBreakdownProps {
  safetyBuffer: SafetyBufferAnalysis;
}

export function SafetyBufferBreakdown({ safetyBuffer }: SafetyBufferBreakdownProps) {
  const items = [
    {
      label: 'Theoretical Buffer',
      value: `${safetyBuffer.theoreticalBufferPercent.toFixed(2)}%`,
      sub: 'before oracle',
    },
    {
      label: 'Oracle Deviation',
      value: `${safetyBuffer.oracleAvgDeviationPercent.toFixed(2)}%`,
      sub: 'avg consensus',
    },
    {
      label: 'Effective Buffer',
      value: `${safetyBuffer.bufferPercent.toFixed(2)}%`,
      sub: 'real safety',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white/60 rounded-md border border-black/5 p-2.5 text-center"
        >
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">
            {item.label}
          </span>
          <span className="text-sm font-bold font-mono text-gray-900">{item.value}</span>
          <span className="text-[9px] text-gray-400 block">{item.sub}</span>
        </div>
      ))}
    </div>
  );
}
