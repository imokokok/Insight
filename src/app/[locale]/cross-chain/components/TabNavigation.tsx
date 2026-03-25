'use client';

import { useTranslations } from '@/i18n';
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
    <div className="mb-4">
      {/* Desktop: SegmentedControl style */}
      <div className="hidden sm:block">
        <div
          className="inline-flex p-1 rounded-lg"
          style={{ backgroundColor: baseColors.gray[100] }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'shadow-sm'
                    : 'hover:text-gray-900'
                }`}
                style={{
                  backgroundColor: isActive ? baseColors.primary[600] : 'transparent',
                  color: isActive ? '#ffffff' : baseColors.gray[600],
                }}
                title={tab.description}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: Horizontal scroll with compact style */}
      <div className="sm:hidden">
        <div
          className="flex gap-1 p-1 rounded-lg overflow-x-auto scrollbar-hide"
          style={{ backgroundColor: baseColors.gray[100] }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'shadow-sm'
                    : 'hover:text-gray-900'
                }`}
                style={{
                  backgroundColor: isActive ? baseColors.primary[600] : 'transparent',
                  color: isActive ? '#ffffff' : baseColors.gray[600],
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
