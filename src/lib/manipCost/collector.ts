/**
 * Manipulation-cost collector (foundation block ②: DEX pool depth -> cost to
 * move price). For each pool in the curated map, fetches live on-chain state
 * and computes the closed-form minimum single-sided trade size (USD) needed to
 * move the pool price by r%, plus the round-trip fee loss (arXiv:2606.03548).
 *
 * Storage: `manip_cost_pool_snapshots` (migration 0082), unique on
 * (snapshot_ts, pool_key), upsert = idempotent per slot.
 *
 * Discipline (same as the market-reference layer): EVIDENCE ONLY. This feeds
 * advisory dimensions and analysis; it must NOT enter verdict gates or signed
 * receipts until separately reviewed.
 *
 * Scope guard (v0): DEX-referenced feed subset only. CEX-aggregated reference
 * markets (ETH/BTC/SOL mainline feeds) need order-book depth that public DEX
 * pools cannot provide — do not widen the map without per-feed reference-market
 * verification.
 *
 * Math (exact within constant-product / in-range-concentrated assumptions):
 *   v2: x*y=k, p = y/x. Move price by factor r:
 *     up  (sell token1): Δy = y0*(√r − 1)
 *     down(sell token0): Δx = x0*(√r − 1)
 *   v3 (in-range, liquidity L constant):
 *     Δy_raw = L*sqrtPriceX96*(√r − 1)/2^96 ; Δx_raw = L*2^96*(√r − 1)/sqrtPriceX96
 *   v3 caveat: no tick data — if the move exits the current range this is a
 *   LOWER bound (cost jumps discontinuously outside the range).
 *
 * Fail-closed: a failed pool writes only an error row (is_success=false),
 * never a stale or partial estimate.
 */

export interface ManipCostPoolSpec {
  /** pool_key in DB; stable identifier */
  name: string;
  version: 'v2' | 'v3';
  addr: string;
  /** token0/token1 in canonical address order */
  t0: string;
  t0d: number;
  t1: string;
  t1d: number;
  /** swap fee as fraction (0.0005 = 0.05%) */
  fee: number;
  dex: string;
  feeTierLabel: string | null;
}

export interface ManipCostRow {
  snapshot_ts: string;
  pool_key: string;
  chain: string;
  pool_addr: string;
  dex: string;
  fee_tier: string | null;
  block_number: number | null;
  mid_price: number | null;
  tvl_usd: number | null;
  eth_usd_mid: number | null;
  pool_state: Record<string, unknown> | null;
  cost_curve: Array<Record<string, unknown>> | null;
  is_success: boolean;
  error_message: string | null;
  collector_version: string;
}

export interface ManipCostSummary {
  covered: string[];
  failed: string[];
  ethUsdMid: number | null;
  rpcUrl: string | null;
  blockNumber: number | null;
}

export const COLLECTOR_VERSION = 'manip-cost-v0';

/** Price-move factors: +0.5% … +10%. */
const R_STEPS = [1.005, 1.01, 1.02, 1.05, 1.1];
const Q96 = 2n ** 96n;

/**
 * Pool map v0 — curated, address-ordered token0/token1. This map is the real
 * maintenance cost of the block: every entry must be verified against the
 * feed's actual reference market before its cost numbers are quoted anywhere.
 * All Ethereum mainnet in v0.
 */
export const MANIP_COST_POOLS: ManipCostPoolSpec[] = [
  // USDC 0xA0b8… < WETH 0xC02a… ⇒ token0 = USDC
  {
    name: 'uniswap-v3-eth-usdc-005',
    version: 'v3',
    addr: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    t0: 'USDC',
    t0d: 6,
    t1: 'WETH',
    t1d: 18,
    fee: 0.0005,
    dex: 'uniswap-v3',
    feeTierLabel: '0.0005',
  },
  {
    name: 'uniswap-v2-usdc-weth',
    version: 'v2',
    addr: '0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc',
    t0: 'USDC',
    t0d: 6,
    t1: 'WETH',
    t1d: 18,
    fee: 0.003,
    dex: 'uniswap-v2',
    feeTierLabel: null, // v2 pools have no fee tier
  },
  // WBTC 0x2260… < WETH 0xC02a… ⇒ token0 = WBTC
  {
    name: 'uniswap-v3-wbtc-weth-030',
    version: 'v3',
    addr: '0xCBCdF9626bC03E24F779434178A73a0B4bad62eD',
    t0: 'WBTC',
    t0d: 8,
    t1: 'WETH',
    t1d: 18,
    fee: 0.003,
    dex: 'uniswap-v3',
    feeTierLabel: '0.003',
  },
];

/** ETH mainnet RPC endpoints: Alchemy first (workflow secret), public fallbacks. */
export function manipCostRpcEndpoints(): string[] {
  const endpoints: string[] = [];
  if (process.env.ALCHEMY_ETHEREUM_RPC) endpoints.push(process.env.ALCHEMY_ETHEREUM_RPC);
  endpoints.push(
    'https://ethereum-rpc.publicnode.com',
    'https://eth.llamarpc.com',
    'https://eth.drpc.org',
    'https://cloudflare-eth.com'
  );
  return endpoints;
}

