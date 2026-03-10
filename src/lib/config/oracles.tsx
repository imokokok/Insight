import { OracleProvider, Blockchain } from '@/lib/types/oracle';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythNetworkClient,
  API3Client,
} from '@/lib/oracles';
import { MarketDataConfig } from '@/components/oracle/MarketDataPanel';
import { NetworkDataConfig } from '@/components/oracle/NetworkHealthPanel';
import { ReactNode } from 'react';

export interface OracleConfig {
  provider: OracleProvider;
  name: string;
  symbol: string;
  defaultChain: Blockchain;
  supportedChains: Blockchain[];
  client: InstanceType<typeof ChainlinkClient>;
  icon: ReactNode;
  iconBgColor: string;
  marketData: MarketDataConfig;
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
  };
}

export const oracleConfigs: Record<OracleProvider, OracleConfig> = {
  [OracleProvider.CHAINLINK]: {
    provider: OracleProvider.CHAINLINK,
    name: 'Chainlink',
    symbol: 'LINK',
    defaultChain: Blockchain.ETHEREUM,
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
    ],
    client: new ChainlinkClient(),
    iconBgColor: 'bg-blue-600',
    icon: (
      <svg viewBox="0 0 256 256" className="w-8 h-8" fill="none">
        <path d="M128 0L16 64v128l112 64 112-64V64L128 0z" fill="#375BD2" />
        <path d="M208 64l-80 46-80-46 80-46 80 46z" fill="#6582F0" />
        <path d="M48 64v128l80 46V110l-80-46z" fill="#2A4CAD" />
        <path d="M208 64v128l-80 46V110l80-46z" fill="#375BD2" />
      </svg>
    ),
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
  },
  [OracleProvider.BAND_PROTOCOL]: {
    provider: OracleProvider.BAND_PROTOCOL,
    name: 'Band Protocol',
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
    ],
    client: new BandProtocolClient(),
    iconBgColor: 'bg-purple-600',
    icon: (
      <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">BAND</span>
      </div>
    ),
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
  },
  [OracleProvider.UMA]: {
    provider: OracleProvider.UMA,
    name: 'UMA',
    symbol: 'UMA',
    defaultChain: Blockchain.ETHEREUM,
    supportedChains: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.OPTIMISM],
    client: new UMAClient(),
    iconBgColor: 'bg-yellow-500',
    icon: (
      <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">UMA</span>
      </div>
    ),
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
  },
  [OracleProvider.PYTH_NETWORK]: {
    provider: OracleProvider.PYTH_NETWORK,
    name: 'Pyth Network',
    symbol: 'PYTH',
    defaultChain: Blockchain.SOLANA,
    supportedChains: [Blockchain.SOLANA, Blockchain.ETHEREUM, Blockchain.ARBITRUM],
    client: new PythNetworkClient(),
    iconBgColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
    icon: (
      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">PYTH</span>
      </div>
    ),
    marketData: {
      symbol: 'PYTH',
      tokenName: 'Pyth Network',
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
      hasValidatorAnalytics: false,
      hasPublisherAnalytics: true,
      hasDisputeResolution: false,
      hasPriceFeeds: true,
      hasQuantifiableSecurity: false,
      hasFirstPartyOracle: false,
      hasCoreFeatures: true,
    },
  },
  [OracleProvider.API3]: {
    provider: OracleProvider.API3,
    name: 'API3',
    symbol: 'API3',
    defaultChain: Blockchain.ETHEREUM,
    supportedChains: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.POLYGON],
    client: new API3Client(),
    iconBgColor: 'bg-green-600',
    icon: (
      <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">API3</span>
      </div>
    ),
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
    },
  },
};

export function getOracleConfig(provider: OracleProvider): OracleConfig {
  return oracleConfigs[provider];
}

export function getAllOracleConfigs(): OracleConfig[] {
  return Object.values(oracleConfigs);
}
