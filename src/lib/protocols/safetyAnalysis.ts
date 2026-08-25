import { roundTo } from '@/lib/utils/format';

import type {
  AssetAdjustment,
  AssetDeviationResult,
  HealthStatus,
  OracleWarning,
  PositionCriticalResult,
  PricePoint,
  SafetyBufferAnalysis,
  SafetyParameterPlan,
} from './protocolHealthTypes';

/**
 * Generate adaptive price sampling points
 * Dense sampling near critical value, sparse sampling far from it
 */
export function generateAdaptivePricePoints(
  worstDeviation: AssetDeviationResult,
  collaterals: PositionCriticalResult['collaterals'],
  borrows: PositionCriticalResult['borrows'],
  totalBorrowValue: number,
  liquidationRatio: number
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
  const uniqueDeviations = Array.from(new Set(deviationPoints.map((d) => roundTo(d, 2)))).sort(
    (a, b) => b - a
  );

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
    const hf = liquidationRatio > 0 ? ratio / liquidationRatio : 0;

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
      deviationPercent: roundTo(deviation, 2),
      collateralPrice: roundTo(displayPrice, 2),
      collateralValue: roundTo(adjustedCollateralValue, 2),
      borrowValue: roundTo(adjustedBorrowValue, 2),
      collateralRatio: roundTo(ratio * 100, 2),
      healthFactor: roundTo(hf, 4),
      status,
      statusLabel,
    });
  }

  return points;
}

/**
 * Asymmetric liquidation-price uncertainty band.
 *
 * The displayed liquidation price rests on the oracle feed. The band captures how
 * far it could be off due to consensus deviation, live depeg, and staleness. It is
 * asymmetric: the ADVERSE tail (the direction that liquidates the user EARLIER
 * than displayed) carries the full half-width, while the FAVORABLE tail (delaying
 * liquidation) is only half. A favorable surprise only buys time, so we do not
 * extend it as far.
 *
 * @param center         displayed critical price (the nominal liquidation price)
 * @param direction      'down' for collateral-drop liquidation, 'up' for borrow-rise
 * @param adversePercent full adverse half-width in percent (the danger side)
 * @param unknown        true when oracle health could not be verified
 */
export function computeLiquidationPriceBand(
  center: number,
  direction: 'down' | 'up',
  adversePercent: number,
  unknown = false
): {
  center: number;
  lower: number;
  upper: number;
  adversePercent: number;
  favorablePercent: number;
  unknown: boolean;
} {
  const favorable = roundTo(adversePercent * 0.5, 4);
  const upper = roundTo(
    center * (1 + (direction === 'down' ? favorable : adversePercent) / 100),
    4
  );
  const lower = roundTo(
    center * (1 - (direction === 'down' ? adversePercent : favorable) / 100),
    4
  );
  return {
    center: roundTo(center, 4),
    lower,
    upper,
    adversePercent: roundTo(adversePercent, 2),
    favorablePercent: favorable,
    unknown,
  };
}

/**
 * Safety buffer analysis
 * Evaluate the safety distance from liquidation and generate recommendations.
 *
 * Real safety check: effective buffer = theoretical liquidation buffer minus the
 * average oracle deviation from consensus AND minus live depeg/peg risk.
 * A large oracle deviation eats into the apparent safety margin because the
 * oracle price can already be off before the market moves.
 * Live depeg/peg risk reflects actual market stress already happening.
 */
