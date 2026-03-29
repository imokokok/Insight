import { type OracleConfig } from '@/lib/config/oracles';
import { type PriceData } from '@/types/oracle';

export type ChainlinkTabId =
  | 'market'
  | 'network'
  | 'nodes'
  | 'data-feeds'
  | 'data-streams'
  | 'services'
  | 'ecosystem'
  | 'risk'
  | 'ccip'
  | 'vrf'
  | 'automation'
  | 'staking'
  | 'proof-of-reserve'
  | 'functions';

export interface NetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  latency?: number;
  hourlyActivity?: number[];
  status?: string;
  totalStaked?: number;
  updateFrequency?: number;
}

export interface ChainlinkPageState {
  activeTab: ChainlinkTabId;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats: NetworkStats | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export interface ChainlinkPageActions {
  setActiveTab: (tab: ChainlinkTabId) => void;
  refetchAll: () => Promise<void>;
}

export interface ChainlinkHeaderProps {
  config: OracleConfig;
  price: PriceData | null | undefined;
  isLoading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing: boolean;
}

export interface ChainlinkSidebarProps {
  activeTab: ChainlinkTabId | string;
  onTabChange: (tab: ChainlinkTabId | string) => void;
}

export interface ChainlinkMarketViewProps {
  config: OracleConfig;
  price: PriceData | null | undefined;
  historicalData: PriceData[];
  isLoading: boolean;
}

export interface ChainlinkNetworkViewProps {
  config: OracleConfig;
  networkStats: NetworkStats | null | undefined;
  isLoading: boolean;
}

export interface DataFeed {
  id: string;
  name: string;
  category: 'crypto' | 'forex' | 'commodities' | 'defi' | 'equities';
  updateFrequency: string;
  deviationThreshold: string;
  status: 'active' | 'paused' | 'deprecated';
  totalRequests: number;
  reliability: number;
}

export interface NodeData {
  id: string;
  name: string;
  region: string;
  responseTime: number;
  successRate: number;
  reputation: number;
  stakedAmount: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface ChainlinkDataTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    width?: string;
    sortable?: boolean;
    render?: (item: T) => React.ReactNode;
  }>;
  sortConfig?: SortConfig;
  onSort?: (key: string) => void;
  isLoading?: boolean;
}

// ============================================================================
// Enhanced Component Types
// ============================================================================

// Market Depth Types
export interface MarketDepthLevel {
  price: number;
  bidVolume: number;
  askVolume: number;
  bidOrders: number;
  askOrders: number;
}

export interface MarketDepthData {
  levels: MarketDepthLevel[];
  spread: number;
  spreadPercentage: number;
  bestBid: number;
  bestAsk: number;
  totalBidVolume: number;
  totalAskVolume: number;
}

// Trading Pair Types
export interface TradingPair {
  id: string;
  base: string;
  quote: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  liquidityScore: number;
  isActive: boolean;
}

export interface TradingPairStats {
  totalPairs: number;
  activePairs: number;
  totalVolume24h: number;
  avgLiquidityScore: number;
}

// Service Stats Types
export interface ServiceMetric {
  id: string;
  name: string;
  category: 'vrf' | 'automation' | 'ccip' | 'functions' | 'proof';
  requests24h: number;
  successRate: number;
  avgResponseTime: number;
  revenue24h: number;
  growthRate: number;
  status: 'operational' | 'degraded' | 'down';
}

export interface ServiceStats {
  services: ServiceMetric[];
  totalRequests24h: number;
  totalRevenue24h: number;
  overallSuccessRate: number;
}

// Ecosystem Stats Types
export interface EcosystemProject {
  id: string;
  name: string;
  category: 'defi' | 'nft' | 'gaming' | 'enterprise' | 'infrastructure';
  chain: string;
  tvl?: number;
  dailyUsers?: number;
  integrationType: string[];
  logoUrl?: string;
  websiteUrl?: string;
}

export interface EcosystemStats {
  totalProjects: number;
  projectsByCategory: Record<string, number>;
  projectsByChain: Record<string, number>;
  totalTvl: number;
  featuredProjects: EcosystemProject[];
}

// Risk Event Types
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'open' | 'investigating' | 'resolved' | 'mitigated';

export interface RiskEvent {
  id: string;
  title: string;
  description: string;
  severity: RiskSeverity;
  status: RiskStatus;
  category: 'security' | 'performance' | 'operational' | 'financial';
  affectedFeeds?: string[];
  affectedChains?: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

// Node Geographic Distribution Types
export type Region = 'all' | 'northAmerica' | 'europe' | 'asia' | 'others';

export interface RegionData {
  id: Region;
  name: string;
  nodeCount: number;
  avgResponseTime: number;
  successRate: number;
  percentage: number;
  color: string;
}

export interface NodeGeographicDistributionProps {
  className?: string;
}

// Realtime Throughput Monitor Types
export interface ThroughputDataPoint {
  timestamp: string;
  rps: number;
  successRate: number;
  avgLatency: number;
}

export interface ThroughputStats {
  currentRps: number;
  peakRps: number;
  avgSuccessRate: number;
  avgLatency: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

export interface RealtimeThroughputMonitorProps {
  className?: string;
  autoUpdate?: boolean;
  updateInterval?: number;
}

// Network Topology Types
export interface LayerNode {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  count?: number;
}

export interface LayerMetric {
  label: string;
  value: string;
  subValue?: string;
}

export interface LayerData {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  metrics: LayerMetric[];
  nodes: LayerNode[];
}

export interface NetworkTopologyOverviewProps {
  className?: string;
}

// Node Earnings Types
export type NodeTier = 'small' | 'medium' | 'large';

export interface TierConfig {
  minStake: number;
  maxStake: number;
  label: string;
  color: string;
  avgEarningsPerDay: number;
}

export interface TierStats {
  count: number;
  totalStake: number;
  avgEarnings: number;
}

export interface NodeEarningsPanelProps {
  nodes: NodeData[];
}

// Node Performance Trends Types
export interface NodeTrendData {
  successRateTrend: number[];
  responseTimeTrend: number[];
  reputationTrend: number[];
}

export interface NodePerformanceTrendsProps {
  nodes: NodeData[];
}

// Staking Rewards Calculator Types
export type ScenarioType = 'conservative' | 'moderate' | 'optimistic';

export interface ScenarioConfig {
  label: string;
  apy: number;
  color: string;
  description: string;
}

export interface StakingRewards {
  daily: number;
  monthly: number;
  yearly: number;
  total: number;
  apy: number;
}

export interface StakingPoolStats {
  totalStaked: number;
  stakingRate: number;
  currentAPR: number;
  communityPoolStatus: 'active' | 'paused';
  communityPoolSize: number;
}

export interface RewardHistory {
  date: string;
  amount: number;
  type: 'base' | 'service' | 'slashing';
}

export interface SlashingEvent {
  id: string;
  node: string;
  reason: string;
  amount: number;
  timestamp: Date;
}

export interface UnlockQueue {
  address: string;
  amount: number;
  unlockTime: Date;
  status: 'queued' | 'ready' | 'withdrawn';
}

export interface OperatorStake {
  rank: number;
  name: string;
  stakedAmount: number;
  reputation: number;
  rewards: number;
}
