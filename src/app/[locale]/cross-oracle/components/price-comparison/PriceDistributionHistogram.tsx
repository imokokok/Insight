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
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
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

      buckets.push({
        range: `${bucketMin.toFixed(2)}-${bucketMax.toFixed(2)}`,
        count: itemsInBucket.length,
        midPrice,
        isAnomaly: hasAnomaly,
      });
    }

    return buckets;
  }, [priceData, anomalies]);

  const formatPrice = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">
          {t('crossOracle.charts.distributionTitle') || '价格分布'}
        </h4>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-gray-500">{t('crossOracle.normal') || '正常'}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span className="text-gray-500">{t('crossOracle.anomaly') || '异常'}</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histogramData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="midPrice"
              tickFormatter={formatPrice}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: number, _name: string, props: { payload: HistogramData }) => [
                `${value} ${t('crossOracle.oracles') || '个预言机'}`,
                props.payload.range,
              ]}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <ReferenceLine
              x={medianPrice}
              stroke="#374151"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: t('crossOracle.median') || '中位数',
                position: 'top',
                fill: '#374151',
                fontSize: 11,
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {histogramData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.isAnomaly ? '#EF4444' : '#3B82F6'} />
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
