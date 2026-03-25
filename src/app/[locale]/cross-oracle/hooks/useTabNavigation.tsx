'use client';

import { useState, useEffect } from 'react';

export type TabId = 'overview' | 'analysis' | 'history';

// 旧TabId到新TabId的映射（用于向后兼容）
const TAB_MIGRATION_MAP: Record<string, TabId> = {
  charts: 'analysis',
  advanced: 'analysis',
  performance: 'analysis',
  snapshots: 'history',
};

interface Tab {
  id: TabId;
  labelKey: string;
  icon: React.ReactNode;
}

const getTabs = (_t: (key: string) => string): Tab[] => [
  {
    id: 'overview',
    labelKey: 'crossOracle.tabOverview',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    ),
  },
  {
    id: 'analysis',
    labelKey: 'crossOracle.tabAnalysis',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    id: 'history',
    labelKey: 'crossOracle.tabHistory',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

const STORAGE_KEY = 'cross-oracle-active-tab';

export function useTabNavigation() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    const savedTab = localStorage.getItem(STORAGE_KEY);
    if (savedTab) {
      // 检查是否是旧TabId，如果是则映射到新TabId
      const migratedTab = TAB_MIGRATION_MAP[savedTab] || (savedTab as TabId);
      // 验证映射后的TabId是否有效
      if (getTabs(() => '').some((tab) => tab.id === migratedTab)) {
        setActiveTab(migratedTab);
        // 如果发生了迁移，更新本地存储
        if (migratedTab !== savedTab) {
          localStorage.setItem(STORAGE_KEY, migratedTab);
        }
      }
    }
  }, []);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    localStorage.setItem(STORAGE_KEY, tab);
  };

  return { activeTab, handleTabChange };
}
