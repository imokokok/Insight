import { type OracleProvider } from '@/types/oracle';

export type HealthStatus = 'safe' | 'warning' | 'critical' | 'liquidated';

export interface PricePoint {
  deviationPercent: number;
  collateralPrice: number;
  collateralValue: number;
  borrowValue: number;
  collateralRatio: number;
  healthFactor: number;
  status: HealthStatus;
  statusLabel: string;
}

// Single asset entry
export interface AssetEntry {
  symbol: string;
  amount: number;
}

// Position input: supports multiple collaterals + multiple borrows
export interface PositionInput {
  protocolId: string;
  collaterals: AssetEntry[];
  borrows: AssetEntry[];
  // Backward compatible: single-asset mode
  collateralSymbol?: string;
  collateralAmount?: number;
  borrowSymbol?: string;
  borrowAmount?: number;
}

// Per-asset deviation analysis result
export interface AssetDeviationResult {
  symbol: string;
  currentPrice: number;
  criticalDeviationPercent: number;
  criticalPrice: number;
  direction: 'down' | 'up';
  description: string;
}

// Safety buffer analysis
export interface SafetyBufferAnalysis {
  overallLevel: 'safe' | 'moderate' | 'risky' | 'dangerous';
  // Effective safety buffer after subtracting oracle deviation (the real safety check value)
  bufferPercent: number;
  // Theoretical liquidation buffer without considering oracle deviation
  theoreticalBufferPercent: number;
  // Average oracle deviation from consensus across providers used by this position
  oracleAvgDeviationPercent: number;
  // Live depeg/peg risk from 15-minute stablecoin and wrapped asset tracking
  liveDepegRiskPercent: number;
  // Per-asset breakdown of live deviations (symbol → absolute deviation %)
  liveDepegBreakdown: Record<string, number>;
  description: string;
  recommendations: string[];
}

export interface OracleWarning {
  provider: OracleProvider;
  overallScore: number;
  freshnessScore: number;
  reliabilityScore: number;
  avgDeviationPct: number;
  level: 'healthy' | 'fair' | 'degraded' | 'critical';
  message: string;
  /** One-sentence explanation of how this oracle issue affects the user's position. */
  impact: string;
  /** Symbols in the user's position that rely on this provider. */
  affectedSymbols: string[];
}

// ─── Fixed Deviation Scenarios (1% / 3% / 5%) ───

export interface DeviationScenario {
  label: string;
  deviationPercent: number;
  isJoint: boolean;
  healthFactor: number;
  collateralRatio: number;
  status: 'safe' | 'warning' | 'critical' | 'liquidated';
  distanceToLiquidationPercent: number;
}

// ─── Safety Parameter Planning (inverse parameter solver) ───

/** Action type for position adjustments */
export type AdjustmentAction =
  | 'add_collateral' // add more collateral
  | 'repay_borrow' // repay debt
  | 'withdraw_collateral'; // withdraw collateral when buffer is sufficient

/** Adjustment suggestion for a single asset */
export interface AssetAdjustment {
  symbol: string;
  action: AdjustmentAction;
  currentAmount: number;
  targetAmount: number; // target holding after adjustment
  deltaAmount: number; // amount to change (positive = add/withdraw, negative = repay/reduce)
  deltaValueUsd: number; // USD value of the change
  currentPrice: number;
  direction: 'down' | 'up' | 'none'; // direction of this asset in the deviation scenario
}

/** Result of the inverse parameter solver */
export interface SafetyParameterPlan {
  // User input
  targetDeviationPercent: number; // user-specified target deviation δ (major-equivalent, e.g. 15 means 15%)

  // Per-asset deviation breakdown (per-asset δ_i = targetDeviationPercent × ratio_i / 100)
  // Keyed by symbol. Used by UI to show per-asset δ and by the planner for per-asset worst-case.
  perAssetDeviationPercents: Record<string, number>;

