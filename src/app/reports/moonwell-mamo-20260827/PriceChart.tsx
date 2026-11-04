'use client';

import { useMemo, useState } from 'react';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface PriceChartProps {
  rounds: Array<{ updatedAt: number; price: number }>;
  attackStart: number; // unix seconds
  attackEnd: number; // unix seconds
}

const fmtUsd = (v: number) => (v >= 1 ? `$${v.toFixed(4)}` : `$${v.toFixed(6)}`);
const fmtTime = (t: number) =>
  new Date(t * 1000).toLocaleString('zh-CN', {
    timeZone: 'UTC',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export default function PriceChart({ rounds, attackStart, attackEnd }: PriceChartProps) {
  const [logScale, setLogScale] = useState(true);

  const data = useMemo(
    () => rounds.map((r) => ({ t: r.updatedAt, p: r.price, label: fmtTime(r.updatedAt) })),
    [rounds]
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Chainlink MAMO/USD feed（Base）喂价轮次 · UTC 时间 · 共 {rounds.length} 轮
        </p>
        <button
          type="button"
          onClick={() => setLogScale((v) => !v)}
          className="border border-slate-900/20 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-700"
        >
          {logScale ? '切换线性坐标' : '切换对数坐标'}
        </button>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="mamoPriceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={fmtTime}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              minTickGap={40}
            />
            <YAxis
              scale={logScale ? 'log' : 'linear'}
              domain={logScale ? [0.008, 'dataMax'] : [0, 'dataMax']}
              allowDataOverflow
              tickFormatter={(v: number) => fmtUsd(Number(v))}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              width={82}
            />
            <ReferenceArea
              x1={attackStart}
              x2={attackEnd}
              fill="#dc2626"
              fillOpacity={0.07}
              stroke="#dc2626"
              strokeOpacity={0.35}
              strokeDasharray="4 4"
              label={{
                value: '攻击窗口 06:09–09:30',
                position: 'insideTopRight',
                fill: '#b91c1c',
                fontSize: 11,
              }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                backgroundColor: '#ffffff',
              }}
              labelFormatter={(label) => fmtTime(Number(label))}
              formatter={(value) => [fmtUsd(Number(value)), '喂价']}
            />
            <Area
              type="stepAfter"
              dataKey="p"
              stroke="#1d4ed8"
              strokeWidth={1.6}
              fill="url(#mamoPriceFill)"
              dot={false}
              activeDot={{ r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
