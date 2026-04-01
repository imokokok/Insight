import { type ReactNode } from 'react';

import Image from 'next/image';

import { type MarketDataConfig } from '@/components/oracle/panels/MarketDataPanel';
import { type NetworkDataConfig } from '@/components/oracle/panels/NetworkHealthPanel';
import { chartColors } from '@/lib/config/colors';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythClient,
  API3Client,
  RedStoneClient,
  DIAClient,
  TellorClient,
  ChronicleClient,
  WINkLinkClient,
  type BaseOracleClient,
} from '@/lib/oracles';
import { OracleProvider, Blockchain, type PriceData } from '@/types/oracle';

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
  description: string;
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

export const oracleConfigs: Record<OracleProvider, OracleConfig> = {
  [OracleProvider.CHAINLINK]: {
    provider: OracleProvider.CHAINLINK,
    name: 'Chainlink',
    description: '行业领先的去中心化预言机网络，为智能合约提供安全可靠的链下数据连接',
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
      Blockchain.STARKNET,
      Blockchain.BLAST,
      Blockchain.MOONBEAM,
      Blockchain.KAVA,
      Blockchain.POLKADOT,
    ],
    client: new ChainlinkClient(),
    iconBgColor: 'bg-primary-600',
    themeColor: '#375bd2',
    icon: <Image src="/logos/oracles/chainlink.svg" alt="Chainlink" width={48} height={48} />,
    marketData: {
      symbol: 'LINK',
      tokenName: 'Chainlink',
      tokenSymbol: 'LINK',
      marketCap: 13850000000,
      volume24h: 485000000,
      circulatingSupply: 608100000,
      totalSupply: 1000000000,
      fullyDilutedValuation: 22780000000,
      marketCapRank: 12,
      high24h: 23.45,
      low24h: 22.18,
      change24h: 5.67,
      change24hValue: 1.25,
      stakingApr: 4.32,
    },
    networkData: {
      activeNodes: 1847,
      nodeUptime: 99.9,
      avgResponseTime: 245,
      updateFrequency: 60,
      totalStaked: 45000000,
      dataFeeds: 1243,
      hourlyActivity: [
        3200, 2800, 2500, 2200, 1900, 2100, 2800, 4200, 5800, 7200, 8500, 9200, 8800, 8400, 7900,
        8200, 8600, 9100, 8800, 7600, 6500, 5200, 4100, 3500,
      ],
      status: 'online',
      latency: 120,
      stakingTokenSymbol: 'LINK',
    },
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
  [OracleProvider.BAND_PROTOCOL]: {
    provider: OracleProvider.BAND_PROTOCOL,
    name: 'Band Protocol',
    description: '基于 Cosmos SDK 构建的跨链数据预言机平台，实现快速最终性和原生互操作性',
    symbol: 'BAND',
    defaultChain: Blockchain.COSMOS,
    supportedChains: [
      Blockchain.COSMOS,
      Blockchain.OSMOSIS,
      Blockchain.JUNO,
      Blockchain.ETHEREUM,
      Blockchain.POLYGON,
      Blockchain.AVALANCHE,
      Blockchain.FANTOM,
      Blockchain.CRONOS,
      Blockchain.INJECTIVE,
      Blockchain.SEI,
      Blockchain.KAVA,
    ],
    client: new BandProtocolClient(),
    iconBgColor: 'bg-purple-600',
    themeColor: '#7c3aed',
    icon: <Image src="/logos/oracles/band.svg" alt="Band Protocol" width={48} height={48} />,
    marketData: {
      symbol: 'BAND',
      tokenName: 'Band Protocol',
      tokenSymbol: 'BAND',
      marketCap: 362500000,
      volume24h: 18125000,
      circulatingSupply: 145000000,
      totalSupply: 165000000,
      fullyDilutedValuation: 625000000,
      marketCapRank: 165,
      high24h: 2.58,
      low24h: 2.42,
      change24h: 2.5,
      change24hValue: 0.06,
    },
    networkData: {
      activeNodes: 70,
      nodeUptime: 99.85,
      avgResponseTime: 150,
      updateFrequency: 30,
      totalStaked: 85000000,
      dataFeeds: 180,
      hourlyActivity: [
        5800, 5200, 4800, 4400, 4100, 4300, 5600, 7800, 10200, 12500, 14200, 15100, 14800, 14400,
        13900, 14100, 14500, 15000, 14700, 13200, 11800, 9800, 7800, 6500,
      ],
      status: 'online',
      latency: 85,
      stakingTokenSymbol: 'BAND',
      bandProtocolMetrics: {
        activeValidators: 70,
        totalValidators: 80,
        stakedAmount: 85000000,
        stakingRate: 51.5,
        blockHeight: 15500000,
        blockTime: 2.8,
        inflationRate: 8.5,
        communityPoolBalance: 550000,
        tokenSymbol: 'BAND',
      },
    },
    features: {
      hasNodeAnalytics: false,
      hasValidatorAnalytics: true,
      hasPublisherAnalytics: false,
      hasDisputeResolution: false,
      hasPriceFeeds: false,
      hasQuantifiableSecurity: false,
      hasFirstPartyOracle: false,
      hasCoreFeatures: false,
    },
    tabs: [
      { id: 'market', labelKey: 'bandProtocol.menu.marketData' },
      { id: 'network', labelKey: 'bandProtocol.menu.networkHealth' },
      { id: 'validators', labelKey: 'bandProtocol.menu.validators' },
      { id: 'cross-chain', labelKey: 'bandProtocol.menu.crossChain' },
      { id: 'data-feeds', labelKey: 'bandProtocol.menu.dataFeeds' },
      { id: 'risk', labelKey: 'bandProtocol.menu.riskAssessment' },
    ],
  },
  [OracleProvider.UMA]: {
    provider: OracleProvider.UMA,
    name: 'UMA',
    description: '乐观预言机协议，通过争议解决机制构建无价的合成资产和金融合约',
    symbol: 'UMA',
    defaultChain: Blockchain.ETHEREUM,
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
      Blockchain.BASE,
      Blockchain.BNB_CHAIN,
      Blockchain.AVALANCHE,
      Blockchain.FANTOM,
      Blockchain.GNOSIS,
    ],
    client: new UMAClient(),
    iconBgColor: `bg-[${chartColors.marketOverview.uma}]`,
    themeColor: '#dc2626',
    icon: <Image src="/logos/oracles/uma.svg" alt="UMA" width={48} height={48} />,
    marketData: {
      symbol: 'UMA',
      tokenName: 'UMA',
      tokenSymbol: 'UMA',
      marketCap: 280000000,
      volume24h: 15000000,
      circulatingSupply: 65000000,
      totalSupply: 100000000,
      fullyDilutedValuation: 430000000,
      marketCapRank: 180,
      high24h: 4.5,
      low24h: 4.1,
      change24h: 2.5,
      change24hValue: 0.1,
    },
    networkData: {
      activeNodes: 80,
      nodeUptime: 99.7,
      avgResponseTime: 300,
      updateFrequency: 120,
      totalStaked: 30000000,
      dataFeeds: 50,
      hourlyActivity: [
        800, 700, 600, 550, 500, 550, 700, 1000, 1400, 1800, 2100, 2300, 2200, 2100, 2000, 2050,
        2150, 2250, 2200, 1900, 1600, 1300, 1000, 850,
      ],
      status: 'online',
      latency: 150,
      stakingTokenSymbol: 'UMA',
    },
    features: {
      hasNodeAnalytics: false,
      hasValidatorAnalytics: true,
      hasPublisherAnalytics: false,
      hasDisputeResolution: true,
      hasPriceFeeds: false,
      hasQuantifiableSecurity: false,
      hasFirstPartyOracle: false,
      hasCoreFeatures: false,
    },
    tabs: [
      { id: 'market', labelKey: 'uma.menu.marketData' },
      { id: 'network', labelKey: 'uma.menu.networkHealth' },
      { id: 'disputes', labelKey: 'uma.menu.disputeResolution' },
      { id: 'validators', labelKey: 'uma.menu.validatorAnalytics' },
      { id: 'staking', labelKey: 'uma.menu.staking' },
      { id: 'ecosystem', labelKey: 'uma.menu.ecosystem' },
      { id: 'risk', labelKey: 'uma.menu.riskAssessment' },
    ],
  },
  [OracleProvider.PYTH]: {
    provider: OracleProvider.PYTH,
    name: 'Pyth',
    description: '高频金融数据预言机，具有第一方交易所数据和亚秒级延迟',
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
    iconBgColor: `bg-[${chartColors.marketOverview.pyth}]`,
    themeColor: '#8b5cf6',
    icon: <Image src="/logos/oracles/pyth.svg" alt="Pyth" width={48} height={48} />,
    marketData: {
      symbol: 'PYTH',
      tokenName: 'Pyth',
      tokenSymbol: 'PYTH',
      marketCap: 850000000,
      volume24h: 45000000,
      circulatingSupply: 1500000000,
      totalSupply: 10000000000,
      fullyDilutedValuation: 5600000000,
      marketCapRank: 80,
      high24h: 0.65,
      low24h: 0.58,
      change24h: 4.5,
      change24hValue: 0.03,
    },
    networkData: {
      activeNodes: 100,
      nodeUptime: 99.9,
      avgResponseTime: 100,
      updateFrequency: 1,
      totalStaked: 500000000,
      dataFeeds: 500,
      hourlyActivity: [
        5000, 4500, 4000, 3500, 3000, 3500, 4500, 6500, 9000, 11000, 13000, 14000, 13500, 13000,
        12500, 12800, 13200, 13800, 13500, 11500, 10000, 8000, 6500, 5500,
      ],
      status: 'online',
      latency: 50,
      stakingTokenSymbol: 'PYTH',
    },
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
    description: '第一方预言机网络，实现去中心化 API 连接',
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
    iconBgColor: `bg-[${chartColors.marketOverview.api3}]`,
    themeColor: '#10b981',
    icon: <Image src="/logos/oracles/api3.svg" alt="API3" width={48} height={48} />,
    marketData: {
      symbol: 'API3',
      tokenName: 'API3',
      tokenSymbol: 'API3',
      marketCap: 180000000,
      volume24h: 8000000,
      circulatingSupply: 80000000,
      totalSupply: 100000000,
      fullyDilutedValuation: 225000000,
      marketCapRank: 250,
      high24h: 2.5,
      low24h: 2.2,
      change24h: 3.8,
      change24hValue: 0.09,
    },
    networkData: {
      activeNodes: 50,
      nodeUptime: 99.8,
      avgResponseTime: 200,
      updateFrequency: 10,
      totalStaked: 25000000,
      dataFeeds: 150,
      hourlyActivity: [
        600, 550, 500, 450, 400, 450, 550, 750, 1000, 1300, 1500, 1600, 1550, 1500, 1450, 1480,
        1520, 1580, 1550, 1350, 1150, 950, 750, 650,
      ],
      status: 'online',
      latency: 100,
      stakingTokenSymbol: 'API3',
    },
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
    description: '模块化预言机解决方案，支持高效的数据流和灵活的集成选项',
    symbol: 'REDSTONE',
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
    marketData: {
      symbol: 'REDSTONE',
      tokenName: 'RedStone',
      tokenSymbol: 'REDSTONE',
      marketCap: 280000000,
      volume24h: 12000000,
      circulatingSupply: 0,
      totalSupply: 0,
      fullyDilutedValuation: 0,
      marketCapRank: 200,
      high24h: 0,
      low24h: 0,
      change24h: 4.2,
      change24hValue: 0,
    },
    networkData: {
      activeNodes: 25,
      nodeUptime: 99.9,
      avgResponseTime: 200,
      updateFrequency: 60,
      totalStaked: 0,
      dataFeeds: 1000,
      hourlyActivity: [
        1200, 1100, 1000, 900, 800, 900, 1100, 1500, 2000, 2600, 3000, 3200, 3100, 3000, 2900, 2950,
        3050, 3150, 3100, 2650, 2300, 1850, 1500, 1300,
      ],
      status: 'online',
      latency: 80,
      stakingTokenSymbol: '',
    },
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
    description: '开源的跨链数据预言机平台，提供透明且可验证的金融数据馈送',
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
    marketData: {
      symbol: 'DIA',
      tokenName: 'DIA',
      tokenSymbol: 'DIA',
      marketCap: 120000000,
      volume24h: 5000000,
      circulatingSupply: 95000000,
      totalSupply: 200000000,
      fullyDilutedValuation: 252000000,
      marketCapRank: 280,
      high24h: 1.35,
      low24h: 1.22,
      change24h: 3.2,
      change24hValue: 0.04,
    },
    networkData: {
      activeNodes: 45,
      nodeUptime: 99.8,
      avgResponseTime: 150,
      updateFrequency: 60,
      totalStaked: 15000000,
      dataFeeds: 280,
      hourlyActivity: [
        1800, 1650, 1500, 1350, 1200, 1350, 1650, 2400, 3300, 4200, 5100, 5700, 5400, 5100, 4800,
        4950, 5250, 5550, 5100, 4200, 3300, 2550, 2100, 1950,
      ],
      status: 'online',
      latency: 120,
      stakingTokenSymbol: 'DIA',
    },
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
  [OracleProvider.TELLOR]: {
    provider: OracleProvider.TELLOR,
    name: 'Tellor',
    description: '去中心化加密原生预言机，通过质押挖矿机制确保数据透明度和安全性',
    symbol: 'TRB',
    defaultChain: Blockchain.ETHEREUM,
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
      Blockchain.BASE,
      Blockchain.AVALANCHE,
      Blockchain.BNB_CHAIN,
      Blockchain.FANTOM,
      Blockchain.MOONBEAM,
      Blockchain.GNOSIS,
    ],
    client: new TellorClient(),
    iconBgColor: `bg-[${chartColors.oracle.tellor}]`,
    themeColor: '#06b6d4',
    icon: <Image src="/logos/oracles/tellor.svg" alt="Tellor" width={48} height={48} />,
    marketData: {
      symbol: 'TRB',
      tokenName: 'Tellor',
      tokenSymbol: 'TRB',
      marketCap: 180000000,
      volume24h: 8000000,
      circulatingSupply: 120000000,
      totalSupply: 250000000,
      fullyDilutedValuation: 375000000,
      marketCapRank: 240,
      high24h: 1.65,
      low24h: 1.48,
      change24h: 4.5,
      change24hValue: 0.07,
    },
    networkData: {
      activeNodes: 72,
      nodeUptime: 99.9,
      avgResponseTime: 95,
      updateFrequency: 30,
      totalStaked: 20000000,
      dataFeeds: 350,
      hourlyActivity: [
        2400, 2200, 2000, 1800, 1600, 1800, 2200, 3200, 4400, 5600, 6800, 7600, 7200, 6800, 6400,
        6600, 7000, 7400, 6800, 5600, 4400, 3400, 2800, 2600,
      ],
      status: 'online',
      latency: 95,
      stakingTokenSymbol: 'TRB',
    },
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
      { id: 'market', labelKey: 'tellor.tabs.market' },
      { id: 'network', labelKey: 'tellor.tabs.network' },
      { id: 'reporters', labelKey: 'tellor.tabs.reporters' },
      { id: 'disputes', labelKey: 'tellor.tabs.disputes' },
      { id: 'staking', labelKey: 'tellor.tabs.staking' },
      { id: 'ecosystem', labelKey: 'tellor.tabs.ecosystem' },
      { id: 'risk', labelKey: 'tellor.tabs.riskAssessment' },
    ],
  },
  [OracleProvider.CHRONICLE]: {
    provider: OracleProvider.CHRONICLE,
    name: 'Chronicle',
    description: 'MakerDAO 原生预言机，采用 Scuttlebutt 安全协议',
    symbol: 'CHRONICLE',
    defaultChain: Blockchain.ETHEREUM,
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
      Blockchain.BASE,
      Blockchain.BNB_CHAIN,
      Blockchain.AVALANCHE,
      Blockchain.FANTOM,
      Blockchain.GNOSIS,
    ],
    client: new ChronicleClient(),
    iconBgColor: `bg-[${chartColors.oracle.chronicle}]`,
    themeColor: '#f59e0b',
    icon: <Image src="/logos/oracles/chronicle.svg" alt="Chronicle" width={48} height={48} />,
    marketData: {
      symbol: 'CHRONICLE',
      tokenName: 'Chronicle',
      tokenSymbol: 'CHRONICLE',
      marketCap: 220000000,
      volume24h: 9500000,
      circulatingSupply: 85000000,
      totalSupply: 150000000,
      fullyDilutedValuation: 388000000,
      marketCapRank: 210,
      high24h: 2.85,
      low24h: 2.52,
      change24h: 3.8,
      change24hValue: 0.1,
    },
    networkData: {
      activeNodes: 45,
      nodeUptime: 99.95,
      avgResponseTime: 140,
      updateFrequency: 60,
      totalStaked: 25000000,
      dataFeeds: 85,
      hourlyActivity: [
        1200, 1100, 1000, 950, 900, 950, 1100, 1500, 2100, 2800, 3400, 3800, 3600, 3400, 3200, 3300,
        3500, 3700, 3400, 2800, 2200, 1700, 1400, 1300,
      ],
      status: 'online',
      latency: 140,
      stakingTokenSymbol: 'MKR',
    },
    features: {
      hasNodeAnalytics: false,
      hasValidatorAnalytics: true,
      hasPublisherAnalytics: false,
      hasDisputeResolution: false,
      hasPriceFeeds: false,
      hasQuantifiableSecurity: false,
      hasFirstPartyOracle: false,
      hasCoreFeatures: true,
    },
    tabs: [
      { id: 'market', labelKey: 'chronicle.tabs.market' },
      { id: 'makerdao', labelKey: 'chronicle.tabs.makerdao' },
      { id: 'validators', labelKey: 'chronicle.tabs.validators' },
      { id: 'network', labelKey: 'chronicle.tabs.network' },
      { id: 'scuttlebutt', labelKey: 'chronicle.tabs.scuttlebutt' },
      { id: 'risk', labelKey: 'chronicle.tabs.riskAssessment' },
    ],
  },
  [OracleProvider.WINKLINK]: {
    provider: OracleProvider.WINKLINK,
    name: 'WINkLink',
    description: 'TRON 生态预言机，专注游戏和 DeFi',
    symbol: 'WINKLINK',
    defaultChain: Blockchain.BNB_CHAIN,
    supportedChains: [Blockchain.BNB_CHAIN, Blockchain.TRON, Blockchain.ETHEREUM],
    client: new WINkLinkClient(),
    iconBgColor: `bg-[${chartColors.oracle.winklink}]`,
    themeColor: '#ec4899',
    icon: <Image src="/logos/oracles/winklink.svg" alt="WINkLink" width={48} height={48} />,
    marketData: {
      symbol: 'WINKLINK',
      tokenName: 'WINkLink',
      tokenSymbol: 'WINKLINK',
      marketCap: 150000000,
      volume24h: 6500000,
      circulatingSupply: 650000000,
      totalSupply: 999000000000,
      fullyDilutedValuation: 230769230,
      marketCapRank: 290,
      high24h: 0.00028,
      low24h: 0.00022,
      change24h: 5.2,
      change24hValue: 0.00001,
    },
    networkData: {
      activeNodes: 85,
      nodeUptime: 99.92,
      avgResponseTime: 110,
      updateFrequency: 30,
      totalStaked: 45000000,
      dataFeeds: 180,
      hourlyActivity: [
        2800, 2600, 2400, 2200, 2000, 2200, 2600, 3800, 5200, 6800, 8200, 9200, 8800, 8400, 8000,
        8200, 8600, 9000, 8400, 6800, 5400, 4200, 3400, 3000,
      ],
      status: 'online',
      latency: 110,
      stakingTokenSymbol: 'WIN',
    },
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

// Client-side only: Create oracle client instance dynamically
export function createOracleClient(provider: OracleProvider): BaseOracleClient {
  switch (provider) {
    case OracleProvider.CHAINLINK:
      return new ChainlinkClient();
    case OracleProvider.BAND_PROTOCOL:
      return new BandProtocolClient();
    case OracleProvider.UMA:
      return new UMAClient();
    case OracleProvider.PYTH:
      return new PythClient();
    case OracleProvider.API3:
      return new API3Client();
    case OracleProvider.REDSTONE:
      return new RedStoneClient();
    case OracleProvider.DIA:
      return new DIAClient();
    case OracleProvider.TELLOR:
      return new TellorClient();
    case OracleProvider.CHRONICLE:
      return new ChronicleClient();
    case OracleProvider.WINKLINK:
      return new WINkLinkClient();
    default:
      throw new Error(`Unknown oracle provider: ${provider}`);
  }
}