const SELECTORS = {
  getReserves: '0x0902f1ac', // v2 getReserves()
  slot0: '0x3850c7bd', // v3 slot0()
  liquidity: '0x1a686502', // v3 liquidity()
  blockNumber: '0x4284c1e1', // eth_blockNumber via raw call is wrong; handled separately
} as const;

function words(result: string): string[] {
  const hex = result.slice(2);
  const out: string[] = [];
  for (let i = 0; i < hex.length / 64; i += 1) out.push(`0x${hex.slice(i * 64, (i + 1) * 64)}`);
  return out;
}

interface RpcBatchResult {
  results: string[];
  rpcUrl: string;
}

async function rpcBatch(
  urls: string[],
  calls: Array<{ to: string; data: string }>,
  fetchImpl: typeof fetch
): Promise<RpcBatchResult> {
  const body = JSON.stringify(
    calls.map((c, i) => ({
      jsonrpc: '2.0',
      id: i,
      method: 'eth_call',
      params: [{ to: c.to, data: c.data }, 'latest'],
    }))
  );
  let lastError = 'no endpoints configured';
  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15_000);
      let res: Response;
      try {
        res = await fetchImpl(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Array<{ result?: string; error?: unknown }>;
      if (!Array.isArray(json) || json.length !== calls.length) {
        throw new Error('unexpected rpc batch response shape');
      }
      const bad = json.find((r) => r.error || typeof r.result !== 'string');
      if (bad) throw new Error('rpc error in batch');
      return { results: json.map((r) => r.result as string), rpcUrl: url };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error(`[manip-cost] rpc ${url} failed: ${lastError}`);
    }
  }
  throw new Error(`all RPC endpoints failed (last: ${lastError})`);
}

async function fetchBlockNumber(urls: string[], fetchImpl: typeof fetch): Promise<number | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    let res: Response;
    try {
      res = await fetchImpl(urls[0], {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string };
    return json.result ? parseInt(json.result, 16) : null;
  } catch {
    return null;
  }
}

interface PoolState {
  spec: ManipCostPoolSpec;
  price: number; // token1 per token0 (human)
  x0: number; // token0 human units
  y0: number; // token1 human units
  liquidityRaw?: string;
  sqrtPriceX96?: string;
}

function decodeState(spec: ManipCostPoolSpec, results: string[], startIdx: number): PoolState {
  if (spec.version === 'v2') {
    const w = words(results[startIdx]);
    const r0 = BigInt(w[0]);
    const r1 = BigInt(w[1]);
    const x0 = Number(r0) / 10 ** spec.t0d;
    const y0 = Number(r1) / 10 ** spec.t1d;
    return { spec, x0, y0, price: y0 / x0 };
  }
  const sqrtPriceX96 = BigInt(words(results[startIdx])[0]);
  const L = BigInt(words(results[startIdx + 1])[0]);
  // price_human = (sqrtPriceX96 / 2^96)^2 * 10^(t0d − t1d); stay in BigInt until ratio.
  const rawRatio = (sqrtPriceX96 * sqrtPriceX96) >> 192n;
  const price = Number(rawRatio) * 10 ** (spec.t0d - spec.t1d);
  const yRaw = (L * sqrtPriceX96) / Q96;
  const xRaw = (L * Q96) / sqrtPriceX96;
  return {
    spec,
    x0: Number(xRaw) / 10 ** spec.t0d,
    y0: Number(yRaw) / 10 ** spec.t1d,
    price,
    liquidityRaw: String(L),
    sqrtPriceX96: String(sqrtPriceX96),
  };
}

/**
 * One collection pass. Never throws for per-pool failures — those become
 * fail-closed error rows. Throws only if the entire RPC layer is unreachable
 * (no rows can be written at all).
 */
