/**
 * Reviewed Monad lending deployment identities.
 *
 * Addresses come from Aave's published address book and Morpho's canonical
 * singleton deployment.  This is deliberately a small, source-controlled
 * allow-list: a compatible ABI alone must never put a target into a signed
 * exact-call decision.
 */

export const MONAD_CHAIN_ID = 143 as const;

export const AAVE_V3_MONAD_POOL = '0x69a5f9ad4f96ebf0a0c792dd42a01cc5c0102fef' as const;
export const AAVE_V3_MONAD_POOL_ADDRESSES_PROVIDER =
  '0x34793fb9935f7bb5e5ae920fb963f39063e7a615' as const;
export const AAVE_V3_MONAD_UI_POOL_DATA_PROVIDER =
  '0xa7d38785be3422c25677a8aa4a44d3a0853a3a17' as const;

/** Morpho Blue's immutable, canonical Monad singleton. */
export const MORPHO_BLUE_MONAD = '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb' as const;

/**
 * Assets intentionally admitted to the direct Aave v3 path.  The guard still
 * reads reserve status and risk factors live for every decision.  Native MON
 * wrapping, gateways, eMode, permits and delegated/batched calls are outside
 * this direct-call v1 scope.
 */
export const AAVE_V3_MONAD_ASSETS = {
  USDT0: '0xe7cd86e13ac4309349f30b3435a9d337750fc82d',
  USDC: '0x754704bc059f8c67012fed69bc8a327a5aafb603',
  USDE: '0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34',
  WETH: '0xee8c0e9f1bffb4eb878d8f15f368a02a35481242',
  CBBTC: '0xd18b7ec58cdf4876f6afebd3ed1730e4ce10414b',
  WSTETH: '0x10aeaf63194db8d453d4d85a06e5efe1dd0b5417',
  WEETH: '0xa3d68b74bf0528fdd07263c60d6488749044914b',
  SUSDE: '0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2',
  GHO: '0xfc421ad3c883bf9e7c4f42de845c4e4405799e73',
} as const;

const AAVE_V3_MONAD_SYMBOL_ALIASES: Record<string, keyof typeof AAVE_V3_MONAD_ASSETS> = {
  USDT: 'USDT0',
  USDT0: 'USDT0',
  USDC: 'USDC',
  USDE: 'USDE',
  WETH: 'WETH',
  ETH: 'WETH',
  CBBTC: 'CBBTC',
  BTC: 'CBBTC',
  WSTETH: 'WSTETH',
  WEETH: 'WEETH',
  SUSDE: 'SUSDE',
  GHO: 'GHO',
};

export function canonicalMonadAaveSymbol(symbol: string): keyof typeof AAVE_V3_MONAD_ASSETS | null {
  return AAVE_V3_MONAD_SYMBOL_ALIASES[symbol.trim().toUpperCase()] ?? null;
}

export function monadAaveUnderlyingForSymbol(symbol: string): `0x${string}` | null {
  const canonical = canonicalMonadAaveSymbol(symbol);
  return canonical ? (AAVE_V3_MONAD_ASSETS[canonical] as `0x${string}`) : null;
}
