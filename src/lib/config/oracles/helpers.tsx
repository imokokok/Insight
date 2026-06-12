import Image from 'next/image';

import { type BaseOracleClient } from '@/lib/oracles';
import { type OracleProvider, type Blockchain } from '@/types/oracle';

import {
  type OracleConfig,
  type OracleTab,
  type OracleViewConfig,
  type MarketDataConfig,
  type NetworkDataConfig,
} from './types';

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

const DEFAULT_FEATURES = {
  hasNodeAnalytics: false,
  hasValidatorAnalytics: false,
  hasPublisherAnalytics: false,
  hasDisputeResolution: false,
  hasPriceFeeds: false,
  hasQuantifiableSecurity: false,
  hasFirstPartyOracle: false,
  hasCoreFeatures: false,
};

export const COMMON_TABS = {
  MARKET: { id: 'market', label: 'Market Data' },
  NETWORK: { id: 'network', label: 'Network Health' },
  RISK: { id: 'risk', label: 'Risk Assessment' },
  ECOSYSTEM: { id: 'ecosystem', label: 'Ecosystem' },
  PRICE_FEEDS: { id: 'price-feeds', label: 'Price Feeds' },
  OVERVIEW: { id: 'overview', label: 'Overview' },
  ON_CHAIN: { id: 'on-chain', label: 'On-Chain' },
  CROSS_CHAIN: { id: 'cross-chain', label: 'Cross-Chain' },
  DATA_STREAMS: { id: 'data-streams', label: 'Data Streams' },
} as const;

function createClientSingleton<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ClientClass: new (...args: any[]) => T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: Record<string, any>
): () => T {
  let _client: T | null = null;
  return () => {
    if (!_client) _client = options ? new ClientClass(options) : new ClientClass();
    return _client;
  };
}

export function createOracleConfig(params: {
  provider: OracleProvider;
  name: string;
  symbol: string;
  defaultChain: Blockchain;
  supportedChains: Blockchain[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clientClass: new (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clientOptions?: Record<string, any>;
  color: string;
  features?: Partial<OracleConfig['features']>;
  tabs: OracleTab[];
  views?: OracleViewConfig[];
}): OracleConfig {
  const {
    provider,
    name,
    symbol,
    defaultChain,
    supportedChains,
    clientClass,
    clientOptions,
    color,
    features,
    tabs,
    views,
  } = params;

  return {
    provider,
    name,
    descriptionKey: `oracles.descriptions.${name.toLowerCase()}`,
    symbol,
    defaultChain,
    supportedChains,
    getClient: createClientSingleton(clientClass, clientOptions) as () => BaseOracleClient,
    iconBgColor: color,
    themeColor: color,
    icon: (
      <Image src={`/logos/oracles/${name.toLowerCase()}.svg`} alt={name} width={48} height={48} />
    ),
    marketData: getDefaultMarketData(symbol, name),
    networkData: getDefaultNetworkData(),
    features: {
      ...DEFAULT_FEATURES,
      ...features,
    } as OracleConfig['features'],
    tabs,
    ...(views ? { views } : {}),
  };
}