export async function collectManipCost(
  snapshotTs: Date,
  opts?: {
    pools?: ManipCostPoolSpec[];
    rpcEndpoints?: string[];
    fetchImpl?: typeof fetch;
  }
): Promise<{ rows: ManipCostRow[]; summary: ManipCostSummary }> {
  const pools = opts?.pools ?? MANIP_COST_POOLS;
  const endpoints = opts?.rpcEndpoints ?? manipCostRpcEndpoints();
  const fetchImpl = opts?.fetchImpl ?? fetch;

  const calls: Array<{ to: string; data: string }> = [];
  for (const p of pools) {
    if (p.version === 'v2') {
      calls.push({ to: p.addr, data: SELECTORS.getReserves });
    } else {
      calls.push({ to: p.addr, data: SELECTORS.slot0 }, { to: p.addr, data: SELECTORS.liquidity });
    }
  }

  const { results, rpcUrl } = await rpcBatch(endpoints, calls, fetchImpl);
  const blockNumber = await fetchBlockNumber(endpoints, fetchImpl);

  const states: Array<{ spec: ManipCostPoolSpec; state?: PoolState; error?: string }> = pools.map(
    (spec) => ({ spec })
  );
  // Decode per pool by its EXPECTED call count — a decode failure must never
  // desynchronize the result window for subsequent pools (misaligned decode
  // would silently read another pool's state as reserves).
  let callIdx = 0;
  for (let i = 0; i < pools.length; i += 1) {
    const spec = pools[i];
    const callsForPool = spec.version === 'v2' ? 1 : 2;
    try {
      states[i] = { spec, state: decodeState(spec, results, callIdx) };
    } catch (e) {
      states[i] = { spec, error: e instanceof Error ? e.message : String(e) };
    }
    callIdx += callsForPool;
  }

  // Cross-pool USD valuation. ETH/USD from the v3 ETH/USDC pool
  // (price = WETH per USDC ⇒ ETH/USD = 1/price). WBTC priced through WETH.
  const ethState = states.find((s) => s.spec.name === 'uniswap-v3-eth-usdc-005');
  const ethUsdMid =
    ethState?.state && ethState.state.spec.t0 === 'USDC' ? 1 / ethState.state.price : null;
  const wbtcState = states.find((s) => s.spec.name === 'uniswap-v3-wbtc-weth-030');
  const wbtcUsd = wbtcState?.state && ethUsdMid ? wbtcState.state.price * ethUsdMid : null;
  const tokenUsd: Record<string, number | null> = {
    USDC: 1,
    WETH: ethUsdMid,
    ETH: ethUsdMid,
    WBTC: wbtcUsd,
  };

  const snapshotIso = snapshotTs.toISOString();
  const rows: ManipCostRow[] = [];
  const covered: string[] = [];
  const failed: string[] = [];

  for (const s of states) {
    const base = {
      snapshot_ts: snapshotIso,
      pool_key: s.spec.name,
      chain: 'ethereum',
      pool_addr: s.spec.addr,
      dex: s.spec.dex,
      fee_tier: s.spec.feeTierLabel ?? null,
      block_number: blockNumber,
      eth_usd_mid: ethUsdMid,
      collector_version: COLLECTOR_VERSION,
    };

    if (!s.state) {
      failed.push(s.spec.name);
      rows.push({
        ...base,
        mid_price: null,
        tvl_usd: null,
        pool_state: null,
        cost_curve: null,
        is_success: false,
        error_message: s.error ?? 'unknown decode failure',
      });
      continue;
    }
    if (ethUsdMid == null) {
      failed.push(s.spec.name);
      rows.push({
        ...base,
        mid_price: null,
        tvl_usd: null,
        pool_state: null,
        cost_curve: null,
        is_success: false,
        error_message:
          'no eth_usd_mid this round — cross-pool USD valuation unavailable (fail-closed)',
      });
      continue;
    }

    const st = s.state;
    const usd0 = tokenUsd[st.spec.t0];
    const usd1 = tokenUsd[st.spec.t1];
    if (usd0 == null || usd1 == null) {
      failed.push(s.spec.name);
      rows.push({
        ...base,
        mid_price: null,
        tvl_usd: null,
        pool_state: null,
        cost_curve: null,
        is_success: false,
        error_message: `token USD legs unavailable for ${st.spec.t0}/${st.spec.t1} (fail-closed)`,
      });
      continue;
    }

    const tvlUsd = st.x0 * usd0 + st.y0 * usd1; // in-range depth for v3
    const costCurve = R_STEPS.map((r) => {
      const sq = Math.sqrt(r) - 1;
      const upAmt1 = st.y0 * sq; // sell token1 to push price up
      const dnAmt0 = st.x0 * sq; // sell token0 to push price down
      const upUsd = upAmt1 * usd1;
      const dnUsd = dnAmt0 * usd0;
      return {
        move_pct: Number(((r - 1) * 100).toFixed(4)),
        up_usd: Number(upUsd.toFixed(2)),
        down_usd: Number(dnUsd.toFixed(2)),
        up_roundtrip_fee_usd: Number((upUsd * st.spec.fee * 2).toFixed(2)),
        down_roundtrip_fee_usd: Number((dnUsd * st.spec.fee * 2).toFixed(2)),
        within_range_assumed: st.spec.version === 'v3' ? true : null,
      };
    });

    covered.push(s.spec.name);
    rows.push({
      ...base,
      mid_price: st.price,
      tvl_usd: Number(tvlUsd.toFixed(2)),
      pool_state: {
        version: st.spec.version,
        tokens: {
          [st.spec.t0]: { decimals: st.spec.t0d },
          [st.spec.t1]: { decimals: st.spec.t1d },
        },
        depth: { [st.spec.t0]: st.x0, [st.spec.t1]: st.y0 },
        ...(st.spec.version === 'v3'
          ? { liquidity_raw: st.liquidityRaw, sqrt_price_x96: st.sqrtPriceX96 }
          : {}),
        usd_legs: { [st.spec.t0]: usd0, [st.spec.t1]: usd1 },
        v3_caveat:
          st.spec.version === 'v3'
            ? 'no tick data — cost curve is a lower bound if the move exits the active range'
            : undefined,
      },
      cost_curve: costCurve,
      is_success: true,
      error_message: null,
    });
  }

  return {
    rows,
    summary: { covered, failed, ethUsdMid, rpcUrl, blockNumber },
  };
}
