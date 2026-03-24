'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { CompactStatCard } from '@/components/ui/CompactStatCard';
import { ChainStats } from '../constants';

interface CompactStatsGridProps {
  statsData: ChainStats[];
}

// 生成模拟 Sparkline 数据
function generateMockSparklineData(seed: number, points: number = 20): number[] {
  const data: number[] = [];
  let value = 50 + (seed % 50);

  for (let i = 0; i < points; i++) {
    // 基于 seed 生成相对稳定的随机波动
    const change = (Math.sin(seed + i * 0.5) * 10) + (Math.random() - 0.5) * 15;
    value = Math.max(10, Math.min(100, value + change));
    data.push(value);
  }

  return data;
}

export function CompactStatsGrid({ statsData }: CompactStatsGridProps) {
  const t = useTranslations();
  const [showAll, setShowAll] = useState(false);

  // 核心指标（始终显示）
  const coreStats = statsData.slice(0, 6);

  const displayStats = showAll ? statsData : coreStats;

  // 为每个 stat 生成 sparkline 数据（使用 useMemo 缓存）
  const statsWithSparkline = useMemo(() => {
    return displayStats.map((stat, index) => ({
      ...stat,
      sparklineData: generateMockSparklineData(index + (stat.label.charCodeAt(0) || 0)),
    }));
  }, [displayStats]);

  return (
    <div id="stats" className="mb-8 pb-8 border-b border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('crossChain.statistics')}
        </h3>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 transition-colors hover:bg-gray-50"
        >
          {showAll ? t('crossChain.collapse') : t('crossChain.viewAll')}
          <span className="ml-1 text-gray-400">
            ({coreStats.length}/{statsData.length})
          </span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 transition-all duration-300">
        {statsWithSparkline.map((stat, index) => (
          <CompactStatCard
            key={index}
            title={stat.label}
            value={stat.value}
            change={stat.trend !== null && stat.trend !== undefined ? {
              value: stat.trend,
              percentage: true,
            } : undefined}
            sparklineData={stat.sparklineData}
            breakdown={stat.subValue ? [{ label: t('crossChain.detail'), value: stat.subValue }] : undefined}
            tooltip={stat.tooltip}
          />
        ))}
      </div>
    </div>
  );
}
