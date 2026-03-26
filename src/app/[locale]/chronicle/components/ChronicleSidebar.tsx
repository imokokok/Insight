'use client';

import {
  BarChart3,
  Landmark,
  Shield,
  Globe,
  Lock,
  ShieldAlert,
} from 'lucide-react';

import { UnifiedSidebar } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type ChronicleSidebarProps, type ChronicleTabId } from '../types';

const navItems = [
  {
    id: 'market' as ChronicleTabId,
    labelKey: 'chronicle.menu.marketData',
    icon: <BarChart3 className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'makerdao' as ChronicleTabId,
    labelKey: 'chronicle.menu.makerDAO',
    icon: <Landmark className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'validators' as ChronicleTabId,
    labelKey: 'chronicle.menu.validators',
    icon: <Shield className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'network' as ChronicleTabId,
    labelKey: 'chronicle.menu.networkHealth',
    icon: <Globe className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'scuttlebutt' as ChronicleTabId,
    labelKey: 'chronicle.menu.scuttlebutt',
    icon: <Lock className="w-5 h-5" strokeWidth={1.5} />,
  },
  {
    id: 'risk' as ChronicleTabId,
    labelKey: 'chronicle.menu.riskAssessment',
    icon: <ShieldAlert className="w-5 h-5" strokeWidth={1.5} />,
  },
];

export function ChronicleSidebar({ activeTab, onTabChange }: ChronicleSidebarProps) {
  const t = useTranslations();

  return (
    <UnifiedSidebar
      items={navItems}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as ChronicleTabId)}
      themeColor="#f59e0b"
    />
  );
}
