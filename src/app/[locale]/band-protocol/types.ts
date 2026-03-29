import { type OracleConfig } from '@/lib/config/oracles';
import {
  type BandNetworkStats,
  type ValidatorInfo,
  type CrossChainStats,
  type IBCConnection,
  type IBCTransferStats,
  type IBCTransferTrend,
  type OracleScript,
  type StakingInfo,
  type StakingDistribution,
  type GovernanceProposal,
  type GovernanceParams,
  type DataSource,
} from '@/lib/oracles/bandProtocol';
import { type PriceData } from '@/types/oracle';

export type BandProtocolTabId =
  | 'market'
  | 'network'
  | 'validators'
  | 'cross-chain'
  | 'data-feeds'
  | 'oracle-scripts'
  | 'risk'
  | 'ibc'
  | 'staking'
  | 'governance';

export interface BandProtocolPageState {
  activeTab: BandProtocolTabId;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats: BandNetworkStats | null;
  validators: ValidatorInfo[];
  crossChainStats: CrossChainStats | null;
  ibcConnections: IBCConnection[];
  ibcTransferStats: IBCTransferStats | null;
  ibcTransferTrends: IBCTransferTrend[];
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
  error?: Error | null;
  onRefresh?: () => void;
}

export interface BandProtocolCrossChainViewProps {
  crossChainStats: CrossChainStats | null | undefined;
  isLoading: boolean;
}

export interface BandProtocolDataFeedsViewProps {
  dataSources: DataSource[];
  total: number;
  isLoading: boolean;
  error?: Error | null;
  onRefresh: () => void;
}

export interface BandProtocolIBCViewProps {
  ibcConnections: IBCConnection[];
  ibcTransferStats: IBCTransferStats | null | undefined;
  ibcTransferTrends: IBCTransferTrend[];
  isLoading: boolean;
}

export interface BandProtocolOracleScriptsViewProps {
  oracleScripts: OracleScript[];
  isLoading: boolean;
  error?: Error | null;
  onRefresh: () => void;
}

export interface BandProtocolStakingViewProps {
  stakingInfo: StakingInfo | null | undefined;
  stakingDistribution: StakingDistribution[];
  isLoading: boolean;
}

export interface BandProtocolGovernanceViewProps {
  proposals: GovernanceProposal[];
  governanceParams: GovernanceParams | null | undefined;
  isLoading: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}
