'use client';

/**
 * @fileoverview 预言机共识深度图组件
 * @description 基于多预言机价格分布展示共识强度（非真实市场深度）
 * 价格点附近预言机越多，表示该价格点的共识越强
 */

import { memo, useMemo } from 'react';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

import { chartColors } from '@/lib/config/colors';
import { safeMax, safeMin } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';
import type { PriceData } from '@/types/oracle';

interface MarketDepthSimulatorProps {
  priceData: PriceData[];
  medianPrice: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface DepthDataPoint {
  price: number;
  bidDepth: number;
  askDepth: number;
  label: string;
}

function MarketDepthSimulatorComponent({ priceData, medianPrice, t }: MarketDepthSimulatorProps) {
  // 生成市场深度数据
  const depthData = useMemo((): DepthDataPoint[] => {
    if (priceData.length === 0 || medianPrice === 0) return [];

    const prices = priceData.map((d) => d.price).sort((a, b) => a - b);
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];

    // 生成价格点
    const steps = 20;
    const priceStep = (maxPrice - minPrice) / steps || 1;
    const data: DepthDataPoint[] = [];

    for (let i = 0; i <= steps; i++) {
      const price = minPrice + i * priceStep;
      const deviation = Math.abs(price - medianPrice) / medianPrice;

      // 模拟深度：价格越接近中位数，深度越大
      const baseDepth = 100 * Math.exp(-deviation * 10);
      const bidDepth = price <= medianPrice ? baseDepth : 0;
      const askDepth = price >= medianPrice ? baseDepth : 0;

      const formatPriceLabel = (p: number): string => {
        const absP = Math.abs(p);
        if (absP >= 1000) return `$${(p / 1000).toFixed(1)}K`;
        if (absP >= 1) return `$${p.toFixed(4)}`;
        return `$${p.toFixed(6)}`;
      };
      data.push({
        price,
        bidDepth,
        askDepth,
        label: formatPriceLabel(price),
      });
    }

    return data;
  }, [priceData, medianPrice]);

  // 计算最佳买卖价格
  const { bestBid, bestAsk, spread } = useMemo(() => {
    const prices = priceData.map((d) => d.price);
    const bid = safeMax(prices.filter((p) => p <= medianPrice));
    const ask = safeMin(prices.filter((p) => p >= medianPrice));
    const spreadPercent = ((ask - bid) / medianPrice) * 100;
    return { bestBid: bid, bestAsk: ask, spread: spreadPercent };
  }, [priceData, medianPrice]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">
          {t('crossOracle.charts.depthTitle')}
        </h4>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: chartColors.recharts.success }}
            />
            <span className="text-gray-500">{t('crossOracle.bid')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: chartColors.recharts.danger }}
            />
            <span className="text-gray-500">{t('crossOracle.ask')}</span>
          </div>
        </div>
      </div>

      {/* 最佳价格展示 */}
      <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">{t('crossOracle.bestBid')}</div>
          <div className="text-lg font-semibold text-emerald-600">{formatPrice(bestBid)}</div>
        </div>
        <div className="text-center border-x border-gray-200">
          <div className="text-xs text-gray-500 mb-1">{t('crossOracle.spread')}</div>
          <div className="text-lg font-semibold text-gray-900">{spread.toFixed(3)}%</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">{t('crossOracle.bestAsk')}</div>
          <div className="text-lg font-semibold text-red-600">{formatPrice(bestAsk)}</div>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={depthData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
            <XAxis
              dataKey="price"
              tickFormatter={formatPrice}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
            />
            <Tooltip
              formatter={(value, name) => [
                (value as number).toFixed(2),
                name === 'bidDepth' ? t('crossOracle.bidDepth') : t('crossOracle.askDepth'),
              ]}
              labelFormatter={(label) => `${t('crossOracle.price')}: ${label}`}
              contentStyle={{
                backgroundColor: chartColors.recharts.white,
                border: `1px solid ${chartColors.recharts.border}`,
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <ReferenceLine
              x={medianPrice}
              stroke={chartColors.recharts.tickDark}
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: t('crossOracle.median'),
                position: 'top',
                fill: chartColors.recharts.tickDark,
                fontSize: 11,
              }}
            />
            <Area
              type="monotone"
              dataKey="bidDepth"
              stackId="1"
              stroke={chartColors.recharts.success}
              fill={chartColors.recharts.success}
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="askDepth"
              stackId="2"
              stroke={chartColors.recharts.danger}
              fill={chartColors.recharts.danger}
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 text-xs text-gray-500 text-center">
        {t('crossOracle.charts.depthHint')}
      </div>
    </div>
  );
}

export const MarketDepthSimulator = memo(MarketDepthSimulatorComponent);
MarketDepthSimulator.displayName = 'MarketDepthSimulator';

export default MarketDepthSimulator;
