import { type OracleProvider } from './enums';

export interface OracleError {
  message: string;
  provider: OracleProvider;
  code?: string;
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
