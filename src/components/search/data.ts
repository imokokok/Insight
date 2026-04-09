import {
  Shield,
  Zap,
  Layers,
  Activity,
  Flame,
  Database,
  Globe,
  TrendingUp,
  Landmark,
  Gamepad2,
  LayoutDashboard,
  BarChart3,
  Search,
  GitCompare,
  Link2,
  Heart,
  Bell,
  Settings,
  FileText,
} from 'lucide-react';

import { providerNames, chainNames, symbols } from '@/lib/constants';
import {
  OracleProvider,
  Blockchain,
  ORACLE_PROVIDER_VALUES,
  BLOCKCHAIN_VALUES,
} from '@/lib/oracles';

import { type SearchResult, type SearchResultType } from './types';

import type { LucideIcon } from 'lucide-react';

// Oracle icons mapping
const oracleIcons: Record<OracleProvider, LucideIcon> = {
  [OracleProvider.CHAINLINK]: Shield,
  [OracleProvider.PYTH]: Zap,
  [OracleProvider.API3]: Activity,
  [OracleProvider.REDSTONE]: Flame,
  [OracleProvider.UMA]: Database,
  [OracleProvider.DIA]: Globe,
  [OracleProvider.WINKLINK]: Gamepad2,
};

// Oracle descriptions mapping
const oracleDescriptions: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'search.oracles.chainlinkDesc',
  [OracleProvider.PYTH]: 'search.oracles.pythDesc',
  [OracleProvider.API3]: 'search.oracles.api3Desc',
  [OracleProvider.REDSTONE]: 'search.oracles.redstoneDesc',
  [OracleProvider.UMA]: 'search.oracles.umaDesc',
  [OracleProvider.DIA]: 'search.oracles.diaDesc',
  [OracleProvider.WINKLINK]: 'search.oracles.winklinkDesc',
};

// Generate oracle search results
// Note: Oracle detail pages have been removed, links now point to cross-oracle comparison
export function getOracleSearchResults(locale: string): SearchResult[] {
  return ORACLE_PROVIDER_VALUES.map((provider) => ({
    id: `oracle-${provider}`,
    title: providerNames[provider],
    description: oracleDescriptions[provider],
    type: 'oracle' as SearchResultType,
    href: `/${locale}/cross-oracle`,
    icon: oracleIcons[provider],
    keywords: [provider.toLowerCase(), providerNames[provider].toLowerCase(), 'oracle', '预言机'],
    priority: 10,
  }));
}

// Blockchain icons mapping
const blockchainIcons: Record<Blockchain, string> = {
  [Blockchain.ETHEREUM]: '/logos/cryptos/eth.svg',
  [Blockchain.ARBITRUM]: '/logos/cryptos/arb.svg',
  [Blockchain.OPTIMISM]: '/logos/cryptos/op.svg',
  [Blockchain.POLYGON]: '/logos/cryptos/matic.svg',
  [Blockchain.SOLANA]: '/logos/cryptos/sol.svg',
  [Blockchain.AVALANCHE]: '/logos/cryptos/avax.svg',
  [Blockchain.FANTOM]: '/logos/cryptos/ftm.svg',
  [Blockchain.CRONOS]: '/logos/cryptos/crv.svg',
  [Blockchain.JUNO]: '',
  [Blockchain.COSMOS]: '/logos/cryptos/atom.svg',
  [Blockchain.OSMOSIS]: '',
  [Blockchain.BNB_CHAIN]: '',
  [Blockchain.BASE]: '',
  [Blockchain.SCROLL]: '',
  [Blockchain.ZKSYNC]: '',
  [Blockchain.APTOS]: '',
  [Blockchain.SUI]: '',
  [Blockchain.GNOSIS]: '',
  [Blockchain.MANTLE]: '',
  [Blockchain.LINEA]: '',
  [Blockchain.CELESTIA]: '',
  [Blockchain.INJECTIVE]: '',
  [Blockchain.SEI]: '',
  [Blockchain.TRON]: '',
  [Blockchain.TON]: '',
  [Blockchain.NEAR]: '/logos/cryptos/near.svg',
  [Blockchain.AURORA]: '',
  [Blockchain.CELO]: '',
  [Blockchain.STARKNET]: '',
  [Blockchain.BLAST]: '',
  [Blockchain.CARDANO]: '',
  [Blockchain.POLKADOT]: '',
  [Blockchain.KAVA]: '',
  [Blockchain.MOONBEAM]: '',
  [Blockchain.MOONRIVER]: '',
  [Blockchain.METIS]: '',
  [Blockchain.STARKEX]: '',
};

// Generate blockchain search results
export function getBlockchainSearchResults(locale: string): SearchResult[] {
  return BLOCKCHAIN_VALUES.map((chain) => ({
    id: `blockchain-${chain}`,
    title: chainNames[chain],
    description: `search.blockchains.${chain.toLowerCase()}Desc`,
    type: 'blockchain' as SearchResultType,
    href: `/${locale}/cross-chain?chain=${chain.toLowerCase()}`,
    iconUrl: blockchainIcons[chain] || undefined,
    icon: Globe,
    keywords: [chain.toLowerCase(), chainNames[chain].toLowerCase(), 'blockchain', '链'],
    priority: 8,
  }));
}

// Generate trading pair search results
export function getPairSearchResults(locale: string): SearchResult[] {
  return symbols.map((symbol) => ({
    id: `pair-${symbol}`,
    title: `${symbol}/USD`,
    description: 'search.pairs.priceFeed',
    type: 'pair' as SearchResultType,
    href: `/${locale}/price-query?symbol=${symbol}`,
    keywords: [symbol.toLowerCase(), 'price', 'price feed', '价格', '交易对'],
    priority: 9,
  }));
}

