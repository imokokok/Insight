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
  bufferPercent: number;
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
  totalAdjustedCollateralValue: number; // sumColl: Σ(collFact * exchRt * price * amount)
  totalBorrowValue: number;
  currentCollateralRatio: number; // totalBorrowValue > 0 ? totalAdjustedCollateralValue / totalBorrowValue : Infinity
  currentHealthFactor: number;

  // Per-asset critical deviations (bidirectional)
  assetDeviations: AssetDeviationResult[];

  // The most dangerous deviation (smallest absolute critical deviation)
  worstDeviation: AssetDeviationResult;

  // Price sampling points (based on worst deviation)
  pricePoints: PricePoint[];

  // Safety buffer analysis
  safetyBuffer: SafetyBufferAnalysis;

  // Oracle reliability warnings
  oracleWarnings: OracleWarning[];

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

    // Fetch live prices
    const priceQueries = Array.from(allSymbols).map((symbol) => ({
      provider: assetConfigs.get(symbol)!.oracleProvider,
      symbol,
    }));

    const prices = await fetchPrices(priceQueries);

    const priceMap = new Map<string, number>();
    for (const p of prices) {
      if (p.price > 0) {
        priceMap.set(p.symbol, p.price);
      }
    }

    // Verify all prices are available
    for (const symbol of allSymbols) {
      if (!priceMap.has(symbol) || (priceMap.get(symbol) ?? 0) <= 0) {
        throw new Error(`Failed to fetch price for ${symbol}`);
      }
    }

    // Calculate current position state
    // sumColl = Σ (collFact_a * exchRt_a * price_a * amount_a)  — OVer paper formula (1)
    // sumBrwEfct = Σ (price_a * amount_a)                        — OVer paper formula (2) simplified
    const collateralDetails: PositionCriticalResult['collaterals'] = [];
    let totalAdjustedCollateralValue = 0;

    for (const c of collaterals) {
      const config = assetConfigs.get(c.symbol)!;
      const price = priceMap.get(c.symbol)!;
      const adjustedValue = config.collateralFactor * config.exchangeRate * price * c.amount;

      collateralDetails.push({
        symbol: c.symbol,
        amount: c.amount,
        price,
        value: price * c.amount * config.exchangeRate,
        collateralFactor: config.collateralFactor,
        liquidationThreshold: config.liquidationThreshold,
        exchangeRate: config.exchangeRate,
      });

      totalAdjustedCollateralValue += adjustedValue;
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

    const totalCollateralValue = collateralDetails.reduce((sum, c) => sum + c.value, 0);

    // Weighted average liquidation threshold
    const weightedLiquidationThreshold =
      totalAdjustedCollateralValue > 0
        ? collateralDetails.reduce(
            (sum, c) =>
              sum +
              c.collateralFactor * c.exchangeRate * c.price * c.amount * c.liquidationThreshold,
            0
          ) / totalAdjustedCollateralValue
        : 1;

    const currentCollateralRatio =
      totalBorrowValue > 0 ? totalAdjustedCollateralValue / totalBorrowValue : Infinity;
    const currentHealthFactor =
      weightedLiquidationThreshold > 0
        ? currentCollateralRatio / weightedLiquidationThreshold
        : Infinity;

    // Calculate per-asset critical deviations (bidirectional)
    const assetDeviations = calculateAssetDeviations(
      collateralDetails,
      borrowDetails,
      totalAdjustedCollateralValue,
      totalBorrowValue,
      weightedLiquidationThreshold
    );

    // Find the most dangerous deviation (smallest absolute value)
    const worstDeviation = assetDeviations.reduce((worst, curr) =>
      Math.abs(curr.criticalDeviationPercent) < Math.abs(worst.criticalDeviationPercent)
        ? curr
        : worst
    );

    // Generate adaptive price sampling points
    const pricePoints = generateAdaptivePricePoints(
      worstDeviation,
      collateralDetails,
      borrowDetails,
      totalBorrowValue,
      weightedLiquidationThreshold
    );

    // Safety buffer analysis
    const safetyBuffer = analyzeSafetyBuffer(worstDeviation, currentHealthFactor, assetDeviations);

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
      worstDeviation,
      pricePoints,
      safetyBuffer,
      oracleWarnings: oracleWarnings ?? [],
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
      criticalCollateralPrice: Number(worstDeviation.criticalPrice.toFixed(4)),
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
 * Calculate per-asset critical deviations (bidirectional)
 * OVer paper core: liquidation triggers when sumColl / sumBrwEfct = liquidationThreshold
 *
 * For collateral price drop: solve (collFact * exchRt * P_new * amount + otherColl) / borrowValue = LT
 * For borrow price rise: solve adjustedColl / (P_new * amount + otherBorrow) = LT
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
    // Current adjusted value of this collateral
    const currentAdjustedValue = c.collateralFactor * c.exchangeRate * c.price * c.amount;
    // Adjusted value of other collaterals
    const otherAdjustedCollateral = totalAdjustedCollateralValue - currentAdjustedValue;

    // Liquidation condition: otherAdjustedCollateral + collFact * exchRt * P_critical * amount = LT * borrowValue
    // P_critical = (LT * borrowValue - otherAdjustedCollateral) / (collFact * exchRt * amount)
    const numerator = weightedLiquidationThreshold * totalBorrowValue - otherAdjustedCollateral;
    const denominator = c.collateralFactor * c.exchangeRate * c.amount;

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
        return sum + c.collateralFactor * c.exchangeRate * c.price * mult * c.amount;
      }, 0);
      adjustedBorrowValue = totalBorrowValue;
    } else {
      // Borrow price rise scenario
      adjustedCollateralValue = collaterals.reduce(
        (sum, c) => sum + c.collateralFactor * c.exchangeRate * c.price * c.amount,
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
 * Evaluate the safety distance from liquidation and generate recommendations
 */
function analyzeSafetyBuffer(
  worstDeviation: AssetDeviationResult,
  healthFactor: number,
  assetDeviations: AssetDeviationResult[]
): SafetyBufferAnalysis {
  const bufferPercent = Math.abs(worstDeviation.criticalDeviationPercent);
  const recommendations: string[] = [];

  let overallLevel: SafetyBufferAnalysis['overallLevel'];
  let description: string;

  if (healthFactor < 1) {
    overallLevel = 'dangerous';
    description = 'Position is already liquidated';
    recommendations.push('Position is in liquidation state, take action immediately');
  } else if (bufferPercent < 5) {
    overallLevel = 'dangerous';
    description = `Extremely thin safety buffer, only ${bufferPercent.toFixed(2)}% deviation triggers liquidation`;
    recommendations.push('Strongly recommend adding collateral or reducing borrow');
    recommendations.push('Consider raising Health Factor above 1.5');
  } else if (bufferPercent < 15) {
    overallLevel = 'risky';
    description = `Thin safety buffer, ${bufferPercent.toFixed(2)}% deviation triggers liquidation`;
    recommendations.push('Recommend adding collateral to widen the safety buffer');
    recommendations.push('Monitor market volatility and set price alerts');
  } else if (bufferPercent < 30) {
    overallLevel = 'moderate';
    description = `Moderate safety buffer, ${bufferPercent.toFixed(2)}% deviation triggers liquidation`;
    recommendations.push('Keep monitoring market changes');
  } else {
    overallLevel = 'safe';
    description = `Adequate safety buffer, ${bufferPercent.toFixed(2)}% deviation needed to trigger liquidation`;
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
    description,
    recommendations: recommendations.length > 0 ? recommendations : ['Position is in good shape'],
  };
}
