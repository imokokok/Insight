import { type OracleConfig } from '@/lib/config/oracles';
import { type PriceData } from '@/types/oracle';
import {
  type Publisher,
  type GenericValidator,
  type PublisherStatus,
} from '@/types/oracle/publisher';

export type PythTabId =
  | 'market'
  | 'network'
  | 'publishers'
  | 'validators'
  | 'price-feeds'
  | 'risk'
  | 'cross-chain';

export interface NetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  updateFrequency?: number;
  latency?: number;
  hourlyActivity?: number[];
  status?: string;
  totalStaked?: number;
}

export interface PythServiceNetworkStats {
  totalPublishers: number;
  activePublishers: number;
  totalPriceFeeds: number;
  totalSubmissions24h: number;
  averageLatency: number;
  uptimePercentage: number;
  lastUpdated: number;
}

export interface PublisherData extends Publisher {
  publisherKey?: string;
  priceFeeds?: string[];
  totalSubmissions?: number;
  averageLatency?: number;
  accuracy?: number;
  stake?: number;
  contribution?: number;
  source?: 'pyth-hermes-api' | 'pythnet-rpc' | 'mock-fallback' | 'pyth-official-list';
}

export interface ValidatorData extends GenericValidator {
  rewards?: number;
  stake?: number;
  performance?: number;
  source?: 'pyth-hermes-api' | 'pythnet-rpc' | 'mock-fallback' | 'pyth-official-list';
}

export interface PythPageState {
  activeTab: PythTabId;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats: NetworkStats | null;
  publishers: PublisherData[];
  validators: ValidatorData[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export interface PythPageActions {
  setActiveTab: (tab: PythTabId) => void;
  refetchAll: () => Promise<void>;
}

export interface PythSidebarProps {
  activeTab: PythTabId | string;
  onTabChange: (tab: PythTabId | string) => void;
}

export interface PythMarketViewProps {
  config: OracleConfig;
  price: PriceData | null | undefined;
  historicalData: PriceData[];
  networkStats: NetworkStats | null | undefined;
  isLoading: boolean;
}

export interface PythNetworkViewProps {
  config: OracleConfig;
  networkStats: NetworkStats | null | undefined;
  isLoading: boolean;
}

export interface PythPublishersViewProps {
  publishers: PublisherData[];
  isLoading: boolean;
}

export interface PythValidatorsViewProps {
  validators: ValidatorData[];
  isLoading: boolean;
}

export interface PythPriceFeedsViewProps {
  isLoading: boolean;
}

export interface PythRiskViewProps {
  isLoading: boolean;
}

// Price Feed types
export interface PriceFeed {
  id: string;
  name: string;
  category: 'crypto' | 'forex' | 'commodities' | 'equities';
  updateFrequency: string;
  deviationThreshold: string;
  status: 'active' | 'paused' | 'deprecated';
  totalRequests: number;
  reliability: number;
}

// Risk analysis types
export interface RiskMetric {
  id: string;
  name: string;
  value: number;
  max: number;
  description: string;
  status: 'low' | 'medium' | 'high';
  trend: 'up' | 'down' | 'stable';
}

export interface RiskFactor {
  category: string;
  level: 'low' | 'medium' | 'high';
  description: string;
  details: string[];
}

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info' | 'error';
}

// Benchmark comparison data
export interface BenchmarkData {
  metric: string;
  pyth: number;
  chainlink: number;
  band: number;
  api3: number;
}

// Cross-chain price data
export interface ChainPriceData {
  chain: string;
  price: number;
  deviation: number;
  latency: number;
  status: 'online' | 'degraded' | 'offline';
  lastUpdate: Date;
}

export interface PythCrossChainViewProps {
  isLoading: boolean;
  symbol?: string;
}

export interface CrossChainPriceData {
  chain: string;
  price: number;
  deviation: number;
  latency: number;
  status: 'online' | 'degraded' | 'offline';
  lastUpdate: Date;
}

export interface CrossChainResult {
  data: CrossChainPriceData[];
  basePrice: number;
  timestamp: number;
}

export interface RealtimeState {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  lastUpdateLatency: number;
  priceUpdateAnimation: 'up' | 'down' | 'none';
}

export interface PythPriceRaw {
  price: string | number;
  conf?: string | number;
  expo?: number;
  publish_time?: number;
  slot?: number;
}

export interface PythServicePriceFeed {
  id: string;
  symbol: string;
  description: string;
  assetType: string;
  status: string;
}

export type { PublisherStatus };
