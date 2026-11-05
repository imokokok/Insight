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
// Euler V2 on Monad (chainId 143) — injectable, deliberately UNVERIFIED
// ---------------------------------------------------------------------------

/**
 * Monad Euler V2 deployment descriptor.
 *
 * Verification result (2026-11-05), stated plainly so nobody mistakes a
 * placeholder for a reviewed deployment:
 *
 * - In-repo: EULER_V2_EVM_MARKETS (src/lib/lending/multichainEvmLendingProtocols.ts:114-125)
 *   registers only `euler-v2-base` / `euler-v2-arbitrum`. The reviewed registry
 *   likewise has no chainId-143 Euler descriptor. There is no Monad Euler
 *   eVaultFactory, EVC, or EVault market list anywhere in this repository.
 * - Public first-hand sources: docs.euler.finance documents the EVC/EVK
 *   architecture but publishes no Monad-mainnet core addresses; the deployment
 *   addresses surfaced by a first-hand-source check belong to HyperEVM
 *   (HypurrFi), Base, and Arbitrum. No verifiable Monad-mainnet Euler V2
 *   eVaultFactory / EVC / EVault market list constant was found.
 *
 * => 未找到，需人工 review 后登记. Every address field is null on purpose;
 * NEVER fabricate a contract address. The descriptor stays UNVERIFIED until a
 * human registers a first-hand source reference and the concrete addresses.
 * The evaluator (assessMonadLendingGuard) fails closed for any UNVERIFIED
 * descriptor and never reads a chain address that does not exist here.
 */
export type MonadEulerVerificationStatus = 'UNVERIFIED' | 'VERIFIED';

export interface MonadEulerVaultDescriptor {
  address: `0x${string}`;
  assetSymbol: string;
}

export interface MonadEulerDeploymentDescriptor {
  status: MonadEulerVerificationStatus;
  chainId: typeof MONAD_CHAIN_ID;
  /** Euler's canonical EVault factory on Monad. null while UNVERIFIED. */
  eVaultFactory: `0x${string}` | null;
  /** Ethereum Vault Connector on Monad. null while UNVERIFIED. */
  evc: `0x${string}` | null;
  /** Reviewed EVault market list. Empty while UNVERIFIED. */
  vaults: readonly MonadEulerVaultDescriptor[];
  /** First-hand source (official deployment repo file@commit / official docs). */
  sourceRef: string | null;
  note: string;
}

export const MONAD_EULER_UNVERIFIED_DESCRIPTOR: MonadEulerDeploymentDescriptor = {
  status: 'UNVERIFIED',
  chainId: MONAD_CHAIN_ID,
  eVaultFactory: null,
  evc: null,
  vaults: [],
  sourceRef: null,
  note: '未找到，需人工 review 后登记：仓库与公开一手来源均未核实到 Monad 主网 Euler V2 的 eVaultFactory / EVC / EVault 市场清单地址；不编造常量。',
};

/** Injection point: UNVERIFIED by default; a reviewed registration overrides this. */
export function defaultMonadEulerDescriptor(): MonadEulerDeploymentDescriptor {
  return MONAD_EULER_UNVERIFIED_DESCRIPTOR;
}
