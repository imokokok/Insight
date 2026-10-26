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
export const BASE_CHAIN_ID = 8453 as const;

export type MultichainEvmLendingChainId =
  | typeof POLYGON_CHAIN_ID
  | typeof ARBITRUM_CHAIN_ID
  | typeof BNB_CHAIN_ID
  | typeof BASE_CHAIN_ID;

export type AaveV3EvmProtocolId = 'aave-v3-polygon' | 'aave-v3-arbitrum' | 'aave-v3-bnb';
export type MorphoBlueEvmProtocolId = 'morpho-blue-polygon' | 'morpho-blue-arbitrum';
export type CompoundV3EvmProtocolId = 'compound-v3-arbitrum';
export type ListaMoolahProtocolId = 'lista-moolah-bnb';
export type EulerV2EvmProtocolId = 'euler-v2-base' | 'euler-v2-arbitrum';
export type DolomiteProtocolId = 'dolomite-arbitrum';
/** Fluid's simple (T1) collateral/debt vaults only; LP-vault variants are not interchangeable. */
export type FluidVaultT1ProtocolId = 'fluid-vault-t1-base' | 'fluid-vault-t1-arbitrum';

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

/**
 * Morpho Blue uses the same audited core address on these deployments.  The
 * market identifier still commits to five immutable parameters, so the shared
 * address never expands a decision to an arbitrary market.
 */
export const MORPHO_BLUE_EVM_MARKETS = {
  'morpho-blue-polygon': {
    chainId: POLYGON_CHAIN_ID,
    morpho: '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
  },
  'morpho-blue-arbitrum': {
    chainId: ARBITRUM_CHAIN_ID,
    morpho: '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
  },
} as const;

/**
 * Compound's official Arbitrum native-USDC Comet and its reviewed collateral
 * universe.  The guard uses live `getAssetInfoByAddress` reads before issuing
 * an ALLOW; this registry merely pins the intended deployment and assets.
 */
export const COMPOUND_V3_ARBITRUM_COMET = '0x9c4ec768c28520b50860ea7a15bd7213a9ff58bf' as const;
export const COMPOUND_V3_ARBITRUM_USDC = '0xaf88d065e77c8cc2239327c5edb3a432268e5831' as const;
export const COMPOUND_V3_ARBITRUM_COLLATERAL_ASSETS = {
  ARB: '0x912ce59144191c1204e64559fe8253a0e49e6548',
  GMX: '0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a',
  WETH: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  WBTC: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
} as const;

/**
 * Lista's Moolah is a Morpho-Blue-style isolated market system.  The exact
 * call profile intentionally targets only its documented BSC core proxy and
 * recomputes each market ID from the tuple supplied in calldata.
 */
export const LISTA_MOOLAH_BNB = '0x8f73b65b4caaf64fba2af91cc5d4a2a1318e5d8c' as const;

/**
 * Euler publishes this core registry together with bytecode provenance for
 * every production deployment.  Individual EVaults remain permissionless, so
 * the guard also verifies factory `isProxy(vault)` and the expected EVC live.
 */
export const EULER_V2_EVM_MARKETS = {
  'euler-v2-base': {
    chainId: BASE_CHAIN_ID,
    eVaultFactory: '0x7f321498a801a191a93c840750ed637149ddf8d0',
    evc: '0x5301c7dd20bd945d2013b48ed0dee3a284ca8989',
  },
  'euler-v2-arbitrum': {
    chainId: ARBITRUM_CHAIN_ID,
    eVaultFactory: '0x78df1cf5bf06a7f27f2acc580b934238c1b80d50',
    evc: '0x6302ef0f34100cddfb5489fbcb6ee1aa95cd1066',
  },
} as const;

/** Dolomite's canonical Arbitrum margin engine, published in its address book. */
export const DOLOMITE_ARBITRUM_MARGIN = '0x6bd780e7fdf01d77e4d475c821f1e7ae05409072' as const;

/**
 * Fluid publishes the same VaultFactory deployment address for Base and
 * Arbitrum. Individual vaults are discovered and authenticated live with
 * `isVault` and `VAULT_FACTORY`, never by trusting a user-supplied target.
 */
