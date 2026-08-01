import type { Blockchain, OracleProvider, PriceData } from '@/types/oracle';

export type RiskLevel = 'normal' | 'warning' | 'critical' | 'severe';

export type PriceSourceCategory = 'oracle' | 'market';

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
  // DEX / Market price fields
  category: PriceSourceCategory;
  dexName?: 'uniswap-v3' | 'curve';
  poolAddress?: string;
  feeTier?: number;
  spotPrice?: number;
  twapPrice?: number;
  liquidity?: string;
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
  // Enhanced: oracle-market divergence impact
  oracleMarketDivergence?: number;
  estimatedImpact?: string;
}

export interface OracleMarketDivergence {
  oracleMedian: number;
  marketMedian: number;
  divergencePercent: number;
  direction: 'oracle-above-market' | 'oracle-below-market' | 'aligned';
  riskLevel: RiskLevel;
  interpretation: string;
}

export interface MarketDeviationResult {
  referencePrice: number;
  maxDeviationPercent: number;
  minPrice: number;
  maxPrice: number;
  spreadPercent: number;
  riskLevel: RiskLevel;
}
