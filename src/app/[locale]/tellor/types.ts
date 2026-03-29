import { type OracleConfig } from '@/lib/config/oracles';
import {
  type TellorNetworkHealth,
  type EcosystemStats,
  type RiskMetrics,
} from '@/lib/oracles/tellor';
import { type PriceData } from '@/types/oracle';

export type TellorTabId =
  | 'market'
  | 'network'
  | 'reporters'
  | 'disputes'
  | 'staking'
  | 'ecosystem'
  | 'risk'
  | 'governance';

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
  themeColor?: string;
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
  networkHealth: TellorNetworkHealth | null | undefined;
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

export interface TellorAutopayViewProps {
  isLoading: boolean;
}

export interface TellorEcosystemViewProps {
  ecosystem: EcosystemStats | null | undefined;
  isLoading: boolean;
}

export interface TellorRiskViewProps {
  risk: RiskMetrics | null | undefined;
  isLoading: boolean;
}

export interface TellorQueryDataViewProps {
  isLoading: boolean;
}

export interface TellorLayerViewProps {
  isLoading: boolean;
}

export interface ReporterData {
  id: string;
  name: string;
  address: string;
  region: string;
  responseTime: number;
  successRate: number;
  reputation: number;
  stakedAmount: number;
  reports: number;
  reward: number;
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

export interface TellorGovernanceProposal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'rejected' | 'pending' | 'executed';
  proposer: string;
  startBlock: number;
  endBlock: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorum: number;
  votingPower: number;
  category: 'parameter' | 'treasury' | 'other';
}

export interface TellorVotingWeightDistribution {
  holder: string;
  votingPower: number;
  percentage: number;
  isDelegated: boolean;
}

export interface TellorGovernanceStats {
  totalVotingPower: number;
  activeProposals: number;
  participationRate: number;
  nextVotingDeadline: number;
  totalProposals: number;
  passedProposals: number;
  rejectedProposals: number;
  quorumThreshold: number;
}

export interface TellorGovernanceViewProps {
  proposals?: TellorGovernanceProposal[];
  votingWeights?: TellorVotingWeightDistribution[];
  stats?: TellorGovernanceStats;
  isLoading?: boolean;
}