export const FLUID_VAULT_T1_EVM_MARKETS = {
  'fluid-vault-t1-base': {
    chainId: BASE_CHAIN_ID,
    vaultFactory: '0x324c5dc1fc42c7a4d43d92df1eba58a54d13bf2d',
  },
  'fluid-vault-t1-arbitrum': {
    chainId: ARBITRUM_CHAIN_ID,
    vaultFactory: '0x324c5dc1fc42c7a4d43d92df1eba58a54d13bf2d',
  },
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

export function isMorphoBlueEvmProtocolId(value: string): value is MorphoBlueEvmProtocolId {
  return value in MORPHO_BLUE_EVM_MARKETS;
}

export function isCompoundV3EvmProtocolId(value: string): value is CompoundV3EvmProtocolId {
  return value === 'compound-v3-arbitrum';
}

export function isListaMoolahProtocolId(value: string): value is ListaMoolahProtocolId {
  return value === 'lista-moolah-bnb';
}

export function isEulerV2EvmProtocolId(value: string): value is EulerV2EvmProtocolId {
  return value in EULER_V2_EVM_MARKETS;
}

export function isDolomiteProtocolId(value: string): value is DolomiteProtocolId {
  return value === 'dolomite-arbitrum';
}

export function isFluidVaultT1ProtocolId(value: string): value is FluidVaultT1ProtocolId {
  return value in FLUID_VAULT_T1_EVM_MARKETS;
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

export function morphoBlueEvmMarket(protocolId: MorphoBlueEvmProtocolId) {
  return MORPHO_BLUE_EVM_MARKETS[protocolId];
}

export function eulerV2EvmMarket(protocolId: EulerV2EvmProtocolId) {
  return EULER_V2_EVM_MARKETS[protocolId];
}

export function fluidVaultT1EvmMarket(protocolId: FluidVaultT1ProtocolId) {
  return FLUID_VAULT_T1_EVM_MARKETS[protocolId];
}

export function compoundV3ArbitrumAssetForSymbol(symbol: string): `0x${string}` | null {
  const normalized = symbol.trim().toUpperCase();
  const canonical = normalized === 'ETH' ? 'WETH' : normalized === 'BTC' ? 'WBTC' : normalized;
  if (canonical === 'USDC') return COMPOUND_V3_ARBITRUM_USDC;
  return (
    (COMPOUND_V3_ARBITRUM_COLLATERAL_ASSETS[
      canonical as keyof typeof COMPOUND_V3_ARBITRUM_COLLATERAL_ASSETS
    ] as `0x${string}` | undefined) ?? null
  );
}

export function lendingProtocolChainId(
  protocolId:
    | AaveV3EvmProtocolId
    | MorphoBlueEvmProtocolId
    | CompoundV3EvmProtocolId
    | ListaMoolahProtocolId
    | EulerV2EvmProtocolId
    | DolomiteProtocolId
    | FluidVaultT1ProtocolId
    | 'venus-core-bnb'
): MultichainEvmLendingChainId {
  if (isAaveV3EvmProtocolId(protocolId)) return aaveV3EvmMarket(protocolId).chainId;
  if (isMorphoBlueEvmProtocolId(protocolId)) return morphoBlueEvmMarket(protocolId).chainId;
  if (isCompoundV3EvmProtocolId(protocolId)) return ARBITRUM_CHAIN_ID;
  if (isEulerV2EvmProtocolId(protocolId)) return eulerV2EvmMarket(protocolId).chainId;
  if (isDolomiteProtocolId(protocolId)) return ARBITRUM_CHAIN_ID;
  if (isFluidVaultT1ProtocolId(protocolId)) return fluidVaultT1EvmMarket(protocolId).chainId;
  return BNB_CHAIN_ID;
}

export function venusCoreMarketForSymbol(symbol: string): `0x${string}` | null {
  const canonical = VENUS_ALIASES[symbol.trim().toUpperCase()];
  return canonical ? VENUS_CORE_POOL_MARKETS[canonical] : null;
}

export function isVenusNativeMarket(target: string): boolean {
  return target.toLowerCase() === VENUS_CORE_POOL_MARKETS.BNB;
}
