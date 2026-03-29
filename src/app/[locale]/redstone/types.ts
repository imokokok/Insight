import {
  type RedStoneClient,
  type RedStoneProviderInfo,
  type RedStoneMetrics,
} from '@/lib/oracles/redstone';
import { type PriceData } from '@/types/oracle';

export type RedStoneTabId =
  | 'pull-model'
  | 'erc7412'
  | 'market'
  | 'network'
  | 'data-streams'
  | 'providers'
  | 'cross-chain'
  | 'ecosystem'
  | 'risk'
  | 'avs'
  | 'arweave'
  | 'token';

export interface NetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  latency: number;
  hourlyActivity?: number[];
}

export interface RedStonePageState {
  activeTab: RedStoneTabId;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats: NetworkStats | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export interface RedStonePageActions {
  setActiveTab: (tab: RedStoneTabId) => void;
  refetchAll: () => Promise<void>;
}

export interface RedStoneSidebarProps {
  activeTab: RedStoneTabId;
  onTabChange: (tab: RedStoneTabId) => void;
}

export interface RedStoneMarketViewProps {
  client: RedStoneClient;
  price: PriceData | null | undefined;
  historicalData: PriceData[];
  isLoading: boolean;
  networkStats: NetworkStats | null;
}

export interface RedStoneNetworkViewProps {
  networkStats: NetworkStats | null;
  isLoading: boolean;
}

export interface RedStoneDataStreamsViewProps {
  metrics: RedStoneMetrics | null;
  isLoading: boolean;
}

export interface RedStoneProvidersViewProps {
  providers: RedStoneProviderInfo[];
  metrics: RedStoneMetrics | null;
  isLoading: boolean;
}

export interface RedStoneCrossChainViewProps {
  isLoading: boolean;
}

export interface RedStoneEcosystemViewProps {
  isLoading: boolean;
}

export interface RedStoneRiskViewProps {
  isLoading: boolean;
}

export interface RedStoneAVSViewProps {
  isLoading: boolean;
}

export interface RedStoneTokenViewProps {
  isLoading: boolean;
}

export interface ChainInfo {
  chain: string;
  latency: number;
  updateFreq: number;
  status: 'active' | 'inactive';
}

export interface EcosystemIntegration {
  name: string;
  description: string;
  category: 'infrastructure' | 'defi' | 'nft' | 'gaming';
}

export type SortOption = 'reputation' | 'dataPoints' | 'lastUpdate';
export type FilterOption = 'all' | 'highReputation' | 'mostData';

export interface RedStonePullModelViewProps {
  isLoading: boolean;
}

export interface RedStoneERC7412ViewProps {
  isLoading: boolean;
}

export interface RedStoneArweaveViewProps {
  isLoading: boolean;
}
