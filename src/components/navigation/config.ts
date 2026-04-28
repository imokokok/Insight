import {
  LayoutDashboard,
  BarChart3,
  Search,
  GitCompare,
  Link2,
  Settings,
  Heart,
  Bell,
  BookOpen,
  Camera,
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
    id: 'market',
    label: 'Market',
    icon: BarChart3,
    items: [
      {
        href: '/price-query',
        label: 'Price Query',
        icon: Search,
        description:
          'Instant price lookup across all major oracle networks with historical trend analysis',
      },
    ],
  },
  {
    id: 'analysis',
    label: 'Data Analysis',
    icon: GitCompare,
    items: [
      {
        href: '/cross-oracle',
        label: 'Cross-Oracle Comparison',
        icon: GitCompare,
        description: 'Real-time multi-oracle price comparison and deviation analytics',
      },
      {
        href: '/cross-chain',
        label: 'Cross-Chain Comparison',
        icon: Link2,
        description: 'Cross-chain oracle performance benchmarking and reliability analytics',
      },
      {
        href: '/snapshots',
        label: 'Price Snapshots',
        icon: Camera,
        description: 'Save, compare, and track oracle price snapshots over time',
      },
    ],
  },

  {
    href: '/docs',
    label: 'Documentation',
    icon: BookOpen,
  },
];

const userNavigationConfig: NavStructure = [
  {
    href: '/favorites',
    label: 'Favorites',
    icon: Heart,
  },
  {
    href: '/alerts',
    label: 'Alerts',
    icon: Bell,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
  },
];

export { oracleColors };
