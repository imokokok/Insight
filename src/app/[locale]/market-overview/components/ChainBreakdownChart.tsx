'use client';

import { useState } from 'react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { useTranslations } from '@/i18n';

import { type ChainBreakdownData } from '../types';

interface ChainBreakdownChartProps {
  data: ChainBreakdownData[];
  loading?: boolean;
}

export default function ChainBreakdownChart({ data, loading = false }: ChainBreakdownChartProps) {
  const t = useTranslations('marketOverview.chainBreakdown');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 按TVS排序
  const sortedData = [...data].sort((a, b) => b.tvs - a.tvs);

  // 格式化数值
  const formatTVS = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toFixed(0)}`;
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as ChainBreakdownData;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">{t('tvs')}:</span>
              <span className="font-medium text-gray-900">{formatTVS(item.tvs)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">{t('share')}:</span>
              <span className="font-medium text-gray-900">{item.share.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">{t('protocols')}:</span>
              <span className="font-medium text-gray-900">{item.protocolCount}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">{t('oracles')}:</span>
              <span className="font-medium text-gray-900">{item.oracleCount}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent animate-spin" />
          <span className="text-gray-500 text-sm">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">{t('noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis
              type="number"
              tickFormatter={(value) => formatTVS(value)}
              stroke="#9ca3af"
              fontSize={12}
            />
            <YAxis
              type="category"
              dataKey="chain"
              width={70}
              tick={{ fill: '#4b5563', fontSize: 12 }}
              stroke="#9ca3af"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="tvs"
              radius={[0, 4, 4, 0]}
              onMouseEnter={(_, index) => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={hoveredIndex === index ? '#3b82f6' : '#60a5fa'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-500 mb-1">{t('totalChains')}</div>
            <div className="text-lg font-semibold text-gray-900">{data.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">{t('totalTVS')}</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatTVS(data.reduce((sum, item) => sum + item.tvs, 0))}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">{t('avgProtocols')}</div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.round(data.reduce((sum, item) => sum + item.protocolCount, 0) / data.length)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
