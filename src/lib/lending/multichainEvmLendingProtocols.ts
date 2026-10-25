/**
 * Source-controlled identities for the additional EVM lending guard surface.
 *
 * A transaction is never admitted solely because it has a familiar ABI: its
 * chain, protocol and direct target must all match this reviewed registry.
 */

import { AaveV3Arbitrum, AaveV3BNB, AaveV3Polygon } from '@aave-dao/aave-address-book';

export const POLYGON_CHAIN_ID = 137 as const;
export const ARBITRUM_CHAIN_ID = 42161 as const;
export const BNB_CHAIN_ID = 56 as const;

export type MultichainEvmLendingChainId =
  | typeof POLYGON_CHAIN_ID
  | typeof ARBITRUM_CHAIN_ID
  | typeof BNB_CHAIN_ID;

export type AaveV3EvmProtocolId = 'aave-v3-polygon' | 'aave-v3-arbitrum' | 'aave-v3-bnb';

export const AAVE_V3_EVM_MARKETS = {
  'aave-v3-polygon': {
    chainId: POLYGON_CHAIN_ID,
    pool: AaveV3Polygon.POOL as `0x${string}`,
    poolAddressesProvider: AaveV3Polygon.POOL_ADDRESSES_PROVIDER as `0x${string}`,
    uiPoolDataProvider: AaveV3Polygon.UI_POOL_DATA_PROVIDER as `0x${string}`,
    assets: AaveV3Polygon.ASSETS as Record<string, { UNDERLYING: `0x${string}`; decimals: number }>,
  },
  'aave-v3-arbitrum': {
    chainId: ARBITRUM_CHAIN_ID,
    pool: AaveV3Arbitrum.POOL as `0x${string}`,
    poolAddressesProvider: AaveV3Arbitrum.POOL_ADDRESSES_PROVIDER as `0x${string}`,
    uiPoolDataProvider: AaveV3Arbitrum.UI_POOL_DATA_PROVIDER as `0x${string}`,
    assets: AaveV3Arbitrum.ASSETS as Record<
      string,
      { UNDERLYING: `0x${string}`; decimals: number }
    >,
  },
  'aave-v3-bnb': {
    chainId: BNB_CHAIN_ID,
    pool: AaveV3BNB.POOL as `0x${string}`,
    poolAddressesProvider: AaveV3BNB.POOL_ADDRESSES_PROVIDER as `0x${string}`,
    uiPoolDataProvider: AaveV3BNB.UI_POOL_DATA_PROVIDER as `0x${string}`,
    assets: AaveV3BNB.ASSETS as Record<string, { UNDERLYING: `0x${string}`; decimals: number }>,
  },
} as const;

/**
 * Venus BNB Chain Core Pool addresses from the protocol's deployed-pools
 * reference.  The vToken allowlist is intentionally limited to its deepest
 * core markets; new markets require an explicit review rather than inheriting
 * trust from a Comptroller listing.
 */
export const VENUS_CORE_POOL_COMPTROLLER = '0xfd36e2c2a6789db23113685031d7f16329158384' as const;
export const VENUS_CORE_POOL_MARKETS = {
  BNB: '0xa07c5b74c9b40447a954e1466938b865b6bbea36',
  BTCB: '0x882c173bc7ff3b7786ca16dfed3dfffb9ee7847b',
  ETH: '0xf508fcd89b8bd15579dc79a6827cb4686a3592c8',
  USDC: '0xeca88125a5adbe82614ffc12d0db554e2e2867c8',
  USDT: '0xfd5840cd36d94d7229439859c0112a4185bc0255',
} as const;

const AAVE_ALIASES: Record<string, string> = {
  ETH: 'WETH',
  WETH: 'WETH',
  BNB: 'WBNB',
  WBNB: 'WBNB',
  MATIC: 'WMATIC',
  POL: 'WPOL',
  BTC: 'WBTC',
};
const VENUS_ALIASES: Record<string, keyof typeof VENUS_CORE_POOL_MARKETS> = {
  BNB: 'BNB',
  WBNB: 'BNB',
  BTC: 'BTCB',
  BTCB: 'BTCB',
  ETH: 'ETH',
  WETH: 'ETH',
  USDC: 'USDC',
  USDT: 'USDT',
};

export function isAaveV3EvmProtocolId(value: string): value is AaveV3EvmProtocolId {
  return value in AAVE_V3_EVM_MARKETS;
}

export function aaveV3EvmMarket(protocolId: AaveV3EvmProtocolId) {
  return AAVE_V3_EVM_MARKETS[protocolId];
}

export function aaveV3EvmUnderlyingForSymbol(
  protocolId: AaveV3EvmProtocolId,
  symbol: string
): `0x${string}` | null {
  const assets = aaveV3EvmMarket(protocolId).assets;
  const requested = symbol.trim().toUpperCase();
  const canonical = AAVE_ALIASES[requested] ?? requested;
  const entry = assets[canonical] ?? assets[requested];
  return entry?.UNDERLYING.toLowerCase() as `0x${string}` | null;
}

export function venusCoreMarketForSymbol(symbol: string): `0x${string}` | null {
  const canonical = VENUS_ALIASES[symbol.trim().toUpperCase()];
  return canonical ? VENUS_CORE_POOL_MARKETS[canonical] : null;
}

export function isVenusNativeMarket(target: string): boolean {
  return target.toLowerCase() === VENUS_CORE_POOL_MARKETS.BNB;
}
