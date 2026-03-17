'use client';

import { useTranslations, useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';

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
  const t = useTranslations();
  const locale = useLocale();

  if (!active || !payload || payload.length === 0) return null;

  // 检查是否有异常或价格突变信息
  const hasAnomaly = payload.some((p) => p.payload?.isAnomaly);
  const hasPriceSpike = payload.some((p) => p.payload?.isPriceSpike);

  const formatTime = (timestamp: string | number | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString(isChineseLocale(locale) ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="bg-white border border-gray-200 p-3 min-w-[180px]">
      <p className="text-xs text-gray-500 mb-2">{formatTime(label)}</p>
      {payload.map((entry, index) => {
        const provider = entry.name as string;
        const color = entry.color as string;
        const value = entry.value as number;
        return (
          <div key={index} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2" style={{ backgroundColor: color }} />
              <span className="text-sm text-gray-600">{provider}</span>
            </div>
            <span className="text-sm font-medium text-gray-900">${value.toFixed(6)}</span>
          </div>
        );
      })}
    </div>
  );
}
