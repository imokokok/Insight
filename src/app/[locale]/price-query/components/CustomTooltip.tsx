'use client';

/**
 * @fileoverview 自定义图表提示框组件
 * @description 显示数据点的详细信息，包含多维度数据展示、涨跌幅计算、数据源标识
 */

import { useTranslations, useLocale } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';
import { formatPrice } from '@/lib/utils/chartSharedUtils';
import { type ChartDataPoint } from './PriceChart';
import { Icons } from './Icons';

interface CustomTooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
  payload?: ChartDataPoint & {
    isAnomaly?: boolean;
    anomalyReason?: string;
    deviation?: number;
    isPriceSpike?: boolean;
    spikeDirection?: 'up' | 'down';
    spikeMagnitude?: number;
    _avgPrice?: number;
    _prevValues?: Record<string, number>;
    _oracleInfo?: Record<string, { chain?: string; provider?: string }>;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string | number;
}

/**
 * 计算涨跌幅百分比
 */
function calculateChangePercent(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * 计算与平均价格的偏差百分比
 */
function calculateDeviationPercent(value: number, avgPrice: number | undefined): number | null {
  if (avgPrice === undefined || avgPrice === 0) return null;
  return ((value - avgPrice) / avgPrice) * 100;
}

/**
 * 格式化涨跌幅显示
 */
function formatChangePercent(percent: number | null): string {
  if (percent === null) return '-';
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * 自定义图表提示框组件
 *
 * 显示时间戳和对应的价格数据，包含：
 * - 精确时间（含日期）
 * - 价格（大字号突出显示）
 * - 与上一时间点的涨跌幅
 * - 与平均价格的偏差
 * - 数据源标识（预言机名称、链名称）
 */
export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  const t = useTranslations();
  const locale = useLocale();

  if (!active || !payload || payload.length === 0) return null;

  // 从 payload 中提取额外数据
  const firstPayload = payload[0]?.payload;
  const avgPrice = firstPayload?._avgPrice;
  const prevValues = firstPayload?._prevValues;
  const oracleInfo = firstPayload?._oracleInfo;

  const formatDateTime = (timestamp: string | number | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString(isChineseLocale(locale) ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 min-w-[220px]">
      {/* 时间标题 */}
      <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-gray-100">
        <Icons.clock className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-500">{formatDateTime(label)}</span>
      </div>

      {/* 数据项列表 */}
      <div className="space-y-3">
        {payload.map((entry, index) => {
          const provider = entry.name as string;
          const color = entry.color as string;
          const value = entry.value as number;
          const dataKey = entry.dataKey as string;

          // 计算涨跌幅
          const prevValue = prevValues?.[dataKey];
          const changePercent = calculateChangePercent(value, prevValue);
          const isUp = changePercent !== null && changePercent >= 0;
          const isDown = changePercent !== null && changePercent < 0;

          // 计算与平均价格的偏差
          const deviationPercent = calculateDeviationPercent(value, avgPrice);

          // 获取数据源信息
          const info = oracleInfo?.[dataKey];
          const chainName = info?.chain;

          return (
            <div key={index} className="space-y-1.5">
              {/* 数据源标识行 */}
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-medium text-gray-700">{provider}</span>
                {chainName && (
                  <span className="text-xs text-gray-400">({chainName})</span>
                )}
              </div>

              {/* 价格和涨跌幅行 */}
              <div className="flex items-baseline justify-between gap-3 pl-4.5">
                <span className="text-lg font-bold text-gray-900">{formatPrice(value)}</span>
                {changePercent !== null && (
                  <div
                    className={`flex items-center gap-0.5 text-xs font-medium ${
                      isUp ? 'text-emerald-600' : isDown ? 'text-red-600' : 'text-gray-500'
                    }`}
                  >
                    {isUp && <Icons.arrowUp className="w-3 h-3" />}
                    {isDown && <Icons.arrowDown className="w-3 h-3" />}
                    <span>{formatChangePercent(changePercent)}</span>
                  </div>
                )}
              </div>

              {/* 偏差信息行 */}
              {deviationPercent !== null && (
                <div className="flex items-center justify-between pl-4.5">
                  <span className="text-xs text-gray-400">
                    {t('priceQuery.tooltip.deviationFromAvg')}
                  </span>
                  <span
                    className={`text-xs ${
                      Math.abs(deviationPercent) > 1
                        ? deviationPercent > 0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {formatChangePercent(deviationPercent)}
                  </span>
                </div>
              )}

              {/* 分割线（如果不是最后一项） */}
              {index < payload.length - 1 && (
                <div className="border-t border-gray-100 mt-2 pt-2" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
