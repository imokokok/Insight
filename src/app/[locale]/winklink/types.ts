import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';
import {
  TRONEcosystem,
  NodeStakingData,
  WINkLinkNode,
  WINkLinkGamingData,
  WINkLinkRiskMetrics,
  WINkLinkNetworkStats,
} from '@/lib/oracles/winklink';

export type StakingNode = WINkLinkNode;

export type WinklinkTabId =
  | 'market'
  | 'network'
  | 'tron'
  | 'staking'
  | 'gaming'
  | 'risk';

export interface WinklinkPageState {
  activeTab: WinklinkTabId;
  price: PriceData | null;
  historicalData: PriceData[];
  tronIntegration: TRONEcosystem | null;
  staking: NodeStakingData | null;
  gaming: WINkLinkGamingData | null;
  networkStats: WINkLinkNetworkStats | null;
  riskMetrics: WINkLinkRiskMetrics | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export interface WinklinkPageActions {
  setActiveTab: (tab: WinklinkTabId) => void;
  refetchAll: () => Promise<void>;
}

export interface WinklinkSidebarProps {
  activeTab: WinklinkTabId;
  onTabChange: (tab: WinklinkTabId) => void;
}

export interface WinklinkMarketViewProps {
  config: OracleConfig;
  price: PriceData | null | undefined;
  historicalData: PriceData[];
  staking: NodeStakingData | null | undefined;
  isLoading: boolean;
}

export interface WinklinkNetworkViewProps {
  config: OracleConfig;
  networkStats: WINkLinkNetworkStats | null | undefined;
  isLoading: boolean;
}

export interface WinklinkTRONViewProps {
  tronIntegration: TRONEcosystem | null | undefined;
  isLoading: boolean;
}

export interface WinklinkStakingViewProps {
  staking: NodeStakingData | null | undefined;
  isLoading: boolean;
}

export interface WinklinkGamingViewProps {
  gaming: WINkLinkGamingData | null | undefined;
  isLoading: boolean;
}

export interface WinklinkRiskViewProps {
  riskMetrics: WINkLinkRiskMetrics | null | undefined;
  isLoading: boolean;
}

export interface NavItem {
  id: WinklinkTabId;
  labelKey: string;
  icon: React.ReactNode;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}
