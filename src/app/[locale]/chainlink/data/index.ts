// Chainlink data exports
// Note: Mock data has been removed. Add real data sources here.

export interface CCIPStats {
  messages24h: number;
  valueTransferred24h: number;
  avgConfirmTime: number;
  activeChains: number;
  successRate: number;
}

export interface CrossChainTransaction {
  id: string;
  sourceChain: string;
  destChain: string;
  type: 'message' | 'token';
  status: 'pending' | 'success' | 'failed';
  value?: number;
  timestamp: Date;
}

export interface SupportedChain {
  name: string;
  logo: string;
  status: 'active' | 'coming_soon';
  messageSupported: boolean;
  tokenTransferSupported: boolean;
}

export interface RMNStatus {
  nodesOnline: number;
  securityScore: number;
  lastCheck: Date;
  anomalies: number;
}

export interface VRFStats {
  requests24h: number;
  successRate: number;
  avgResponseTime: number;
  gasUsed: number;
  activeSubscriptions: number;
  totalFunded: number;
}

export interface VRFRequest {
  id: string;
  consumer: string;
  randomWords: string[];
  status: 'pending' | 'fulfilled' | 'failed';
  timestamp: Date;
  gasUsed?: number;
}

export interface VRFSubscription {
  id: number;
  balance: number;
  consumers: number;
  owner: string;
}

export interface UseCaseDistribution {
  name: string;
  percentage: number;
  count: number;
  color: string;
}

export interface RegionStat {
  region: string;
  count: number;
  percentage: number;
}

export interface TvlTrendDataPoint {
  month: string;
  ethereum: number;
  arbitrum: number;
  polygon: number;
  optimism: number;
  avalanche: number;
  base: number;
  total: number;
}

export interface ProjectByChainData {
  chain: string;
  projects: number;
  color: string;
}

export interface ServiceData {
  id: string;
  name: string;
  color: string;
  requests: string;
  uptime: number;
}

export interface ServiceUsageDataPoint {
  name: string;
  value: number;
  color: string;
}
