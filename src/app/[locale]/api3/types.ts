import { type OracleConfig } from '@/lib/config/oracles';
import type {
  AirnodeNetworkStats,
  DAPICoverage,
  StakingData,
  FirstPartyOracleData,
  DAPIPriceDeviation,
  DataSourceInfo,
} from '@/lib/oracles/api3';
import { type PriceData } from '@/types/oracle';

export type API3TabId = 'market' | 'network' | 'airnode' | 'dapi' | 'ecosystem' | 'risk';

export interface NetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  latency: number;
  hourlyActivity?: number[];
}

export interface API3PageState {
  activeTab: API3TabId;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats: NetworkStats | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export interface API3PageActions {
  setActiveTab: (tab: API3TabId) => void;
  refetchAll: () => Promise<void>;
}

export interface API3SidebarProps {
  activeTab: API3TabId;
  onTabChange: (tab: API3TabId) => void;
}

export interface API3MarketViewProps {
  config: OracleConfig;
  price: PriceData | null | undefined;
  historicalData: PriceData[];
  stakingApr?: number;
  isLoading: boolean;
}

export interface API3NetworkViewProps {
  config: OracleConfig;
  networkStats: NetworkStats | null | undefined;
  isLoading: boolean;
}

export interface API3AirnodeViewProps {
  airnodeStats?: AirnodeNetworkStats | null;
  firstParty?: FirstPartyOracleData | null;
  isLoading: boolean;
}

export interface API3DapiViewProps {
  dapiCoverage?: DAPICoverage | null;
  deviations?: DAPIPriceDeviation[];
  sourceTrace?: DataSourceInfo[];
  isLoading: boolean;
}

export interface API3EcosystemViewProps {
  isLoading: boolean;
}

export interface API3RiskViewProps {
  staking?: StakingData | null;
  airnodeStats?: AirnodeNetworkStats | null;
  dapiCoverage?: DAPICoverage | null;
  isLoading: boolean;
}

export interface AirnodeNode {
  id: string;
  name: string;
  region: string;
  responseTime: number;
  successRate: number;
  reputation: number;
  stakedAmount: number;
}

export interface DapiFeed {
  id: string;
  name: string;
  category: 'crypto' | 'forex' | 'commodities' | 'stocks';
  updateFrequency: string;
  deviationThreshold: string;
  status: 'active' | 'paused' | 'deprecated';
  totalRequests: number;
  reliability: number;
}

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
