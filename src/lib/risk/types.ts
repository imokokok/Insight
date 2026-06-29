import type { Blockchain, OracleProvider, PriceData } from '@/types/oracle';

export type RiskLevel = 'normal' | 'warning' | 'critical' | 'severe';

export interface RiskLevelConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  threshold: number;
}

export interface SourcePriceSnapshot {
  sourceId: string;
  provider: OracleProvider;
  chain: Blockchain;
  symbol: string;
  price: number;
  timestamp: number;
  deviationPercent: number;
  verification?: PriceData['verification'];
}

export interface AffectedProtocol {
  protocolId: string;
  protocolName: string;
  chain: Blockchain;
  assetRole: 'collateral' | 'borrow' | 'both';
  liquidationThreshold: number;
  tvlUsd?: number;
  impactDirection: 'collateral-down' | 'borrow-up' | 'both';
  riskSummary: string;
}

export interface RiskSnapshotBase {
  riskLevel: RiskLevel;
  durationSeconds: number;
  sources: SourcePriceSnapshot[];
  affectedProtocols: AffectedProtocol[];
  lastUpdated: number;
}
