import {
  LayoutDashboard,
  BarChart3,
  Search,
  GitCompare,
  Link2,
  Zap,
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
    label: 'navbar.home',
    icon: LayoutDashboard,
  },
  {
    id: 'market',
    label: 'navbar.market',
    icon: BarChart3,
    items: [
      {
        href: '/price-query',
        label: 'navbar.priceQuery',
        icon: Search,
        description: 'navbar.priceQueryDesc',
      },
    ],
  },
  {
    id: 'analysis',
    label: 'navbar.dataAnalysis',
    icon: GitCompare,
    items: [
      {
        href: '/cross-oracle',
        label: 'navbar.crossOracle',
        icon: GitCompare,
        description: 'navbar.crossOracleDesc',
      },
      {
        href: '/cross-chain',
        label: 'navbar.crossChain',
        icon: Link2,
        description: 'navbar.crossChainDesc',
      },
    ],
  },

  {
    href: '/docs',
    label: 'navbar.documentation',
    icon: BookOpen,
  },
];

export const userNavigationConfig: NavStructure = [
  {
    href: '/favorites',
    label: 'navbar.favorites',
    icon: Heart,
  },
  {
    href: '/alerts',
    label: 'navbar.alerts',
    icon: Bell,
  },
  {
    href: '/settings',
    label: 'navbar.settings',
    icon: Settings,
  },
];

export { oracleColors };