  // Derived targets
  targetHealthFactor: number; // nominal (1+δ)/(1−δ) assuming all assets deviate by δ (intuition only)
  targetCollateralRatio: number; // targetHF × liquidationRatio
  currentHealthFactor: number; // current HF (redundant, for UI comparison)
  currentWorstCaseHF: number; // actual worst-case HF under per-asset δ (the real decision metric)

  // Whether adjustment is required
  needsAdjustment: boolean; // true when currentWorstCaseHF < 1
  gapPercent: number; // worst-case HF shortfall = (1 − currentWorstCaseHF) × 100

  // Three mutually exclusive adjustment plans (UI can switch between them)
  plans: {
    addCollateral: {
      adjustments: AssetAdjustment[]; // suggested collateral additions sorted by efficiency
      totalDeltaValueUsd: number;
      description: string;
    };
    repayBorrow: {
      adjustments: AssetAdjustment[]; // suggested debt repayments
      totalDeltaValueUsd: number;
      description: string;
    };
    withdrawable?: {
      adjustments: AssetAdjustment[]; // collateral that can be safely withdrawn
      totalDeltaValueUsd: number;
      description: string;
    };
  };

  // Scenario verification: worst-case HF after applying the suggested adjustment
  projectedWorstCaseHF: number;

  lastUpdated: number;
}

export interface PositionCriticalResult {
  protocolId: string;
  protocolName: string;
  chain: string;

  // Multi-asset position info
  collaterals: Array<{
    symbol: string;
    amount: number;
    price: number;
    value: number;
    collateralFactor: number;
    liquidationThreshold: number;
    exchangeRate: number;
  }>;
  borrows: Array<{
    symbol: string;
    amount: number;
    price: number;
    value: number;
  }>;

  // Summary
  totalCollateralValue: number;
  // raw collateral value: Σ(exchRt * price * amount), NOT discounted by collateralFactor
  // HF = (totalAdjustedCollateralValue / totalBorrowValue) / liquidationRatio
  //   - Aave V3: HF = (collateral × LT%) / debt, liquidationThreshold = 1/LT%
  //   - Compound V2: HF = (collateral × CF) / debt, liquidationThreshold = 1/CF
  totalAdjustedCollateralValue: number;
  totalBorrowValue: number;
  currentCollateralRatio: number; // totalBorrowValue > 0 ? totalAdjustedCollateralValue / totalBorrowValue : Infinity
  currentHealthFactor: number;

  // Per-asset critical deviations (bidirectional, single-asset ceteris paribus)
  assetDeviations: AssetDeviationResult[];

  // Joint deviation: all collaterals drop δ and all borrows rise δ simultaneously (OVer-style worst case)
  jointDeviation: AssetDeviationResult;

  // Per-asset deviation ratios (relative to major=1.0), keyed by symbol
  // Used by UI to show per-asset δ breakdown and by safety planner for per-asset worst-case
  deviationRatios: Record<string, number>;

  // The most dangerous deviation (smallest absolute critical deviation, considering both single & joint)
  worstDeviation: AssetDeviationResult;

  // Price sampling points (based on worst deviation)
  pricePoints: PricePoint[];

  // Safety buffer analysis
  safetyBuffer: SafetyBufferAnalysis;

  // Oracle reliability warnings
  oracleWarnings: OracleWarning[];

  // Fixed deviation scenarios (1% / 3% / 5%) for user-friendly risk assessment
  deviationScenarios: DeviationScenario[];

  lastUpdated: number;

  // Backward compatible fields
  collateralSymbol: string;
  collateralAmount: number;
  collateralPrice: number;
  borrowSymbol: string;
  borrowAmount: number;
  borrowPrice: number;
  liquidationThreshold: number;
  criticalDeviationPercent: number;
  criticalCollateralPrice: number;
}

export interface PriceLookup {
  provider: OracleProvider;
  symbol: string;
  price: number;
  timestamp: number;
}
