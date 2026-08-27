import type { PositionCriticalResult } from './protocolHealth';

/** A single protocol's computed stress-test result within a portfolio. */
export interface ProtocolHealthEntry {
  protocolId: string;
  name: string;
  chain: string;
  result: PositionCriticalResult;
}

export interface CombinedPortfolio {
  /** Sum of each position's (un-discounted) collateral value, USD. */
  totalCollateralUsd: number;
  /** Sum of each position's borrow value, USD. */
  totalBorrowUsd: number;
  /**
   * The smallest absolute critical deviation across all protocols — i.e. the
   * price move that liquidates the *first* (weakest) position in the portfolio.
   * This is the real "how much room do I have" number, not a naive blended HF.
   */
  combinedLiquidationDistancePercent: number;
  /** Protocol id / name of the weakest position, or null when none. */
  weakestProtocolId: string | null;
  weakestName: string | null;
  /**
   * Collateral assets that appear in two or more protocols — a correlated
   * shock (e.g. ETH dropping) would hit every such position at once.
   */
  correlations: { symbol: string; protocols: string[] }[];
}

/**
 * Combine per-protocol stress-test results into a single portfolio view.
 *
 * IMPORTANT: we never average health factors. Each lending pool has its own
 * liquidation threshold, so a weighted "portfolio HF" would be mathematically
 * wrong. Instead we surface the *first* position to break and flag correlated
 * collateral exposure.
 */
export function buildCombinedPortfolio(entries: ProtocolHealthEntry[]): CombinedPortfolio {
  let totalCollateralUsd = 0;
  let totalBorrowUsd = 0;
  let combinedDistance = Infinity;
  let weakest: { id: string; name: string } | null = null;

  const collateralBySymbol: Record<string, string[]> = {};

  for (const entry of entries) {
    totalCollateralUsd += entry.result.totalCollateralValue;
    totalBorrowUsd += entry.result.totalBorrowValue;

    const distance = Math.abs(entry.result.worstDeviation.criticalDeviationPercent);
    if (distance < combinedDistance) {
      combinedDistance = distance;
      weakest = { id: entry.protocolId, name: entry.name };
    }

    for (const collateral of entry.result.collaterals) {
      (collateralBySymbol[collateral.symbol] ??= []).push(entry.name);
    }
  }

  const correlations = Object.entries(collateralBySymbol)
    .filter(([, protocols]) => protocols.length >= 2)
    .map(([symbol, protocols]) => ({ symbol, protocols: [...new Set(protocols)] }));

  return {
    totalCollateralUsd,
    totalBorrowUsd,
    combinedLiquidationDistancePercent: Number.isFinite(combinedDistance) ? combinedDistance : 0,
    weakestProtocolId: weakest?.id ?? null,
    weakestName: weakest?.name ?? null,
    correlations,
  };
}
