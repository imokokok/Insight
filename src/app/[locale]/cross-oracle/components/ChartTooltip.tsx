'use client';

import { OracleProvider } from '@/types/oracle';
import { oracleNames } from '../constants';

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ChartTooltip({ active, payload, label, t }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const avgPriceData = payload.find((p) => p.dataKey === 'avgPrice');
  const oraclePrices = payload.filter((p) =>
    Object.values(oracleNames).includes(p.dataKey as OracleProvider)
  );
  const avgValue = avgPriceData?.value;
  const stdDevValue = payload.find((p) => p.dataKey === 'stdDev')?.value;

  return (
    <div className="bg-white border border-gray-200 p-4 min-w-[280px]">
      <div className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
        {label}
      </div>
      {avgValue !== undefined && (
        <div className="mb-3 pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">{t('crossOracle.chartTooltip.avgPrice')}</span>
            <span className="font-semibold text-gray-900">
              $
              {avgValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          {stdDevValue !== undefined && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{t('crossOracle.chartTooltip.stdDev')}</span>
              <span>
                ±$
                {stdDevValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="space-y-1.5">
        <div className="text-xs text-gray-500 mb-2">
          {t('crossOracle.chartTooltip.oraclePrices')}
        </div>
        {oraclePrices.map((entry, index) => {
          const deviation = avgValue ? ((entry.value - avgValue) / avgValue) * 100 : null;
          return (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-700">{entry.dataKey}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-gray-900">
                  $
                  {entry.value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                {deviation !== null && (
                  <span className={`text-xs ${deviation >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    ({deviation >= 0 ? '+' : ''}
                    {deviation.toFixed(3)}%)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
