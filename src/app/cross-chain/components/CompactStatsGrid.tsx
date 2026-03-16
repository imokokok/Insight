'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { baseColors } from '@/lib/config/colors';
import { TrendIndicator } from './SmallComponents';
import { ChainStats } from '../constants';

interface CompactStatsGridProps {
  statsData: ChainStats[];
}

export function CompactStatsGrid({ statsData }: CompactStatsGridProps) {
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);

  // 核心指标（始终显示）
  const coreStats = statsData.slice(0, 6);
  // 扩展指标（可展开）
  const extendedStats = statsData.slice(6);

  const displayStats = showAll ? statsData : coreStats;

  return (
    <div id="stats" className="mb-8 pb-8 border-b" style={{ borderColor: baseColors.gray[100] }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: baseColors.gray[900] }}>
          {t('crossChain.statistics')}
        </h3>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs px-3 py-1.5 border transition-colors hover:bg-gray-50"
          style={{ borderColor: baseColors.gray[300], color: baseColors.gray[600] }}
        >
          {showAll ? (t('crossChain.collapse') || '收起') : (t('crossChain.viewAll') || '查看全部')}
          <span className="ml-1" style={{ color: baseColors.gray[400] }}>
            ({coreStats.length}/{statsData.length})
          </span>
        </button>
      </div>

      <div className={`grid gap-3 transition-all duration-300 ${
        showAll 
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' 
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
      }`}>
        {displayStats.map((stat, index) => (
          <div
            key={index}
            className="px-3 py-3 border"
            style={{ 
              borderColor: baseColors.gray[200],
              backgroundColor: 'white',
            }}
            title={stat.tooltip}
          >
            <div className="flex items-center justify-between mb-1">
              <div
                className="text-[10px] uppercase truncate"
                style={{ color: baseColors.gray[500] }}
              >
                {stat.label}
              </div>
              {stat.trend !== null && stat.trend !== undefined && (
                <TrendIndicator changePercent={stat.trend} />
              )}
            </div>
            <div
              className="text-base font-semibold truncate"
              style={{ color: baseColors.gray[900] }}
            >
              {stat.value}
            </div>
            {stat.subValue && (
              <div
                className="text-[10px] mt-0.5 truncate"
                style={{ color: baseColors.gray[400] }}
              >
                {stat.subValue}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
