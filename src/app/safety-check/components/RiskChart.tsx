'use client';

import { useMemo } from 'react';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';

import type { PositionCriticalResult } from '@/lib/protocols/protocolHealth';

interface RiskChartProps {
  result: PositionCriticalResult;
}

export function RiskChart({ result }: RiskChartProps) {
  const data = useMemo(() => {
    const points: Array<{ price: number; ratio: number; deviation: number }> = [];
    const currentPrice = result.collateralPrice;
    const minDeviation = Math.min(result.criticalDeviationPercent * 1.3, -5);
    const maxDeviation = 5;

    for (let d = maxDeviation; d >= minDeviation; d -= 0.5) {
      const price = currentPrice * (1 + d / 100);
      const cValue = result.collateralAmount * price;
      const ratio =
        result.borrowAmount * result.borrowPrice > 0
          ? (cValue / (result.borrowAmount * result.borrowPrice)) * 100
          : 0;
      points.push({
        price: Number(price.toFixed(2)),
        ratio: Number(Math.max(0, ratio).toFixed(2)),
        deviation: d,
      });
    }
    return points;
  }, [result]);

  const liquidationLineY = result.liquidationThreshold * 100;

  const formatPriceLabel = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-1">Collateral Ratio Curve</h4>
      <p className="text-xs text-gray-500 mb-4">
        X-axis: {result.collateralSymbol} oracle price, Y-axis: collateral ratio
      </p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="riskGradientLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="50%" stopColor="#6366f1" stopOpacity={0.05} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="price"
              tickFormatter={formatPriceLabel}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '12px',
                color: '#374151',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(value, name) => [
                name === 'ratio' ? `${Number(value).toFixed(1)}%` : value,
                name === 'ratio' ? 'Collateral Ratio' : name,
              ]}
              labelFormatter={(label) => `Price: $${Number(label).toFixed(2)}`}
            />
            <ReferenceLine
              y={liquidationLineY}
              stroke="#ef4444"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: `Liq. Line ${liquidationLineY.toFixed(0)}%`,
                position: 'insideTopRight',
                fill: '#ef4444',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <ReferenceDot
              x={result.criticalCollateralPrice}
              y={liquidationLineY}
              r={5}
              fill="#ef4444"
              stroke="#fff"
              strokeWidth={2}
              label={{
                value: 'Critical Point',
                position: 'top',
                fill: '#ef4444',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <Area
              type="monotone"
              dataKey="ratio"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#riskGradientLight)"
              dot={false}
              activeDot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
