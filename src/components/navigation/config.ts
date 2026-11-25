import {
  Search,
  BookOpen,
  Award,
  BarChart3,
  ShieldCheck,
  Eye,
  FileText,
  Gauge,
  Key,
  Bot,
  Code,
  CircleDollarSign,
  BadgeCheck,
  Wallet,
} from 'lucide-react';

import { type NavStructure } from './types';

// Home is intentionally omitted: the logo links to "/" (see Navbar), so a
// dedicated "Home" tab would be a redundant second route to the same page.
export const navigationConfig: NavStructure = [
  {
    href: '/decision-integrity',
    label: 'Decision Integrity',
    icon: ShieldCheck,
  },
  {
    id: 'oracle-evidence',
    label: 'Oracle Evidence',
    icon: Search,
    href: '/price-insight?stage=observe',
    megaMenu: true,
    items: [
      {
        href: '/price-insight?stage=observe',
        label: 'Observe',
        icon: Eye,
        description: 'Inspect oracle sources, coverage, freshness, and observed prices',
      },
      {
        href: '/price-insight?stage=compare',
        label: 'Compare',
        icon: Search,
        description: 'Compare provider agreement, divergence, and source context',
      },
      {
        href: '/reputation',
        label: 'Oracle Directory',
        icon: Award,
        description: 'Explore provider coverage and historical performance context',
      },
      {
        href: '/reports',
        label: 'Daily Reports',
        icon: FileText,
        description: 'Review historical deviations, rankings, and risk highlights',
      },
      {
        href: '/verify',
        label: 'Verify a receipt',
        icon: BadgeCheck,
        description: 'Independently inspect supported signed evidence',
      },
    ],
  },
  {
    id: 'risk-tools',
    label: 'Risk Tools',
    icon: BarChart3,
    href: '/risk-intelligence',
    megaMenu: true,
    items: [
      {
        href: '/risk-intelligence',
        label: 'Risk Tools Overview',
        icon: Eye,
        description: 'Choose a focused assessment for a position or asset-risk question',
      },
      {
        href: '/safety-check',
        label: 'Position Stress Test',
        icon: ShieldCheck,
        description:
          'Calculate a position critical deviation and liquidation risk across supported lending protocols',
      },
      {
        href: '/polymarket',
        label: 'Polymarket Positions',
        icon: Wallet,
        description:
          'Additional read-only market-position context; no wallet connection or trading permission required.',
      },
      {
        href: '/peg-risk',
        label: 'Peg Risk',
        icon: Gauge,
        description:
          'Assess stablecoins, wrapped assets and LSTs across source deviation and protocol impact',
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
        href: '/build',
        label: 'Build Overview',
        icon: Code,
        description: 'Choose REST, AI / MCP, or Guard SDK for your integration path',
      },
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
    href: '/pricing',
    label: 'Pricing',
    icon: CircleDollarSign,
  },
];
