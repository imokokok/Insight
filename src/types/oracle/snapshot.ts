import { type OracleProvider } from '../oracle/enums';
import { type PriceData } from '../oracle/price';

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
