import {
  LayoutDashboard,
  BarChart3,
  Search,
  GitCompare,
  Link2,
  Database,
  Layers,
  Shield,
  Zap,
  Activity,
  Settings,
  Heart,
  Bell,
  Flame,
} from 'lucide-react';
import { NavStructure } from './types';
import { oracleColors } from '@/lib/constants';

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
        href: '/market-overview',
        label: 'navbar.marketOverview',
        icon: BarChart3,
        description: 'navbar.marketOverviewDesc',
      },
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
    id: 'oracles',
    label: 'navbar.oracleDetails',
    icon: Database,
    items: [
      {
        href: '/chainlink',
        label: 'navbar.chainlink',
        icon: Shield,
        description: 'navbar.chainlinkDesc',
      },
      {
        href: '/band-protocol',
        label: 'navbar.bandProtocol',
        icon: Layers,
        description: 'navbar.bandProtocolDesc',
      },
      {
        href: '/pyth-network',
        label: 'navbar.pythNetwork',
        icon: Zap,
        description: 'navbar.pythNetworkDesc',
      },
      {
        href: '/api3',
        label: 'navbar.api3',
        icon: Activity,
        description: 'navbar.api3Desc',
      },
      {
        href: '/uma',
        label: 'navbar.uma',
        icon: Database,
        description: 'navbar.umaDesc',
      },
      {
        href: '/redstone',
        label: 'navbar.redstone',
        icon: Flame,
        description: 'navbar.redstoneDesc',
      },
    ],
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