// Page search results
export function getPageSearchResults(locale: string): SearchResult[] {
  return [
    {
      id: 'page-home',
      title: 'search.pages.home',
      description: 'search.pages.homeDesc',
      type: 'page',
      href: `/${locale}/`,
      icon: LayoutDashboard,
      keywords: ['home', '首页', 'dashboard'],
      priority: 10,
    },
    {
      id: 'page-market-overview',
      title: 'search.pages.marketOverview',
      description: 'search.pages.marketOverviewDesc',
      type: 'page',
      href: `/${locale}/market-overview`,
      icon: BarChart3,
      keywords: ['market', 'overview', '市场概览', '市场'],
      priority: 9,
    },
    {
      id: 'page-price-query',
      title: 'search.pages.priceQuery',
      description: 'search.pages.priceQueryDesc',
      type: 'page',
      href: `/${locale}/price-query`,
      icon: Search,
      keywords: ['price', 'query', '价格查询', '查询'],
      priority: 9,
    },
    {
      id: 'page-cross-oracle',
      title: 'search.pages.crossOracle',
      description: 'search.pages.crossOracleDesc',
      type: 'page',
      href: `/${locale}/cross-oracle`,
      icon: GitCompare,
      keywords: ['cross oracle', 'comparison', '对比', '预言机对比'],
      priority: 8,
    },
    {
      id: 'page-cross-chain',
      title: 'search.pages.crossChain',
      description: 'search.pages.crossChainDesc',
      type: 'page',
      href: `/${locale}/cross-chain`,
      icon: Link2,
      keywords: ['cross chain', 'chain', '跨链', '链'],
      priority: 8,
    },
    {
      id: 'page-favorites',
      title: 'search.pages.favorites',
      description: 'search.pages.favoritesDesc',
      type: 'page',
      href: `/${locale}/favorites`,
      icon: Heart,
      keywords: ['favorites', '收藏', '关注'],
      priority: 7,
    },
    {
      id: 'page-alerts',
      title: 'search.pages.alerts',
      description: 'search.pages.alertsDesc',
      type: 'page',
      href: `/${locale}/alerts`,
      icon: Bell,
      keywords: ['alerts', 'alert', '提醒', '通知'],
      priority: 7,
    },
    {
      id: 'page-settings',
      title: 'search.pages.settings',
      description: 'search.pages.settingsDesc',
      type: 'page',
      href: `/${locale}/settings`,
      icon: Settings,
      keywords: ['settings', '设置', '偏好'],
      priority: 6,
    },
  ];
}

// Feature search results
export function getFeatureSearchResults(locale: string): SearchResult[] {
  return [
    {
      id: 'feature-realtime',
      title: 'search.features.realtimePrice',
      description: 'search.features.realtimePriceDesc',
      type: 'feature',
      href: `/${locale}/market-overview`,
      icon: Zap,
      keywords: ['realtime', 'price', '实时价格', '实时'],
      priority: 8,
    },
    {
      id: 'feature-comparison',
      title: 'search.features.priceComparison',
      description: 'search.features.priceComparisonDesc',
      type: 'feature',
      href: `/${locale}/cross-oracle`,
      icon: GitCompare,
      keywords: ['comparison', 'compare', '对比', '比较'],
      priority: 8,
    },
    {
      id: 'feature-alerts',
      title: 'search.features.priceAlerts',
      description: 'search.features.priceAlertsDesc',
      type: 'feature',
      href: `/${locale}/alerts`,
      icon: Bell,
      keywords: ['alert', 'notification', '提醒', '通知'],
      priority: 7,
    },
    {
      id: 'feature-export',
      title: 'search.features.dataExport',
      description: 'search.features.dataExportDesc',
      type: 'feature',
      href: `/${locale}/market-overview`,
      icon: FileText,
      keywords: ['export', 'download', '导出', '下载'],
      priority: 6,
    },
    {
      id: 'feature-charts',
      title: 'search.features.charts',
      description: 'search.features.chartsDesc',
      type: 'feature',
      href: `/${locale}/price-query`,
      icon: BarChart3,
      keywords: ['chart', 'graph', '图表', '图形'],
      priority: 7,
    },
  ];
}

// Documentation search results
export function getDocumentationSearchResults(locale: string): SearchResult[] {
  return [
    {
      id: 'doc-api',
      title: 'search.docs.apiReference',
      description: 'search.docs.apiReferenceDesc',
      type: 'documentation',
      href: '/api/docs',
      icon: FileText,
      keywords: ['api', 'reference', '文档', '接口'],
      priority: 5,
    },
  ];
}

// Get all searchable items
export function getAllSearchResults(locale: string): SearchResult[] {
  return [
    ...getOracleSearchResults(locale),
    ...getBlockchainSearchResults(locale),
    ...getPairSearchResults(locale),
    ...getPageSearchResults(locale),
    ...getFeatureSearchResults(locale),
    ...getDocumentationSearchResults(locale),
  ];
}

// Group labels for i18n
export const searchGroupLabels: Record<SearchResultType, string> = {
  oracle: 'search.groups.oracles',
  pair: 'search.groups.pairs',
  blockchain: 'search.groups.blockchains',
  page: 'search.groups.pages',
  feature: 'search.groups.features',
  documentation: 'search.groups.documentation',
};
