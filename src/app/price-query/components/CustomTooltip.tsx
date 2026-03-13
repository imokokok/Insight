'use client';

import { useI18n } from '@/lib/i18n/provider';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload?: {
      isAnomaly?: boolean;
      anomalyReason?: string;
      deviation?: number;
      isPriceSpike?: boolean;
      spikeDirection?: 'up' | 'down';
      spikeMagnitude?: number;
    };
  }>;
  label?: string;
}

export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  const { t } = useI18n();

  if (!active || !payload || payload.length === 0) return null;

  // 检查是否有异常或价格突变信息
  const hasAnomaly = payload.some((p) => p.payload?.isAnomaly);
  const hasPriceSpike = payload.some((p) => p.payload?.isPriceSpike);

  return (
    <div className="bg-white border border-gray-200 shadow-xl rounded-lg p-3 min-w-[200px] max-w-[280px]">
      <div className="text-xs font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">
        {t('priceQuery.chart.tooltip.time')}: {label}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const isAnomaly = entry.payload?.isAnomaly;
          const isPriceSpike = entry.payload?.isPriceSpike;

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
                {isAnomaly && entry.payload?.anomalyReason && (
                  <div className="text-xs text-red-600 mt-0.5">
                    ⚠️ {entry.payload.anomalyReason}
                    {entry.payload.deviation && (
                      <span className="ml-1">
                        ({entry.payload.deviation > 0 ? '+' : ''}
                        {entry.payload.deviation.toFixed(1)}σ)
                      </span>
                    )}
                  </div>
                )}
                {isPriceSpike && entry.payload?.spikeMagnitude && (
                  <div
                    className={`text-xs mt-0.5 ${entry.payload.spikeDirection === 'up' ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {entry.payload.spikeDirection === 'up' ? '📈' : '📉'} 价格突变
                    <span className="ml-1">
                      {entry.payload.spikeDirection === 'up' ? '+' : '-'}
                      {entry.payload.spikeMagnitude.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
        {t('priceQuery.chart.tooltip.dataPoints')}: {payload.length}
        {hasAnomaly && <span className="ml-2 text-red-600">⚠️ 异常点</span>}
        {hasPriceSpike && <span className="ml-2 text-orange-600">📊 价格突变</span>}
      </div>
    </div>
  );
}
