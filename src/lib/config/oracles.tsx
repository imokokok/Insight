import { type ReactNode } from 'react';

import Image from 'next/image';

// MarketDataPanel component removed
import { chartColors } from '@/lib/config/colors';
import {
  ChainlinkClient,
  PythClient,
  API3Client,
  RedStoneClient,
  DIAClient,
  WINkLinkClient,
  type BaseOracleClient,
} from '@/lib/oracles';
import { getTokenMarketData } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';

// MarketDataConfig type definition (previously imported from MarketDataPanel)
interface MarketDataConfig {
  symbol: string;
  tokenName: string;
  tokenSymbol: string;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number;
  fullyDilutedValuation: number;
  marketCapRank: number;
  high24h: number;
  low24h: number;
  change24h: number;
  change24hValue: number;
  stakingApr: number;
}

// Network data configuration type
interface NetworkDataConfig {
  activeNodes: number;
  nodeUptime: number;
  avgResponseTime: number;
  updateFrequency: number;
  totalStaked: number;
  dataFeeds: number;
  hourlyActivity: unknown[];
  status: string;
  latency: number;
  stakingTokenSymbol: string;
}

export interface OracleTab {
  id: string;
  labelKey: string;
}

export interface OracleViewConfig {
  id: string;
  labelKey: string;
  component: string;
  requiredData?: string[];
  default?: boolean;
}

export interface OracleConfig {
  provider: OracleProvider;
  name: string;
  descriptionKey: string;
  symbol: string;
  defaultChain: Blockchain;
  supportedChains: Blockchain[];
  client?: BaseOracleClient;
  icon: ReactNode;
  iconBgColor: string;
  themeColor: string;
  marketData: MarketDataConfig & { change24hPercent?: number };
  networkData: NetworkDataConfig;
  features: {
    hasNodeAnalytics: boolean;
    hasValidatorAnalytics: boolean;
    hasPublisherAnalytics: boolean;
    hasDisputeResolution: boolean;
    hasPriceFeeds: boolean;
    hasQuantifiableSecurity: boolean;
    hasFirstPartyOracle: boolean;
    hasCoreFeatures: boolean;
    hasDataStreams?: boolean;
    hasCrossChain?: boolean;
    hasRiskAssessment?: boolean;
  };
  tabs: OracleTab[];
  views?: OracleViewConfig[];
}

// 默认市场数据（当 API 不可用时使用）
const getDefaultMarketData = (
  symbol: string,
  name: string
): MarketDataConfig & { change24hPercent?: number } => ({
  symbol,
  tokenName: name,
  tokenSymbol: symbol,
  marketCap: 0,
  volume24h: 0,
  circulatingSupply: 0,
  totalSupply: 0,
  fullyDilutedValuation: 0,
  marketCapRank: 0,
  high24h: 0,
  low24h: 0,
  change24h: 0,
  change24hValue: 0,
  change24hPercent: 0,
  stakingApr: 0,
});

// 默认网络数据
const getDefaultNetworkData = (): NetworkDataConfig => ({
  activeNodes: 0,
  nodeUptime: 0,
  avgResponseTime: 0,
  updateFrequency: 0,
  totalStaked: 0,
  dataFeeds: 0,
  hourlyActivity: [],
  status: 'offline',
  latency: 0,
  stakingTokenSymbol: '',
});

