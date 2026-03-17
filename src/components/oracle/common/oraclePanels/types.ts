import { ReactNode } from 'react';
import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';
import { UMAMetworkStats } from '@/lib/oracles/uma/types';

export interface PanelRenderContext {
  config: OracleConfig;
  activeTab: string;
  priceData: PriceData | null;
  historicalData: PriceData[];
  umaNetworkStats: UMAMetworkStats | null;
  t: (key: string) => string;
}

export interface StatItem {
  title: string;
  value: string;
  suffix?: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
}

export interface NetworkStatusItem {
  label: string;
  value: string;
  status: 'healthy' | 'warning' | 'critical';
}

export interface DataSourceItem {
  name: string;
  status: 'active' | 'syncing' | 'inactive';
  latency: string;
}

export interface PanelConfig {
  getStats?: (context: PanelRenderContext) => StatItem[];
  renderMarketTab?: (context: PanelRenderContext) => ReactNode;
  renderNetworkTab?: (context: PanelRenderContext) => ReactNode;
  renderValidatorsTab?: (context: PanelRenderContext) => ReactNode;
  renderDisputesTab?: (context: PanelRenderContext) => ReactNode;
  renderStakingTab?: (context: PanelRenderContext) => ReactNode;
  renderRiskTab?: (context: PanelRenderContext) => ReactNode;
  renderEcosystemTab?: (context: PanelRenderContext) => ReactNode;
  renderCrossOracleTab?: (context: PanelRenderContext) => ReactNode;
  renderGamingTab?: (context: PanelRenderContext) => ReactNode;
  renderTronTab?: (context: PanelRenderContext) => ReactNode;
  renderDataFeedsTab?: (context: PanelRenderContext) => ReactNode;
  renderCrossChainTab?: (context: PanelRenderContext) => ReactNode;
  getKPIData?: (context: PanelRenderContext) => {
    price: number;
    priceChange24h: number;
    priceChangePercent?: number;
    updateFrequency: number;
    networkHealth: 'healthy' | 'warning' | 'critical';
    dataQualityScore: number;
  } | null;
  getDataQualityData?: (context: PanelRenderContext) => {
    completeness: number;
    latency: number;
    sourceCount: number;
  } | null;
  getDataSourceCredibilityData?: (context: PanelRenderContext) => {
    id: string;
    name: string;
    accuracy: number;
    responseSpeed: number;
    consistency: number;
    availability: number;
    contribution: number;
  }[];
}
