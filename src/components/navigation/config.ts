import {
  LayoutDashboard,
  Search,
  GitCompare,
  Link2,
  BookOpen,
  Camera,
  Award,
  Bell,
  Heart,
  BarChart3,
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
        highlight: true,
      },
      {
        href: '/cross-chain',
        label: 'Cross-Chain Comparison',
        icon: Link2,
        description: 'Cross-chain oracle performance benchmarking and reliability analytics',
      },
      {
        href: '/reputation',
        label: 'Oracle Reputation',
        icon: Award,
        description:
          'Historical reliability scoring and reputation tracking for all oracle providers',
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
      {
        href: '/favorites',
        label: 'Favorites',
        icon: Heart,
        description: 'Bookmark your favorite oracle pairs for quick access and monitoring',
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
