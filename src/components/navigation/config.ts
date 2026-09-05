import {
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
  Code,
  CircleDollarSign,
  BadgeCheck,
} from 'lucide-react';

import { oracleColors } from '@/lib/constants';

import { type NavStructure } from './types';

// Home is intentionally omitted: the logo links to "/" (see Navbar), so a
// dedicated "Home" tab would be a redundant second route to the same page.
export const navigationConfig: NavStructure = [
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
          '15-minute stablecoin depeg tracking with multi-oracle price deviation and protocol impact',
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
    id: 'build',
    label: 'Build',
    icon: Code,
    megaMenu: true,
    items: [
      {
        href: '/sdk',
        label: 'Guard SDK',
        icon: Code,
        badge: 'Recommended',
        description:
          'One guarded workflow for pre-trade gates, Oracle Watch halts, and VERIFIED execution receipts',
      },
      {
        href: '/api',
        label: 'REST API',
        icon: Key,
        description:
          'Use atomic price, risk, evidence, and execution endpoints in your own integration',
      },
      {
        href: '/ai',
        label: 'AI / MCP',
        icon: Bot,
        description:
          'Give Claude, Cursor, and MCP-compatible agents direct access to Insight tools',
      },
      {
        href: '/docs',
        label: 'Developer Docs',
        icon: BookOpen,
        description: 'Read API, SDK, receipt verification, and integration references',
      },
    ],
  },
  {
    href: '/verify',
    label: 'Verify',
    icon: BadgeCheck,
  },
  {
    href: '/pricing',
    label: 'Pricing',
    icon: CircleDollarSign,
  },
];

export { oracleColors };
