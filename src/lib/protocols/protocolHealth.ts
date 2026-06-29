import { CATEGORY_DEVIATION_RATIOS } from '@/lib/protocols/protocolRegistry';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider } from '@/types/oracle';

const logger = createLogger('protocol-health');

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

// ─── Safety Parameter Planning (反向求参数) ───

/** 调整动作类型 */
export type AdjustmentAction =
  | 'add_collateral' // 追加抵押品
  | 'repay_borrow' // 偿还借贷
  | 'withdraw_collateral'; // 可提取抵押品（缓冲充足时）

/** 单个资产的调整建议 */
export interface AssetAdjustment {
  symbol: string;
  action: AdjustmentAction;
  currentAmount: number;
  targetAmount: number; // 调整后该资产应有数量
  deltaAmount: number; // 需要变动的量（正数=追加/提取，负数=偿还/减少）
  deltaValueUsd: number; // 变动量的美元价值
  currentPrice: number;
  direction: 'down' | 'up' | 'none'; // 该资产在偏差场景中的方向
}

/** 反向求参数的结果 */
export interface SafetyParameterPlan {
  // 用户输入
  targetDeviationPercent: number; // 用户设定的目标偏差 δ（major-equivalent，如 15 表示 15%）

  // Per-asset deviation breakdown (per-asset δ_i = targetDeviationPercent × ratio_i / 100)
  // Keyed by symbol. Used by UI to show per-asset δ and by the planner for per-asset worst-case.
  perAssetDeviationPercents: Record<string, number>;

  // 推导出的目标值
  targetHealthFactor: number; // 名义 (1+δ)/(1−δ)，假设所有资产同 δ（仅用于显示直觉）
  targetCollateralRatio: number; // targetHF × weightedLT
  currentHealthFactor: number; // 当前 HF（冗余，方便前端展示对比）
  currentWorstCaseHF: number; // 当前头寸在 per-asset δ 最坏情况下的 HF（实际判断依据）

  // 是否需要调整
  needsAdjustment: boolean; // currentWorstCaseHF < 1 时为 true
  gapPercent: number; // 最坏情况 HF 缺口 = (1 − currentWorstCaseHF) × 100

  // 三种调整方案（互斥，前端可切换展示）
  plans: {
    addCollateral: {
      adjustments: AssetAdjustment[]; // 建议追加的抵押品（按贡献效率排序）
      totalDeltaValueUsd: number;
      description: string;
    };
    repayBorrow: {
      adjustments: AssetAdjustment[]; // 建议偿还的借贷（按利率/优先级排序）
      totalDeltaValueUsd: number;
      description: string;
    };
    withdrawable?: {
      adjustments: AssetAdjustment[]; // 可安全提取的抵押品
      totalDeltaValueUsd: number;
      description: string;
    };
  };

