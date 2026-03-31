'use client';

import { BarChart3, Globe, Users, Scale, Wallet, Network, ShieldAlert, Gavel } from 'lucide-react';

import { UnifiedSidebar } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type TellorSidebarProps, type TellorTabId } from '../types';

const navItems = [
  {
    id: 'market' as TellorTabId,
    labelKey: 'tellor.menu.marketData',
    icon: <BarChart3 className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'network' as TellorTabId,
    labelKey: 'tellor.menu.networkHealth',
    icon: <Globe className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'reporters' as TellorTabId,
    labelKey: 'tellor.menu.reporters',
    icon: <Users className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'disputes' as TellorTabId,
    labelKey: 'tellor.menu.disputes',
    icon: <Scale className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'staking' as TellorTabId,
    labelKey: 'tellor.menu.staking',
    icon: <Wallet className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'ecosystem' as TellorTabId,
    labelKey: 'tellor.menu.ecosystem',
    icon: <Network className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'risk' as TellorTabId,
    labelKey: 'tellor.menu.riskAssessment',
    icon: <ShieldAlert className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'governance' as TellorTabId,
    labelKey: 'tellor.menu.governance',
    icon: <Gavel className="w-5 h-5" strokeWidth={1.5} />,
  },
];

export function TellorSidebar({ activeTab, onTabChange }: TellorSidebarProps) {
  const t = useTranslations();

  return (
    <UnifiedSidebar
      items={navItems}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as TellorTabId)}
      themeColor="#06b6d4"
    />
  );
}
