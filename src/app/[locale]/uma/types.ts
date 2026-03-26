import { type OracleConfig } from '@/lib/config/oracles';
import {
  type ValidatorData,
  type DisputeData,
  type UMANetworkStats,
  ValidatorPerformanceHeatmapData,
  DisputeEfficiencyStats,
  DisputeAmountDistributionStats,
} from '@/lib/oracles/uma/types';
import { type PriceData } from '@/types/oracle';

export type UmaTabId =
  | 'market'
  | 'network'
  | 'disputes'
  | 'validators'
  | 'staking'
  | 'ecosystem'
  | 'risk';

export interface UMAStats {
  activeValidators: number;
  totalDisputes: number;
  disputeSuccessRate: number;
  supportedChains: number;
}

export interface UmaPageState {
  activeTab: UmaTabId;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats: UMANetworkStats | null;
  validators: ValidatorData[];
  disputes: DisputeData[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export interface UmaPageActions {
  setActiveTab: (tab: UmaTabId) => void;
  refresh: () => Promise<void>;
  exportData: () => void;
}

export interface UmaSidebarProps {
  activeTab: UmaTabId;
  onTabChange: (tab: UmaTabId) => void;
}

export interface UmaMarketViewProps {
  config: OracleConfig;
  price: PriceData | null | undefined;
  historicalData: PriceData[];
  networkStats: UMANetworkStats | null;
  isLoading: boolean;
}

export interface UmaNetworkViewProps {
  config: OracleConfig;
  networkStats: UMANetworkStats | null;
  isLoading: boolean;
}

export interface UmaDisputesViewProps {
  disputes: DisputeData[];
  networkStats: UMANetworkStats | null;
  isLoading: boolean;
}

export interface UmaValidatorsViewProps {
  validators: ValidatorData[];
  networkStats: UMANetworkStats | null;
  isLoading: boolean;
}

export interface UmaStakingViewProps {
  validators: ValidatorData[];
  networkStats: UMANetworkStats | null;
  isLoading: boolean;
}

export interface UmaEcosystemViewProps {
  config: OracleConfig;
}

export interface UmaRiskViewProps {
  networkStats: UMANetworkStats | null;
  disputes: DisputeData[];
  isLoading: boolean;
}

export interface StatCard {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

export interface NetworkStatusItem {
  label: string;
  value: string;
  status: 'healthy' | 'warning' | 'error';
}

export interface DataSourceItem {
  name: string;
  status: 'active' | 'syncing' | 'error';
  latency: string;
}
