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
} from 'lucide-react';

import { type NavStructure } from './types';

// Home is intentionally omitted: the logo links to "/" (see Navbar), so a
// dedicated "Home" tab would be a redundant second route to the same page.
export const navigationConfig: NavStructure = [
  {
    href: '/price-insight?stage=observe',
    label: 'Oracle Evidence',
    icon: Search,
  },
  {
    href: '/decision-integrity',
    label: 'Decision Integrity',
    icon: ShieldCheck,
  },
  {
    id: 'risk-intelligence',
    label: 'Risk Intelligence',
    icon: BarChart3,
    megaMenu: true,
    items: [
      {
        href: '/risk-intelligence',
        label: 'Risk Intelligence Overview',
        icon: Eye,
        description:
          'Choose the right oracle-risk instrument for source comparison, position stress, and ongoing monitoring',
      },
      {
        href: '/price-insight?stage=compare',
        label: 'Compare & Assess',
        icon: Search,
        description:
          'Compare oracle prices across providers and chains with divergence, freshness, and source context',
      },
      {
        href: '/safety-check',
        label: 'Position Stress Test',
        icon: ShieldCheck,
        description:
          'Calculate a position critical deviation and liquidation risk across supported lending protocols',
      },
      {
        href: '/peg-risk',
        label: 'Peg Risk',
        icon: Gauge,
        description:
          'Assess stablecoins, wrapped assets and LSTs across source deviation and protocol impact',
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
