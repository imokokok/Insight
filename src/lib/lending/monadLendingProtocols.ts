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

// ---------------------------------------------------------------------------
// Euler V2 on Monad (chainId 143) — reviewed deployment (2026-11-06)
// ---------------------------------------------------------------------------

/**
 * Monad Euler V2 deployment descriptor.
 *
 * Verification result (2026-11-06), stated plainly:
 *
 * - Official first-hand source: euler-xyz/euler-interfaces
 *   addresses/143/CoreAddresses.json pins the Monad-mainnet eVaultFactory,
 *   EVC and protocolConfig.
 * - scripts/verify-euler-monad-vaults.mjs confirmed on-chain that each
 *   reviewed vault below is a canonical factory proxy (isProxy=true) with
 *   correct EVC wiring, and ranked them by live totalAssets against the
 *   official euler-simple-monad subgraph (168 vaults total).
 * - TVL leaders evUSD-2 / gAUSD-1 / eAUSD-16 / eAUSD-17 (vUSD/gAUSD/AUSD
 *   ecosystem credit tokens) and PT-USDat (Pendle maturity asset) are outside
 *   the stablecoin direct-lending scope and are deliberately NOT registered.
 * - Clearstar Earn USDC 0xe1bca19baa63894d374578320551633320436523 appears in
 *   the subgraph with isProxy=false (not a canonical-factory deployment) and
 *   is correctly refused — the verification logic is doing its job.
 *
 * => VERIFIED. A VERIFIED descriptor is NOT an ALLOW: the guard still runs a
 * live resolver (factory isProxy + EVC wiring + asset symbol + LTVFull/oracle
 * reads) for every decision, and the evaluator (assessMonadLendingGuard)
 * fails closed for any descriptor that is not fully specified.
 */
export type MonadEulerVerificationStatus = 'UNVERIFIED' | 'VERIFIED';

export interface MonadEulerVaultDescriptor {
  address: `0x${string}`;
  assetSymbol: string;
}

export interface MonadEulerDeploymentDescriptor {
  status: MonadEulerVerificationStatus;
  chainId: typeof MONAD_CHAIN_ID;
  /** Euler's canonical EVault factory on Monad. */
  eVaultFactory: `0x${string}` | null;
  /** Ethereum Vault Connector on Monad. */
  evc: `0x${string}` | null;
  /** Reviewed EVault market list. */
  vaults: readonly MonadEulerVaultDescriptor[];
  /** First-hand source (official deployment repo file@commit / official docs). */
  sourceRef: string | null;
  note: string;
}

export const MONAD_EULER_REVIEWED_DESCRIPTOR: MonadEulerDeploymentDescriptor = {
  status: 'VERIFIED',
  chainId: MONAD_CHAIN_ID,
  eVaultFactory: '0xba4dd672062de8feedb665dd4410658864483f1e',
  evc: '0x7a9324e8f270413fa2e458f5831226d99c7477cd',
  vaults: [
    // eUSDC-17, TVL ~9.1M
    { address: '0x06047833d9aac144f7f4e9b8234d2c7dda1a8baf', assetSymbol: 'USDC' },
    // eUSDC-15, TVL ~4.2M
    { address: '0xa3b64e2674463c98cbd21807055d8c1e008b6e79', assetSymbol: 'USDC' },
    // eUSDC-12, TVL ~3.4M
    { address: '0x1905eddf5943ef6c92ccf1469bd40fc2cb4a77b0', assetSymbol: 'USDC' },
    // eUSDT0-13, TVL ~2.5M
    { address: '0xcf450973dee1ee41cb708496bf73f34324180035', assetSymbol: 'USDT0' },
  ],
  sourceRef:
    'euler-xyz/euler-interfaces addresses/143/CoreAddresses.json + scripts/verify-euler-monad-vaults.mjs on-chain verification (2026-11-06)',
  note: '2026-11-06 已核实：eVaultFactory / EVC 来自官方 euler-interfaces 143 地址簿，四个 reviewed vault 经链上 isProxy + EVC wiring + totalAssets 排序确认；VERIFIED descriptor 不等于 ALLOW，每笔决策仍需 live resolver 链上验证。',
};

/** Injection point: a reviewed registration is the default; callers may override. */
export function defaultMonadEulerDescriptor(): MonadEulerDeploymentDescriptor {
  return MONAD_EULER_REVIEWED_DESCRIPTOR;
}
