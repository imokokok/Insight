'use client';

import {
  BarChart3,
  Globe,
  Database,
  Gavel,
  Shield,
  Wallet,
  Vote,
  Network,
  ShieldAlert,
  BookOpen,
  ArrowLeftRight,
} from 'lucide-react';

import { UnifiedSidebar } from '@/components/oracle';

import { type UmaSidebarProps, type UmaTabId } from '../types';

interface NavItem {
  id: UmaTabId;
  labelKey: string;
  icon: React.ReactNode;
}

const getNavItems = (): NavItem[] => [
  {
    id: 'market',
    labelKey: 'uma.menu.marketData',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    id: 'network',
    labelKey: 'uma.menu.networkHealth',
    icon: <Globe className="w-5 h-5" />,
  },
  {
    id: 'requests',
    labelKey: 'uma.menu.dataRequests',
    icon: <Database className="w-5 h-5" />,
  },
  {
    id: 'disputes',
    labelKey: 'uma.menu.disputeResolution',
    icon: <Gavel className="w-5 h-5" />,
  },
  {
    id: 'validators',
    labelKey: 'uma.menu.validatorAnalytics',
    icon: <Shield className="w-5 h-5" />,
  },
  {
    id: 'staking',
    labelKey: 'uma.menu.staking',
    icon: <Wallet className="w-5 h-5" />,
  },
  {
    id: 'governance',
    labelKey: 'uma.menu.governance',
    icon: <Vote className="w-5 h-5" />,
  },
  {
    id: 'ecosystem',
    labelKey: 'uma.menu.ecosystem',
    icon: <Network className="w-5 h-5" />,
  },
  {
    id: 'risk',
    labelKey: 'uma.menu.riskAssessment',
    icon: <ShieldAlert className="w-5 h-5" />,
  },
  {
    id: 'crosschain',
    labelKey: 'uma.menu.crossChain',
    icon: <ArrowLeftRight className="w-5 h-5" />,
  },
  {
    id: 'education',
    labelKey: 'uma.menu.education',
    icon: <BookOpen className="w-5 h-5" />,
  },
];

export function UmaSidebar({
  activeTab,
  onTabChange,
  themeColor,
}: UmaSidebarProps & { themeColor?: string }) {
  const navItems = getNavItems();

  return (
    <UnifiedSidebar
      items={navItems}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as UmaTabId)}
      themeColor={themeColor || '#dc2626'}
    />
  );
}
