/**
 * Chronicle's reviewed, directly-readable USD feeds on Monad mainnet.
 *
 * Source: Monad's public `monad-crypto/protocols` registry
 * (`mainnet/chronicle.jsonc`), then a direct `readWithAge()` verification
 * through Monad RPC on 2026-10-24. The registry exposed 29 contracts at
 * review time. Seven are intentionally omitted here because they either
 * rejected an unauthenticated `readWithAge()` or returned an old observation;
 * an advertised contract is not evidence that Insight can read a current
 * price. Add them only after a fresh, directly-readable verification.
 */
export const CHRONICLE_MONAD_CHAIN_ID = 143;

export const CHRONICLE_MONAD_RPC_ENDPOINTS = [
  'https://rpc.monad.xyz',
  'https://rpc1.monad.xyz',
  'https://rpc2.monad.xyz',
  'https://rpc3.monad.xyz',
  'https://rpc-mainnet.monadinfra.com',
] as const;

/** Chronicle's Monad dashboard publishes no more than 30 minutes between updates. */
export const CHRONICLE_MONAD_MAX_STALENESS_SECONDS = 30 * 60;
export const CHRONICLE_MONAD_PRICE_DEVIATION_PERCENT = 0.15;

export interface ChronicleMonadFeed {
  /** Insight's canonical USD pair. */
  alias: string;
  /** Canonical key in Monad's public Chronicle registry. */
  feedName: string;
  /** Direct Chronicle price feed implementing `readWithAge()`. */
  address: `0x${string}`;
  maxStalenessSeconds: number;
  priceDeviationPercent: number;
}

const monadFeed = (
  alias: string,
  feedName: string,
  address: `0x${string}`
): ChronicleMonadFeed => ({
  alias,
  feedName,
  address,
  maxStalenessSeconds: CHRONICLE_MONAD_MAX_STALENESS_SECONDS,
  priceDeviationPercent: CHRONICLE_MONAD_PRICE_DEVIATION_PERCENT,
});

/**
 * Only feeds proven current and publicly readable at review time. Every entry
 * is a direct USD price, never a cross-rate or a redemption/reference rate.
 */
export const CHRONICLE_MONAD_PRICE_FEEDS: readonly ChronicleMonadFeed[] = [
  monadFeed('ARB/USD', 'Chronicle_ARB_USD_1', '0x55900781784cC88e10b53B400241a8B5099b1a58'),
  monadFeed('BERA/USD', 'Chronicle_BERA_USD_1', '0xaE9Ef5d8193348E484805683aA4026F4d410d9E9'),
  monadFeed('BTC/USD', 'Chronicle_BTC_USD_1', '0xECd09Ce60c069384D6B91656A841097F1181A59e'),
  monadFeed('CBBTC/USD', 'Chronicle_CBBTC_USD_1', '0x8644203113402C1D9CBe0A39064E467eE76e2fBC'),
  monadFeed('DAI/USD', 'Chronicle_DAI_USD_1', '0x7FC72F82B67aD3bbbaDA92b62d412AB284f910A6'),
  monadFeed('ETH/USD', 'Chronicle_ETH_USD_1', '0xa7f041Fb6AfFb962162Ff3f318cA184299e4eC58'),
  monadFeed('MON/USD', 'Chronicle_MON_USD_1', '0x936a444C983347FFBfe3F26D1497CAbfA2BfE271'),
  monadFeed('POL/USD', 'Chronicle_POL_USD_1', '0xA3835b84BcaBF17C7509D09487E7B7169A82d64F'),
  monadFeed('PYUSD/USD', 'Chronicle_PYUSD_USD_1', '0xEe4631539c06aCC8c1f681C0b1b573FbC8506Da8'),
  monadFeed('SRUSD/USD', 'Chronicle_SRUSD_USD_1', '0x144a4B14115fcBe23408611a5307115a96ab5bA1'),
  monadFeed('STETH/USD', 'Chronicle_STETH_USD_1', '0xd52C49Ea370cDaa0E5912A98B3AAf3375768E49B'),
  monadFeed('STONE/USD', 'Chronicle_STONE_USD_1', '0xDa75F9d81dca1Ad7a2D3F628425c3736E2e7B685'),
  monadFeed('SUSDE/USD', 'Chronicle_SUSDE_USD_1', '0x46eA6F8Ad2F346801a346FB95E0e9E6106791291'),
  monadFeed('SUSDS/USD', 'Chronicle_SUSDS_USD_1', '0x812Aab12D9C323678C78d7EC6Aa76F4bc86f623a'),
  monadFeed('USDC/USD', 'Chronicle_USDC_USD_1', '0x8F9ad9205B442ACC5105Aac1F1efe5f09B194e1d'),
  monadFeed('USDE/USD', 'Chronicle_USDE_USD_1', '0x5B49FA5187F99DA89C644cd2C1c23ff3b1d8dd88'),
  monadFeed('USDS/USD', 'Chronicle_USDS_USD_1', '0x700EdC28DC93E72D76E8C1eA2Be0A50d60a4844D'),
  monadFeed('USDT/USD', 'Chronicle_USDT_USD_1', '0x83D794F01A3eDBdD92ae2f2EcC8e56b41eD7777c'),
  monadFeed('WBTC/USD', 'Chronicle_WBTC_USD_1', '0xf8689D8A90cDB562ea2B83cecE80c8a551a931C6'),
  monadFeed('WEETH/USD', 'Chronicle_WEETH_USD_1', '0x847A305548462557945088c97074524d1Fe9d563'),
  monadFeed('WETH/USD', 'Chronicle_WETH_USD_1', '0xD4920c3Eba8c0E4824afe7B3737fACD7C1022234'),
  monadFeed('WSTETH/USD', 'Chronicle_WSTETH_USD_1', '0x418541FFD62bDB3078fb669cB9c18D45942d9C3d'),
] as const;

const feedsByAlias = new Map(CHRONICLE_MONAD_PRICE_FEEDS.map((feed) => [feed.alias, feed]));

/** Resolve Insight's bare symbol or the canonical USD pair. */
export function resolveChronicleMonadFeed(symbol: string): ChronicleMonadFeed | null {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;
  return feedsByAlias.get(normalized) ?? feedsByAlias.get(`${normalized}/USD`) ?? null;
}
