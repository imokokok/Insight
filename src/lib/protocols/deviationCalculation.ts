import { roundTo } from '@/lib/utils/format';

import type {
  AssetDeviationResult,
  DeviationScenario,
  PositionCriticalResult,
} from './protocolHealthTypes';

/**
 * Calculate per-asset critical deviations (bidirectional, single-asset ceteris paribus)
 * OVer paper core: liquidation triggers when rawCollateral / borrow = liquidationThreshold
 *
 * For collateral price drop: solve (exchRt * P_new * amount + otherColl) / borrowValue = LT
 * For borrow price rise: solve rawCollateral / (P_new * amount + otherBorrow) = LT
 */
export function calculateAssetDeviations(
  collaterals: PositionCriticalResult['collaterals'],
  borrows: PositionCriticalResult['borrows'],
  totalAdjustedCollateralValue: number,
  totalBorrowValue: number,
  liquidationRatio: number
): AssetDeviationResult[] {
  const results: AssetDeviationResult[] = [];

  // Critical deviation for collateral price drops
  for (const c of collaterals) {
    // Current raw value of this collateral
    const currentRawValue = c.exchangeRate * c.price * c.amount;
    // Raw value of other collaterals
    const otherCollateral = totalAdjustedCollateralValue - currentRawValue;

    // Liquidation condition: otherColl + exchRt * P_critical * amount = liquidationRatio * borrowValue
    // P_critical = (liquidationRatio * borrowValue - otherColl) / (exchRt * amount)
    const numerator = liquidationRatio * totalBorrowValue - otherCollateral;
    const denominator = c.exchangeRate * c.amount;

    if (denominator <= 0) continue;

    const criticalPrice = numerator / denominator;
    const criticalDeviationPercent = c.price > 0 ? (criticalPrice / c.price - 1) * 100 : 0;

    // Only the drop direction is meaningful (critical price < current price)
    if (criticalPrice < c.price) {
      results.push({
        symbol: c.symbol,
        currentPrice: c.price,
        criticalDeviationPercent: roundTo(criticalDeviationPercent, 4),
        criticalPrice: roundTo(criticalPrice, 4),
        direction: 'down',
        description: `${c.symbol} drops ${Math.abs(criticalDeviationPercent).toFixed(2)}% to $${criticalPrice.toFixed(2)} triggers liquidation`,
      });
    } else {
      // Already below liquidation line or critical price above current (cannot trigger via this asset dropping)
      results.push({
        symbol: c.symbol,
        currentPrice: c.price,
        criticalDeviationPercent: roundTo(criticalDeviationPercent, 4),
        criticalPrice: roundTo(criticalPrice, 4),
        direction: 'down',
        description: `${c.symbol} dropping alone cannot trigger liquidation (protected by other collaterals)`,
      });
    }
  }

  // Critical deviation for borrow price rises
  for (const b of borrows) {
    const currentBorrowValue = b.price * b.amount;
    const otherBorrowValue = totalBorrowValue - currentBorrowValue;

    // Liquidation condition: adjustedColl / (P_critical * amount + otherBorrow) = liquidationRatio
    // P_critical = (adjustedColl / liquidationRatio - otherBorrow) / amount
    const numerator = totalAdjustedCollateralValue / liquidationRatio - otherBorrowValue;
    const denominator = b.amount;

    if (denominator <= 0) continue;

    const criticalPrice = numerator / denominator;
    const criticalDeviationPercent = b.price > 0 ? (criticalPrice / b.price - 1) * 100 : 0;

    // Only the rise direction is meaningful (critical price > current price)
    if (criticalPrice > b.price) {
      results.push({
        symbol: b.symbol,
        currentPrice: b.price,
        criticalDeviationPercent: roundTo(criticalDeviationPercent, 4),
        criticalPrice: roundTo(criticalPrice, 4),
        direction: 'up',
        description: `${b.symbol} rises ${criticalDeviationPercent.toFixed(2)}% to $${criticalPrice.toFixed(2)} triggers liquidation`,
      });
    } else {
      results.push({
        symbol: b.symbol,
        currentPrice: b.price,
        criticalDeviationPercent: roundTo(criticalDeviationPercent, 4),
        criticalPrice: roundTo(criticalPrice, 4),
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
export function calculateJointDeviation(
  collaterals: PositionCriticalResult['collaterals'],
  borrows: PositionCriticalResult['borrows'],
  deviationRatios: Record<string, number>,
  totalAdjustedCollateralValue: number,
  totalBorrowValue: number,
  liquidationRatio: number
): AssetDeviationResult {
  // Edge case: no borrow or no collateral — cannot be liquidated via deviation
  if (totalBorrowValue <= 0 || totalAdjustedCollateralValue <= 0 || liquidationRatio <= 0) {
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
  const currentHF = totalAdjustedCollateralValue / totalBorrowValue / liquidationRatio;
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
    const hf = worstBorrow > 0 ? worstColl / worstBorrow / liquidationRatio : Infinity;
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
    criticalDeviationPercent: roundTo(criticalDeviationPercent, 4),
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
export function calculateDeviationScenarios(
  collaterals: PositionCriticalResult['collaterals'],
  borrows: PositionCriticalResult['borrows'],
  deviationRatios: Record<string, number>,
  totalBorrowValue: number,
  liquidationRatio: number
): DeviationScenario[] {
  const scenarios: DeviationScenario[] = [];
  const fixedPercents = [1, 3, 5];

  const primaryCollateral = collaterals[0];
  if (primaryCollateral) {
    for (const pct of fixedPercents) {
      const dropRatio = pct / 100;
      // Single-asset drop: only the primary collateral falls by pct, other collaterals unchanged.
      const newCollateralValue = collaterals.reduce((sum, c) => {
        const mult = c.symbol === primaryCollateral.symbol ? 1 - dropRatio : 1;
        return sum + c.exchangeRate * c.price * c.amount * mult;
      }, 0);
      const newRatio = totalBorrowValue > 0 ? newCollateralValue / totalBorrowValue : Infinity;
      const hf = liquidationRatio > 0 ? newRatio / liquidationRatio : Infinity;
      scenarios.push(
        buildDeviationScenario(
          `${primaryCollateral.symbol} -${pct}%`,
          -pct,
          false,
          hf,
          newRatio,
          liquidationRatio
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
    const hf = liquidationRatio > 0 ? newRatio / liquidationRatio : Infinity;
    scenarios.push(
      buildDeviationScenario(`Joint -${pct}%`, -pct, true, hf, newRatio, liquidationRatio)
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
  liquidationRatio: number
): DeviationScenario {
  let status: DeviationScenario['status'] = 'safe';
  if (healthFactor < 1) status = 'liquidated';
  else if (healthFactor < 1.05) status = 'critical';
  else if (healthFactor < 1.2) status = 'warning';

  const distanceToLiquidationPercent =
    isFinite(collateralRatio) && collateralRatio >= liquidationRatio
      ? (collateralRatio / liquidationRatio - 1) * 100
      : 0;

  return {
    label,
    deviationPercent,
    isJoint,
    healthFactor: roundTo(healthFactor, 4),
    collateralRatio: roundTo(collateralRatio, 4),
    status,
    distanceToLiquidationPercent: roundTo(Math.max(0, distanceToLiquidationPercent), 2),
  };
}
