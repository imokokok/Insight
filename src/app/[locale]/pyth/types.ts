import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';

export type PythTabId =
  | 'market'
  | 'network'
  | 'publishers'
  | 'validators'
  | 'price-feeds'
  | 'risk';

export interface NetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  updateFrequency: number;
  latency?: number;
  hourlyActivity?: number[];
}

export interface PublisherData {
  id: string;
  name: string;
  stake: number;
  accuracy: number;
}

export interface ValidatorData {
  id: string;
  name: string;
  stake: number;
  uptime: number;
  rewards: number;
  status: 'active' | 'inactive' | 'jailed';
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
  activeTab: PythTabId;
  onTabChange: (tab: PythTabId) => void;
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
