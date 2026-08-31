/**
 * @fileoverview Per-chain RPC endpoint resolution for the execution collector.
 *
 * The collector needs public-client reads (getTransactionReceipt, getBlockByNumber,
 * decimals()) but the codebase's oracle RPC config is API3-specific and not a
 * general-purpose chain registry. Rather than push a general registry into the
 * oracle layer, this module owns the small, execution-relevant subset of chains.
 *
 * Honesty rule baked in: an unsupported chain returns null, never a guessed
 * endpoint. The caller turns a null into a clean "UNSUPPORTED_CHAIN" error, which
 * is the honest outcome for a chain we cannot read. A wrong endpoint would
 * produce a confident receipt built on unreachable evidence.
 */

import { ALCHEMY_RPC } from '@/lib/config/serverEnv';

/** Public fallback RPCs, matching the fallbacks already used in the oracle
 *  layer. Alchemy is preferred when configured; these are the safety net. */
const PUBLIC_FALLBACKS: Record<number, string[]> = {
  1: ['https://eth.llamarpc.com', 'https://ethereum.publicnode.com'],
  42161: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum.publicnode.com'],
  8453: ['https://mainnet.base.org', 'https://base.publicnode.com'],
  137: ['https://polygon-rpc.com', 'https://polygon.publicnode.com'],
};

/** Map an Alchemy network key to its chain id. */
const ALCHEMY_BY_CHAIN: Record<number, string | undefined> = {
  1: ALCHEMY_RPC.ethereum,
  42161: ALCHEMY_RPC.arbitrum,
  8453: ALCHEMY_RPC.base,
  137: ALCHEMY_RPC.polygon,
  10: ALCHEMY_RPC.optimism,
  59144: ALCHEMY_RPC.linea,
};

/**
 * Resolve RPC endpoints for a chain. Returns null for chains we do not support
 * (the caller must treat that as a hard error, not a silent default).
 *
 * Priority: explicit env override (EXECUTION_RPC_<CHAINID>, comma-separated) >
 * configured Alchemy endpoint > public fallbacks.
 */
export function getRpcEndpoints(chainId: number): string[] | null {
  const override = process.env[`EXECUTION_RPC_${chainId}`];
  if (override && override.trim().length > 0) {
    return override
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  const alchemy = ALCHEMY_BY_CHAIN[chainId];
  const fallbacks = PUBLIC_FALLBACKS[chainId];
  if (alchemy && fallbacks) return [alchemy, ...fallbacks];
  if (alchemy) return [alchemy];
  if (fallbacks) return fallbacks;
  return null;
}
