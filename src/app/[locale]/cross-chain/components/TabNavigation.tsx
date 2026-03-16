'use client';

import { baseColors } from '@/lib/config/colors';

export type TabId = 'overview' | 'correlation' | 'advanced' | 'charts';

interface Tab {
  id: TabId;
  label: string;
  description: string;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: Tab[] = [
    {
      id: 'overview',
      label: '概览',
      description: '核心统计与价格对比',
    },
    {
      id: 'correlation',
      label: '相关性',
      description: '链间相关性分析',
    },
    {
      id: 'advanced',
      label: '高级分析',
      description: '协整与波动率分析',
    },
    {
      id: 'charts',
      label: '价格图表',
      description: '交互式价格走势',
    },
  ];

  return (
    <div className="mb-6 pb-6 border-b" style={{ borderColor: baseColors.gray[200] }}>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative px-4 py-3 text-left transition-all duration-200 border min-w-[140px] ${
                isActive ? 'bg-white' : 'bg-transparent hover:bg-gray-50'
              }`}
              style={{
                borderColor: isActive ? baseColors.primary[500] : baseColors.gray[300],
                boxShadow: isActive ? `0 0 0 1px ${baseColors.primary[500]}` : 'none',
              }}
            >
              <div
                className={`text-sm font-medium ${isActive ? '' : ''}`}
                style={{ color: isActive ? baseColors.primary[700] : baseColors.gray[700] }}
              >
                {tab.label}
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: isActive ? baseColors.primary[500] : baseColors.gray[400] }}
              >
                {tab.description}
              </div>
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: baseColors.primary[500] }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