export function analyzeSafetyBuffer(
  worstDeviation: AssetDeviationResult,
  healthFactor: number,
  assetDeviations: AssetDeviationResult[],
  oracleWarnings: OracleWarning[],
  liveAssetDeviations: Record<string, number> = {}
): SafetyBufferAnalysis {
  const theoreticalBufferPercent = Math.abs(worstDeviation.criticalDeviationPercent);

  // Oracle consensus deviation: how far providers disagree right now.
  const hasOracleData = oracleWarnings.length > 0;
  const oracleAvgDeviationPercent = hasOracleData
    ? oracleWarnings.reduce((sum, w) => sum + w.avgDeviationPct, 0) / oracleWarnings.length
    : 0;

  // Live depeg/peg risk: sum of absolute live deviations for position assets
  const liveDepegBreakdown: Record<string, number> = {};
  let liveDepegRiskPercent = 0;
  for (const [symbol, deviation] of Object.entries(liveAssetDeviations)) {
    const absDev = Math.abs(deviation);
    if (absDev > 0) {
      liveDepegBreakdown[symbol] = roundTo(absDev, 4);
      liveDepegRiskPercent += absDev;
    }
  }

  // Oracle staleness penalty: a stale oracle may not reflect the latest market
  // move. Derive a conservative contribution from each provider's freshness score
  // (0–100): freshness 0 → +2%, 100 → 0%. The worst provider dominates (max).
  const stalenessPenaltyPercent = hasOracleData
    ? Math.min(
        2,
        oracleWarnings.reduce(
          (maxP, w) => Math.max(maxP, Math.min(Math.max(0, 100 - w.freshnessScore) / 50, 2)),
          0
        )
      )
    : 0;

  // Oracle-unknown uncertainty: when reputation data is missing we cannot verify
  // the oracle at all. That is the MOST uncertain case, not zero — use a
  // conservative placeholder and flag the band as unknown.
  const UNKNOWN_ORACLE_UNCERTAINTY = 10;
  const bandUnknown = !hasOracleData;
  const oracleUncertaintyPercent = hasOracleData
    ? oracleAvgDeviationPercent
    : UNKNOWN_ORACLE_UNCERTAINTY;

  // Oracle uncertainty band (adverse half-width, % of price). Combines consensus
  // deviation, live depeg, and staleness into a single ± figure around the
  // displayed liquidation price. Conservative sum of observable signals (no model
  // dependency), capped at 50%. This is a heuristic estimate, not a statistical CI.
  const bandHalfWidthPercent = Math.min(
    50,
    oracleUncertaintyPercent + liveDepegRiskPercent + stalenessPenaltyPercent
  );

  // Effective (real) safety buffer after subtracting the FULL oracle uncertainty
  // band. Because the band half-width is the adverse side, subtracting it makes the
  // displayed safety margin conservative: the real liquidation price can be closer
  // to the current price than displayed, so the real buffer is smaller. This is
  // what makes the band actually tighten the safety conclusion instead of only
  // decorating it.
  const bufferPercent = Math.max(0, theoreticalBufferPercent - bandHalfWidthPercent);
  const recommendations: string[] = [];

  let overallLevel: SafetyBufferAnalysis['overallLevel'];
  let description: string;

  // Build description parts
  const deductionParts: string[] = [];
  if (oracleUncertaintyPercent > 0) {
    deductionParts.push(
      hasOracleData
        ? `${oracleUncertaintyPercent.toFixed(2)}% oracle deviation`
        : `${oracleUncertaintyPercent.toFixed(2)}% oracle uncertainty (unverified)`
    );
  }
  if (liveDepegRiskPercent > 0) {
    const assetNames = Object.entries(liveDepegBreakdown)
      .map(([s, d]) => `${s} ${d.toFixed(2)}%`)
      .join(', ');
    deductionParts.push(`${liveDepegRiskPercent.toFixed(2)}% live depeg/peg risk (${assetNames})`);
  }
  if (stalenessPenaltyPercent > 0) {
    deductionParts.push(`${stalenessPenaltyPercent.toFixed(2)}% oracle staleness`);
  }
  const deductionText = deductionParts.length > 0 ? `after ${deductionParts.join(' and ')}` : '';

  if (healthFactor < 1) {
    overallLevel = 'dangerous';
    description = 'Position is already liquidated';
    recommendations.push('Position is in liquidation state, take action immediately');
  } else if (bufferPercent < 5) {
    overallLevel = 'dangerous';
    description = `Effective safety buffer only ${bufferPercent.toFixed(2)}% ${deductionText}`;
    recommendations.push('Strongly recommend adding collateral or reducing borrow');
    recommendations.push('Consider raising Health Factor above 1.5');
  } else if (bufferPercent < 15) {
    overallLevel = 'risky';
    description = `Thin effective safety buffer (${bufferPercent.toFixed(2)}%) ${deductionText}`;
    recommendations.push('Recommend adding collateral to widen the safety buffer');
    recommendations.push('Track market volatility');
  } else if (bufferPercent < 30) {
    overallLevel = 'moderate';
    description = `Moderate effective safety buffer (${bufferPercent.toFixed(2)}%) ${deductionText}`;
    recommendations.push('Keep tracking market changes');
  } else {
    overallLevel = 'safe';
    description = `Adequate effective safety buffer (${bufferPercent.toFixed(2)}%) ${deductionText || 'with no significant risk deductions'}`;
  }

  // Add specific recommendations for live depeg risks
  for (const [symbol, deviation] of Object.entries(liveDepegBreakdown)) {
    if (deviation >= 0.5) {
      recommendations.push(
        `${symbol} is currently ${deviation.toFixed(2)}% off peg — this already reduces your effective safety margin`
      );
    }
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

  // Oracle uncertainty band awareness: the displayed liquidation price carries an
  // error band; flag it so users keep extra buffer above the nominal threshold.
  if (bandHalfWidthPercent >= 1.5 && healthFactor >= 1) {
    recommendations.push(
      bandUnknown
        ? `Oracle health is unverified; a conservative ±${bandHalfWidthPercent.toFixed(
            2
          )}% uncertainty band applies — keep extra buffer above the nominal liquidation threshold`
        : `Oracle uncertainty band is ±${bandHalfWidthPercent.toFixed(
            2
          )}% — your displayed liquidation price could be off by this much; keep extra buffer above the nominal threshold`
    );
  }

  return {
    overallLevel,
    bufferPercent: roundTo(bufferPercent, 2),
    theoreticalBufferPercent: roundTo(theoreticalBufferPercent, 2),
    oracleAvgDeviationPercent: roundTo(oracleAvgDeviationPercent, 2),
    liveDepegRiskPercent: roundTo(liveDepegRiskPercent, 4),
    liveDepegBreakdown,
    bandHalfWidthPercent: roundTo(bandHalfWidthPercent, 2),
    bandUnknown,
    description,
    recommendations: recommendations.length > 0 ? recommendations : ['Position is in good shape'],
  };
}

/**
 * Inverse safety-parameter solver: given a target deviation tolerance, compute the
 * position adjustment required to survive it.
 *
 * Core formula (reverse application of the OVer insight):
 *   Liquidation triggers when HF = 1.
 *   To withstand a δ deviation we require worst-case HF ≥ 1.
 *
 * Per-asset differentiated deviation (enhancement 1):
 *   targetDeviationPercent is the major-equivalent δ (k × 100).
 *   Each asset's actual δ_i = k × ratio_i, scaled by category:
 *   - stablecoin: k × 0.2  (depeg scale)
 *   - major:      k × 1.0  (baseline)
 *   - alt:        k × 2.0
 *   - micro:      k × 3.33
 *
 *   Worst-case HF = [Σ collValue × (1 − δ_i)] / [Σ borrowValue × (1 + δ_j)] / liquidationRatio
 *
 *   Nominal targetHF = (1+δ)/(1−δ) is kept for intuition (assumes all assets deviate by δ),
 *   but the actual decision and adjustment math uses per-asset δ.
 *
 * @param result Forward calculation result (reuses prices, parameters, position, deviationRatios)
 * @param targetDeviationPercent User target deviation in major-equivalent percent (e.g. 15 means 15%)
 */
export function calculateSafetyParameterPlan(
  result: PositionCriticalResult,
  targetDeviationPercent: number
): SafetyParameterPlan {
  const k = targetDeviationPercent / 100; // major-equivalent δ

  // Guard rails
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

  // 2. Nominal target HF (for intuition, assumes all assets deviate by δ=k)
  const targetHF = (1 + k) / (1 - k);
  const liquidationRatio = result.liquidationThreshold;
  const targetCollateralRatio = targetHF * liquidationRatio;

  const currentHF = result.currentHealthFactor;

  // 3. Actual worst-case HF under per-asset δ
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
    worstBorrowCurrent > 0 && liquidationRatio > 0
      ? worstCollCurrent / worstBorrowCurrent / liquidationRatio
      : Infinity;

  // needsAdjustment: current position cannot survive the target deviation (worst-case HF < 1)
  const needsAdjustment = currentWorstHF < 1;
  const gapPercent =
    currentWorstHF > 0 && isFinite(currentWorstHF) ? (1 - currentWorstHF) * 100 : Infinity;

  // 4. Plan A: add collateral (exact per-asset δ calculation)
  // For each collateral asset X, solve addedAmount such that worstHF = 1:
  //   worstColl_new = worstCollCurrent + addedAmount × exchRt_X × price_X × (1 − δ_X)
  //   worstHF_new = worstColl_new / worstBorrowCurrent / liquidationRatio = 1
  //   => addedAmount = (liquidationRatio × worstBorrowCurrent − worstCollCurrent) / (exchRt_X × price_X × (1 − δ_X))
  const collGap = liquidationRatio * worstBorrowCurrent - worstCollCurrent; // worst-case raw value gap
  const needAdjustedDelta = Math.max(0, collGap);
  const addCollateralRaw = result.collaterals.map((c) => {
    const delta_i = perAssetDelta[c.symbol] ?? k;
    // worst-case raw value contributed per unit of collateral
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
  // addCollateralTotal: USD required from the most efficient asset (first after sorting)
  const addCollateralTotal = addCollateralAdjustments[0]?.deltaValueUsd ?? 0;

  // 5. Plan B: repay borrow (exact per-asset δ calculation)
  // For each borrow asset Y, solve repaidAmount such that worstHF = 1:
  //   worstBorrow_new = worstBorrowCurrent − repaidAmount × price_Y × (1 + δ_Y)
  //   worstHF_new = worstCollCurrent / worstBorrow_new / liquidationRatio = 1
  //   => repaidAmount = (worstBorrowCurrent − worstCollCurrent / liquidationRatio) / (price_Y × (1 + δ_Y))
  const borrowGap = worstBorrowCurrent - worstCollCurrent / liquidationRatio;
  const needBorrowReduction = Math.max(0, borrowGap);
  const repayBorrowAdjustments: AssetAdjustment[] = result.borrows.map((b) => {
    const delta_i = perAssetDelta[b.symbol] ?? k;
    const efficiency = b.price * (1 + delta_i); // worst-case borrow reduction per unit repaid
    const deltaAmount = efficiency > 0 ? needBorrowReduction / efficiency : 0;
    return {
      symbol: b.symbol,
      action: 'repay_borrow' as const,
      currentAmount: b.amount,
      targetAmount: b.amount - deltaAmount,
      deltaAmount: -deltaAmount, // negative means reduce debt
      deltaValueUsd: -deltaAmount * b.price,
      currentPrice: b.price,
      direction: 'up' as const,
    };
  });

  // 6. Plan C: withdrawable collateral (when currentWorstHF > 1, buffer is sufficient)
  let withdrawablePlan: SafetyParameterPlan['plans']['withdrawable'];
  if (!needsAdjustment && currentWorstHF > 1) {
    // withdrawable worst-case collateral surplus
    const surplusColl = worstCollCurrent - liquidationRatio * worstBorrowCurrent;
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

  // 7. Scenario verification: worst-case HF after applying Plan A
  // Adjusted worstColl = worstCollCurrent + needAdjustedDelta (top up via any one asset)
  // worstHF = (worstCollCurrent + needAdjustedDelta) / worstBorrowCurrent / liquidationRatio
  const projectedWorstCaseHF =
    worstBorrowCurrent > 0 && liquidationRatio > 0
      ? (worstCollCurrent + needAdjustedDelta) / worstBorrowCurrent / liquidationRatio
      : Infinity;

  const repayBorrowTotal = Math.abs(
    repayBorrowAdjustments.reduce((s, a) => s + a.deltaValueUsd, 0)
  );

  return {
    targetDeviationPercent,
    perAssetDeviationPercents,
    targetHealthFactor: roundTo(targetHF, 4),
    targetCollateralRatio: roundTo(targetCollateralRatio, 4),
    currentHealthFactor: currentHF,
    currentWorstCaseHF: roundTo(isFinite(currentWorstHF) ? currentWorstHF : 0, 4),
    needsAdjustment,
    gapPercent: roundTo(isFinite(gapPercent) ? gapPercent : 0, 2),
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
