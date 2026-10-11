/**
 * Manipulation-cost advisory baseline — hot-path reader for the pre-trade
 * response. Reads the freshest successful snapshots from
 * `manip_cost_pool_snapshots` (migration 0082, written every 15 min by the
 * production collector) and shapes them into a per-symbol advisory context.
 *
 * DISCIPLINE (mirrors collector.ts): EVIDENCE ONLY. This is an advisory
 * dimension on the pre-trade response — it must NOT enter verdict gates or
 * signed receipts until separately reviewed. Absence (null) means "no fresh
 * evidence", never "low risk".
 *
 * Non-blocking contract (same as feedCadence.getFeedStalenessBaselineMap):
 * any error, missing pool, or stale data returns null and the response field
 * is omitted. Fail-closed on staleness: a snapshot older than
 * MANIP_COST_MAX_AGE_MS is withheld rather than served, because the collector
 * failing silently must not look like "cost unchanged".
 *
 * Scope guard (v0): the pool map covers Ethereum mainnet DEX pools only.
 * Callers on other chains get null — a mainnet pool depth number must not be
 * presented as the manipulation cost of a different chain's reference market.
 */

import { createLogger } from '@/lib/utils/logger';

import type { SupabaseClient } from '@supabase/supabase-js';

const logger = createLogger('manip-cost-baseline');

/**
 * Max age of the freshest acceptable snapshot. The collector runs every 15
 * min; 2h covers several missed rounds (RPC outages) without serving stale
 * depth as current.
 */
export const MANIP_COST_MAX_AGE_MS = 2 * 60 * 60 * 1000;

/** Symbols covered by the v0 pool map, normalized (WETH is treated as ETH). */
export type ManipCostCoveredSymbol = 'ETH' | 'USDC' | 'WBTC';

export interface ManipCostCurvePoint {
  movePct: number;
  /** USD to push pool price UP by movePct. */
  upUsd: number;
  /** USD to push pool price DOWN by movePct. */
  downUsd: number;
  /** Cheaper direction — the practical minimum to move the price by movePct. */
  minUsd: number;
  /** Round-trip fee loss of the cheaper direction (arXiv:2606.03548). */
  minRoundtripFeeUsd: number;
  /** v3 curves assume the move stays in the active range (lower bound). */
  withinRangeAssumed: boolean | null;
}

export interface ManipCostAdvisoryPool {
  poolKey: string;
  dex: string;
  feeTier: string | null;
  snapshotTs: string;
  blockNumber: number | null;
  midPrice: number | null;
  tvlUsd: number | null;
  curve: ManipCostCurvePoint[];
}

export interface ManipCostAdvisory {
  symbol: ManipCostCoveredSymbol;
  /** Pool scope of the numbers — v0 is Ethereum mainnet only. */
  referenceChain: 'ethereum';
  /** Always true; exists so clients never mistake the field for a verdict input. */
  advisoryOnly: true;
  pools: ManipCostAdvisoryPool[];
  /** Cross-pool minimum of minUsd at the 1% step, or null if uncomputable. */
  cheapestMove1PctUsd: number | null;
  freshestSnapshotTs: string | null;
  note: string;
}

/**
 * Pool keys relevant to a symbol. ETH and WETH are the same economic asset in
 * the v0 map (both ETH/USDC pools; the WBTC/WETH pool moves WBTC's price, not
 * ETH's, so it is excluded from the ETH mapping). USDC maps to the same pools:
 * moving the ETH/USDC pool price moves the USDC leg symmetrically. WBTC maps
 * to its own pool.
 */
export function manipCostPoolKeysForSymbol(symbol: string): string[] | null {
  const s = symbol.trim().toUpperCase();
  const ethSide = ['uniswap-v3-eth-usdc-005', 'uniswap-v2-usdc-weth'];
  if (s === 'ETH' || s === 'WETH') return ethSide;
  if (s === 'USDC') return ethSide;
  if (s === 'WBTC') return ['uniswap-v3-wbtc-weth-030'];
  return null;
}

/** True if the symbol is covered by the v0 pool map. */
export function isManipCostCoveredSymbol(symbol: string): boolean {
  return manipCostPoolKeysForSymbol(symbol) !== null;
}

interface SnapshotRow {
  pool_key: string;
  dex: string;
  fee_tier: string | null;
  snapshot_ts: string;
  block_number: number | null;
  mid_price: number | null;
  tvl_usd: number | null;
  cost_curve: unknown;
}

