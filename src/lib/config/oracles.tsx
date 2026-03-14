import { OracleProvider, Blockchain } from '@/types/oracle';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythClient,
  API3Client,
  RedStoneClient,
  DIAClient,
  TellarClient,
  ChronicleClient,
  WINkLinkClient,
} from '@/lib/oracles';
import { MarketDataConfig } from '@/components/oracle/panels/MarketDataPanel';
import { NetworkDataConfig } from '@/components/oracle/panels/NetworkHealthPanel';
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
      Blockchain.AVALANCHE,
      Blockchain.BASE,
      Blockchain.BNB_CHAIN,
      Blockchain.FANTOM,
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
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
      Blockchain.BASE,
    ],
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
  [OracleProvider.PYTH]: {
    provider: OracleProvider.PYTH,
    name: 'Pyth',
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
    ],
    client: new PythClient(),
    iconBgColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
    icon: (
      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">PYTH</span>
      </div>
    ),
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
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.POLYGON,
      Blockchain.AVALANCHE,
      Blockchain.BASE,
      Blockchain.BNB_CHAIN,
      Blockchain.OPTIMISM,
    ],
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
  [OracleProvider.REDSTONE]: {
    provider: OracleProvider.REDSTONE,
    name: 'RedStone',
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
    ],
    client: new RedStoneClient(),
    iconBgColor: 'bg-red-500',
    icon: (
      <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-xs">RED</span>
      </div>
    ),
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
        1200, 1100, 1000, 900, 800, 900, 1100, 1500, 2000, 2600, 3000, 3200, 3100, 3000, 2900,
        2950, 3050, 3150, 3100, 2650, 2300, 1850, 1500, 1300,
      ],
      status: 'online',
      latency: 80,
      stakingTokenSymbol: '',
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
  },
  [OracleProvider.DIA]: {
    provider: OracleProvider.DIA,
    name: 'DIA',
    symbol: 'DIA',
    defaultChain: Blockchain.ETHEREUM,
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.POLYGON,
      Blockchain.AVALANCHE,
      Blockchain.BNB_CHAIN,
      Blockchain.BASE,
    ],
    client: new DIAClient(),
    iconBgColor: 'bg-indigo-600',
    icon: (
      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">DIA</span>
      </div>
    ),
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
        1800, 1650, 1500, 1350, 1200, 1350, 1650, 2400, 3300, 4200, 5100, 5700,
        5400, 5100, 4800, 4950, 5250, 5550, 5100, 4200, 3300, 2550, 2100, 1950,
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
  },
  [OracleProvider.TELLAR]: {
    provider: OracleProvider.TELLAR,
    name: 'Tellar',
    symbol: 'TELLAR',
    defaultChain: Blockchain.ETHEREUM,
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
      Blockchain.BASE,
      Blockchain.AVALANCHE,
    ],
    client: new TellarClient(),
    iconBgColor: 'bg-cyan-600',
    icon: (
      <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-xs">TEL</span>
      </div>
    ),
    marketData: {
      symbol: 'TELLAR',
      tokenName: 'Tellar',
      tokenSymbol: 'TELLAR',
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
        2400, 2200, 2000, 1800, 1600, 1800, 2200, 3200, 4400, 5600, 6800, 7600,
        7200, 6800, 6400, 6600, 7000, 7400, 6800, 5600, 4400, 3400, 2800, 2600,
      ],
      status: 'online',
      latency: 95,
      stakingTokenSymbol: 'TELLAR',
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
  },
  [OracleProvider.CHRONICLE]: {
    provider: OracleProvider.CHRONICLE,
    name: 'Chronicle',
    symbol: 'CHRONICLE',
    defaultChain: Blockchain.ETHEREUM,
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
      Blockchain.BASE,
    ],
    client: new ChronicleClient(),
    iconBgColor: 'bg-amber-600',
    icon: (
      <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-xs">CHR</span>
      </div>
    ),
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
        1200, 1100, 1000, 950, 900, 950, 1100, 1500, 2100, 2800, 3400, 3800,
        3600, 3400, 3200, 3300, 3500, 3700, 3400, 2800, 2200, 1700, 1400, 1300,
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
  },
  [OracleProvider.WINKLINK]: {
    provider: OracleProvider.WINKLINK,
    name: 'WINkLink',
    symbol: 'WINKLINK',
    defaultChain: Blockchain.BNB_CHAIN,
    supportedChains: [
      Blockchain.BNB_CHAIN,
    ],
    client: new WINkLinkClient(),
    iconBgColor: 'bg-pink-600',
    icon: (
      <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-xs">WIN</span>
      </div>
    ),
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
        2800, 2600, 2400, 2200, 2000, 2200, 2600, 3800, 5200, 6800, 8200, 9200,
        8800, 8400, 8000, 8200, 8600, 9000, 8400, 6800, 5400, 4200, 3400, 3000,
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
  return Object.values(oracleConfigs).sort((a, b) => b.marketData.marketCap - a.marketData.marketCap);
}

export function getOracleProvidersSortedByMarketCap(): OracleProvider[] {
  return Object.values(oracleConfigs)
    .sort((a, b) => b.marketData.marketCap - a.marketData.marketCap)
    .map((config) => config.provider);
}
