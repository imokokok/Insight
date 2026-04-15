'use client';

/**
 * @fileoverview 偏差分析散点图组件
 * @description X轴价格，Y轴偏差百分比，气泡大小代表置信度
 */

import { memo, useMemo } from 'react';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  ZAxis,
  Cell,
} from 'recharts';

import { chartColors } from '@/lib/config/colors';
import { formatPrice } from '@/lib/utils/format';
import type { OracleProvider, PriceData } from '@/types/oracle';

import { oracleNames } from '../../constants';

interface DeviationScatterChartProps {
  priceData: PriceData[];
  medianPrice: number;
  anomalies: Array<{
    provider: OracleProvider;
    deviationPercent: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface ScatterDataPoint {
  x: number; // 价格
  y: number; // 偏差百分比
  z: number; // 置信度 (用于气泡大小)
  provider: OracleProvider;
  name: string;
  severity: 'low' | 'medium' | 'high' | null;
}

function DeviationScatterChartComponent({
  priceData,
  medianPrice,
  anomalies,
  t,
}: DeviationScatterChartProps) {
  // 生成散点数据
  const scatterData = useMemo((): ScatterDataPoint[] => {
    if (priceData.length === 0 || medianPrice === 0) return [];

    const anomalyMap = new Map(anomalies.map((a) => [a.provider, a.severity]));

    return priceData.map((data) => {
      const deviationPercent = ((data.price - medianPrice) / medianPrice) * 100;
      const confidence = data.confidence || 50;

      return {
        x: data.price,
        y: deviationPercent,
        z: confidence * 5, // 放大置信度用于气泡大小
        provider: data.provider,
        name: oracleNames[data.provider] || data.provider,
        severity: anomalyMap.get(data.provider) || null,
      };
    });
  }, [priceData, medianPrice, anomalies]);

  // 获取颜色
  const getColor = (severity: 'low' | 'medium' | 'high' | null): string => {
    switch (severity) {
      case 'high':
        return chartColors.recharts.danger;
      case 'medium':
        return chartColors.recharts.warning;
      case 'low':
        return chartColors.recharts.warning;
      default:
        return chartColors.recharts.success;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">
          {t('crossOracle.charts.scatterTitle')}
        </h4>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: chartColors.recharts.success }}
            />
            <span className="text-gray-500">{t('crossOracle.normal')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: chartColors.recharts.warning }}
            />
            <span className="text-gray-500">{t('crossOracle.lowRisk')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: chartColors.recharts.warning }}
            />
            <span className="text-gray-500">{t('crossOracle.mediumRisk')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: chartColors.recharts.danger }}
            />
            <span className="text-gray-500">{t('crossOracle.highRisk')}</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
            <XAxis
              type="number"
              dataKey="x"
              name="Price"
              tickFormatter={formatPrice}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              domain={['auto', 'auto']}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Deviation"
              tickFormatter={(value) => `${value.toFixed(2)}%`}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
            />
            <ZAxis type="number" dataKey="z" range={[50, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as ScatterDataPoint;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <p className="font-medium text-gray-900">{data.name}</p>
                      <p className="text-sm text-gray-600">
                        {t('crossOracle.price')}: {formatPrice(data.x)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {t('crossOracle.deviation')}: {data.y >= 0 ? '+' : ''}
                        {data.y.toFixed(3)}%
                      </p>
                      <p className="text-sm text-gray-600">
                        {t('crossOracle.confidence')}: {(data.z / 5).toFixed(0)}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine
              y={0}
              stroke={chartColors.recharts.tickDark}
              strokeDasharray="4 4"
              strokeWidth={2}
            />
            <Scatter data={scatterData}>
              {scatterData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.severity)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 text-xs text-gray-500 text-center">
        {t('crossOracle.charts.scatterHint')}
      </div>
    </div>
  );
}

export const DeviationScatterChart = memo(DeviationScatterChartComponent);
DeviationScatterChart.displayName = 'DeviationScatterChart';

export default DeviationScatterChart;
