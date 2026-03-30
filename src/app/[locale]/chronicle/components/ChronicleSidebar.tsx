'use client';

import { BarChart3, Landmark, Shield, Globe, Lock, ShieldAlert, Vault, ArrowLeftRight, TrendingUpDown } from 'lucide-react';

import { UnifiedSidebar } from '@/components/oracle';

import { type ChronicleSidebarProps, type ChronicleTabId } from '../types';

export function ChronicleSidebar({ activeTab, onTabChange, themeColor }: ChronicleSidebarProps) {
  const navItems = [
    {
      id: 'market' as ChronicleTabId,
      labelKey: 'menu.marketData',
      icon: <BarChart3 className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'makerdao' as ChronicleTabId,
      labelKey: 'menu.makerDAO',
      icon: <Landmark className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'validators' as ChronicleTabId,
      labelKey: 'menu.validators',
      icon: <Shield className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'network' as ChronicleTabId,
      labelKey: 'menu.networkHealth',
      icon: <Globe className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'vault' as ChronicleTabId,
      labelKey: 'menu.vaultStatus',
      icon: <Vault className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'crossChain' as ChronicleTabId,
      labelKey: 'menu.crossChainAnalysis',
      icon: <ArrowLeftRight className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'priceDeviation' as ChronicleTabId,
      labelKey: 'menu.priceDeviation',
      icon: <TrendingUpDown className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'scuttlebutt' as ChronicleTabId,
      labelKey: 'menu.scuttlebutt',
      icon: <Lock className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'risk' as ChronicleTabId,
      labelKey: 'menu.riskAssessment',
      icon: <ShieldAlert className="w-5 h-5" strokeWidth={1.5} />,
    },
  ];

  return (
    <UnifiedSidebar
      items={navItems}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as ChronicleTabId)}
      themeColor={themeColor}
      translationNamespace="chronicle"
    />
  );
}
