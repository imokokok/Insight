import { ReactNode } from 'react';

export type NetworkStatus = 'online' | 'warning' | 'offline';

export interface NetworkMetric {
  id: string;
  title: string;
  value: string;
  unit?: string;
  trend: number;
  trendDirection: 'up' | 'down' | 'neutral';
  icon: ReactNode;
}

export interface BandProtocolMetrics {
  activeValidators: number;
  totalValidators: number;
  stakedAmount: number;
  stakingRate: number;
  blockHeight: number;
  blockTime: number;
  inflationRate: number;
  communityPoolBalance: number;
  tokenSymbol?: string;
}

export interface SolanaNetworkMetrics {
  blockConfirmationTime: number;
  pythProgramStatus: 'active' | 'inactive' | 'degraded';
  pythProgramAccount: string;
  slotHeight: number;
  tps: number;
  avgBlockTime: number;
  validatorCount: number;
  totalStake: number;
}

export interface NetworkDataConfig {
  activeNodes: number;
  nodeUptime: number;
  avgResponseTime: number;
  updateFrequency: number;
  totalStaked: number;
  dataFeeds: number;
  hourlyActivity: number[];
  status: NetworkStatus;
  latency: number;
  stakingTokenSymbol?: string;
  bandProtocolMetrics?: BandProtocolMetrics;
  solanaNetworkMetrics?: SolanaNetworkMetrics;
}
