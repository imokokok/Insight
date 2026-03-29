'use client';

import {
  BarChart3,
  Globe,
  Server,
  Database,
  Layers,
  Network,
  ShieldAlert,
  ArrowRightLeft,
  Activity,
  Zap,
  Clock,
  Code,
  Shield,
} from 'lucide-react';

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
    id: 'data-streams' as ChainlinkTabId,
    labelKey: 'chainlink.menu.dataStreams',
    icon: <Activity className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'services' as ChainlinkTabId,
    labelKey: 'chainlink.menu.services',
    icon: <Layers className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'ccip' as ChainlinkTabId,
    labelKey: 'chainlink.menu.ccip',
    icon: <ArrowRightLeft className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'vrf' as ChainlinkTabId,
    labelKey: 'chainlink.menu.vrf',
    icon: <Zap className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'automation' as ChainlinkTabId,
    labelKey: 'chainlink.menu.automation',
    icon: <Clock className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'functions' as ChainlinkTabId,
    labelKey: 'chainlink.menu.functions',
    icon: <Code className="w-5 h-5" strokeWidth={1.5} />,
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
  {
    id: 'proof-of-reserve' as ChainlinkTabId,
    labelKey: 'chainlink.menu.proofOfReserve',
    icon: <Shield className="w-5 h-5" strokeWidth={1.5} />,
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
