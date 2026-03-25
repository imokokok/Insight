import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';

export type DIATabId =
  | 'market'
  | 'network'
  | 'data-feeds'
  | 'nft-data'
  | 'staking'
  | 'ecosystem'
  | 'risk';

export interface DIANetworkStats {
  activeDataSources: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  latency: number;
  hourlyActivity?: number[];
  // Risk view properties
  uptime?: number;
  dataQuality?: number;
  oracleDiversity?: number;
  avgConfidence?: number;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface DIAPageState {
  activeTab: DIATabId;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats: DIANetworkStats | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export interface DIAPageActions {
  setActiveTab: (tab: DIATabId) => void;
  refetchAll: () => Promise<void>;
}

export interface DIASidebarProps {
  activeTab: DIATabId;
  onTabChange: (tab: DIATabId) => void;
}

export interface DIAMarketViewProps {
  config: OracleConfig;
  price: PriceData | null | undefined;
  historicalData: PriceData[];
  isLoading: boolean;
}

export interface DIANetworkViewProps {
  config: OracleConfig;
  networkStats: DIANetworkStats | null | undefined;
  isLoading: boolean;
}
