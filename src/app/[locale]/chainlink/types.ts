import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';

export type ChainlinkTabId =
  | 'market'
  | 'network'
  | 'nodes'
  | 'data-feeds'
  | 'services'
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
  activeTab: ChainlinkTabId;
  onTabChange: (tab: ChainlinkTabId) => void;
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
