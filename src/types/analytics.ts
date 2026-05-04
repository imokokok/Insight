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

export interface RiskLevel {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskColor: string;
  hhiValue: number;
  hhiLevel: 'competitive' | 'moderate' | 'concentrated';
  diversificationScore: number;
  diversificationLevel: 'high' | 'medium' | 'low';
  volatilityIndex: number;
  volatilityLevel: 'low' | 'moderate' | 'high' | 'extreme';
  correlationScore: number;
  correlationLevel: 'low' | 'moderate' | 'high';
  highCorrelationPairs: string[];
  freshnessScore: number;
  freshnessLevel: 'fresh' | 'stale' | 'critical';
  staleOracleCount: number;
  staleOracles: string[];
  manipulationResistanceScore: number;
  manipulationResistanceLevel: 'strong' | 'moderate' | 'weak';
  manipulationResistanceFactors: string[];
  sharedDependencyScore: number;
  sharedDependencyLevel: 'low' | 'moderate' | 'high';
  sharedSourceGroups: string[];
  systemicRiskFactor: number;
  weights: Record<string, number>;
  oracleCount: number;
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
