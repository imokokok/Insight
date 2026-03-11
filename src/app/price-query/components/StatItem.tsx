'use client';

interface StatItemProps {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  subValue?: string;
}

export function StatItem({ label, value, prefix = '', suffix = '', subValue }: StatItemProps) {
  return (
    <div className="py-4 border-b border-gray-200 last:border-b-0">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-lg text-gray-400">{prefix}</span>}
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {suffix && <span className="text-lg text-gray-400">{suffix}</span>}
      </div>
      {subValue && <div className="text-sm text-gray-500 mt-1">{subValue}</div>}
    </div>
  );
}
