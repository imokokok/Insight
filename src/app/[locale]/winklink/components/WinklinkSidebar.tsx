'use client';

import {
  BarChart3,
  Globe,
  CircleDot,
  Wallet,
  Gamepad2,
  ShieldAlert,
} from 'lucide-react';

import { UnifiedSidebar } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type WinklinkSidebarProps, type WinklinkTabId } from '../types';

const navItems = [
  {
    id: 'market' as WinklinkTabId,
    labelKey: 'winklink.menu.marketData',
    icon: <BarChart3 className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'network' as WinklinkTabId,
    labelKey: 'winklink.menu.networkHealth',
    icon: <Globe className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'tron' as WinklinkTabId,
    labelKey: 'winklink.menu.tronEcosystem',
    icon: <CircleDot className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'staking' as WinklinkTabId,
    labelKey: 'winklink.menu.staking',
    icon: <Wallet className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'gaming' as WinklinkTabId,
    labelKey: 'winklink.menu.gaming',
    icon: <Gamepad2 className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'risk' as WinklinkTabId,
    labelKey: 'winklink.menu.riskAssessment',
    icon: <ShieldAlert className="w-5 h-5" strokeWidth={1.5} />,
  },
];

export function WinklinkSidebar({ activeTab, onTabChange }: WinklinkSidebarProps) {
  const t = useTranslations();

  return (
    <UnifiedSidebar
      items={navItems}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as WinklinkTabId)}
      themeColor="#ec4899"
    />
  );
}