// 异步获取市场数据的函数
export async function fetchOracleMarketData(
  symbol: string,
  name: string
): Promise<MarketDataConfig & { change24hPercent?: number }> {
  try {
    const marketData = await getTokenMarketData(symbol);
    if (marketData) {
      return {
        symbol: marketData.symbol,
        tokenName: marketData.name,
        tokenSymbol: marketData.symbol,
        marketCap: marketData.marketCap ?? 0,
        volume24h: marketData.totalVolume24h,
        circulatingSupply: marketData.circulatingSupply ?? 0,
        totalSupply: marketData.totalSupply ?? 0,
        fullyDilutedValuation: marketData.marketCap ?? 0,
        marketCapRank: marketData.marketCapRank ?? 0,
        high24h: marketData.high24h,
        low24h: marketData.low24h,
        change24h: marketData.priceChange24h,
        change24hValue: marketData.priceChange24h,
        change24hPercent: marketData.priceChangePercentage24h,
        stakingApr: 0,
      };
    }
  } catch (error) {
    console.warn(`Failed to fetch market data for ${symbol}:`, error);
  }
  return getDefaultMarketData(symbol, name);
}

export const oracleConfigs: Record<OracleProvider, OracleConfig> = {
  [OracleProvider.CHAINLINK]: {
    provider: OracleProvider.CHAINLINK,
    name: 'Chainlink',
    descriptionKey: 'oracles.descriptions.chainlink',
    symbol: 'LINK',
    defaultChain: Blockchain.ETHEREUM,
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
      Blockchain.AVALANCHE,
      Blockchain.BASE,
      Blockchain.BNB_CHAIN,
      Blockchain.FANTOM,
      Blockchain.GNOSIS,
      Blockchain.METIS,
      Blockchain.SCROLL,
      Blockchain.CELO,
      Blockchain.MOONBEAM,
      Blockchain.MOONRIVER,
      Blockchain.STARKNET,
      Blockchain.BLAST,
      Blockchain.KAVA,
      Blockchain.LINEA,
      Blockchain.SOLANA,
    ],
    client: new ChainlinkClient({ useRealData: true }),
    iconBgColor: 'bg-primary-600',
    themeColor: '#375bd2',
    icon: <Image src="/logos/oracles/chainlink.svg" alt="Chainlink" width={48} height={48} />,
    marketData: getDefaultMarketData('LINK', 'Chainlink'),
    networkData: getDefaultNetworkData(),
    features: {
      hasNodeAnalytics: true,
      hasValidatorAnalytics: false,
      hasPublisherAnalytics: false,
      hasDisputeResolution: false,
      hasPriceFeeds: false,
      hasQuantifiableSecurity: false,
      hasFirstPartyOracle: false,
      hasCoreFeatures: false,
    },
    tabs: [
      { id: 'market', labelKey: 'chainlink.menu.marketData' },
      { id: 'network', labelKey: 'chainlink.menu.networkHealth' },
      { id: 'nodes', labelKey: 'chainlink.menu.nodes' },
      { id: 'data-feeds', labelKey: 'chainlink.menu.dataFeeds' },
      { id: 'services', labelKey: 'chainlink.menu.services' },
      { id: 'ecosystem', labelKey: 'chainlink.menu.ecosystem' },
      { id: 'risk', labelKey: 'chainlink.menu.riskAssessment' },
    ],
    views: [
      {
        id: 'market',
        labelKey: 'chainlink.menu.marketData',
        component: 'ChainlinkMarketView',
        default: true,
      },
      {
        id: 'network',
        labelKey: 'chainlink.menu.networkHealth',
        component: 'ChainlinkNetworkView',
      },
      { id: 'nodes', labelKey: 'chainlink.menu.nodes', component: 'ChainlinkNodesView' },
      {
        id: 'data-feeds',
        labelKey: 'chainlink.menu.dataFeeds',
        component: 'ChainlinkDataFeedsView',
      },
      { id: 'services', labelKey: 'chainlink.menu.services', component: 'ChainlinkServicesView' },
      {
        id: 'ecosystem',
        labelKey: 'chainlink.menu.ecosystem',
        component: 'ChainlinkEcosystemView',
      },
      { id: 'risk', labelKey: 'chainlink.menu.riskAssessment', component: 'ChainlinkRiskView' },
    ],
  },
  [OracleProvider.PYTH]: {
    provider: OracleProvider.PYTH,
    name: 'Pyth',
    descriptionKey: 'oracles.descriptions.pyth',
    symbol: 'PYTH',
    defaultChain: Blockchain.SOLANA,
    supportedChains: [
      Blockchain.SOLANA,
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.POLYGON,
      Blockchain.OPTIMISM,
      Blockchain.AVALANCHE,
      Blockchain.BASE,
      Blockchain.STARKNET,
      Blockchain.BLAST,
      Blockchain.SUI,
      Blockchain.APTOS,
      Blockchain.INJECTIVE,
      Blockchain.SEI,
    ],
    client: new PythClient(),
    iconBgColor: `bg-[${chartColors.oracle.pyth}]`,
    themeColor: '#8b5cf6',
    icon: <Image src="/logos/oracles/pyth.svg" alt="Pyth" width={48} height={48} />,
    marketData: getDefaultMarketData('PYTH', 'Pyth'),
    networkData: getDefaultNetworkData(),
    features: {
      hasNodeAnalytics: false,
      hasValidatorAnalytics: true,
      hasPublisherAnalytics: true,
      hasDisputeResolution: false,
      hasPriceFeeds: true,
      hasQuantifiableSecurity: false,
      hasFirstPartyOracle: false,
      hasCoreFeatures: true,
    },
    tabs: [
      { id: 'market', labelKey: 'pyth.menu.marketData' },
      { id: 'network', labelKey: 'pyth.menu.networkHealth' },
      { id: 'publishers', labelKey: 'pyth.menu.publishers' },
      { id: 'validators', labelKey: 'pyth.menu.validators' },
      { id: 'price-feeds', labelKey: 'pyth.menu.priceFeeds' },
      { id: 'risk', labelKey: 'pyth.menu.riskAssessment' },
    ],
    views: [
      {
        id: 'market',
        labelKey: 'pyth.menu.marketData',
        component: 'PythMarketView',
        default: true,
      },
      { id: 'network', labelKey: 'pyth.menu.networkHealth', component: 'PythNetworkView' },
      { id: 'publishers', labelKey: 'pyth.menu.publishers', component: 'PythPublishersView' },
      { id: 'validators', labelKey: 'pyth.menu.validators', component: 'PythValidatorsView' },
      { id: 'price-feeds', labelKey: 'pyth.menu.priceFeeds', component: 'PythPriceFeedsView' },
      { id: 'risk', labelKey: 'pyth.menu.riskAssessment', component: 'PythRiskView' },
    ],
  },
  [OracleProvider.API3]: {
    provider: OracleProvider.API3,
    name: 'API3',
    descriptionKey: 'oracles.descriptions.api3',
    symbol: 'API3',
    defaultChain: Blockchain.ETHEREUM,
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.POLYGON,
      Blockchain.AVALANCHE,
      Blockchain.BASE,
      Blockchain.BNB_CHAIN,
      Blockchain.OPTIMISM,
      Blockchain.MOONBEAM,
      Blockchain.KAVA,
      Blockchain.FANTOM,
      Blockchain.GNOSIS,
      Blockchain.LINEA,
      Blockchain.SCROLL,
    ],
    client: new API3Client(),
    iconBgColor: `bg-[${chartColors.oracle.api3}]`,
    themeColor: '#10b981',
    icon: <Image src="/logos/oracles/api3.svg" alt="API3" width={48} height={48} />,
    marketData: getDefaultMarketData('API3', 'API3'),
    networkData: getDefaultNetworkData(),
    features: {
      hasNodeAnalytics: false,
      hasValidatorAnalytics: false,
      hasPublisherAnalytics: false,
      hasDisputeResolution: false,
      hasPriceFeeds: false,
      hasQuantifiableSecurity: true,
      hasFirstPartyOracle: true,
      hasCoreFeatures: false,
      hasRiskAssessment: true,
    },
    tabs: [
      { id: 'market', labelKey: 'api3.menu.marketData' },
      { id: 'network', labelKey: 'api3.menu.networkHealth' },
      { id: 'airnode', labelKey: 'api3.menu.airnode' },
      { id: 'dapi', labelKey: 'api3.menu.dapi' },
      { id: 'ecosystem', labelKey: 'api3.menu.ecosystem' },
      { id: 'risk', labelKey: 'api3.menu.riskAssessment' },
    ],
  },
  [OracleProvider.REDSTONE]: {
    provider: OracleProvider.REDSTONE,
    name: 'RedStone',
    descriptionKey: 'oracles.descriptions.redstone',
    symbol: 'RED',
    defaultChain: Blockchain.ETHEREUM,
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
      Blockchain.AVALANCHE,
      Blockchain.BASE,
      Blockchain.BNB_CHAIN,
      Blockchain.FANTOM,
      Blockchain.LINEA,
      Blockchain.MANTLE,
      Blockchain.SCROLL,
      Blockchain.ZKSYNC,
      Blockchain.BLAST,
      Blockchain.STARKNET,
      Blockchain.APTOS,
      Blockchain.SUI,
    ],
    client: new RedStoneClient(),
    iconBgColor: `bg-[${chartColors.oracle.redstone}]`,
    themeColor: '#ef4444',
    icon: <Image src="/logos/oracles/redstone.svg" alt="RedStone" width={48} height={48} />,
    marketData: getDefaultMarketData('REDSTONE', 'RedStone'),
    networkData: getDefaultNetworkData(),
    features: {
      hasNodeAnalytics: false,
      hasValidatorAnalytics: false,
      hasPublisherAnalytics: true,
      hasDisputeResolution: false,
      hasPriceFeeds: true,
      hasQuantifiableSecurity: false,
      hasFirstPartyOracle: false,
      hasCoreFeatures: true,
      hasDataStreams: true,
      hasCrossChain: true,
    },
    tabs: [
      { id: 'market', labelKey: 'redstone.tabs.market' },
      { id: 'network', labelKey: 'redstone.tabs.network' },
      { id: 'providers', labelKey: 'redstone.tabs.providers' },
      { id: 'data-streams', labelKey: 'redstone.tabs.dataStreams' },
      { id: 'cross-chain', labelKey: 'redstone.tabs.crossChain' },
      { id: 'ecosystem', labelKey: 'redstone.tabs.ecosystem' },
      { id: 'risk', labelKey: 'redstone.tabs.riskAssessment' },
    ],
  },
  [OracleProvider.DIA]: {
    provider: OracleProvider.DIA,
    name: 'DIA',
    descriptionKey: 'oracles.descriptions.dia',
    symbol: 'DIA',
    defaultChain: Blockchain.ETHEREUM,
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.POLYGON,
      Blockchain.AVALANCHE,
      Blockchain.BNB_CHAIN,
      Blockchain.BASE,
      Blockchain.FANTOM,
      Blockchain.CRONOS,
      Blockchain.MOONBEAM,
      Blockchain.GNOSIS,
      Blockchain.KAVA,
    ],
    client: new DIAClient(),
    iconBgColor: 'bg-indigo-600',
    themeColor: '#6366f1',
    icon: <Image src="/logos/oracles/dia.svg" alt="DIA" width={48} height={48} />,
    marketData: getDefaultMarketData('DIA', 'DIA'),
    networkData: getDefaultNetworkData(),
    features: {
      hasNodeAnalytics: false,
      hasValidatorAnalytics: false,
      hasPublisherAnalytics: false,
      hasDisputeResolution: false,
      hasPriceFeeds: false,
      hasQuantifiableSecurity: false,
      hasFirstPartyOracle: false,
      hasCoreFeatures: true,
    },
    tabs: [
      { id: 'market', labelKey: 'dia.tabs.market' },
      { id: 'network', labelKey: 'dia.tabs.network' },
      { id: 'data-feeds', labelKey: 'dia.tabs.dataFeeds' },
      { id: 'nft-data', labelKey: 'dia.tabs.nftData' },
      { id: 'staking', labelKey: 'dia.tabs.staking' },
      { id: 'ecosystem', labelKey: 'dia.tabs.ecosystem' },
      { id: 'risk', labelKey: 'dia.tabs.riskAssessment' },
    ],
  },
  [OracleProvider.WINKLINK]: {
    provider: OracleProvider.WINKLINK,
    name: 'WINkLink',
    descriptionKey: 'oracles.descriptions.winklink',
    symbol: 'WIN/USD',
    defaultChain: Blockchain.BNB_CHAIN,
    supportedChains: [Blockchain.BNB_CHAIN, Blockchain.TRON, Blockchain.ETHEREUM],
    client: new WINkLinkClient(),
    iconBgColor: `bg-[${chartColors.oracle.winklink}]`,
    themeColor: '#ec4899',
    icon: <Image src="/logos/oracles/winklink.svg" alt="WINkLink" width={48} height={48} />,
    marketData: getDefaultMarketData('WINKLINK', 'WINkLink'),
    networkData: getDefaultNetworkData(),
    features: {
      hasNodeAnalytics: false,
      hasValidatorAnalytics: false,
      hasPublisherAnalytics: false,
      hasDisputeResolution: false,
      hasPriceFeeds: true,
      hasQuantifiableSecurity: false,
      hasFirstPartyOracle: false,
      hasCoreFeatures: true,
    },
    tabs: [
      { id: 'market', labelKey: 'winklink.menu.marketData' },
      { id: 'network', labelKey: 'winklink.menu.networkHealth' },
      { id: 'tron', labelKey: 'winklink.menu.tronEcosystem' },
      { id: 'staking', labelKey: 'winklink.menu.staking' },
      { id: 'gaming', labelKey: 'winklink.menu.gaming' },
      { id: 'risk', labelKey: 'winklink.menu.riskAssessment' },
    ],
  },
};

