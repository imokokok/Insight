/**
 * @fileoverview The Oracle Watch history universe — the (symbol, chain) pairs
 * `/oracle-watch/history` GUARANTEES a retrospective curve for.
 *
 * Why this file exists: Oracle Watch is positioned as an "always-on" layer, but
 * the collector historically ran a fixed list of 16 GLOBAL symbols with no
 * chain dimension. A strategy running on Arbitrum ETH got an empty `/history`
 * series — silently. An empty array reads as "no incidents", which is the one
 * answer a dependent agent must never be handed by accident.
 *
 * The fix is not to cover every market (upstream cost scales with the target
 * list at a 30-minute cadence). It is to publish an explicit, narrow promise
 * and then keep it: these pairs have history, everything else is a point-in-
 * time signal only. A documented boundary is more trustworthy than an
 * undocumented gap.
 *
 * Adding a pair here is a commitment: the collector will start writing rows for
 * it every 30 minutes, and `/history` will claim coverage. Remove one only when
 * its feeds are gone, not because a query returned empty once.
 */

/** A collection target. `chain` omitted = global cross-oracle coverage. */
export interface OracleWatchTarget {
  symbol: string;
  chain?: string;
}

/** Chains we publish per-chain history for. */
export const ORACLE_WATCH_HISTORY_CHAINS = ['ethereum', 'arbitrum', 'base'] as const;

export type OracleWatchHistoryChain = (typeof ORACLE_WATCH_HISTORY_CHAINS)[number];

/**
 * The committed per-chain universe: majors + stablecoins across the chains the
 * collector actually has feeds for.
 *
 * Deliberately small. Each entry costs one full cross-oracle evaluation every
 * 30 minutes, forever — 12 entries is ~576 rows/day, negligible; 200 would not
 * be, and would also mean most rows describe feeds nobody depends on.
 */
export const ORACLE_WATCH_HISTORY_UNIVERSE: ReadonlyArray<{
  symbol: string;
  chain: OracleWatchHistoryChain;
}> = [
  // Majors — the collateral most lending strategies are actually built on.
  { symbol: 'ETH', chain: 'ethereum' },
  { symbol: 'ETH', chain: 'arbitrum' },
  { symbol: 'ETH', chain: 'base' },
  { symbol: 'BTC', chain: 'ethereum' },
  { symbol: 'BTC', chain: 'arbitrum' },
  { symbol: 'BTC', chain: 'base' },
  // Stablecoins — peg risk is the failure mode that matters most here, and it
  // is chain-specific: a depeg on one chain's USDC feed is invisible globally.
  { symbol: 'USDC', chain: 'ethereum' },
  { symbol: 'USDC', chain: 'arbitrum' },
  { symbol: 'USDC', chain: 'base' },
  { symbol: 'USDT', chain: 'ethereum' },
  { symbol: 'USDT', chain: 'arbitrum' },
  { symbol: 'USDT', chain: 'base' },
];

/**
 * True when (symbol, chain) is inside the committed universe, i.e. `/history`
 * is expected to return a populated series.
 *
 * Note the asymmetry with the point signal: `isInHistoryUniverse(...) === false`
 * does NOT mean the pair is unsupported — `oracle_watch` still evaluates any
 * symbol we have feeds for. It means there is no retrospective curve, and
 * callers must be told that rather than being handed an empty array.
 */
export function isInHistoryUniverse(symbol: string, chain?: string | null): boolean {
  const s = symbol.toUpperCase();
  const c = chain?.toLowerCase() ?? null;
  return ORACLE_WATCH_HISTORY_UNIVERSE.some((t) => t.symbol === s && (c === null || t.chain === c));
}

/**
 * True when the symbol is one we publish history for on ANY chain. Used to
 * distinguish "we cover this asset but not on that chain" from "we have never
 * heard of this asset" — different remediations for a dependent agent.
 */
export function hasAnyHistoryCoverage(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return ORACLE_WATCH_HISTORY_UNIVERSE.some((t) => t.symbol === s);
}

/** Human-readable statement of the promise, for API meta + MCP output. */
export const HISTORY_UNIVERSE_NOTE =
  'History is guaranteed for the committed universe (ETH/BTC/USDC/USDT × ethereum/arbitrum/base). ' +
  'Other pairs still return a live point signal from oracle_watch, but no retrospective curve.';
