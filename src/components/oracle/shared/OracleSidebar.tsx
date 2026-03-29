'use client';

import { type ReactNode } from 'react';

import { UnifiedSidebar } from '@/components/oracle';
import { type OracleConfig } from '@/lib/config/oracles';

export interface OracleSidebarProps {
  config: OracleConfig;
  activeTab: string;
  onTabChange: (tab: string) => void;
  themeColor?: string;
  iconMap?: Record<string, ReactNode>;
}

export function OracleSidebar({
  config,
  activeTab,
  onTabChange,
  themeColor,
  iconMap = {},
}: OracleSidebarProps) {
  const items = config.tabs.map((tab) => ({
    id: tab.id,
    labelKey: tab.labelKey,
    icon: iconMap[tab.id] || <DefaultIcon />,
  }));

  return (
    <UnifiedSidebar
      items={items}
      activeTab={activeTab}
      onTabChange={onTabChange}
      themeColor={themeColor || config.themeColor}
    />
  );
}

function DefaultIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
