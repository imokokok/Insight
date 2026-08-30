import { type OracleProvider } from '@/types/oracle';

export interface HourlySnapshotInput {
  snapshotHour: Date;
  provider: OracleProvider;
  symbol: string;
  chainId?: number | null;
  price: number;
  consensusPrice?: number | null;
  deviationPct?: number | null;
  latencyMs?: number | null;
  dataAgeSeconds?: number | null;
  confidence?: number | null;
  isSuccess: boolean;
  errorMessage?: string | null;
}

export interface DeviationEvent {
  provider: OracleProvider;
  symbol: string;
  hour: string;
  price: number;
  consensusPrice: number;
  deviationPct: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProviderRanking {
  provider: OracleProvider;
  totalQueries: number;
  successQueries: number;
  successRate: number;
  avgLatencyMs: number;
  avgDeviationPct: number;
  maxDeviationPct: number;
  anomalyCount: number;
  score: number;
}

export interface AssetDailyStats {
  symbol: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  avgConsensusPrice: number;
  maxDeviationPct: number;
  avgDeviationPct: number;
  volatilityPct: number;
  sampleCount: number;
}

export interface CoverageCell {
  provider: OracleProvider;
  symbol: string;
  total: number;
  success: number;
  failed: number;
  avgDeviationPct: number;
  maxDeviationPct: number;
}

export interface FailureBreakdown {
  provider: OracleProvider;
  symbol: string;
  failureCount: number;
  topError?: string;
}

export interface PreviousDayComparison {
  reportAvailable: boolean;
  successRateChangePct: number;
  avgDeviationChangePct: number;
  anomalyChangePct: number;
  failedSnapshotsChangePct: number;
}

export type RiskImpactCategory =
  | 'liquidation'
  | 'stablecoin_depeg'
  | 'wrapped_asset'
  | 'oracle_reliability'
  | 'systemic';

export type ReportRiskLevel = 'normal' | 'warning' | 'critical' | 'severe';

export interface StablecoinDepegSummary {
  symbol: string;
  maxDeviationPercent: number;
  riskLevel: ReportRiskLevel;
  affectedProtocols: string[];
}

export interface WrappedAssetPegSummary {
  symbol: string;
  maxDeviationPercent: number;
  riskLevel: ReportRiskLevel;
  affectedProtocols: string[];
}

export interface RiskImpact {
  category: RiskImpactCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  affectedEntities: string[];
  description: string;
  relatedAssets: string[];
  relatedProviders: string[];
}

export interface ProtocolLiquidationScenario {
  label: string;
  deviationPercent: number;
  isJoint: boolean;
  healthFactor: number;
  collateralRatio: number;
  status: 'safe' | 'warning' | 'critical' | 'liquidated';
  distanceToLiquidationPercent: number;
}

export interface ProtocolLiquidationRisk {
  protocolId: string;
  protocolName: string;
  chain: string;
  collaterals: Array<{ symbol: string; amount: number; price: number; value: number }>;
  borrows: Array<{ symbol: string; amount: number; price: number; value: number }>;
  totalCollateralValue: number;
  totalBorrowValue: number;
  currentHealthFactor: number;
  currentCollateralRatio: number;
  liquidationThreshold: number;
  jointCriticalDeviationPercent: number;
  worstSingleAssetDeviation: {
    symbol: string;
    criticalDeviationPercent: number;
    direction: 'down' | 'up';
  } | null;
  scenarios: ProtocolLiquidationScenario[];
}

export interface DailyReportMetrics {
  totalSnapshots: number;
  successfulSnapshots: number;
  failedSnapshots: number;
  overallSuccessRate: number;
  avgDeviationPct: number;
  maxDeviationPct: number;
  totalAnomalies: number;
  criticalEvents: number;
  highEvents: number;
  avgLatencyMs: number;
  activeProviders: number;
  activeAssets: number;
  activeHours: number;
  /**
   * ML manipulation-risk model health snapshot (build-time model status +
   * realized closed-loop accuracy). Populated by reportService when the model
   * is active; absent on reports generated before this field existed.
   */
  mlModelHealth?: {
    active: boolean;
    trainedAt: string | null;
    horizons: Array<{
      name: string;
      verified: boolean;
      auc: number | null;
      precision: number | null;
      recall: number | null;
    }>;
    /** Realized accuracy on labeled pre-trade checks (last 7 days). */
    realized: {
      labeled: number;
      positives: number;
      auc: number | null;
    } | null;
  };
}

export interface DailyReportData {
  reportDate: string;
  reportTitle: string;
  summary: string;
  recommendations: string[];
  metrics: DailyReportMetrics;
  topAssets: AssetDailyStats[];
  providerRankings: ProviderRanking[];
  deviationEvents: DeviationEvent[];
  anomalySummary: {
    total: number;
    bySeverity: Record<'low' | 'medium' | 'high' | 'critical', number>;
    byProvider: Record<string, number>;
    byAsset: Record<string, number>;
  };
  coverageMatrix: CoverageCell[];
  failureBreakdown: FailureBreakdown[];
  previousDayComparison: PreviousDayComparison;
  riskImpacts: RiskImpact[];
  protocolLiquidationRisks: ProtocolLiquidationRisk[];
  stablecoinDepeg: StablecoinDepegSummary[];
  wrappedAssetPeg: WrappedAssetPegSummary[];
}

/**
 * Lightweight summary used by the reports list view.
 * Only contains the fields the list UI actually renders,
 * avoiding transfer of large nested arrays (coverageMatrix,
 * providerRankings, topAssets, etc.).
 */
export interface ReportSummary {
  reportDate: string;
  summary: string;
  metrics: {
    criticalEvents: number;
    highEvents: number;
    overallSuccessRate: number;
    avgDeviationPct: number;
    activeProviders: number;
    activeAssets: number;
  };
  topDeviationEvent: DeviationEvent | null;
}

/** Internal row shape from the hourly_price_snapshots table */
export interface SnapshotRow {
  snapshot_hour: string;
  provider: string;
  symbol: string;
  chain_id: number;
  price: number;
  consensus_price: number | null;
  deviation_pct: number | null;
  latency_ms: number | null;
  data_age_seconds: number | null;
  confidence: number | null;
  is_success: boolean;
  error_message: string | null;
}
