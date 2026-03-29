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

import { GroupedSidebar, type SidebarGroup } from '@/components/oracle/GroupedSidebar';
import { useTranslations } from '@/i18n';

import { type RedStoneSidebarProps, type RedStoneTabId } from '../types';

const navGroups: SidebarGroup[] = [
  {
    id: 'market-data',
    labelKey: 'redstone.groups.marketData',
    icon: <BarChart3 className="w-4 h-4" strokeWidth={1.5} />,
    items: [
      {
        id: 'market' as RedStoneTabId,
        labelKey: 'redstone.menu.marketData',
        icon: <BarChart3 className="w-4 h-4" strokeWidth={1.5} />,
      },
    ],
  },
  {
    id: 'core-features',
    labelKey: 'redstone.groups.coreFeatures',
    icon: <Layers className="w-4 h-4" strokeWidth={1.5} />,
    items: [
      {
        id: 'pull-model' as RedStoneTabId,
        labelKey: 'redstone.menu.pullModel',
        icon: <Layers className="w-4 h-4" strokeWidth={1.5} />,
      },
      {
        id: 'erc7412' as RedStoneTabId,
        labelKey: 'redstone.menu.erc7412',
        icon: <Layers className="w-4 h-4" strokeWidth={1.5} />,
      },
    ],
  },
  {
    id: 'network',
    labelKey: 'redstone.groups.network',
    icon: <Globe className="w-4 h-4" strokeWidth={1.5} />,
    items: [
      {
        id: 'network' as RedStoneTabId,
        labelKey: 'redstone.menu.networkHealth',
        icon: <Globe className="w-4 h-4" strokeWidth={1.5} />,
      },
      {
        id: 'providers' as RedStoneTabId,
        labelKey: 'redstone.menu.providers',
        icon: <Users className="w-4 h-4" strokeWidth={1.5} />,
      },
      {
        id: 'data-streams' as RedStoneTabId,
        labelKey: 'redstone.menu.dataStreams',
        icon: <Zap className="w-4 h-4" strokeWidth={1.5} />,
      },
    ],
  },
  {
    id: 'cross-chain-storage',
    labelKey: 'redstone.groups.crossChainStorage',
    icon: <ArrowLeftRight className="w-4 h-4" strokeWidth={1.5} />,
    items: [
      {
        id: 'cross-chain' as RedStoneTabId,
        labelKey: 'redstone.menu.crossChain',
        icon: <ArrowLeftRight className="w-4 h-4" strokeWidth={1.5} />,
      },
      {
        id: 'arweave' as RedStoneTabId,
        labelKey: 'redstone.menu.arweaveStorage',
        icon: <Database className="w-4 h-4" strokeWidth={1.5} />,
      },
    ],
  },
  {
    id: 'staking-token',
    labelKey: 'redstone.groups.stakingToken',
    icon: <Coins className="w-4 h-4" strokeWidth={1.5} />,
    items: [
      {
        id: 'token' as RedStoneTabId,
        labelKey: 'redstone.menu.token',
        icon: <Coins className="w-4 h-4" strokeWidth={1.5} />,
      },
      {
        id: 'avs' as RedStoneTabId,
        labelKey: 'redstone.menu.avs',
        icon: <Shield className="w-4 h-4" strokeWidth={1.5} />,
      },
    ],
  },
  {
    id: 'ecosystem',
    labelKey: 'redstone.groups.ecosystem',
    icon: <Network className="w-4 h-4" strokeWidth={1.5} />,
    items: [
      {
        id: 'ecosystem' as RedStoneTabId,
        labelKey: 'redstone.menu.ecosystem',
        icon: <Network className="w-4 h-4" strokeWidth={1.5} />,
      },
    ],
  },
  {
    id: 'risk',
    labelKey: 'redstone.groups.risk',
    icon: <ShieldAlert className="w-4 h-4" strokeWidth={1.5} />,
    items: [
      {
        id: 'risk' as RedStoneTabId,
        labelKey: 'redstone.menu.riskAssessment',
        icon: <ShieldAlert className="w-4 h-4" strokeWidth={1.5} />,
      },
    ],
  },
];

export function RedStoneSidebar({ activeTab, onTabChange }: RedStoneSidebarProps) {
  const t = useTranslations();

  return (
    <GroupedSidebar
      groups={navGroups}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as RedStoneTabId)}
      themeColor="#ef4444"
    />
  );
}
