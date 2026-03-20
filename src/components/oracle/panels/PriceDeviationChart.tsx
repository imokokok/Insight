'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { chartColors, semanticColors } from '@/lib/config/colors';
import { PriceDeviationData } from './qualityUtils';


interface PriceDeviationChartProps {
  data: PriceDeviationData[];
}

export function PriceDeviationChart({ data }: PriceDeviationChartProps) {
  const t = useTranslations();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('dataQuality.deviationDistribution')}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('dataQuality.deviationPercentByOracle')}</p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartColors.recharts.grid}
            vertical={false}
          />
          <XAxis
            dataKey="oracle"
            stroke={chartColors.recharts.tick}
            tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid }}
          />
          <YAxis
            stroke={chartColors.recharts.tick}
            tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid }}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const item = payload[0].payload as PriceDeviationData;
              return (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600 font-medium mb-2">{item.oracle}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">{t('dataQuality.price')}:</span>
                      <span className="text-gray-900 font-mono">${item.price.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">{t('dataQuality.deviation')}:</span>
                      <span
                        className={`font-mono ${item.deviationPercent >= 0 ? 'text-success-600' : 'text-danger-600'}`}
                      >
                        {item.deviationPercent >= 0 ? '+' : ''}
                        {item.deviationPercent.toFixed(3)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <ReferenceLine y={0} stroke={chartColors.recharts.tick} strokeWidth={1} />
          <ReferenceLine y={0.5} stroke={chartColors.semantic.warning} strokeDasharray="5 5" />
          <ReferenceLine y={-0.5} stroke={chartColors.semantic.warning} strokeDasharray="5 5" />
          <ReferenceLine y={1.0} stroke={chartColors.semantic.danger} strokeDasharray="5 5" />
          <ReferenceLine y={-1.0} stroke={chartColors.semantic.danger} strokeDasharray="5 5" />
          <Bar dataKey="deviationPercent">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.status === 'critical'
                    ? chartColors.semantic.danger
                    : entry.status === 'warning'
                      ? chartColors.semantic.warning
                      : chartColors.semantic.success
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded"
            style={{ backgroundColor: semanticColors.success.DEFAULT }}
          />
          <span className="text-xs text-gray-500">{t('dataQuality.normal')} (&lt;0.2%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded"
            style={{ backgroundColor: semanticColors.warning.DEFAULT }}
          />
          <span className="text-xs text-gray-500">{t('dataQuality.warningRange')} (0.2-0.5%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded"
            style={{ backgroundColor: semanticColors.danger.DEFAULT }}
          />
          <span className="text-xs text-gray-500">{t('dataQuality.criticalRange')} (&gt;0.5%)</span>
        </div>
      </div>
    </div>
  );
}