function buildCurve(raw: unknown): ManipCostCurvePoint[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: ManipCostCurvePoint[] = [];
  for (const p of raw) {
    if (typeof p !== 'object' || p === null) return null;
    const e = p as Record<string, unknown>;
    const movePct = e.move_pct;
    const up = e.up_usd;
    const down = e.down_usd;
    if (typeof movePct !== 'number' || typeof up !== 'number' || typeof down !== 'number') {
      return null;
    }
    if (!Number.isFinite(movePct) || !Number.isFinite(up) || !Number.isFinite(down)) return null;
    const upFee = typeof e.up_roundtrip_fee_usd === 'number' ? e.up_roundtrip_fee_usd : null;
    const downFee = typeof e.down_roundtrip_fee_usd === 'number' ? e.down_roundtrip_fee_usd : null;
    const upFirst = down == null || up <= down;
    const minUsd = Math.min(up, down);
    out.push({
      movePct,
      upUsd: up,
      downUsd: down,
      minUsd,
      minRoundtripFeeUsd: (upFirst ? upFee : downFee) ?? 0,
      withinRangeAssumed:
        typeof e.within_range_assumed === 'boolean' ? e.within_range_assumed : null,
    });
  }
  return out;
}

/**
 * Read the freshest successful snapshot per relevant pool and shape the
 * advisory. Returns null when: the symbol is uncovered, the query fails, any
 * mapped pool has no successful snapshot, or any snapshot is older than
 * MANIP_COST_MAX_AGE_MS. Never throws.
 */
export async function getManipCostAdvisory(
  supabase: SupabaseClient,
  symbol: string,
  opts?: { now?: Date; maxAgeMs?: number }
): Promise<ManipCostAdvisory | null> {
  const keys = manipCostPoolKeysForSymbol(symbol);
  if (!keys || keys.length === 0) return null;

  const now = opts?.now ?? new Date();
  const maxAgeMs = opts?.maxAgeMs ?? MANIP_COST_MAX_AGE_MS;

  try {
    // Over-fetch slightly so a single missing pool is distinguishable from a
    // short result window; dedupe to the newest row per pool below.
    const { data, error } = await supabase
      .from('manip_cost_pool_snapshots')
      .select('pool_key, dex, fee_tier, snapshot_ts, block_number, mid_price, tvl_usd, cost_curve')
      .in('pool_key', keys)
      .eq('is_success', true)
      .order('snapshot_ts', { ascending: false })
      .limit(keys.length * 10);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return null;

    const freshestByPool = new Map<string, SnapshotRow>();
    for (const row of data as SnapshotRow[]) {
      if (!freshestByPool.has(row.pool_key)) freshestByPool.set(row.pool_key, row);
    }

    const pools: ManipCostAdvisoryPool[] = [];
    let freshestTs: string | null = null;
    for (const key of keys) {
      const row = freshestByPool.get(key);
      if (!row) return null; // fail-closed: every mapped pool must report
      const age = now.getTime() - new Date(row.snapshot_ts).getTime();
      if (!Number.isFinite(age) || age < 0 || age > maxAgeMs) return null; // stale → withhold
      const curve = buildCurve(row.cost_curve);
      if (!curve) return null; // malformed curve → withhold, never partial
      if (freshestTs === null || row.snapshot_ts > freshestTs) freshestTs = row.snapshot_ts;
      pools.push({
        poolKey: row.pool_key,
        dex: row.dex,
        feeTier: row.fee_tier,
        snapshotTs: row.snapshot_ts,
        blockNumber: row.block_number,
        midPrice: row.mid_price,
        tvlUsd: row.tvl_usd,
        curve,
      });
    }

    const onePct = pools
      .map((p) => p.curve.find((c) => Math.abs(c.movePct - 1) < 1e-9)?.minUsd ?? null)
      .filter((v): v is number => v !== null);
    const cheapestMove1PctUsd = onePct.length > 0 ? Math.min(...onePct) : null;

    return {
      symbol:
        symbol.trim().toUpperCase() === 'WETH'
          ? 'ETH'
          : (symbol.trim().toUpperCase() as ManipCostCoveredSymbol),
      referenceChain: 'ethereum',
      advisoryOnly: true,
      pools,
      cheapestMove1PctUsd,
      freshestSnapshotTs: freshestTs,
      note:
        'Advisory only — never a verdict input and not part of the signed attestation. ' +
        'USD cost to move the Ethereum-mainnet DEX reference price (v3 curves are in-range ' +
        'lower bounds). Absence of this field means no fresh evidence, not low risk.',
    };
  } catch (e) {
    logger.warn('getManipCostAdvisory failed; advisory omitted', {
      symbol,
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}
