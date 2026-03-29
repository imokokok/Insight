'use client';

import { BarChart3, Landmark, Shield, Globe, Lock, ShieldAlert, Vault, ArrowLeftRight, TrendingUpDown } from 'lucide-react';

import { UnifiedSidebar } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type ChronicleSidebarProps, type ChronicleTabId } from '../types';

export function ChronicleSidebar({ activeTab, onTabChange, themeColor }: ChronicleSidebarProps) {
  const t = useTranslations();

  const navItems = [
    {
      id: 'market' as ChronicleTabId,
      labelKey: t('chronicle.menu.marketData'),
      icon: <BarChart3 className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'makerdao' as ChronicleTabId,
      labelKey: t('chronicle.menu.makerDAO'),
      icon: <Landmark className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'validators' as ChronicleTabId,
      labelKey: t('chronicle.menu.validators'),
      icon: <Shield className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'network' as ChronicleTabId,
      labelKey: t('chronicle.menu.networkHealth'),
      icon: <Globe className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'vault' as ChronicleTabId,
      labelKey: t('chronicle.menu.vaultStatus'),
      icon: <Vault className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'crossChain' as ChronicleTabId,
      labelKey: t('chronicle.menu.crossChainAnalysis'),
      icon: <ArrowLeftRight className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'priceDeviation' as ChronicleTabId,
      labelKey: t('chronicle.menu.priceDeviation'),
      icon: <TrendingUpDown className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'scuttlebutt' as ChronicleTabId,
      labelKey: t('chronicle.menu.scuttlebutt'),
      icon: <Lock className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      id: 'risk' as ChronicleTabId,
      labelKey: t('chronicle.menu.riskAssessment'),
      icon: <ShieldAlert className="w-5 h-5" strokeWidth={1.5} />,
    },
  ];

  return (
    <UnifiedSidebar
      items={navItems}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as ChronicleTabId)}
      themeColor={themeColor}
    />
  );
}
