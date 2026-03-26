'use client';

import { OracleSidebarProps } from '@/components/oracle/shared/OraclePageTemplateNew';
import { ChainlinkSidebar as OriginalChainlinkSidebar } from './ChainlinkSidebar';
import { ChainlinkTabId } from '../types';

interface ChainlinkSidebarAdapterProps extends OracleSidebarProps {}

export function ChainlinkSidebarAdapter({ 
  activeTab, 
  onTabChange, 
  tabs,
  themeColor 
}: ChainlinkSidebarAdapterProps) {
  return (
    <OriginalChainlinkSidebar
      activeTab={activeTab as ChainlinkTabId}
      onTabChange={(tab) => onTabChange(tab as string)}
    />
  );
}
