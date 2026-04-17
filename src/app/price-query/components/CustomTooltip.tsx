'use client';

/**
 * @fileoverview 自定义图表提示框组件
 * @description 显示数据点的详细信息，包含多维度数据展示、涨跌幅计算、数据源标识、溢出检测
 */

import { useEffect, useRef, useState } from 'react';

import { chartColors } from '@/lib/config/colors';
import { formatPrice } from '@/lib/utils/chartSharedUtils';

import { Icons } from './Icons';
import { type ChartDataPoint } from './PriceChart';

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
  coordinate?: { x: number; y: number };
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
 * 检测并计算 tooltip 位置以避免溢出视口
 */
function calculateTooltipPosition(
  coordinate: { x: number; y: number } | undefined,
  tooltipWidth: number,
  tooltipHeight: number
): { left: number; top: number; transform: string } {
  if (!coordinate) {
    return { left: 0, top: 0, transform: 'translate(0, 0)' };
  }

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const margin = 16; // 视口边距

  const left = coordinate.x;
  let top = coordinate.y;
  let transform = 'translate(10px, -50%)';

  // 检测右侧溢出
  if (left + tooltipWidth + margin > viewportWidth) {
    // 显示在左侧
    transform = 'translate(calc(-100% - 10px), -50%)';
  }

  // 检测底部溢出
  if (top + tooltipHeight / 2 > viewportHeight - margin) {
    top = viewportHeight - tooltipHeight / 2 - margin;
  }

  // 检测顶部溢出
  if (top - tooltipHeight / 2 < margin) {
    top = tooltipHeight / 2 + margin;
  }

  return { left, top, transform };
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
 * - 溢出检测和自动位置调整
 */
export function CustomTooltip({ active, payload, label, coordinate }: CustomTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, transform: 'translate(0, 0)' });

  useEffect(() => {
    if (active && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const newPosition = calculateTooltipPosition(coordinate, rect.width, rect.height);
      setPosition(newPosition);
    }
  }, [active, coordinate, payload]);

  if (!active || !payload || payload.length === 0) return null;

  // 从 payload 中提取额外数据
  const firstPayload = payload[0]?.payload;
  const avgPrice = firstPayload?._avgPrice;
  const prevValues = firstPayload?._prevValues;
  const oracleInfo = firstPayload?._oracleInfo;

  const formatDateTime = (timestamp: string | number | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      ref={tooltipRef}
      className="border shadow-lg rounded-lg p-3 min-w-[220px] fixed pointer-events-none"
      style={{
        backgroundColor: chartColors.recharts.white,
        borderColor: chartColors.recharts.border,
        left: position.left,
        top: position.top,
        transform: position.transform,
        zIndex: 1000,
      }}
    >
      {/* 时间标题 */}
      <div
        className="flex items-center gap-1.5 mb-2 pb-2 border-b"
        style={{ borderColor: chartColors.recharts.border }}
      >
        <span style={{ color: chartColors.recharts.tick }}>
          <Icons.clock className="w-3.5 h-3.5" />
        </span>
        <span className="text-xs" style={{ color: chartColors.recharts.tick }}>
          {formatDateTime(label)}
        </span>
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
                <span
                  className="text-xs font-medium"
                  style={{ color: chartColors.recharts.tickDark }}
                >
                  {provider}
                </span>
                {chainName && (
                  <span className="text-xs" style={{ color: chartColors.recharts.tick }}>
                    ({chainName})
                  </span>
                )}
              </div>

              {/* 价格和涨跌幅行 */}
              <div className="flex items-baseline justify-between gap-3 pl-4.5">
                <span
                  className="text-lg font-bold"
                  style={{ color: chartColors.recharts.tickDark }}
                >
                  {formatPrice(value)}
                </span>
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
                  <span className="text-xs" style={{ color: chartColors.recharts.tick }}>
                    {'priceQuery.chart.tooltip.deviationFromAvg'}
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
                <div
                  className="border-t mt-2 pt-2"
                  style={{ borderColor: chartColors.recharts.border }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
