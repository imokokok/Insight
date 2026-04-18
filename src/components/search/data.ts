import {
  Shield,
  Zap,
  Activity,
  Flame,
  Globe,
  Gamepad2,
  Hexagon,
  LayoutDashboard,
  BarChart3,
  Sun,
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
} from '@/types/oracle';

import { type SearchResult, type SearchResultType } from './types';

import type { LucideIcon } from 'lucide-react';

// Oracle icons mapping
const oracleIcons: Record<OracleProvider, LucideIcon> = {
  [OracleProvider.CHAINLINK]: Shield,
  [OracleProvider.PYTH]: Zap,
  [OracleProvider.API3]: Activity,
  [OracleProvider.REDSTONE]: Flame,
  [OracleProvider.DIA]: Globe,
  [OracleProvider.WINKLINK]: Gamepad2,
  [OracleProvider.SUPRA]: Hexagon,
  [OracleProvider.TWAP]: LayoutDashboard,
  [OracleProvider.REFLECTOR]: BarChart3,
  [OracleProvider.FLARE]: Sun,
};

// Oracle descriptions mapping
const oracleDescriptions: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Decentralized oracle network providing reliable price feeds',
  [OracleProvider.PYTH]: 'High-frequency oracle delivering real-time market data',
  [OracleProvider.API3]: 'First-party oracle solution with Airnode technology',
  [OracleProvider.REDSTONE]: 'Innovative oracle with on-chain data streaming',
  [OracleProvider.DIA]: 'Open-source oracle for financial data',
  [OracleProvider.WINKLINK]: 'TRON ecosystem oracle for price data',
  [OracleProvider.SUPRA]: 'Intralayer oracle with fast and reliable data feeds',
  [OracleProvider.TWAP]: 'Time-weighted average price oracle for DeFi',
  [OracleProvider.REFLECTOR]: 'Stellar-based oracle with multi-signature consensus',
  [OracleProvider.FLARE]: 'Native FTSO oracle on Flare Network with decentralized price feeds',
};

// Generate oracle search results
// Note: Oracle detail pages have been removed, links now point to cross-oracle comparison
function getOracleSearchResults(): SearchResult[] {
  return ORACLE_PROVIDER_VALUES.map((provider) => ({
    id: `oracle-${provider}`,
    title: providerNames[provider],
    description: oracleDescriptions[provider],
    type: 'oracle' as SearchResultType,
    href: `/cross-oracle`,
    icon: oracleIcons[provider],
    keywords: [provider.toLowerCase(), providerNames[provider].toLowerCase(), 'oracle'],
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
  [Blockchain.STELLAR]: '/logos/cryptos/xlm.svg',
  [Blockchain.FLARE]: '/logos/cryptos/flr.svg',
};

// Generate blockchain search results
function getBlockchainSearchResults(): SearchResult[] {
  return BLOCKCHAIN_VALUES.map((chain) => ({
    id: `blockchain-${chain}`,
    title: chainNames[chain],
    description: `Price data on ${chainNames[chain]}`,
    type: 'blockchain' as SearchResultType,
    href: `/cross-chain?chain=${chain.toLowerCase()}`,
    iconUrl: blockchainIcons[chain] || undefined,
    icon: Globe,
    keywords: [chain.toLowerCase(), chainNames[chain].toLowerCase(), 'blockchain'],
    priority: 8,
  }));
}

// Generate trading pair search results
function getPairSearchResults(): SearchResult[] {
  return symbols.map((symbol) => ({
    id: `pair-${symbol}`,
    title: `${symbol}/USD`,
    description: 'Real-time price feed data',
    type: 'pair' as SearchResultType,
    href: `/price-query?symbol=${symbol}`,
    keywords: [symbol.toLowerCase(), 'price', 'price feed'],
    priority: 9,
  }));
}

// Page search results
function getPageSearchResults(): SearchResult[] {
  return [
    {
      id: 'page-home',
      title: 'Home',
      description: 'Dashboard overview and quick access',
      type: 'page',
      href: `/`,
      icon: LayoutDashboard,
      keywords: ['home', 'dashboard'],
      priority: 10,
    },
    {
      id: 'page-price-query',
      title: 'Price Query',
      description: 'Search and view real-time price data',
      type: 'page',
      href: `/price-query`,
      icon: Search,
      keywords: ['price', 'query'],
      priority: 9,
    },
    {
      id: 'page-cross-oracle',
      title: 'Cross-Oracle Comparison',
      description: 'Compare prices across multiple oracle providers',
      type: 'page',
      href: `/cross-oracle`,
      icon: GitCompare,
      keywords: ['cross oracle', 'comparison'],
      priority: 8,
    },
    {
      id: 'page-cross-chain',
      title: 'Cross-Chain Comparison',
      description: 'Compare prices across different blockchains',
      type: 'page',
      href: `/cross-chain`,
      icon: Link2,
      keywords: ['cross chain', 'chain'],
      priority: 8,
    },
    {
      id: 'page-favorites',
      title: 'Favorites',
      description: 'Your saved favorite price feeds',
      type: 'page',
      href: `/favorites`,
      icon: Heart,
      keywords: ['favorites'],
      priority: 7,
    },
    {
      id: 'page-alerts',
      title: 'Alerts',
      description: 'Manage your price alert notifications',
      type: 'page',
      href: `/alerts`,
      icon: Bell,
      keywords: ['alerts', 'alert'],
      priority: 7,
    },
    {
      id: 'page-settings',
      title: 'Settings',
      description: 'Configure application preferences',
      type: 'page',
      href: `/settings`,
      icon: Settings,
      keywords: ['settings'],
      priority: 6,
    },
  ];
}

// Feature search results
function getFeatureSearchResults(): SearchResult[] {
  return [
    {
      id: 'feature-comparison',
      title: 'Price Comparison',
      description: 'Compare prices across different oracle providers',
      type: 'feature',
      href: `/cross-oracle`,
      icon: GitCompare,
      keywords: ['comparison', 'compare'],
      priority: 8,
    },
    {
      id: 'feature-alerts',
      title: 'Price Alerts',
      description: 'Set up notifications for price changes',
      type: 'feature',
      href: `/alerts`,
      icon: Bell,
      keywords: ['alert', 'notification'],
      priority: 7,
    },
    {
      id: 'feature-charts',
      title: 'Price Charts',
      description: 'Visualize price trends and historical data',
      type: 'feature',
      href: `/price-query`,
      icon: BarChart3,
      keywords: ['chart', 'graph'],
      priority: 7,
    },
  ];
}

// Documentation search results
function getDocumentationSearchResults(): SearchResult[] {
  return [
    {
      id: 'doc-api',
      title: 'API Reference',
      description: 'API documentation and endpoint reference',
      type: 'documentation',
      href: '/api/docs',
      icon: FileText,
      keywords: ['api', 'reference'],
      priority: 5,
    },
  ];
}

// Get all searchable items
export function getAllSearchResults(): SearchResult[] {
  return [
    ...getOracleSearchResults(),
    ...getBlockchainSearchResults(),
    ...getPairSearchResults(),
    ...getPageSearchResults(),
    ...getFeatureSearchResults(),
    ...getDocumentationSearchResults(),
  ];
}

// Group labels
export const searchGroupLabels: Record<SearchResultType, string> = {
  oracle: 'Oracles',
  pair: 'Pairs',
  blockchain: 'Blockchains',
  page: 'Pages',
  feature: 'Features',
  documentation: 'Documentation',
};
