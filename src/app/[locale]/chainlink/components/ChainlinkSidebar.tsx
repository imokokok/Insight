'use client';

import { BarChart3, Globe, Server, Database, Layers, Network, ShieldAlert } from 'lucide-react';

import { UnifiedSidebar } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type ChainlinkSidebarProps, type ChainlinkTabId } from '../types';

const navItems = [
  {
    id: 'market' as ChainlinkTabId,
    labelKey: 'chainlink.menu.marketData',
    icon: <BarChart3 className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'network' as ChainlinkTabId,
    labelKey: 'chainlink.menu.networkHealth',
    icon: <Globe className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'nodes' as ChainlinkTabId,
    labelKey: 'chainlink.menu.nodes',
    icon: <Server className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'data-feeds' as ChainlinkTabId,
    labelKey: 'chainlink.menu.dataFeeds',
    icon: <Database className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'services' as ChainlinkTabId,
    labelKey: 'chainlink.menu.services',
    icon: <Layers className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'ecosystem' as ChainlinkTabId,
    labelKey: 'chainlink.menu.ecosystem',
    icon: <Network className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'risk' as ChainlinkTabId,
    labelKey: 'chainlink.menu.riskAssessment',
    icon: <ShieldAlert className="w-5 h-5" strokeWidth={1.5} />,
  },
];

export function ChainlinkSidebar({ activeTab, onTabChange }: ChainlinkSidebarProps) {
  const t = useTranslations();

  return (
    <UnifiedSidebar
      items={navItems}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as ChainlinkTabId)}
      themeColor="#375bd2"
    />
  );
}
