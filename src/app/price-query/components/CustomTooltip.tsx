'use client';

import { useI18n } from '@/lib/i18n/provider';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}

export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  const { t } = useI18n();

  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 shadow-lg p-3 min-w-[200px]">
      <div className="text-xs font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">
        {t('priceQuery.chart.tooltip.time')}: {label}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          return (
            <div key={index} className="flex items-start gap-2">
              <span
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-900 truncate">{entry.name}</div>
                <div className="text-sm font-mono text-gray-700">
                  $
                  {Number(entry.value).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
        {t('priceQuery.chart.tooltip.dataPoints')}: {payload.length}
      </div>
    </div>
  );
}
