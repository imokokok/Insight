export interface PriceStats {
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviationPercent: number;
}

export interface ExtendedPriceStats extends PriceStats {
  medianPrice: number;
  weightedAvgPrice: number;
  variance: number;
  standardDeviation: number;
  validPrices: number[];
}

export interface UserProfile {
  id: string;
  email?: string;
  display_name: string | null;
  avatar_url?: string | null;
  preferences?: Record<string, unknown>;
  created_at?: string | Date;
  updated_at?: string | Date;
}
