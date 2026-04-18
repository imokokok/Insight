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
        label: 'Cross-Oracle Analysis',
        icon: GitCompare,
        description: 'Real-Time Multi-Oracle Price Comparison & Deviation Analytics',
      },
      {
        href: '/cross-chain',
        label: 'Cross-Chain Comparison',
        icon: Link2,
        description: 'Cross-chain oracle performance benchmarking and reliability analytics',
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
