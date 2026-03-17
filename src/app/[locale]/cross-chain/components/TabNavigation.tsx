'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations();
  
  const tabs: Tab[] = [
    {
      id: 'overview',
      label: t('crossChain.tabOverview'),
      description: t('crossChain.tabOverviewDesc'),
    },
    {
      id: 'correlation',
      label: t('crossChain.tabCorrelation'),
      description: t('crossChain.tabCorrelationDesc'),
    },
    {
      id: 'advanced',
      label: t('crossChain.tabAdvanced'),
      description: t('crossChain.tabAdvancedDesc'),
    },
    {
      id: 'charts',
      label: t('crossChain.tabCharts'),
      description: t('crossChain.tabChartsDesc'),
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
