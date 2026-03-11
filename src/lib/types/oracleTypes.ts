import { OracleProvider, Blockchain } from './oracle';

export { OracleProvider, Blockchain };

export enum TimeRange {
  '1H' = 3600,
  '6H' = 21600,
  '24H' = 86400,
  '7D' = 604800,
  '30D' = 2592000,
}

export enum DataStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  CRITICAL = 'critical',
  STALE = 'stale',
}

export enum TrendDirection {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
  EXPANDING = 'expanding',
  SHRINKING = 'shrinking',
}

export type PublisherStatus = 'active' | 'inactive' | 'degraded';

export interface ConfidenceInterval {
  bid: number;
  ask: number;
  widthPercentage: number;
}

export interface GenericHistoricalPrice {
  timestamp: number;
  price: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
}

export interface PriceData {
  provider: OracleProvider;
  chain?: Blockchain;
  symbol: string;
  price: number;
  timestamp: number;
  decimals: number;
  confidence?: number;
  source?: string;
  change?: number;
  changePercent?: number;
  confidenceInterval?: ConfidenceInterval;
}

export interface PriceDeviation {
  symbol: string;
  oraclePrice: number;
  marketPrice?: number;
  deviation: number;
  deviationPercent: number;
  trend: TrendDirection;
  status: DataStatus;
}

export interface GenericValidator {
  id: string;
  name: string;
  reliabilityScore: number;
  latency: number;
  status: PublisherStatus;
  staked: number;
  region?: string;
  uptime?: number;
  commission?: number;
  totalResponses?: number;
}

export interface GenericNetworkStats {
  activeValidators: number;
  totalValidators: number;
  avgResponseTime: number;
  updateFrequency: number;
  totalStaked: number;
  timestamp: number;
}

export interface DataQualityMetrics {
  freshness: {
    lastUpdated: number;
    updateInterval: number;
  };
  completeness: {
    successCount: number;
    totalCount: number;
  };
  reliability: {
    historicalAccuracy: number;
    responseSuccessRate: number;
    uptime: number;
  };
}

export interface ChartDataPoint {
  x: number | string | Date;
  y: number;
  label?: string;
  color?: string;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface HeatmapCell {
  x: string;
  y: string;
  value: number;
  color?: string;
}

export interface StatsSummary {
  label: string;
  value: number | string;
  change?: number;
  changePercent?: number;
  trend?: TrendDirection;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface TabConfig {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export interface PageConfig {
  title: string;
  description?: string;
  provider: OracleProvider;
  tabs: TabConfig[];
  refreshInterval?: number;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
  lastUpdated?: number;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterState {
  timeRange?: TimeRange;
  chain?: Blockchain;
  symbol?: string;
  status?: DataStatus;
}

export interface OracleProviderConfig {
  provider: OracleProvider;
  name: string;
  supportedChains: Blockchain[];
  description: string;
  website?: string;
  logo?: string;
  active: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'png';
  filename?: string;
  includeMetadata?: boolean;
}

export interface ChartThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  neutral: string;
  grid: string;
  text: string;
  background: string;
}

export const DEFAULT_CHART_THEME: ChartThemeColors = {
  primary: '#3b82f6',
  secondary: '#6b7280',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  neutral: '#9ca3af',
  grid: '#e5e7eb',
  text: '#374151',
  background: '#ffffff',
};

export const ORACLE_PROVIDERS: Record<OracleProvider, OracleProviderConfig> = {
  [OracleProvider.CHAINLINK]: {
    provider: OracleProvider.CHAINLINK,
    name: 'Chainlink',
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
      Blockchain.AVALANCHE,
      Blockchain.BASE,
    ],
    description: ' decentralized oracle network',
    website: 'https://chain.link',
    active: true,
  },
  [OracleProvider.BAND_PROTOCOL]: {
    provider: OracleProvider.BAND_PROTOCOL,
    name: 'Band Protocol',
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.COSMOS,
      Blockchain.OSMOSIS,
      Blockchain.BINANCE,
    ],
    description: 'Cross-chain data oracle platform',
    website: 'https://bandprotocol.com',
    active: true,
  },
  [OracleProvider.UMA]: {
    provider: OracleProvider.UMA,
    name: 'UMA',
    supportedChains: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.OPTIMISM],
    description: 'Optimistic oracle and dispute arbitration',
    website: 'https://umaproject.org',
    active: true,
  },
  [OracleProvider.PYTH_NETWORK]: {
    provider: OracleProvider.PYTH_NETWORK,
    name: 'Pyth Network',
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.SOLANA,
    ],
    description: 'Low-latency price oracle',
    website: 'https://pyth.network',
    active: true,
  },
  [OracleProvider.API3]: {
    provider: OracleProvider.API3,
    name: 'API3',
    supportedChains: [
      Blockchain.ETHEREUM,
      Blockchain.ARBITRUM,
      Blockchain.OPTIMISM,
      Blockchain.POLYGON,
    ],
    description: 'First-party oracle infrastructure',
    website: 'https://api3.org',
    active: true,
  },
};
