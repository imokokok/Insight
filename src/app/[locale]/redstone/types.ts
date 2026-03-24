import { PriceData } from '@/types/oracle';
import { RedStoneClient, RedStoneProviderInfo, RedStoneMetrics } from '@/lib/oracles/redstone';

export type RedStoneTabId =
  | 'market'
  | 'network'
  | 'data-streams'
  | 'providers'
  | 'cross-chain'
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
