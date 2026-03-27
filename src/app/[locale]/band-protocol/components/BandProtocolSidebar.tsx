'use client';

import { BarChart3, Globe, Shield, ArrowLeftRight, Database, ShieldAlert } from 'lucide-react';

import { UnifiedSidebar, type SidebarItem } from '@/components/oracle/UnifiedSidebar';
import { useTranslations } from '@/i18n';

import { type BandProtocolSidebarProps, type BandProtocolTabId } from '../types';

const getNavItems = (t: (key: string) => string): SidebarItem[] => [
  {
    id: 'market' as BandProtocolTabId,
    labelKey: 'band.bandProtocol.menu.marketData',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    id: 'network' as BandProtocolTabId,
    labelKey: 'band.bandProtocol.menu.networkHealth',
    icon: <Globe className="w-5 h-5" />,
  },
  {
    id: 'validators' as BandProtocolTabId,
    labelKey: 'band.bandProtocol.menu.validators',
    icon: <Shield className="w-5 h-5" />,
  },
  {
    id: 'cross-chain' as BandProtocolTabId,
    labelKey: 'band.bandProtocol.menu.crossChain',
    icon: <ArrowLeftRight className="w-5 h-5" />,
  },
  {
    id: 'data-feeds' as BandProtocolTabId,
    labelKey: 'band.bandProtocol.menu.dataFeeds',
    icon: <Database className="w-5 h-5" />,
  },
  {
    id: 'risk' as BandProtocolTabId,
    labelKey: 'band.bandProtocol.menu.riskAssessment',
    icon: <ShieldAlert className="w-5 h-5" />,
  },
];

interface BandProtocolSidebarComponentProps extends BandProtocolSidebarProps {
  themeColor?: string;
}

export function BandProtocolSidebar({
  activeTab,
  onTabChange,
  themeColor = '#7c3aed',
}: BandProtocolSidebarComponentProps) {
  const t = useTranslations();
  const navItems = getNavItems(t);

  const handleTabChange = (tab: string) => {
    onTabChange(tab as BandProtocolTabId);
  };

  return (
    <UnifiedSidebar
      items={navItems}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      themeColor={themeColor}
    />
  );
}
