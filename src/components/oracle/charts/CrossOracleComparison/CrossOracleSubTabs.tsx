'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export type SubTab = 'overview' | 'charts' | 'data' | 'settings';

interface CrossOracleSubTabsProps {
  activeTab: SubTab;
  onTabChange: (tab: SubTab) => void;
}

const STORAGE_KEY = 'cross-oracle-subtab';

export function CrossOracleSubTabs({ activeTab, onTabChange }: CrossOracleSubTabsProps) {
  const t = useTranslations();

  // Load saved tab from localStorage on mount
  useEffect(() => {
    const savedTab = localStorage.getItem(STORAGE_KEY) as SubTab | null;
    if (savedTab && ['overview', 'charts', 'data', 'settings'].includes(savedTab)) {
      onTabChange(savedTab);
    }
  }, [onTabChange]);

  const handleTabChange = (tab: SubTab) => {
    onTabChange(tab);
    localStorage.setItem(STORAGE_KEY, tab);
  };

  const tabs: { id: SubTab; label: string }[] = [
    {
      id: 'overview',
      label: t('crossOracle.subTabs.overview'),
    },
    {
      id: 'charts',
      label: t('crossOracle.subTabs.charts'),
    },
    {
      id: 'data',
      label: t('crossOracle.subTabs.data'),
    },
    {
      id: 'settings',
      label: t('crossOracle.subTabs.settings'),
    },
  ];

  return (
    <nav className="flex space-x-1" aria-label="SubTabs">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              relative px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 rounded-md
              ${
                isActive
                  ? 'text-gray-900 bg-gray-100'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function useSubTab(): [SubTab, (tab: SubTab) => void] {
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  return [activeTab, setActiveTab];
}
