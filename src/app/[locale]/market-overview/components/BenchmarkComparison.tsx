'use client';

import { useState } from 'react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { useTranslations } from '@/i18n';

import { type BenchmarkData } from '../types';

interface BenchmarkComparisonProps {
  data: BenchmarkData[];
  loading?: boolean;
}

type Timeframe = '1d' | '7d' | '30d' | '90d' | '1y';

export default function BenchmarkComparison({ data, loading = false }: BenchmarkComparisonProps) {
  const t = useTranslations('marketOverview.benchmark');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('30d');

  // 格式化百分比
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600">{entry.name}:</span>
                <span className="font-medium text-gray-900">
                  {formatPercent(entry.value)}
                </span>
              </div>
            ))}
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

  const timeframes: Timeframe[] = ['1d', '7d', '30d', '90d', '1y'];

  return (
    <div className="h-full flex flex-col">
      {/* Timeframe Selection */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">{t('timeframes.1d')}:</span>
        <div className="flex gap-1">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                selectedTimeframe === tf
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(`timeframes.${tf}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#4b5563', fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis
              tickFormatter={(value) => formatPercent(value)}
              tick={{ fill: '#4b5563', fontSize: 12 }}
              stroke="#9ca3af"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="oraclePerformance"
              name={t('performance')}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="benchmarkPerformance"
              name={t('compareTo')}
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
