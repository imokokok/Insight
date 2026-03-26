import { type OracleConfig } from '@/lib/config/oracles';
import type {
  ScuttlebuttData,
  MakerDAOIntegration,
  ValidatorNetwork,
  ChronicleNetworkStats,
} from '@/lib/oracles';
import { type PriceData } from '@/types/oracle';

export type ChronicleTabId =
  | 'market'
  | 'network'
  | 'validators'
  | 'makerdao'
  | 'scuttlebutt'
  | 'risk';

export interface NetworkStats {
  activeValidators: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  latency: number;
  hourlyActivity?: number[];
  status?: 'online' | 'warning' | 'offline';
  totalStaked?: number;
  updateFrequency?: number;
}

export interface ChroniclePageState {
  activeTab: ChronicleTabId;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats: NetworkStats | null;
  validatorMetrics: ValidatorNetwork | null;
  makerDAO: MakerDAOIntegration | null;
  scuttlebutt: ScuttlebuttData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export interface ChroniclePageActions {
  setActiveTab: (tab: ChronicleTabId) => void;
  refetchAll: () => Promise<void>;
}

export interface ChronicleSidebarProps {
  activeTab: ChronicleTabId;
  onTabChange: (tab: ChronicleTabId) => void;
}

export interface ChronicleHeaderProps {
  config: OracleConfig;
  price: PriceData | null | undefined;
  isLoading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing: boolean;
}

export interface ChronicleMarketViewProps {
  config: OracleConfig;
  price: PriceData | null | undefined;
  historicalData: PriceData[];
  networkStats: NetworkStats | null | undefined;
  isLoading: boolean;
}

export interface ChronicleNetworkViewProps {
  config: OracleConfig;
  networkStats: NetworkStats | null | undefined;
  validatorMetrics: ValidatorNetwork | null | undefined;
  isLoading: boolean;
}

export interface ChronicleValidatorsViewProps {
  validatorMetrics: ValidatorNetwork | null | undefined;
  isLoading: boolean;
}

export interface ChronicleMakerDAOViewProps {
  makerDAO: MakerDAOIntegration | null | undefined;
  isLoading: boolean;
}

export interface ChronicleScuttlebuttViewProps {
  scuttlebutt: ScuttlebuttData | null | undefined;
  isLoading: boolean;
}

export interface ChronicleRiskViewProps {
  scuttlebutt: ScuttlebuttData | null | undefined;
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

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface ChronicleDataTableProps<T> {
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
