import { createLogger } from '@/lib/utils/logger';
import { lstExchangeRateService } from '@/lib/wrapped-assets/exchangeRateService';
import type { Blockchain } from '@/types/oracle';

import {
  calculateAssetDeviations,
  calculateJointDeviation,
  calculateDeviationScenarios,
} from './deviationCalculation';
import { getProtocolByIdWithDynamicData, type EnrichedProtocolConfig } from './dynamicData';
import { getChainId } from './importer/chainId';
import { deriveDeviationRatios } from './protocolRegistry';
import { analyzeSafetyBuffer, generateAdaptivePricePoints } from './safetyAnalysis';

import type {
  AssetEntry,
  OracleWarning,
  PositionCriticalResult,
  PositionInput,
  PriceLookup,
} from './protocolHealthTypes';
import type { ProtocolAssetConfig } from './protocolRegistry';

// Re-export all types from the types module
export type {
  AssetEntry,
  PositionInput,
  AssetDeviationResult,
  SafetyBufferAnalysis,
  OracleWarning,
  DeviationScenario,
  AssetAdjustment,
  SafetyParameterPlan,
  PositionCriticalResult,
} from './protocolHealthTypes';

// Re-export calculateSafetyParameterPlan from safetyAnalysis
export { calculateSafetyParameterPlan } from './safetyAnalysis';

const logger = createLogger('protocol-health');

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

/**
 * Fetch on-chain exchange rates for LST collateral assets whose registry config
 * marks them as priced in the underlying (exchangeRateSource === 'lst').
 *
 * This is used when a protocol's oracle returns the underlying price (e.g. ETH/USD)
 * but the collateral is a wrapped staked token (wstETH/cbETH). For protocols whose
 * oracle already returns the wrapped-token price, exchangeRateSource should be left
 * undefined and exchangeRate defaults to 1.
 */
async function applyLSTExchangeRates(
  protocol: NonNullable<Awaited<ReturnType<typeof getProtocolByIdWithDynamicData>>>
): Promise<void> {
  const chainId = getChainId(protocol.chain);
  const lstAssets = protocol.assets.filter((a) => a.exchangeRateSource === 'lst');

  await Promise.allSettled(
    lstAssets.map(async (asset) => {
      try {
        const rate = await lstExchangeRateService.getExchangeRate(asset.symbol, chainId);
        asset.exchangeRate = rate;
        logger.info(`Applied on-demand LST exchange rate`, {
          protocolId: protocol.id,
          symbol: asset.symbol,
          chainId,
          rate,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(
          `Failed to fetch on-demand LST exchange rate for ${asset.symbol}, keeping registry value`,
          { protocolId: protocol.id, error: message }
        );
      }
    })
  );
}

export async function calculatePositionCriticalDeviation(
  input: PositionInput,
  fetchPrices: (
    queries: {
      provider: PriceLookup['provider'];
      symbol: string;
      chain?: Blockchain;
    }[]
  ) => Promise<PriceLookup[]>,
  oracleWarnings?: OracleWarning[],
  liveAssetDeviations?: Record<string, number>,
  protocolOverride?: EnrichedProtocolConfig
): Promise<PositionCriticalResult> {
  const startTime = Date.now();

  try {
    const protocol = protocolOverride ?? (await getProtocolByIdWithDynamicData(input.protocolId));

    if (!protocol) {
      throw new Error(`Protocol not found: ${input.protocolId}`);
    }

    // Fetch freshest LST exchange rates for assets priced in the underlying.
    await applyLSTExchangeRates(protocol);

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
    const assetConfigs = new Map<string, ProtocolAssetConfig>();
    for (const symbol of allSymbols) {
      const asset = protocol.assets.find((a) => a.symbol === symbol);
      if (!asset) {
        throw new Error(`Asset ${symbol} not supported in ${protocol.name}`);
      }
      assetConfigs.set(symbol, asset);
    }

    // Build per-asset deviation ratios from the protocol's own risk parameters.
    // Each integrated protocol contributes its liquidation-threshold assessment;
    // the category baseline is only used when no protocol-specific signal exists.
    const protocolDeviationRatios = deriveDeviationRatios(protocol);
    const deviationRatios: Record<string, number> = {};
    for (const symbol of allSymbols) {
      deviationRatios[symbol] = protocolDeviationRatios[symbol] ?? 1.0;
    }

    // Fetch live prices
    // Use priceSymbol (if defined) for price lookup, e.g. iSUPRA → SUPRA, iUSDC → USDC
    const priceQueries = Array.from(allSymbols).map((symbol) => {
      const config = assetConfigs.get(symbol)!;
      return {
        provider: config.oracleProvider,
        symbol: config.priceSymbol ?? symbol,
        chain: protocol.chain,
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
    // HF = (rawCollateral / borrow) / liquidationRatio
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

    // Aave-style exact weighted liquidation threshold:
    // HF = Σ(collateral_i * LT_i) / debt = (totalCollateral / debt) * weightedLT
    // where weightedLT = Σ(value_i * LT_i) / Σ(value_i) and LT_i = 1 / liquidationThreshold_i.
    // The liquidation ratio (collateral/debt threshold) is the reciprocal: 1 / weightedLT.
    const weightedActualLT =
      totalAdjustedCollateralValue > 0
        ? collateralDetails.reduce(
            (sum, c) => sum + (c.exchangeRate * c.price * c.amount) / c.liquidationThreshold,
            0
          ) / totalAdjustedCollateralValue
        : 1;
    const weightedLiquidationRatio = weightedActualLT > 0 ? 1 / weightedActualLT : 1;

    const currentCollateralRatio =
      totalBorrowValue > 0 ? totalAdjustedCollateralValue / totalBorrowValue : Infinity;
    const currentHealthFactor =
      weightedLiquidationRatio > 0 ? currentCollateralRatio / weightedLiquidationRatio : Infinity;

    // Calculate per-asset critical deviations (bidirectional, single-asset ceteris paribus)
    const assetDeviations = calculateAssetDeviations(
      collateralDetails,
      borrowDetails,
      totalAdjustedCollateralValue,
      totalBorrowValue,
      weightedLiquidationRatio
    );

    // Joint deviation: all collaterals drop and all borrows rise simultaneously (OVer-style)
    // Per-asset δ scaled by category ratio (enhancement 1)
    const jointDeviation = calculateJointDeviation(
      collateralDetails,
      borrowDetails,
      deviationRatios,
      totalAdjustedCollateralValue,
      totalBorrowValue,
      weightedLiquidationRatio
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
      weightedLiquidationRatio
    );

    // Safety buffer analysis
    const safetyBuffer = analyzeSafetyBuffer(
      worstDeviation,
      currentHealthFactor,
      assetDeviations,
      oracleWarnings ?? [],
      liveAssetDeviations ?? {}
    );

    // Fixed deviation scenarios (1% / 3% / 5%) for user-friendly risk assessment
    const deviationScenarios = calculateDeviationScenarios(
      collateralDetails,
      borrowDetails,
      deviationRatios,
      totalBorrowValue,
      weightedLiquidationRatio
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
      liquidationThreshold: Number(weightedLiquidationRatio.toFixed(4)),
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
