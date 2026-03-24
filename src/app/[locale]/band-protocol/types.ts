import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';
import { BandNetworkStats, ValidatorInfo, CrossChainStats } from '@/lib/oracles/bandProtocol';

export type BandProtocolTabId =
  | 'market'
  | 'network'
  | 'validators'
  | 'cross-chain'
  | 'data-feeds'
  | 'risk';

export interface NetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  latency: number;
  hourlyActivity?: number[];
}

export interface BandProtocolPageState {
  activeTab: BandProtocolTabId;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats: BandNetworkStats | null;
  validators: ValidatorInfo[];
  crossChainStats: CrossChainStats | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export interface BandProtocolPageActions {
  setActiveTab: (tab: BandProtocolTabId) => void;
  refetchAll: () => Promise<void>;
}

export interface BandProtocolHeaderProps {
  config: OracleConfig;
  price: PriceData | null | undefined;
  isLoading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing: boolean;
}

export interface BandProtocolSidebarProps {
  activeTab: BandProtocolTabId;
  onTabChange: (tab: BandProtocolTabId) => void;
}

export interface BandProtocolMarketViewProps {
  config: OracleConfig;
  price: PriceData | null | undefined;
  historicalData: PriceData[];
  isLoading: boolean;
}

export interface BandProtocolNetworkViewProps {
  config: OracleConfig;
  networkStats: BandNetworkStats | null | undefined;
  isLoading: boolean;
}

export interface BandProtocolValidatorsViewProps {
  validators: ValidatorInfo[];
  isLoading: boolean;
}

export interface BandProtocolCrossChainViewProps {
  crossChainStats: CrossChainStats | null | undefined;
  isLoading: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface BandProtocolDataTableProps<T> {
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
