import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';

export type TellorTabId =
  | 'market'
  | 'network'
  | 'reporters'
  | 'disputes'
  | 'staking'
  | 'ecosystem'
  | 'cross-oracle'
  | 'risk';

export interface NetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  latency: number;
  hourlyActivity?: number[];
}

export interface TellorPageState {
  activeTab: TellorTabId;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats: NetworkStats | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export interface TellorPageActions {
  setActiveTab: (tab: TellorTabId) => void;
  refetchAll: () => Promise<void>;
}

export interface TellorSidebarProps {
  activeTab: TellorTabId;
  onTabChange: (tab: TellorTabId) => void;
}

export interface TellorMarketViewProps {
  config: OracleConfig;
  price: PriceData | null | undefined;
  historicalData: PriceData[];
  isLoading: boolean;
}

export interface TellorNetworkViewProps {
  config: OracleConfig;
  networkStats: NetworkStats | null | undefined;
  isLoading: boolean;
}

export interface TellorReportersViewProps {
  isLoading: boolean;
}

export interface TellorDisputesViewProps {
  isLoading: boolean;
}

export interface TellorStakingViewProps {
  isLoading: boolean;
}

export interface TellorEcosystemViewProps {
  isLoading: boolean;
}

export interface TellorRiskViewProps {
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

export interface ReporterData {
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

export interface TellorDataTableProps<T> {
  data: T[];
  columns: Array<{
    key: string;
    header: string;
    width?: string;
    sortable?: boolean;
    render?: (item: T) => React.ReactNode;
  }>;
  sortConfig?: SortConfig;
  onSort?: (key: string) => void;
  isLoading?: boolean;
}
