import { type OracleConfig } from '@/lib/config/oracles';
import { type PriceData } from '@/types/oracle';

export type PythTabId = 'market' | 'network' | 'publishers' | 'validators' | 'price-feeds' | 'risk';

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

export interface PublisherData {
  id: string;
  name: string;
  stake?: number;
  accuracy: number;
  status?: string;
  contribution?: number;
}

export interface ValidatorData {
  id: string;
  name: string;
  stake?: number;
  uptime?: number;
  rewards?: number;
  performance?: number;
  status: string;
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
