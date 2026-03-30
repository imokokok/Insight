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

import { type RedStoneSidebarProps, type RedStoneTabId } from '../types';

const getNavItems = () => [
  {
    id: 'market' as RedStoneTabId,
    labelKey: 'tabs.market',
    icon: <BarChart3 className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'pull-model' as RedStoneTabId,
    labelKey: 'tabs.pullModel',
    icon: <Layers className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'erc7412' as RedStoneTabId,
    labelKey: 'tabs.erc7412',
    icon: <Layers className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'network' as RedStoneTabId,
    labelKey: 'tabs.network',
    icon: <Globe className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'providers' as RedStoneTabId,
    labelKey: 'tabs.providers',
    icon: <Users className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'data-streams' as RedStoneTabId,
    labelKey: 'tabs.dataStreams',
    icon: <Zap className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'cross-chain' as RedStoneTabId,
    labelKey: 'tabs.crossChain',
    icon: <ArrowLeftRight className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'arweave' as RedStoneTabId,
    labelKey: 'tabs.arweave',
    icon: <Database className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'token' as RedStoneTabId,
    labelKey: 'tabs.token',
    icon: <Coins className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'avs' as RedStoneTabId,
    labelKey: 'tabs.avs',
    icon: <Shield className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'ecosystem' as RedStoneTabId,
    labelKey: 'tabs.ecosystem',
    icon: <Network className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'risk' as RedStoneTabId,
    labelKey: 'tabs.risk',
    icon: <ShieldAlert className="w-5 h-5" strokeWidth={1.5} />,
  },
];

export function RedStoneSidebar({ activeTab, onTabChange }: RedStoneSidebarProps) {
  return (
    <UnifiedSidebar
      items={getNavItems()}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as RedStoneTabId)}
      themeColor="#ef4444"
      translationNamespace="redstone"
    />
  );
}
