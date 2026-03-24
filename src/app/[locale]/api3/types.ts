import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';
import type {
  AirnodeNetworkStats,
  DAPICoverage,
  StakingData,
  FirstPartyOracleData,
  DAPIPriceDeviation,
  DataSourceInfo,
} from '@/lib/oracles/api3';

export type API3TabId =
  | 'market'
  | 'network'
  | 'airnode'
  | 'dapi'
  | 'ecosystem'
  | 'risk';

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
