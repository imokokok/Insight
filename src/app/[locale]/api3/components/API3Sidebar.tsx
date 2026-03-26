'use client';

import { BarChart3, Globe, Server, Database, Network, ShieldAlert } from 'lucide-react';

import { UnifiedSidebar } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type API3SidebarProps, type API3TabId } from '../types';

const navItems = [
  {
    id: 'market' as API3TabId,
    labelKey: 'api3.menu.marketData',
    icon: <BarChart3 className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'network' as API3TabId,
    labelKey: 'api3.menu.networkHealth',
    icon: <Globe className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'airnode' as API3TabId,
    labelKey: 'api3.menu.airnode',
    icon: <Server className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'dapi' as API3TabId,
    labelKey: 'api3.menu.dapi',
    icon: <Database className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'ecosystem' as API3TabId,
    labelKey: 'api3.menu.ecosystem',
    icon: <Network className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'risk' as API3TabId,
    labelKey: 'api3.menu.riskAssessment',
    icon: <ShieldAlert className="w-5 h-5" strokeWidth={1.5} />,
  },
];

export function API3Sidebar({ activeTab, onTabChange }: API3SidebarProps) {
  const t = useTranslations();

  return (
    <UnifiedSidebar
      items={navItems}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as API3TabId)}
      themeColor="#10b981"
    />
  );
}
