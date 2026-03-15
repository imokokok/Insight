import { OracleProvider, Blockchain } from './enums';
import { ConfidenceInterval } from './price';

export interface OracleClient {
  getPrice(symbol: string, chain?: Blockchain): Promise<import('./price').PriceData>;
  getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number
  ): Promise<import('./price').PriceData[]>;
  name: OracleProvider;
  supportedChains: Blockchain[];
}

export interface OracleError {
  message: string;
  provider: OracleProvider;
  code?: string;
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

export interface OracleProviderConfig {
  provider: OracleProvider;
  name: string;
  supportedChains: Blockchain[];
  description: string;
  website?: string;
  logo?: string;
  active: boolean;
}
