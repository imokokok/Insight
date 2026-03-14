import { OracleProvider } from '../oracle/enums';
import { PriceData } from '../oracle/price';

export interface SnapshotStats {
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
}

export interface OracleSnapshot {
  id: string;
  timestamp: number;
  symbol: string;
  selectedOracles: OracleProvider[];
  priceData: PriceData[];
  stats: SnapshotStats;
}

export interface SnapshotComparisonResult {
  snapshotId: string;
  snapshotTimestamp: number;
  priceChange: {
    avgPrice: number;
    avgPricePercent: number;
    maxPrice: number;
    maxPricePercent: number;
    minPrice: number;
    minPricePercent: number;
  };
  oracleCountChange: number;
  statsChange: {
    priceRange: number;
    priceRangePercent: number;
    standardDeviationPercent: number;
    standardDeviationPercentChange: number;
    variance: number;
    variancePercent: number;
  };
}
