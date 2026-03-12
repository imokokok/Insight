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
} from 'lucide-react';
import { NavStructure } from './types';

export const navigationConfig: NavStructure = [
  // 首页 - 单独一个
  {
    href: '/',
    label: 'navbar.home',
    icon: LayoutDashboard,
  },
  // 市场 - 包含市场概览和价格查询
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
  // 数据分析
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
  // 预言机详情
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
    ],
  },
];

export const oracleColors: Record<string, string> = {
  chainlink: '#375BD2',
  'band-protocol': '#516BEB',
  'pyth-network': '#E6B800',
  api3: '#7CE3CB',
  uma: '#FF4A8D',
};
