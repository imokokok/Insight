import {
  LayoutDashboard,
  Search,
  GitCompare,
  Link2,
  BookOpen,
  Camera,
  Award,
  Bell,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';

import { oracleColors } from '@/lib/constants';

import { type NavStructure } from './types';

export const navigationConfig: NavStructure = [
  {
    href: '/',
    label: 'Home',
    icon: LayoutDashboard,
  },
  {
    href: '/price-query',
    label: 'Price Query',
    icon: Search,
  },
  {
    href: '/safety-check',
    label: 'Safety Check',
    icon: ShieldCheck,
  },
  {
    id: 'analysis',
    label: 'Analysis',
    icon: BarChart3,
    megaMenu: true,
    items: [
      {
        href: '/cross-oracle',
        label: 'Cross-Oracle Comparison',
        icon: GitCompare,
        description:
          'Real-time multi-oracle price comparison, deviation analytics and anomaly detection',
      },
      {
        href: '/cross-chain',
        label: 'Cross-Chain Comparison',
        icon: Link2,
        description: 'Cross-chain oracle performance benchmarking and reliability analytics',
      },
      {
        href: '/reputation',
        label: 'Oracle Directory',
        icon: Award,
        description:
          'Explore oracle providers, their unique capabilities, and historical performance tracking',
      },
      {
        href: '/snapshots',
        label: 'Price Snapshots',
        icon: Camera,
        description: 'Save, compare, and track oracle price snapshots over time',
      },
      {
        href: '/alerts',
        label: 'Price Alerts',
        icon: Bell,
        description: 'Set custom price alerts and get notified when oracle prices deviate',
        badge: 'New',
      },
    ],
  },
  {
    href: '/docs',
    label: 'Documentation',
    icon: BookOpen,
  },
];

export { oracleColors };