export function getOracleConfig(provider: OracleProvider): OracleConfig {
  const config = oracleConfigs[provider];
  if (!config) {
    throw new Error(`Oracle configuration not found for provider: ${provider}`);
  }
  return config;
}

export function getAllOracleConfigs(): OracleConfig[] {
  return Object.values(oracleConfigs);
}

export function getAllOracleConfigsSortedByMarketCap(): OracleConfig[] {
  return Object.values(oracleConfigs).sort((a, b) => {
    if (a.provider === OracleProvider.API3 && b.provider === OracleProvider.REDSTONE) {
      return -1;
    }
    if (a.provider === OracleProvider.REDSTONE && b.provider === OracleProvider.API3) {
      return 1;
    }
    return b.marketData.marketCap - a.marketData.marketCap;
  });
}

export function getOracleProvidersSortedByMarketCap(): OracleProvider[] {
  return Object.values(oracleConfigs)
    .sort((a, b) => {
      if (a.provider === OracleProvider.API3 && b.provider === OracleProvider.REDSTONE) {
        return -1;
      }
      if (a.provider === OracleProvider.REDSTONE && b.provider === OracleProvider.API3) {
        return 1;
      }
      return b.marketData.marketCap - a.marketData.marketCap;
    })
    .map((config) => config.provider);
}

export function getPriceOracleProvidersSortedByMarketCap(): OracleProvider[] {
  return getOracleProvidersSortedByMarketCap();
}

export function getOracleViews(provider: OracleProvider): OracleViewConfig[] {
  const config = getOracleConfig(provider);
  return (
    config.views ||
    config.tabs.map((tab) => ({
      id: tab.id,
      labelKey: tab.labelKey,
      component: `${provider.charAt(0).toUpperCase() + provider.slice(1).replace(/-/g, '')}View`,
    }))
  );
}
