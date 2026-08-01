import {
  LayoutDashboard,
  Search,
  BookOpen,
  Award,
  BarChart3,
  ShieldCheck,
  Eye,
  FileText,
  AlertTriangle,
  Anchor,
  Key,
  Bot,
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
    id: 'safety',
    label: 'Safety',
    icon: ShieldCheck,
    megaMenu: true,
    items: [
      {
        href: '/safety-check',
        label: 'Safety Check',
        icon: ShieldCheck,
        description:
          'Calculate your personal position critical deviation and liquidation risk across protocols',
      },
      {
        href: '/stablecoin-depeg',
        label: 'Stablecoin Depeg',
        icon: AlertTriangle,
        description:
          'Hourly stablecoin depeg tracking with multi-oracle price deviation and protocol impact',
      },
      {
        href: '/wrapped-assets',
        label: 'Wrapped Asset Peg',
        icon: Anchor,
        description:
          'Track WBTC, LSTs and wrapped assets peg risks against their underlying collateral',
      },
    ],
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
        href: '/reports',
        label: 'Daily Reports',
        icon: FileText,
        description:
          'Daily oracle performance summaries with price deviations, rankings, and risk highlights',
      },
    ],
  },
  {
    // Points to the API product/landing page (/api), NOT the API docs page
    // (/docs/api). The docs page lives under the Documentation tab so the two
    // don't both highlight — isActive() uses startsWith, and /docs/api would
    // match both /docs and /docs/api.
    href: '/api',
    label: 'API',
    icon: Key,
  },
  {
    href: '/ai',
    label: 'AI',
    icon: Bot,
  },
  {
    href: '/docs',
    label: 'Documentation',
    icon: BookOpen,
  },
];

export { oracleColors };
