'use client';

import {
  BarChart3,
  Layers,
  Globe,
  Zap,
  Users,
  ArrowLeftRight,
  Network,
  ShieldAlert,
  Shield,
  Coins,
  Database,
} from 'lucide-react';

import { UnifiedSidebar } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type RedStoneSidebarProps, type RedStoneTabId } from '../types';

const getNavItems = (t: ReturnType<typeof useTranslations>) => [
  {
    id: 'market' as RedStoneTabId,
    labelKey: t('redstone.tabs.market'),
    icon: <BarChart3 className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'pull-model' as RedStoneTabId,
    labelKey: t('redstone.tabs.pullModel'),
    icon: <Layers className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'erc7412' as RedStoneTabId,
    labelKey: t('redstone.tabs.erc7412'),
    icon: <Layers className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'network' as RedStoneTabId,
    labelKey: t('redstone.tabs.network'),
    icon: <Globe className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'providers' as RedStoneTabId,
    labelKey: t('redstone.tabs.providers'),
    icon: <Users className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'data-streams' as RedStoneTabId,
    labelKey: t('redstone.tabs.dataStreams'),
    icon: <Zap className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'cross-chain' as RedStoneTabId,
    labelKey: t('redstone.tabs.crossChain'),
    icon: <ArrowLeftRight className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'arweave' as RedStoneTabId,
    labelKey: t('redstone.tabs.arweave'),
    icon: <Database className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'token' as RedStoneTabId,
    labelKey: t('redstone.tabs.token'),
    icon: <Coins className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'avs' as RedStoneTabId,
    labelKey: t('redstone.tabs.avs'),
    icon: <Shield className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'ecosystem' as RedStoneTabId,
    labelKey: t('redstone.tabs.ecosystem'),
    icon: <Network className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'risk' as RedStoneTabId,
    labelKey: t('redstone.tabs.risk'),
    icon: <ShieldAlert className="w-5 h-5" strokeWidth={1.5} />,
  },
];

export function RedStoneSidebar({ activeTab, onTabChange }: RedStoneSidebarProps) {
  const t = useTranslations();

  return (
    <UnifiedSidebar
      items={getNavItems(t)}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as RedStoneTabId)}
      themeColor="#ef4444"
    />
  );
}
