'use client';

import { useState } from 'react';

import { useTranslations } from '@/i18n';

import { type CorrelationData } from '../types';

interface CorrelationMatrixProps {
  data: CorrelationData;
  loading?: boolean;
}

type Timeframe = '1d' | '7d' | '30d' | '90d';
type Method = 'pearson' | 'spearman';

export default function CorrelationMatrix({ data, loading = false }: CorrelationMatrixProps) {
  const t = useTranslations('marketOverview.correlation');
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [method, setMethod] = useState<Method>('pearson');

  // 获取相关性颜色
  const getCorrelationColor = (value: number) => {
    // value: -1 to 1
    if (value > 0.7) return 'bg-green-600';
    if (value > 0.4) return 'bg-green-400';
    if (value > 0.1) return 'bg-green-200';
    if (value < -0.7) return 'bg-red-600';
    if (value < -0.4) return 'bg-red-400';
    if (value < -0.1) return 'bg-red-200';
    return 'bg-gray-200';
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

  const assets = data.oracles;

  if (!assets || assets.length === 0) {
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
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">{t('title')}</h3>
        <p className="text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{t('timeframe')}:</span>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="1d">1D</option>
            <option value="7d">7D</option>
            <option value="30d">30D</option>
            <option value="90d">90D</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{t('method')}:</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as Method)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="pearson">{t('pearson')}</option>
            <option value="spearman">{t('spearman')}</option>
          </select>
        </div>
      </div>

      {/* Matrix */}
      <div className="flex-1 overflow-auto">
        <div className="inline-block">
          {/* Header Row */}
          <div className="flex">
            <div className="w-20 h-10" /> {/* Empty corner */}
            {assets.map((asset) => (
              <div
                key={asset}
                className="w-16 h-10 flex items-center justify-center text-xs font-medium text-gray-600"
              >
                {asset}
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {assets.map((rowAsset, rowIndex) => (
            <div key={rowAsset} className="flex">
              <div className="w-20 h-10 flex items-center justify-center text-xs font-medium text-gray-600">
                {rowAsset}
              </div>
              {assets.map((colAsset, colIndex) => {
                const value = data.matrix[rowIndex]?.[colIndex] ?? 0;
                return (
                  <div
                    key={`${rowAsset}-${colAsset}`}
                    className={`w-16 h-10 flex items-center justify-center text-xs font-medium ${getCorrelationColor(value)}`}
                    title={`${rowAsset} vs ${colAsset}: ${value.toFixed(2)}`}
                  >
                    {value.toFixed(2)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-600" />
            <span className="text-gray-600">{t('positiveCorrelation')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600" />
            <span className="text-gray-600">{t('negativeCorrelation')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200" />
            <span className="text-gray-600">{t('noCorrelation')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
