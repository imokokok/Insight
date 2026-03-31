'use client';

import { useState } from 'react';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

import { useTranslations } from '@/i18n';
import { type TooltipProps } from '@/types/ui/recharts';

import { type AssetCategory } from '../types';

interface AssetCategoryChartProps {
  data: AssetCategory[];
  loading?: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];

export default function AssetCategoryChart({ data, loading = false }: AssetCategoryChartProps) {
  const t = useTranslations('marketOverview.assetCategory');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // 格式化数值
  const formatTVS = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toFixed(0)}`;
  };

  // 获取类别标签
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      stablecoins: t('stablecoins'),
      layer1: t('layer1'),
      layer2: t('layer2'),
      defi: t('defi'),
      nft: t('nft'),
      gaming: t('gaming'),
      other: t('other'),
    };
    return labels[category] || category;
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: TooltipProps<AssetCategory>) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{getCategoryLabel(item.category)}</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">{t('tvs')}:</span>
              <span className="font-medium text-gray-900">{formatTVS(item.value)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">{t('share')}:</span>
              <span className="font-medium text-gray-900">{item.share.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">{t('assets')}:</span>
              <span className="font-medium text-gray-900">{item.assets.length}</span>
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
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="70%"
              paddingAngle={2}
              dataKey="tvs"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke={activeIndex === index ? '#fff' : 'none'}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.map((item, index) => (
          <div key={item.category} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm text-gray-600">{getCategoryLabel(item.category)}</span>
            <span className="text-sm text-gray-400">({item.share.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
