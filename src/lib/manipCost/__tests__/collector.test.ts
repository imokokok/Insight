import { collectManipCost } from '@/lib/manipCost/collector';

type JsonRpcResponse = { jsonrpc: string; id: number; result: string };

const word = (v: bigint) => v.toString(16).padStart(64, '0');
const encWords = (vs: bigint[]) => '0x' + vs.map(word).join('');

// --- fixture on-chain states (exact BigInt values, expectations derived by hand) ---
// v2 USDC/WETH: 40M USDC / 10k WETH  => price = 2.5e-4 WETH per USDC
const V2_R0 = 40_000_000_000_000n; // 40M USDC (6d)
const V2_R1 = 10_000_000_000_000_000_000_000n; // 10k WETH (18d)
// v3 USDC/WETH: sqrtPriceX96/2^96 = 15812 => price = 15812^2 * 1e-12 ≈ 2.50013e-4 WETH per USDC
// => ETH/USD ≈ 3999.79
const V3_ETH_X = 2n ** 96n * 15_812n;
const V3_ETH_L = 10n ** 30n;
// v3 WBTC/WETH: sqrtPriceX96/2^96 = 400000 => price = 400000^2 * 1e-10 = 16 WETH per WBTC
const V3_WBTC_X = 2n ** 96n * 400_000n;
const V3_WBTC_L = 10n ** 28n;

function rpcBatchResponse(results: string[]) {
  return results.map((result, id) => ({ jsonrpc: '2.0', id, result }) as JsonRpcResponse);
}

function makeFetchImpl(opts?: { corruptEthUsdcSlot0?: boolean }) {
  return jest.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Array<{ method: string }> | { method: string };
    if (!Array.isArray(body)) {
      // eth_blockNumber
      return {
        ok: true,
        status: 200,
        json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x1234' }),
      } as Response;
    }
    // batch of eth_call in POOLS order: v3 eth-usdc (slot0, liquidity), v2 (getReserves),
    // v3 wbtc-weth (slot0, liquidity)
    const slot0Eth = opts?.corruptEthUsdcSlot0 ? '0x' : encWords([V3_ETH_X]);
    return {
      ok: true,
      status: 200,
      json: async () =>
        rpcBatchResponse([
          slot0Eth, // eth-usdc slot0
          encWords([V3_ETH_L]), // eth-usdc liquidity
          encWords([V2_R0, V2_R1, 0n]), // v2 getReserves (uint112, uint112, uint32)
          encWords([V3_WBTC_X]), // wbtc-weth slot0
          encWords([V3_WBTC_L]), // wbtc-weth liquidity
        ]),
    } as Response;
  });
}

describe('collectManipCost', () => {
  it('computes the closed-form cost curve from live pool state (exact math)', async () => {
    const { rows, summary } = await collectManipCost(new Date('2026-10-11T08:00:00Z'), {
      fetchImpl: makeFetchImpl(),
    });

    // eth_usd_mid = 1 / (15812^2 * 1e-12) ≈ 3999.79
    const ethUsd = summary.ethUsdMid ?? 0;
    expect(ethUsd).toBeGreaterThan(3999);
    expect(ethUsd).toBeLessThan(4001);

    expect(summary.covered).toEqual([
      'uniswap-v3-eth-usdc-005',
      'uniswap-v2-usdc-weth',
      'uniswap-v3-wbtc-weth-030',
    ]);
    expect(summary.failed).toEqual([]);
    expect(summary.blockNumber).toBe(0x1234);

    // v2 row: exact reserves known — closed form by hand
    const v2 = rows.find((r) => r.pool_key === 'uniswap-v2-usdc-weth');
    expect(v2?.is_success).toBe(true);
    // +1% up: sell Δy = 10000 * (√1.01 − 1) = 49.8756… WETH @ ~$4000 ≈ $199,502
    const up1 = v2?.cost_curve?.find((c) => c.move_pct === 1);
    expect(up1).toBeDefined();
    const expectedUpUsd = 10_000 * (Math.sqrt(1.01) - 1) * ethUsd;
    // (BigInt >> 192 truncation + Number rounding ⇒ ~1e-8 relative noise; 1e-6 is generous)
    expect(Math.abs((up1?.up_usd as number) - expectedUpUsd)).toBeLessThan(expectedUpUsd * 1e-6);
    // down: 40M USDC * (√1.01 − 1) — USDC leg is exact $1
    const expectedDownUsd = 40_000_000 * (Math.sqrt(1.01) - 1);
    expect(Math.abs((up1?.down_usd as number) - expectedDownUsd)).toBeLessThan(0.01);
    // roundtrip fee = trade size × 0.003 × 2 (stored rounded to 2dp)
    expect(up1?.up_roundtrip_fee_usd).toBeCloseTo((up1?.up_usd as number) * 0.006, 1);

    // tvl for v2 = 40M + 10000*ethUsd
    expect(v2?.tvl_usd).toBeCloseTo(40_000_000 + 10_000 * ethUsd, 0);
    expect(v2?.eth_usd_mid).toBeCloseTo(ethUsd, 6);
    expect(v2?.collector_version).toBeTruthy();

    // v3 rows carry the lower-bound caveat
    const v3 = rows.find((r) => r.pool_key === 'uniswap-v3-eth-usdc-005');
    expect((v3?.pool_state as Record<string, unknown>).v3_caveat).toContain('lower bound');
    expect(v3?.cost_curve?.every((c) => c.within_range_assumed === true)).toBe(true);
    // WBTC priced through WETH: wbtcUsd ≈ 16 × ethUsd
    const wbtc = rows.find((r) => r.pool_key === 'uniswap-v3-wbtc-weth-030');
    expect(wbtc?.is_success).toBe(true);
    expect(
      ((wbtc?.pool_state as Record<string, unknown>).usd_legs as Record<string, number>).WBTC
    ).toBeGreaterThan(15 * ethUsd);
  });

  it('fail-closes every pool when the ETH/USD reference leg cannot be decoded', async () => {
    const { rows, summary } = await collectManipCost(new Date('2026-10-11T08:00:00Z'), {
      fetchImpl: makeFetchImpl({ corruptEthUsdcSlot0: true }),
    });

    // All three pools depend on eth_usd_mid for USD valuation → none may emit
    // a priced estimate (no stale/partial numbers). The undecodable pool gets
    // its decode error; the rest are explicitly valuation-blocked.
    expect(rows.every((r) => r.is_success === false)).toBe(true);
    expect(rows.every((r) => r.cost_curve === null)).toBe(true);
    expect(rows.every((r) => (r.error_message ?? '').length > 0)).toBe(true);
    expect(rows.filter((r) => (r.error_message ?? '').includes('fail-closed'))).toHaveLength(2);
    expect(summary.covered).toEqual([]);
    expect(summary.failed).toHaveLength(3);
  });
});
