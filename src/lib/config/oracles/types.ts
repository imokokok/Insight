import { type ReactNode } from 'react';

import { type BaseOracleClient } from '@/lib/oracles';
import { type OracleProvider, type Blockchain } from '@/types/oracle';

interface MarketDataConfig {
  symbol: string;
  tokenName: string;
  tokenSymbol: string;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number;
  fullyDilutedValuation: number;
  marketCapRank: number;
  high24h: number;
  low24h: number;
  change24h: number;
  change24hValue: number;
  stakingApr: number;
}

interface NetworkDataConfig {
  activeNodes: number;
  nodeUptime: number;
  avgResponseTime: number;
  updateFrequency: number;
  totalStaked: number;
  dataFeeds: number;
  hourlyActivity: unknown[];
  status: string;
  latency: number;
  stakingTokenSymbol: string;
}

interface OracleTab {
  id: string;
  label: string;
}

interface OracleViewConfig {
  id: string;
  label: string;
  component: string;
  requiredData?: string[];
  default?: boolean;
}

interface OracleConfig {
  provider: OracleProvider;
  name: string;
  descriptionKey: string;
  symbol: string;
  defaultChain: Blockchain;
  supportedChains: Blockchain[];
  client?: BaseOracleClient;
  icon: ReactNode;
  iconBgColor: string;
  themeColor: string;
  marketData: MarketDataConfig & { change24hPercent?: number };
  networkData: NetworkDataConfig;
  features: {
    hasNodeAnalytics: boolean;
    hasValidatorAnalytics: boolean;
    hasPublisherAnalytics: boolean;
    hasDisputeResolution: boolean;
    hasPriceFeeds: boolean;
    hasQuantifiableSecurity: boolean;
    hasFirstPartyOracle: boolean;
    hasCoreFeatures: boolean;
    hasDataStreams?: boolean;
    hasCrossChain?: boolean;
    hasRiskAssessment?: boolean;
  };
  tabs: OracleTab[];
  views?: OracleViewConfig[];
}

export type { MarketDataConfig, NetworkDataConfig, OracleTab, OracleViewConfig, OracleConfig };
