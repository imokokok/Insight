'use client';

import { BarChart3, Globe, Database, Image, Wallet, Network, ShieldAlert } from 'lucide-react';

import { UnifiedSidebar } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type DIASidebarProps, type DIATabId } from '../types';

const navItems = [
  {
    id: 'market' as DIATabId,
    labelKey: 'dia.menu.marketData',
    icon: <BarChart3 className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'network' as DIATabId,
    labelKey: 'dia.menu.networkHealth',
    icon: <Globe className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'data-feeds' as DIATabId,
    labelKey: 'dia.menu.dataFeeds',
    icon: <Database className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'nft-data' as DIATabId,
    labelKey: 'dia.menu.nftData',
    // eslint-disable-next-line jsx-a11y/alt-text
    icon: <Image className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'staking' as DIATabId,
    labelKey: 'dia.menu.staking',
    icon: <Wallet className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'ecosystem' as DIATabId,
    labelKey: 'dia.menu.ecosystem',
    icon: <Network className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'risk' as DIATabId,
    labelKey: 'dia.menu.riskAssessment',
    icon: <ShieldAlert className="w-5 h-5" strokeWidth={1.5} />,
  },
];

export function DIASidebar({ activeTab, onTabChange }: DIASidebarProps) {
  const t = useTranslations();

  return (
    <UnifiedSidebar
      items={navItems}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as DIATabId)}
      themeColor="#6366f1"
    />
  );
}
