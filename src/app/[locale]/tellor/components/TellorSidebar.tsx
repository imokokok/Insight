'use client';

import { BarChart3, Globe, Users, Gavel, Wallet, Network, ShieldAlert } from 'lucide-react';

import { UnifiedSidebar } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type TellorSidebarProps, type TellorTabId } from '../types';

interface NavItem {
  id: TellorTabId;
  labelKey: string;
  icon: React.ReactNode;
}

const getNavItems = (t: (key: string) => string): NavItem[] => [
  {
    id: 'market',
    labelKey: 'tellor.menu.marketData',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    id: 'network',
    labelKey: 'tellor.menu.networkHealth',
    icon: <Globe className="w-5 h-5" />,
  },
  {
    id: 'reporters',
    labelKey: 'tellor.menu.reporters',
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 'disputes',
    labelKey: 'tellor.menu.disputes',
    icon: <Gavel className="w-5 h-5" />,
  },
  {
    id: 'staking',
    labelKey: 'tellor.menu.staking',
    icon: <Wallet className="w-5 h-5" />,
  },
  {
    id: 'ecosystem',
    labelKey: 'tellor.menu.ecosystem',
    icon: <Network className="w-5 h-5" />,
  },
  {
    id: 'risk',
    labelKey: 'tellor.menu.riskAssessment',
    icon: <ShieldAlert className="w-5 h-5" />,
  },
];

export function TellorSidebar({ activeTab, onTabChange, themeColor }: TellorSidebarProps & { themeColor?: string }) {
  const t = useTranslations();
  const navItems = getNavItems(t);

  return (
    <UnifiedSidebar
      items={navItems.map((item) => ({
        id: item.id,
        labelKey: item.labelKey,
        icon: item.icon,
      }))}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as TellorTabId)}
      themeColor={themeColor || '#06b6d4'}
    />
  );
}

export default TellorSidebar;
