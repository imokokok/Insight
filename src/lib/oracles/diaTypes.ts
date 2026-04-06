import { type Blockchain } from '@/types/oracle';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface DIAAssetQuotation {
  Symbol: string;
  Name: string;
  Address: string;
  Blockchain: string;
  Price: number;
  PriceYesterday: number;
  VolumeYesterdayUSD: number;
  Time: string;
  Source: string;
}

export interface DIANFTQuotation {
  Collection: string;
  FloorPrice: number;
  FloorPriceUSD: number;
  FloorPriceYesterday: number;
  VolumeYesterday: number;
  Time: string;
  Blockchain: string;
}

export interface DIASupply {
  Symbol: string;
  Name: string;
  CirculatingSupply: number;
  TotalSupply: number;
  MaxSupply: number;
}

export interface DIADigitalAsset {
  Asset: string;
  Name: string;
  Blockchain: string;
  Address: string;
  Decimals: number;
}

export interface DIAExchange {
  Name: string;
  Volume24h: number;
  Trades: number;
  Pairs: number;
  Type: 'CEX' | 'DEX';
  Blockchain: string;
  ScraperActive: boolean;
}

export interface DIANetworkStatsData {
  activeDataSources: number;
  nodeUptime: number;
  avgResponseTime: number;
  updateFrequency: number;
  totalStaked: number;
  dataFeeds: number;
  hourlyActivity: number[];
  status: 'online' | 'warning' | 'offline';
  latency: number;
  stakingTokenSymbol: string;
}

export interface DIAStakingData {
  totalStaked: number;
  stakingApr: number;
  stakerCount: number;
  rewardPool: number;
  minStakeAmount: number;
  lockPeriods: number[];
  aprByPeriod: Record<number, number>;
  historicalApr: { timestamp: number; apr: number }[];
  rewardsDistributed: number;
}

export interface DIANFTCollection {
  id: string;
  name: string;
  symbol: string;
  floorPrice: number;
  floorPriceChange24h: number;
  volume24h: number;
  totalSupply: number;
  chain: Blockchain;
  imageUrl?: string;
  updateFrequency: number;
  confidence: number;
}

export interface DIANFTData {
  collections: DIANFTCollection[];
  totalCollections: number;
  byChain: Partial<Record<Blockchain, number>>;
  trending: DIANFTCollection[];
}

export interface DIAEcosystemIntegration {
  protocolId: string;
  name: string;
  category: 'dex' | 'lending' | 'derivatives' | 'yield' | 'insurance' | 'other';
  chain: Blockchain;
  tvl: number;
  integrationDepth: 'full' | 'partial' | 'experimental';
  dataFeedsUsed: string[];
  logoUrl?: string;
  website: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}
