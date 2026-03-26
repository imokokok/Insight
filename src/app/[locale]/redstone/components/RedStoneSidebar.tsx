'use client';

import { BarChart3, Globe, Zap, Users, ArrowLeftRight, Network, ShieldAlert } from 'lucide-react';

import { UnifiedSidebar } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type RedStoneSidebarProps, type RedStoneTabId } from '../types';

const navItems = [
  {
    id: 'market' as RedStoneTabId,
    labelKey: 'redstone.menu.marketData',
    icon: <BarChart3 className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'network' as RedStoneTabId,
    labelKey: 'redstone.menu.networkHealth',
    icon: <Globe className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'data-streams' as RedStoneTabId,
    labelKey: 'redstone.menu.dataStreams',
    icon: <Zap className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'providers' as RedStoneTabId,
    labelKey: 'redstone.menu.providers',
    icon: <Users className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'cross-chain' as RedStoneTabId,
    labelKey: 'redstone.menu.crossChain',
    icon: <ArrowLeftRight className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'ecosystem' as RedStoneTabId,
    labelKey: 'redstone.menu.ecosystem',
    icon: <Network className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'risk' as RedStoneTabId,
    labelKey: 'redstone.menu.riskAssessment',
    icon: <ShieldAlert className="w-5 h-5" strokeWidth={1.5} />,
  },
];

export function RedStoneSidebar({ activeTab, onTabChange }: RedStoneSidebarProps) {
  const t = useTranslations();

  return (
    <UnifiedSidebar
      items={navItems}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as RedStoneTabId)}
      themeColor="#ef4444"
    />
  );
}
