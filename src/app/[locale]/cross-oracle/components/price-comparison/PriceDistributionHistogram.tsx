'use client';

/**
 * @fileoverview 价格分布直方图组件
 * @description 展示预言机价格的分布情况
 */

import { memo, useMemo } from 'react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  Cell,
} from 'recharts';

import { chartColors } from '@/lib/config/colors';
import { safeMax, safeMin } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';
import type { OracleProvider, PriceData } from '@/types/oracle';

interface PriceDistributionHistogramProps {
  priceData: PriceData[];
  medianPrice: number;
  anomalies: Array<{ provider: OracleProvider; deviationPercent: number }>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface HistogramData {
  range: string;
  count: number;
  midPrice: number;
  isAnomaly: boolean;
}

function PriceDistributionHistogramComponent({
  priceData,
  medianPrice,
  anomalies,
  t,
}: PriceDistributionHistogramProps) {
  // 生成直方图数据
  const histogramData = useMemo((): HistogramData[] => {
    if (priceData.length === 0) return [];

    const prices = priceData.map((d) => d.price);
    const minPrice = safeMin(prices);
    const maxPrice = safeMax(prices);
    const range = maxPrice - minPrice;

    // 动态确定桶数量
    const bucketCount = Math.min(10, Math.max(5, priceData.length));
    const bucketSize = range / bucketCount || 1;

    const buckets: HistogramData[] = [];
    const anomalyProviders = new Set(anomalies.map((a) => a.provider));

    for (let i = 0; i < bucketCount; i++) {
      const bucketMin = minPrice + i * bucketSize;
      const bucketMax = bucketMin + bucketSize;
      const midPrice = (bucketMin + bucketMax) / 2;

      const itemsInBucket = priceData.filter(
        (d) =>
          d.price >= bucketMin &&
          (i === bucketCount - 1 ? d.price <= bucketMax : d.price < bucketMax)
      );

      const hasAnomaly = itemsInBucket.some((d) => anomalyProviders.has(d.provider));

      const formatBucketPrice = (p: number): string => {
        const absP = Math.abs(p);
        if (absP >= 1000) return (p / 1000).toFixed(1) + 'K';
        if (absP >= 1) return p.toFixed(4);
        return p.toFixed(6);
      };

      buckets.push({
        range: `${formatBucketPrice(bucketMin)}-${formatBucketPrice(bucketMax)}`,
        count: itemsInBucket.length,
        midPrice,
        isAnomaly: hasAnomaly,
      });
    }

    return buckets;
  }, [priceData, anomalies]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">
          {t('crossOracle.charts.distributionTitle')}
        </h4>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: chartColors.recharts.primary }}
            />
            <span className="text-gray-500">{t('crossOracle.normal')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: chartColors.recharts.danger }}
            />
            <span className="text-gray-500">{t('crossOracle.anomaly')}</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histogramData} margin={{ top: 30, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.recharts.grid}
              vertical={false}
            />
            <XAxis
              dataKey="midPrice"
              tickFormatter={formatPrice}
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: chartColors.recharts.axis, strokeDasharray: '3 3' }}
              formatter={(value, _name, props) => [
                `${value} ${t('crossOracle.oracles')}`,
                (props as { payload: HistogramData }).payload.range,
              ]}
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
                position: 'insideTop',
                fill: chartColors.recharts.tickDark,
                fontSize: 11,
                dy: -20,
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {histogramData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.isAnomaly ? chartColors.recharts.danger : chartColors.recharts.primary
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export const PriceDistributionHistogram = memo(PriceDistributionHistogramComponent);
PriceDistributionHistogram.displayName = 'PriceDistributionHistogram';

export default PriceDistributionHistogram;
