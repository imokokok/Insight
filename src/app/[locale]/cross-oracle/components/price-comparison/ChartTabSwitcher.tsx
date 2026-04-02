'use client';

/**
 * @fileoverview 图表Tab切换器组件
 * @description 用于切换不同类型的价格分析图表
 */

import { memo } from 'react';

import { BarChart3, ScatterChart, TrendingUp, GitGraph } from 'lucide-react';

export type ChartTabType = 'distribution' | 'scatter' | 'trend' | 'depth';

interface ChartTab {
  id: ChartTabType;
  label: string;
  icon: React.ReactNode;
}

interface ChartTabSwitcherProps {
  activeTab: ChartTabType;
  onTabChange: (tab: ChartTabType) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function ChartTabSwitcherComponent({ activeTab, onTabChange, t }: ChartTabSwitcherProps) {
  const tabs: ChartTab[] = [
    {
      id: 'distribution',
      label: t('crossOracle.charts.distribution') || '分布直方图',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'scatter',
      label: t('crossOracle.charts.scatter') || '偏差散点图',
      icon: <ScatterChart className="w-4 h-4" />,
    },
    {
      id: 'trend',
      label: t('crossOracle.charts.trend') || '走势对比',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'depth',
      label: t('crossOracle.charts.depth') || '市场深度',
      icon: <GitGraph className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md
            transition-all duration-200
            ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }
          `}
        >
          {tab.icon}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export const ChartTabSwitcher = memo(ChartTabSwitcherComponent);
ChartTabSwitcher.displayName = 'ChartTabSwitcher';

export default ChartTabSwitcher;
