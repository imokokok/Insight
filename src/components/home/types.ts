import type { OracleProvider } from '@/types/oracle';

export interface AssetConsensusData {
  symbol: string;
  consensusPrice: number;
  priceRange: { min: number; max: number; spreadPercent: number };
  providerCount: number;
  totalProviders: number;
  lastUpdatedAt: number;
  sources: Array<{ provider: OracleProvider; price: number; timestamp: number; color: string }>;
}
