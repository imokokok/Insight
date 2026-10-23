/**
 * RedStone's reviewed direct-USD price feeds on Monad mainnet.
 *
 * Source: monad-crypto/protocols `mainnet/redstone.jsonc`, followed by direct
 * Monad RPC verification. Fundamental exchange-rate feeds are intentionally
 * excluded: a rate such as weETH/ETH must never be treated as a USD price.
 */
export const REDSTONE_MONAD_CHAIN_ID = 143;

export const REDSTONE_MONAD_RPC_ENDPOINTS = [
  'https://rpc.monad.xyz',
  'https://rpc1.monad.xyz',
  'https://rpc2.monad.xyz',
  'https://rpc3.monad.xyz',
  'https://rpc-mainnet.monadinfra.com',
] as const;

/** RedStone's Monad push policy: 0.5% movement or at least once per six hours. */
export const REDSTONE_MONAD_MAX_STALENESS_SECONDS = 6 * 60 * 60;
export const REDSTONE_MONAD_PRICE_DEVIATION_PERCENT = 0.5;

export interface RedStoneMonadFeed {
  alias: string;
  feedName: string;
  /** Chainlink AggregatorV3-compatible proxy on Monad mainnet. */
  address: `0x${string}`;
  maxStalenessSeconds: number;
  priceDeviationPercent: number;
}

const monadFeed = (alias: string, feedName: string, address: `0x${string}`): RedStoneMonadFeed => ({
  alias,
  feedName,
  address,
  maxStalenessSeconds: REDSTONE_MONAD_MAX_STALENESS_SECONDS,
  priceDeviationPercent: REDSTONE_MONAD_PRICE_DEVIATION_PERCENT,
});

export const REDSTONE_MONAD_PRICE_FEEDS: readonly RedStoneMonadFeed[] = [
  monadFeed('ETH/USD', 'ETH_USD', '0xc44be6D00307c3565FDf753e852Fc003036cBc13'),
  monadFeed('BTC/USD', 'BTC_USD', '0xED2B1ca5D7E246f615c2291De309643D41FeC97e'),
  monadFeed('MON/USD', 'MON_USD', '0x1C9582E87eD6E99bc23EC0e6Eb52eE9d7C0D6bcd'),
  monadFeed('USDC/USD', 'USDC_USD', '0x7A9b672fc20b5C89D6774514052b3e0899E5E263'),
  monadFeed('USDT/USD', 'USDT_USD', '0x90196F6D52fce394C79D1614265d36D3F0033Ccf'),
  monadFeed('DAI/USD', 'DAI_USD', '0x1b0FDa12D125B864756Bbf191ad20eaB10915a6F'),
  monadFeed('SOL/USD', 'SOL_USD', '0x0bE6929FD4ad87347e97A525DB6ac8E884FCDCeC'),
  monadFeed('WBTC/USD', 'WBTC_USD', '0x98ECE0D516f891a35278E3186772fb1545b274eB'),
  monadFeed('CBBTC/USD', 'cbBTC_USD', '0x7A532B1B204409472cB92cd07c8B0BB09DD2F520'),
  monadFeed('STETH/USD', 'stETH_USD', '0xD3A0C347b07Fd45F41270D557089B389Fa735C3d'),
  monadFeed('AUSD/USD', 'AUSD_USD', '0xFFD1339908E0deBE2416E03df0843B896b8944Fe'),
  monadFeed('APR/USD', 'APR_USD', '0xB144836c17C5d613Aa471f0BB9B79B55288c2C03'),
] as const;

const feedsByAlias = new Map(REDSTONE_MONAD_PRICE_FEEDS.map((feed) => [feed.alias, feed]));

/** Resolve either Insight's bare asset symbol or the canonical USD pair. */
export function resolveRedStoneMonadFeed(symbol: string): RedStoneMonadFeed | null {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;
  return feedsByAlias.get(normalized) ?? feedsByAlias.get(`${normalized}/USD`) ?? null;
}
