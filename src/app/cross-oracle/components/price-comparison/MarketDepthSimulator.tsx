'use client';

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
}

interface DepthDataPoint {
  price: number;
  bidDepth: number;
  askDepth: number;
  label: string;
}

function MarketDepthSimulatorComponent({ priceData, medianPrice }: MarketDepthSimulatorProps) {
  const depthData = useMemo((): DepthDataPoint[] => {
    if (priceData.length === 0 || medianPrice === 0) return [];

    const prices = priceData.map((d) => d.price).sort((a, b) => a - b);
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];

    const steps = 20;
    const priceStep = (maxPrice - minPrice) / steps || 1;
    const data: DepthDataPoint[] = [];

    for (let i = 0; i <= steps; i++) {
      const price = minPrice + i * priceStep;
      const deviation = Math.abs(price - medianPrice) / medianPrice;

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

  const { bestBid, bestAsk, spread } = useMemo(() => {
    const prices = priceData.map((d) => d.price);
    const bids = prices.filter((p) => p <= medianPrice);
    const asks = prices.filter((p) => p >= medianPrice);
    const bid = bids.length > 0 ? safeMax(bids) : null;
    const ask = asks.length > 0 ? safeMin(asks) : null;
    const spreadPercent = bid !== null && ask !== null ? ((ask - bid) / medianPrice) * 100 : 0;
    return { bestBid: bid, bestAsk: ask, spread: spreadPercent };
  }, [priceData, medianPrice]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">Consensus Depth</h4>
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded">
            Simulated
          </span>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: chartColors.recharts.success }}
              />
              <span className="text-gray-500">Bid</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: chartColors.recharts.danger }}
              />
              <span className="text-gray-500">Ask</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Best Bid</div>
          <div className="text-lg font-semibold text-emerald-600">
            {bestBid !== null ? formatPrice(bestBid) : '-'}
          </div>
        </div>
        <div className="text-center border-x border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Spread</div>
          <div className="text-lg font-semibold text-gray-900">{spread.toFixed(3)}%</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Best Ask</div>
          <div className="text-lg font-semibold text-red-600">
            {bestAsk !== null ? formatPrice(bestAsk) : '-'}
          </div>
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
                name === 'bidDepth' ? 'Bid Depth' : 'Ask Depth',
              ]}
              labelFormatter={(label) => `Price: ${label}`}
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
                value: 'Median',
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
        Consensus strength based on oracle price distribution
      </div>
      <div className="mt-1 text-xs text-gray-400 text-center">
        Depth data is calculated from price deviation, not real order book data
      </div>
    </div>
  );
}

export const MarketDepthSimulator = memo(MarketDepthSimulatorComponent);
MarketDepthSimulator.displayName = 'MarketDepthSimulator';
