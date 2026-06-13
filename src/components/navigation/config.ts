import {
  LayoutDashboard,
  Search,
  BookOpen,
  Camera,
  Award,
  BarChart3,
  ShieldCheck,
  Eye,
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
        href: '/price-insight',
        label: 'Price Insight',
        icon: Eye,
        description:
          'Compare oracle prices across providers and blockchains with risk analysis and divergence tracking',
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
    ],
  },
  {
    href: '/docs',
    label: 'Documentation',
    icon: BookOpen,
  },
];

export { oracleColors };
