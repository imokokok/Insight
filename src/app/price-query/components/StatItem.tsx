'use client';

interface StatItemProps {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatItem({
  label,
  value,
  prefix = '',
  suffix = '',
  subValue,
  trend,
}: StatItemProps) {
  const trendColor =
    trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-900';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return (
    <div className="py-4 border-b border-gray-200 last:border-b-0">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-lg text-gray-400">{prefix}</span>}
        <span className={`text-2xl font-bold ${trendColor}`}>
          {trendIcon && <span className="mr-1">{trendIcon}</span>}
          {value}
        </span>
        {suffix && <span className="text-lg text-gray-400">{suffix}</span>}
      </div>
      {subValue && <div className="text-sm text-gray-500 mt-1">{subValue}</div>}
    </div>
  );
}
