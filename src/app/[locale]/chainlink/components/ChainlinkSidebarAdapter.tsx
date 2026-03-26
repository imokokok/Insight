'use client';

import { type OracleSidebarProps } from '@/components/oracle/shared/OraclePageTemplateNew';

import { type ChainlinkTabId } from '../types';

import { ChainlinkSidebar as OriginalChainlinkSidebar } from './ChainlinkSidebar';

type ChainlinkSidebarAdapterProps = OracleSidebarProps;

export function ChainlinkSidebarAdapter({
  activeTab,
  onTabChange,
  tabs,
  themeColor,
}: ChainlinkSidebarAdapterProps) {
  return (
    <OriginalChainlinkSidebar
      activeTab={activeTab as ChainlinkTabId}
      onTabChange={(tab) => onTabChange(tab as string)}
    />
  );
}