  // 场景验证：按建议调整后，在最坏偏差下的 HF
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
  // HF = (totalAdjustedCollateralValue / totalBorrowValue) / weightedLT
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

interface PriceLookup {
  provider: OracleProvider;
  symbol: string;
  price: number;
  timestamp: number;
}

/**
 * Normalize PositionInput: convert legacy single-asset format to multi-asset format
 */
function normalizeInput(input: PositionInput): {
  collaterals: AssetEntry[];
  borrows: AssetEntry[];
} {
  if (input.collaterals && input.collaterals.length > 0) {
    return { collaterals: input.collaterals, borrows: input.borrows };
  }
  // Backward compatible single-asset mode
  const collaterals: AssetEntry[] = [];
  const borrows: AssetEntry[] = [];
  if (input.collateralSymbol && input.collateralAmount && input.collateralAmount > 0) {
    collaterals.push({ symbol: input.collateralSymbol, amount: input.collateralAmount });
  }
  if (input.borrowSymbol && input.borrowAmount && input.borrowAmount > 0) {
    borrows.push({ symbol: input.borrowSymbol, amount: input.borrowAmount });
  }
  return { collaterals, borrows };
}

export async function calculatePositionCriticalDeviation(
  input: PositionInput,
  fetchPrices: (queries: { provider: OracleProvider; symbol: string }[]) => Promise<PriceLookup[]>,
  oracleWarnings?: OracleWarning[]
): Promise<PositionCriticalResult> {
  const startTime = Date.now();

  try {
    const { getProtocolById } = await import('./protocolRegistry');
    const protocol = getProtocolById(input.protocolId);

    if (!protocol) {
      throw new Error(`Protocol not found: ${input.protocolId}`);
    }

    const { collaterals, borrows } = normalizeInput(input);

    if (collaterals.length === 0) {
      throw new Error('At least one collateral asset is required');
    }
    if (borrows.length === 0) {
      throw new Error('At least one borrow asset is required');
    }

    // Collect all symbols to query
    const allSymbols = new Set<string>();
    collaterals.forEach((c) => allSymbols.add(c.symbol));
    borrows.forEach((b) => allSymbols.add(b.symbol));

    // Look up asset config for each symbol
    const assetConfigs = new Map<string, (typeof protocol.assets)[number]>();
    for (const symbol of allSymbols) {
      const asset = protocol.assets.find((a) => a.symbol === symbol);
      if (!asset) {
        throw new Error(`Asset ${symbol} not supported in ${protocol.name}`);
      }
      assetConfigs.set(symbol, asset);
    }

    // Build per-asset deviation ratios from asset categories
    // Key: symbol → ratio (relative to major=1.0)
    const deviationRatios: Record<string, number> = {};
    for (const symbol of allSymbols) {
      const config = assetConfigs.get(symbol)!;
      deviationRatios[symbol] = CATEGORY_DEVIATION_RATIOS[config.category] ?? 1.0;
    }

    // Fetch live prices
    // Use priceSymbol (if defined) for price lookup, e.g. iSUPRA → SUPRA, iUSDC → USDC
    const priceQueries = Array.from(allSymbols).map((symbol) => {
      const config = assetConfigs.get(symbol)!;
      return {
        provider: config.oracleProvider,
        symbol: config.priceSymbol ?? symbol,
      };
    });

    const prices = await fetchPrices(priceQueries);

    const priceMap = new Map<string, number>();
    for (let i = 0; i < prices.length; i++) {
      const p = prices[i];
      if (p.price > 0) {
        // Map price back to the original asset symbol (e.g. SUPRA price → iSUPRA entry)
        const originalSymbol = Array.from(allSymbols)[i];
        priceMap.set(originalSymbol, p.price);
      }
    }

    // Verify all prices are available
    for (const symbol of allSymbols) {
      if (!priceMap.has(symbol) || (priceMap.get(symbol) ?? 0) <= 0) {
        throw new Error(`Failed to fetch price for ${symbol}`);
      }
    }

    // Calculate current position state
    // HF = (rawCollateral / borrow) / weightedLT
    //   - Aave V3: HF = (collateral × LT%) / debt, liquidationThreshold = 1/LT%
    //   - Compound V2: HF = (collateral × CF) / debt, liquidationThreshold = 1/CF
    // collateralFactor (LTV) is NOT used in HF — it only governs borrowing capacity
    const collateralDetails: PositionCriticalResult['collaterals'] = [];
    let totalAdjustedCollateralValue = 0; // raw collateral value (no CF discount)

    for (const c of collaterals) {
      const config = assetConfigs.get(c.symbol)!;
      const price = priceMap.get(c.symbol)!;
      const rawValue = config.exchangeRate * price * c.amount;

      collateralDetails.push({
        symbol: c.symbol,
        amount: c.amount,
        price,
        value: rawValue,
        collateralFactor: config.collateralFactor,
        liquidationThreshold: config.liquidationThreshold,
        exchangeRate: config.exchangeRate,
      });

      totalAdjustedCollateralValue += rawValue;
    }

    const borrowDetails: PositionCriticalResult['borrows'] = [];
    let totalBorrowValue = 0;

    for (const b of borrows) {
      const price = priceMap.get(b.symbol)!;
      const value = price * b.amount;

      borrowDetails.push({
        symbol: b.symbol,
        amount: b.amount,
        price,
        value,
      });

      totalBorrowValue += value;
    }

    const totalCollateralValue = totalAdjustedCollateralValue;

    // Weighted average liquidation threshold (weighted by raw collateral value)
    const weightedLiquidationThreshold =
      totalAdjustedCollateralValue > 0
        ? collateralDetails.reduce(
            (sum, c) => sum + c.exchangeRate * c.price * c.amount * c.liquidationThreshold,
            0
          ) / totalAdjustedCollateralValue
        : 1;

    const currentCollateralRatio =
      totalBorrowValue > 0 ? totalAdjustedCollateralValue / totalBorrowValue : Infinity;
    const currentHealthFactor =
      weightedLiquidationThreshold > 0
        ? currentCollateralRatio / weightedLiquidationThreshold
        : Infinity;

    // Calculate per-asset critical deviations (bidirectional, single-asset ceteris paribus)
    const assetDeviations = calculateAssetDeviations(
      collateralDetails,
      borrowDetails,
      totalAdjustedCollateralValue,
      totalBorrowValue,
      weightedLiquidationThreshold
    );

    // Joint deviation: all collaterals drop and all borrows rise simultaneously (OVer-style)
    // Per-asset δ scaled by category ratio (enhancement 1)
    const jointDeviation = calculateJointDeviation(
      collateralDetails,
      borrowDetails,
      deviationRatios,
      totalAdjustedCollateralValue,
      totalBorrowValue,
      weightedLiquidationThreshold
    );

    // Find the most dangerous deviation (smallest absolute value, considering single & joint)
    const allDeviations = [...assetDeviations, jointDeviation];
    const worstDeviation = allDeviations.reduce((worst, curr) =>
      Math.abs(curr.criticalDeviationPercent) < Math.abs(worst.criticalDeviationPercent)
        ? curr
        : worst
    );

    // Worst single-asset deviation (for chart/heatmap visualization, which is single-asset by nature)
    const worstSingleAssetDeviation =
      assetDeviations.length > 0
        ? assetDeviations.reduce((worst, curr) =>
            Math.abs(curr.criticalDeviationPercent) < Math.abs(worst.criticalDeviationPercent)
              ? curr
              : worst
          )
        : jointDeviation;

    // Generate adaptive price sampling points (based on worst single-asset deviation for visualization)
    const pricePoints = generateAdaptivePricePoints(
      worstSingleAssetDeviation,
      collateralDetails,
      borrowDetails,
      totalBorrowValue,
      weightedLiquidationThreshold
    );

    // Safety buffer analysis
    const safetyBuffer = analyzeSafetyBuffer(
      worstDeviation,
      currentHealthFactor,
      assetDeviations,
      oracleWarnings ?? []
    );

    // Fixed deviation scenarios (1% / 3% / 5%) for user-friendly risk assessment
    const deviationScenarios = calculateDeviationScenarios(
      collateralDetails,
      borrowDetails,
      deviationRatios,
      totalAdjustedCollateralValue,
      totalBorrowValue,
      weightedLiquidationThreshold
    );

    // Backward compatible fields
    const primaryCollateral = collateralDetails[0];
    const primaryBorrow = borrowDetails[0];

    logger.info(
      `Position critical deviation calculated for ${protocol.id}: ${worstDeviation.criticalDeviationPercent.toFixed(2)}%`,
      { durationMs: Date.now() - startTime }
    );

    return {
      protocolId: protocol.id,
      protocolName: protocol.name,
      chain: protocol.chain,
      collaterals: collateralDetails,
      borrows: borrowDetails,
      totalCollateralValue: Number(totalCollateralValue.toFixed(4)),
      totalAdjustedCollateralValue: Number(totalAdjustedCollateralValue.toFixed(4)),
      totalBorrowValue: Number(totalBorrowValue.toFixed(4)),
      currentCollateralRatio: Number(
        (currentCollateralRatio === Infinity ? 0 : currentCollateralRatio).toFixed(4)
      ),
      currentHealthFactor: Number(
        (currentHealthFactor === Infinity ? 0 : currentHealthFactor).toFixed(4)
      ),
      assetDeviations,
      jointDeviation,
      deviationRatios,
      worstDeviation,
      pricePoints,
      safetyBuffer,
      oracleWarnings: oracleWarnings ?? [],
      deviationScenarios,
      lastUpdated: Date.now(),
      // Backward compatible
      collateralSymbol: primaryCollateral.symbol,
      collateralAmount: primaryCollateral.amount,
      collateralPrice: primaryCollateral.price,
      borrowSymbol: primaryBorrow.symbol,
      borrowAmount: primaryBorrow.amount,
      borrowPrice: primaryBorrow.price,
      liquidationThreshold: Number(weightedLiquidationThreshold.toFixed(4)),
      criticalDeviationPercent: Number(worstDeviation.criticalDeviationPercent.toFixed(4)),
      // Use worst single-asset deviation's critical price (JOINT has criticalPrice=0, invalid for chart)
      criticalCollateralPrice: Number(worstSingleAssetDeviation.criticalPrice.toFixed(4)),
    };
  } catch (error) {
    logger.error(
      `Failed to calculate position critical deviation`,
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

/**
 * Calculate per-asset critical deviations (bidirectional, single-asset ceteris paribus)
 * OVer paper core: liquidation triggers when rawCollateral / borrow = liquidationThreshold
 *
 * For collateral price drop: solve (exchRt * P_new * amount + otherColl) / borrowValue = LT
 * For borrow price rise: solve rawCollateral / (P_new * amount + otherBorrow) = LT
 */
function calculateAssetDeviations(
  collaterals: PositionCriticalResult['collaterals'],
  borrows: PositionCriticalResult['borrows'],
  totalAdjustedCollateralValue: number,
  totalBorrowValue: number,
  weightedLiquidationThreshold: number
): AssetDeviationResult[] {
  const results: AssetDeviationResult[] = [];

  // Critical deviation for collateral price drops
  for (const c of collaterals) {
    // Current raw value of this collateral
    const currentRawValue = c.exchangeRate * c.price * c.amount;
    // Raw value of other collaterals
    const otherCollateral = totalAdjustedCollateralValue - currentRawValue;

    // Liquidation condition: otherColl + exchRt * P_critical * amount = LT * borrowValue
    // P_critical = (LT * borrowValue - otherColl) / (exchRt * amount)
    const numerator = weightedLiquidationThreshold * totalBorrowValue - otherCollateral;
    const denominator = c.exchangeRate * c.amount;

    if (denominator <= 0) continue;

    const criticalPrice = numerator / denominator;
    const criticalDeviationPercent = c.price > 0 ? (criticalPrice / c.price - 1) * 100 : 0;

    // Only the drop direction is meaningful (critical price < current price)
    if (criticalPrice < c.price) {
      results.push({
        symbol: c.symbol,
        currentPrice: c.price,
        criticalDeviationPercent: Number(criticalDeviationPercent.toFixed(4)),
        criticalPrice: Number(criticalPrice.toFixed(4)),
        direction: 'down',
        description: `${c.symbol} drops ${Math.abs(criticalDeviationPercent).toFixed(2)}% to $${criticalPrice.toFixed(2)} triggers liquidation`,
      });
    } else {
      // Already below liquidation line or critical price above current (cannot trigger via this asset dropping)
      results.push({
        symbol: c.symbol,
        currentPrice: c.price,
        criticalDeviationPercent: Number(criticalDeviationPercent.toFixed(4)),
        criticalPrice: Number(criticalPrice.toFixed(4)),
        direction: 'down',
        description: `${c.symbol} dropping alone cannot trigger liquidation (protected by other collaterals)`,
      });
    }
  }

  // Critical deviation for borrow price rises
  for (const b of borrows) {
    const currentBorrowValue = b.price * b.amount;
    const otherBorrowValue = totalBorrowValue - currentBorrowValue;

    // Liquidation condition: adjustedColl / (P_critical * amount + otherBorrow) = LT
    // P_critical = (adjustedColl / LT - otherBorrow) / amount
    const numerator =
      totalAdjustedCollateralValue / weightedLiquidationThreshold - otherBorrowValue;
    const denominator = b.amount;

    if (denominator <= 0) continue;

    const criticalPrice = numerator / denominator;
    const criticalDeviationPercent = b.price > 0 ? (criticalPrice / b.price - 1) * 100 : 0;

    // Only the rise direction is meaningful (critical price > current price)
    if (criticalPrice > b.price) {
      results.push({
        symbol: b.symbol,
        currentPrice: b.price,
        criticalDeviationPercent: Number(criticalDeviationPercent.toFixed(4)),
        criticalPrice: Number(criticalPrice.toFixed(4)),
        direction: 'up',
        description: `${b.symbol} rises ${criticalDeviationPercent.toFixed(2)}% to $${criticalPrice.toFixed(2)} triggers liquidation`,
      });
    } else {
      results.push({
        symbol: b.symbol,
        currentPrice: b.price,
        criticalDeviationPercent: Number(criticalDeviationPercent.toFixed(4)),
        criticalPrice: Number(criticalPrice.toFixed(4)),
        direction: 'up',
        description: `${b.symbol} rising alone cannot trigger liquidation`,
      });
    }
  }

  return results;
}

/**
 * Calculate joint deviation: all collaterals drop and all borrows rise simultaneously.
 * This is the OVer paper's core insight — oracles can deviate together, not just one at a time.
 *
 * Per-asset differentiated deviation (enhancement 1):
 *   Each asset's deviation is scaled by its category ratio relative to major (1.0):
 *     δ_i = k × ratio_i
 *   where k is the major-equivalent deviation scalar (binary-searched).
 *   - stablecoin: k × 0.2  (depeg-scale)
 *   - major:      k × 1.0  (baseline)
 *   - alt:        k × 2.0
 *   - micro:      k × 3.33
 *
 * Liquidation condition (worst case):
 *   [Σ(exchRt × P_coll × (1 − k × ratio_i) × amount)] / [Σ(P_brw × (1 + k × ratio_j) × amount)] = LT
 *
 * Solving for k via binary search; the reported criticalDeviationPercent is k × 100
 * (major-equivalent), so users interpret it on the major-asset scale.
 */
function calculateJointDeviation(
  collaterals: PositionCriticalResult['collaterals'],
  borrows: PositionCriticalResult['borrows'],
  deviationRatios: Record<string, number>,
  totalAdjustedCollateralValue: number,
  totalBorrowValue: number,
  weightedLiquidationThreshold: number
): AssetDeviationResult {
  // Edge case: no borrow or no collateral — cannot be liquidated via deviation
  if (
    totalBorrowValue <= 0 ||
    totalAdjustedCollateralValue <= 0 ||
    weightedLiquidationThreshold <= 0
  ) {
    return {
      symbol: 'JOINT',
      currentPrice: 0,
      criticalDeviationPercent: Infinity,
      criticalPrice: 0,
      direction: 'down',
      description: 'No joint deviation risk (insufficient position data)',
    };
  }

  // If already liquidated at k=0, return 0
  const currentHF = totalAdjustedCollateralValue / totalBorrowValue / weightedLiquidationThreshold;
  if (currentHF < 1) {
    return {
      symbol: 'JOINT',
      currentPrice: 0,
      criticalDeviationPercent: 0,
      criticalPrice: 0,
      direction: 'down',
      description: 'Position already liquidated (joint deviation 0%)',
    };
  }

  // Upper bound for k: ensure k × ratio_i < 1 for every asset (so values stay positive)
  const allRatios = [
    ...collaterals.map((c) => deviationRatios[c.symbol] ?? 1.0),
    ...borrows.map((b) => deviationRatios[b.symbol] ?? 1.0),
  ];
  const maxK = Math.min(...allRatios.map((r) => (r > 0 ? 1 / r : 1))) * 0.999;

  // Binary search for the critical k where HF(k) = 1
  // HF(k) = [Σ collValue × (1 − k × ratio_coll)] / [Σ borrowValue × (1 + k × ratio_brw)] / LT
  let lo = 0;
  let hi = maxK;

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const worstColl = collaterals.reduce((sum, c) => {
      const ratio = deviationRatios[c.symbol] ?? 1.0;
      const mult = Math.max(0, 1 - mid * ratio);
      return sum + c.exchangeRate * c.price * c.amount * mult;
    }, 0);
    const worstBorrow = borrows.reduce((sum, b) => {
      const ratio = deviationRatios[b.symbol] ?? 1.0;
      const mult = 1 + mid * ratio;
      return sum + b.price * b.amount * mult;
    }, 0);
    const hf = worstBorrow > 0 ? worstColl / worstBorrow / weightedLiquidationThreshold : Infinity;
    if (hf < 1) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  const criticalK = lo; // major-equivalent δ (since major ratio = 1.0)
  const criticalDeviationPercent = criticalK * 100;

  // Build description with per-asset δ breakdown
  const collBreakdown = collaterals
    .map((c) => {
      const ratio = deviationRatios[c.symbol] ?? 1.0;
      const assetDelta = criticalK * ratio * 100;
      return `${c.symbol} −${assetDelta.toFixed(2)}%`;
    })
    .join(', ');
  const brwBreakdown = borrows
    .map((b) => {
      const ratio = deviationRatios[b.symbol] ?? 1.0;
      const assetDelta = criticalK * ratio * 100;
      return `${b.symbol} +${assetDelta.toFixed(2)}%`;
    })
    .join(', ');

  return {
    symbol: 'JOINT',
    currentPrice: 0,
    criticalDeviationPercent: Number(criticalDeviationPercent.toFixed(4)),
    criticalPrice: 0,
    direction: 'down',
    description: `Joint deviation triggers liquidation (major-equiv δ = ${criticalDeviationPercent.toFixed(2)}%): collaterals [${collBreakdown}], borrows [${brwBreakdown}]`,
  };
}

/**
 * Calculate fixed deviation scenarios (1% / 3% / 5%) for user-friendly risk assessment.
 * For each fixed percentage we compute both:
 *   1) single-asset drop of the primary collateral
 *   2) joint deviation where all collaterals drop and all borrows rise (scaled by category ratio)
 */
function calculateDeviationScenarios(
  collaterals: PositionCriticalResult['collaterals'],
  borrows: PositionCriticalResult['borrows'],
  deviationRatios: Record<string, number>,
  totalAdjustedCollateralValue: number,
  totalBorrowValue: number,
  weightedLiquidationThreshold: number
): DeviationScenario[] {
  const scenarios: DeviationScenario[] = [];
  const fixedPercents = [1, 3, 5];

  const primaryCollateral = collaterals[0];
  if (primaryCollateral) {
    for (const pct of fixedPercents) {
      const dropRatio = pct / 100;
      const newCollateralValue = totalAdjustedCollateralValue * (1 - dropRatio);
      const newRatio = totalBorrowValue > 0 ? newCollateralValue / totalBorrowValue : Infinity;
      const hf =
        weightedLiquidationThreshold > 0 ? newRatio / weightedLiquidationThreshold : Infinity;
      scenarios.push(
        buildDeviationScenario(
          `${primaryCollateral.symbol} -${pct}%`,
          -pct,
          false,
          hf,
          newRatio,
          weightedLiquidationThreshold
        )
      );
    }
  }

  for (const pct of fixedPercents) {
    const k = pct / 100;
    const worstColl = collaterals.reduce((sum, c) => {
      const ratio = deviationRatios[c.symbol] ?? 1.0;
      const mult = Math.max(0, 1 - k * ratio);
      return sum + c.exchangeRate * c.price * c.amount * mult;
    }, 0);
    const worstBorrow = borrows.reduce((sum, b) => {
      const ratio = deviationRatios[b.symbol] ?? 1.0;
      const mult = 1 + k * ratio;
      return sum + b.price * b.amount * mult;
    }, 0);
    const newRatio = worstBorrow > 0 ? worstColl / worstBorrow : Infinity;
    const hf =
      weightedLiquidationThreshold > 0 ? newRatio / weightedLiquidationThreshold : Infinity;
    scenarios.push(
      buildDeviationScenario(
        `Joint -${pct}%`,
        -pct,
        true,
        hf,
        newRatio,
        weightedLiquidationThreshold
      )
    );
  }

  return scenarios;
}

function buildDeviationScenario(
  label: string,
  deviationPercent: number,
  isJoint: boolean,
  healthFactor: number,
  collateralRatio: number,
  weightedLiquidationThreshold: number
): DeviationScenario {
  let status: DeviationScenario['status'] = 'safe';
  if (healthFactor < 1) status = 'liquidated';
  else if (healthFactor < 1.05) status = 'critical';
  else if (healthFactor < 1.2) status = 'warning';

  const distanceToLiquidationPercent =
    isFinite(collateralRatio) && collateralRatio >= weightedLiquidationThreshold
      ? (collateralRatio / weightedLiquidationThreshold - 1) * 100
      : 0;

  return {
    label,
    deviationPercent,
    isJoint,
    healthFactor: Number(healthFactor.toFixed(4)),
    collateralRatio: Number(collateralRatio.toFixed(4)),
    status,
    distanceToLiquidationPercent: Number(Math.max(0, distanceToLiquidationPercent).toFixed(2)),
  };
}

/**
 * Generate adaptive price sampling points
 * Dense sampling near critical value, sparse sampling far from it
 */
function generateAdaptivePricePoints(
  worstDeviation: AssetDeviationResult,
  collaterals: PositionCriticalResult['collaterals'],
  borrows: PositionCriticalResult['borrows'],
  totalBorrowValue: number,
  weightedLiquidationThreshold: number
): PricePoint[] {
  const points: PricePoint[] = [];
  const criticalDeviation = worstDeviation.criticalDeviationPercent;
  const absCritical = Math.abs(criticalDeviation);

  // Dynamically generate deviation sampling points
  const deviationPoints: number[] = [0]; // Current price

  if (worstDeviation.direction === 'down') {
    // Collateral drop scenario
    const maxDeviation = Math.max(absCritical * 1.3, 5); // Extend at least to -5%
    const step = absCritical > 30 ? 5 : absCritical > 15 ? 2 : absCritical > 5 ? 1 : 0.5;

    // From 0 to critical: sparse
    for (let d = -step; d > criticalDeviation + step; d -= step) {
      deviationPoints.push(d);
    }

    // Near critical: dense sampling (every 0.5% within ±2% range)
    const fineStep = 0.5;
    for (let d = criticalDeviation - 2; d <= criticalDeviation + 2; d += fineStep) {
      deviationPoints.push(d);
    }

    // Beyond critical: sparse sampling to maxDeviation
    for (let d = criticalDeviation - step; d >= -maxDeviation; d -= step) {
      deviationPoints.push(d);
    }

    // Add a few points above
    deviationPoints.push(2, 5);
  } else {
    // Borrow rise scenario
    const maxDeviation = Math.max(absCritical * 1.3, 5);
    const step = absCritical > 30 ? 5 : absCritical > 15 ? 2 : absCritical > 5 ? 1 : 0.5;

    // Add a few points below
    deviationPoints.push(-2, -5);

    // From 0 to critical
    for (let d = step; d < criticalDeviation - step; d += step) {
      deviationPoints.push(d);
    }

    // Near critical: dense sampling
    const fineStep = 0.5;
    for (let d = criticalDeviation - 2; d <= criticalDeviation + 2; d += fineStep) {
      deviationPoints.push(d);
    }

    // Beyond critical
    for (let d = criticalDeviation + step; d <= maxDeviation; d += step) {
      deviationPoints.push(d);
    }
  }

  // Deduplicate and sort (descending)
  const uniqueDeviations = Array.from(
    new Set(deviationPoints.map((d) => Number(d.toFixed(2))))
  ).sort((a, b) => b - a);

  // Find the primary collateral (asset matching worstDeviation)
  const primaryCollateral = collaterals.find((c) => c.symbol === worstDeviation.symbol);
  // If worstDeviation is a borrow asset, use the first collateral for display
  const displayCollateral = primaryCollateral ?? collaterals[0];

  for (const deviation of uniqueDeviations) {
    // Adjust calculation based on deviation direction
    let adjustedCollateralValue: number;
    let adjustedBorrowValue: number;

    if (worstDeviation.direction === 'down') {
      // Collateral price drop scenario
      const priceMultiplier = 1 + deviation / 100;
      adjustedCollateralValue = collaterals.reduce((sum, c) => {
        const isPrimary = c.symbol === worstDeviation.symbol;
        const mult = isPrimary ? priceMultiplier : 1;
        return sum + c.exchangeRate * c.price * mult * c.amount;
      }, 0);
      adjustedBorrowValue = totalBorrowValue;
    } else {
      // Borrow price rise scenario
      adjustedCollateralValue = collaterals.reduce(
        (sum, c) => sum + c.exchangeRate * c.price * c.amount,
        0
      );
      const priceMultiplier = 1 + deviation / 100;
      adjustedBorrowValue = borrows.reduce((sum, b) => {
        const isPrimary = b.symbol === worstDeviation.symbol;
        const mult = isPrimary ? priceMultiplier : 1;
        return sum + b.price * mult * b.amount;
      }, 0);
    }

    const ratio = adjustedBorrowValue > 0 ? adjustedCollateralValue / adjustedBorrowValue : 0;
    const hf = weightedLiquidationThreshold > 0 ? ratio / weightedLiquidationThreshold : 0;

    // Use primary collateral price for display
    const displayPrice = displayCollateral.price * (1 + deviation / 100);

    let status: HealthStatus;
    let statusLabel: string;

    if (hf < 1) {
      status = 'liquidated';
      statusLabel = 'Liquidated';
    } else if (hf < 1.05) {
      status = 'critical';
      statusLabel = 'On the Edge';
    } else if (hf < 1.2) {
      status = 'warning';
      statusLabel = 'Near Liquidation';
    } else {
      status = 'safe';
      statusLabel = 'Safe';
    }

    points.push({
      deviationPercent: Number(deviation.toFixed(2)),
      collateralPrice: Number(displayPrice.toFixed(2)),
      collateralValue: Number(adjustedCollateralValue.toFixed(2)),
      borrowValue: Number(adjustedBorrowValue.toFixed(2)),
      collateralRatio: Number((ratio * 100).toFixed(2)),
      healthFactor: Number(hf.toFixed(4)),
      status,
      statusLabel,
    });
  }

  return points;
}

/**
 * Safety buffer analysis
 * Evaluate the safety distance from liquidation and generate recommendations.
 *
 * Real safety check: effective buffer = theoretical liquidation buffer minus the
 * average oracle deviation from consensus. A large oracle deviation eats into
 * the apparent safety margin because the oracle price can already be off before
 * the market moves.
 */
function analyzeSafetyBuffer(
  worstDeviation: AssetDeviationResult,
  healthFactor: number,
  assetDeviations: AssetDeviationResult[],
  oracleWarnings: OracleWarning[]
): SafetyBufferAnalysis {
  const theoreticalBufferPercent = Math.abs(worstDeviation.criticalDeviationPercent);

  // Average oracle deviation across all providers used by this position
  const oracleAvgDeviationPercent =
    oracleWarnings.length > 0
      ? oracleWarnings.reduce((sum, w) => sum + w.avgDeviationPct, 0) / oracleWarnings.length
      : 0;

  // Effective (real) safety buffer after subtracting oracle inaccuracy
  const bufferPercent = Math.max(0, theoreticalBufferPercent - oracleAvgDeviationPercent);
  const recommendations: string[] = [];

  let overallLevel: SafetyBufferAnalysis['overallLevel'];
  let description: string;

  if (healthFactor < 1) {
    overallLevel = 'dangerous';
    description = 'Position is already liquidated';
    recommendations.push('Position is in liquidation state, take action immediately');
  } else if (bufferPercent < 5) {
    overallLevel = 'dangerous';
    description = `Effective safety buffer only ${bufferPercent.toFixed(2)}% after ${oracleAvgDeviationPercent.toFixed(2)}% oracle deviation`;
    recommendations.push('Strongly recommend adding collateral or reducing borrow');
    recommendations.push('Consider raising Health Factor above 1.5');
  } else if (bufferPercent < 15) {
    overallLevel = 'risky';
    description = `Thin effective safety buffer (${bufferPercent.toFixed(2)}%) after ${oracleAvgDeviationPercent.toFixed(2)}% oracle deviation`;
    recommendations.push('Recommend adding collateral to widen the safety buffer');
    recommendations.push('Monitor market volatility');
  } else if (bufferPercent < 30) {
    overallLevel = 'moderate';
    description = `Moderate effective safety buffer (${bufferPercent.toFixed(2)}%), oracle deviation ${oracleAvgDeviationPercent.toFixed(2)}%`;
    recommendations.push('Keep monitoring market changes');
  } else {
    overallLevel = 'safe';
    description = `Adequate effective safety buffer (${bufferPercent.toFixed(2)}%) after ${oracleAvgDeviationPercent.toFixed(2)}% oracle deviation`;
  }

  // Check for borrow-side risks
  const borrowDeviations = assetDeviations.filter(
    (d) => d.direction === 'up' && d.criticalDeviationPercent > 0
  );
  for (const bd of borrowDeviations) {
    if (bd.criticalDeviationPercent < 10) {
      recommendations.push(
        `${bd.symbol} rising only ${bd.criticalDeviationPercent.toFixed(2)}% triggers liquidation, watch for stablecoin depeg risk`
      );
    }
  }

  // Check multi-asset combination risks
  const dangerousDeviations = assetDeviations.filter(
    (d) => Math.abs(d.criticalDeviationPercent) < 10 && d.criticalDeviationPercent !== 0
  );
  if (dangerousDeviations.length > 1) {
    recommendations.push(
      'Multiple assets have liquidation risk in different directions, consider diversifying'
    );
  }

  return {
    overallLevel,
    bufferPercent: Number(bufferPercent.toFixed(2)),
    theoreticalBufferPercent: Number(theoreticalBufferPercent.toFixed(2)),
    oracleAvgDeviationPercent: Number(oracleAvgDeviationPercent.toFixed(2)),
    description,
    recommendations: recommendations.length > 0 ? recommendations : ['Position is in good shape'],
  };
}

/**
 * 反向求安全参数：给定目标偏差容忍度，反算需要的头寸调整
 *
 * 核心公式（OVer 论文反向应用）：
 *   清算条件 HF = 1
 *   抗 δ 偏差要求 worstHF ≥ 1
 *
 * Per-asset differentiated deviation（增强项1）：
 *   用户输入的 targetDeviationPercent 是 major-equivalent δ（k × 100）
 *   每个资产的实际 δ_i = k × ratio_i（按类别比例缩放）
 *   - stablecoin: k × 0.2  (depeg-scale)
 *   - major:      k × 1.0  (baseline)
 *   - alt:        k × 2.0
 *   - micro:      k × 3.33
 *
 *   最坏情况 HF = [Σ collValue × (1 − δ_i)] / [Σ borrowValue × (1 + δ_j)] / LT
 *
 *   名义 targetHF = (1+δ)/(1−δ) 保留用于显示直觉（假设所有资产同 δ），
 *   实际判断与调整计算使用 per-asset δ。
 *
 * @param result 已计算的正向结果（复用其中的价格、参数、头寸、deviationRatios）
 * @param targetDeviationPercent 用户目标偏差（major-equivalent 百分比，如 15 表示 15%）
 */
export function calculateSafetyParameterPlan(
  result: PositionCriticalResult,
  targetDeviationPercent: number
): SafetyParameterPlan {
  const k = targetDeviationPercent / 100; // major-equivalent δ

  // 边界保护
  if (k <= 0 || k >= 1) {
    throw new Error('Target deviation must be between 0% and 100% (exclusive)');
  }

  // 1. Per-asset δ: δ_i = k × ratio_i
  const deviationRatios = result.deviationRatios ?? {};
  const perAssetDelta: Record<string, number> = {};
  const perAssetDeviationPercents: Record<string, number> = {};
  for (const symbol of Object.keys(deviationRatios)) {
    const ratio = deviationRatios[symbol] ?? 1.0;
    perAssetDelta[symbol] = k * ratio;
    perAssetDeviationPercents[symbol] = k * ratio * 100;
  }

  // 2. 名义目标 HF（用于显示，假设所有资产同 δ=k）
  const targetHF = (1 + k) / (1 - k);
  const weightedLT = result.liquidationThreshold;
  const targetCollateralRatio = targetHF * weightedLT;

  const currentHF = result.currentHealthFactor;

  // 3. 实际最坏情况 HF（per-asset δ）
  const worstCollCurrent = result.collaterals.reduce((sum, c) => {
    const delta_i = perAssetDelta[c.symbol] ?? k;
    const mult = Math.max(0, 1 - delta_i);
    return sum + c.exchangeRate * c.price * c.amount * mult;
  }, 0);
  const worstBorrowCurrent = result.borrows.reduce((sum, b) => {
    const delta_i = perAssetDelta[b.symbol] ?? k;
    const mult = 1 + delta_i;
    return sum + b.price * b.amount * mult;
  }, 0);
  const currentWorstHF =
    worstBorrowCurrent > 0 && weightedLT > 0
      ? worstCollCurrent / worstBorrowCurrent / weightedLT
      : Infinity;

  // needsAdjustment: 当前头寸无法承受目标偏差（最坏情况 HF < 1）
  const needsAdjustment = currentWorstHF < 1;
  const gapPercent =
    currentWorstHF > 0 && isFinite(currentWorstHF) ? (1 - currentWorstHF) * 100 : Infinity;

  // 4. 方案 A：追加抵押品（per-asset δ 精确计算）
  // 对每个抵押品资产 X，求解 addedAmount 使 worstHF = 1:
  //   worstColl_new = worstCollCurrent + addedAmount × exchRt_X × price_X × (1 − δ_X)
  //   worstHF_new = worstColl_new / worstBorrowCurrent / LT = 1
  //   => addedAmount = (LT × worstBorrowCurrent − worstCollCurrent) / (exchRt_X × price_X × (1 − δ_X))
  const collGap = weightedLT * worstBorrowCurrent - worstCollCurrent; // worst-case raw value 缺口
  const needAdjustedDelta = Math.max(0, collGap);
  const addCollateralRaw = result.collaterals.map((c) => {
    const delta_i = perAssetDelta[c.symbol] ?? k;
    // 每单位抵押在 worst-case 下的贡献（raw value）
    const efficiency = c.exchangeRate * c.price * Math.max(0.0001, 1 - delta_i);
    const deltaAmount = efficiency > 0 ? needAdjustedDelta / efficiency : 0;
    const adjustment: AssetAdjustment = {
      symbol: c.symbol,
      action: 'add_collateral',
      currentAmount: c.amount,
      targetAmount: c.amount + deltaAmount,
      deltaAmount,
      deltaValueUsd: deltaAmount * c.price * c.exchangeRate,
      currentPrice: c.price,
      direction: 'down',
    };
    return { adjustment, efficiency };
  });
  addCollateralRaw.sort((a, b) => b.efficiency - a.efficiency);
  const addCollateralAdjustments: AssetAdjustment[] = addCollateralRaw.map(
    (item) => item.adjustment
  );
  // addCollateralTotal：取最高效资产（排序后第一个）的当前 USD 需求量
  const addCollateralTotal = addCollateralAdjustments[0]?.deltaValueUsd ?? 0;

  // 5. 方案 B：偿还借贷（per-asset δ 精确计算）
  // 对每个借贷资产 Y，求解 repaidAmount 使 worstHF = 1:
  //   worstBorrow_new = worstBorrowCurrent − repaidAmount × price_Y × (1 + δ_Y)
  //   worstHF_new = worstCollCurrent / worstBorrow_new / LT = 1
  //   => repaidAmount = (worstBorrowCurrent − worstCollCurrent / LT) / (price_Y × (1 + δ_Y))
  const borrowGap = worstBorrowCurrent - worstCollCurrent / weightedLT;
  const needBorrowReduction = Math.max(0, borrowGap);
  const repayBorrowAdjustments: AssetAdjustment[] = result.borrows.map((b) => {
    const delta_i = perAssetDelta[b.symbol] ?? k;
    const efficiency = b.price * (1 + delta_i); // 每单位偿还减少的 worst-case borrow
    const deltaAmount = efficiency > 0 ? needBorrowReduction / efficiency : 0;
    return {
      symbol: b.symbol,
      action: 'repay_borrow' as const,
      currentAmount: b.amount,
      targetAmount: b.amount - deltaAmount,
      deltaAmount: -deltaAmount, // 负数表示减少
      deltaValueUsd: -deltaAmount * b.price,
      currentPrice: b.price,
      direction: 'up' as const,
    };
  });

  // 6. 方案 C：可提取抵押品（当 currentWorstHF > 1，缓冲充足）
  let withdrawablePlan: SafetyParameterPlan['plans']['withdrawable'];
  if (!needsAdjustment && currentWorstHF > 1) {
    // 可提取的 worst-case collateral surplus
    const surplusColl = worstCollCurrent - weightedLT * worstBorrowCurrent;
    const withdrawableAdjustments: AssetAdjustment[] = result.collaterals.map((c) => {
      const delta_i = perAssetDelta[c.symbol] ?? k;
      const efficiency = c.exchangeRate * c.price * Math.max(0.0001, 1 - delta_i);
      const deltaAmount = efficiency > 0 ? surplusColl / efficiency / result.collaterals.length : 0;
      return {
        symbol: c.symbol,
        action: 'withdraw_collateral' as const,
        currentAmount: c.amount,
        targetAmount: c.amount - deltaAmount,
        deltaAmount,
        deltaValueUsd: deltaAmount * c.price * c.exchangeRate,
        currentPrice: c.price,
        direction: 'none' as const,
      };
    });
    const totalWithdrawable = withdrawableAdjustments.reduce((s, a) => s + a.deltaValueUsd, 0);
    withdrawablePlan = {
      adjustments: withdrawableAdjustments,
      totalDeltaValueUsd: totalWithdrawable,
      description: `Current buffer exceeds target, you can safely withdraw up to $${totalWithdrawable.toFixed(2)} worth of collateral while still surviving ${targetDeviationPercent}% major-equivalent deviation`,
    };
  }

  // 7. 场景验证：按方案 A 调整后，最坏偏差下的 HF
  // 调整后 worstColl = worstCollCurrent + needAdjustedDelta（任选一资产补足缺口）
  // worstHF = (worstCollCurrent + needAdjustedDelta) / worstBorrowCurrent / LT
  const projectedWorstCaseHF =
    worstBorrowCurrent > 0 && weightedLT > 0
      ? (worstCollCurrent + needAdjustedDelta) / worstBorrowCurrent / weightedLT
      : Infinity;

  const repayBorrowTotal = Math.abs(
    repayBorrowAdjustments.reduce((s, a) => s + a.deltaValueUsd, 0)
  );

  return {
    targetDeviationPercent,
    perAssetDeviationPercents,
    targetHealthFactor: Number(targetHF.toFixed(4)),
    targetCollateralRatio: Number(targetCollateralRatio.toFixed(4)),
    currentHealthFactor: currentHF,
    currentWorstCaseHF: Number((isFinite(currentWorstHF) ? currentWorstHF : 0).toFixed(4)),
    needsAdjustment,
    gapPercent: Number((isFinite(gapPercent) ? gapPercent : 0).toFixed(2)),
    plans: {
      addCollateral: {
        adjustments: addCollateralAdjustments,
        totalDeltaValueUsd: addCollateralTotal,
        description: needsAdjustment
          ? `Need ~$${addCollateralTotal.toFixed(2)} collateral to survive ${targetDeviationPercent}% major-equiv deviation (pick ONE asset below; amount varies by asset δ)`
          : 'No additional collateral needed',
      },
      repayBorrow: {
        adjustments: repayBorrowAdjustments,
        totalDeltaValueUsd: repayBorrowTotal,
        description: needsAdjustment
          ? `Repay $${repayBorrowTotal.toFixed(2)} debt to survive ${targetDeviationPercent}% major-equiv price deviation`
          : 'No repayment needed',
      },
      withdrawable: withdrawablePlan,
    },
    projectedWorstCaseHF: Number(
      (isFinite(projectedWorstCaseHF) ? projectedWorstCaseHF : 0).toFixed(4)
    ),
    lastUpdated: Date.now(),
  };
}
