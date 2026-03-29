import { type OracleConfig } from '@/lib/config/oracles';
import {
  type TRONEcosystem,
  type NodeStakingData,
  type WINkLinkNode,
  type WINkLinkGamingData,
  type WINkLinkRiskMetrics,
  type WINkLinkNetworkStats,
} from '@/lib/oracles/winklink';
import { type PriceData } from '@/types/oracle';

export type StakingNode = WINkLinkNode;

export type WinklinkTabId = 'market' | 'network' | 'tron' | 'staking' | 'gaming' | 'vrf' | 'cross-chain' | 'accuracy' | 'developer' | 'risk';

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

export interface VRFRequest {
  requestId: string;
  consumer: string;
  randomValue: string | null;
  status: 'fulfilled' | 'pending' | 'failed';
  timestamp: number;
  proof: string | null;
}

export interface VRFUseCase {
  id: string;
  name: string;
  category: string;
  description: string;
  usageCount: number;
  reliability: number;
  avgLatency: number;
}

export interface VRFData {
  totalRequests: number;
  dailyRequests: number;
  averageResponseTime: number;
  successRate: number;
  activeConsumers: number;
  totalRandomnessGenerated: string;
  recentRequests: VRFRequest[];
}

export interface WinklinkVRFViewProps {
  vrf: VRFData | null | undefined;
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
