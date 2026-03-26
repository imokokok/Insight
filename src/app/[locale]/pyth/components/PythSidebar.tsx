'use client';

import {
  BarChart3,
  Globe,
  Users,
  Shield,
  Database,
  ShieldAlert,
} from 'lucide-react';

import { UnifiedSidebar } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type PythSidebarProps, type PythTabId } from '../types';

const navItems = [
  {
    id: 'market' as PythTabId,
    labelKey: 'pyth.menu.marketData',
    icon: <BarChart3 className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'network' as PythTabId,
    labelKey: 'pyth.menu.networkHealth',
    icon: <Globe className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'publishers' as PythTabId,
    labelKey: 'pyth.menu.publishers',
    icon: <Users className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'validators' as PythTabId,
    labelKey: 'pyth.menu.validators',
    icon: <Shield className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'price-feeds' as PythTabId,
    labelKey: 'pyth.menu.priceFeeds',
    icon: <Database className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'risk' as PythTabId,
    labelKey: 'pyth.menu.riskAssessment',
    icon: <ShieldAlert className="w-5 h-5" strokeWidth={1.5} />,
  },
];

export function PythSidebar({ activeTab, onTabChange }: PythSidebarProps) {
  const t = useTranslations();

  return (
    <UnifiedSidebar
      items={navItems}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as PythTabId)}
      themeColor="#8b5cf6"
    />
  );
}
