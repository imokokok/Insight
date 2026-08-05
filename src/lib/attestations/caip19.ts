/**
 * @fileoverview CAIP-19 asset-identifier resolution for the v2 oracle safety
 * attestation.
 *
 * Raul's locked v2 spec requires the signed attestation to bind BOTH legs of a
 * trade via canonical CAIP-19 asset identifiers, kept strictly separate from
 * provider feed IDs:
 *
 *   - sourceAssetId / destinationAssetId → CAIP-19 (real on-chain asset identity)
 *   - providerFeedIds                    → evidence source (Chainlink feed
 *                                          contract / Pyth feed ID / API3 dAPI
 *                                          name / …), only in JSON + the
 *                                          providerObservationsHash, never the
 *                                          asset-id slot.
 *
 * CAIP-19 form used here (no `caip19:` scheme prefix, matching the v2 spec):
 *   - ERC-20 on EVM:  `eip155:{chainId}/erc20:{checksummedAddress}`
 *   - Native gas token: `eip155:{chainId}/slip44:{coinType}`
 *
 * IMPORTANT — source of token addresses:
 *   `oracle_feeds.address` is the oracle FEED identifier (Chainlink feed
 *   contract / Pyth feed ID / API3 dAPI name / DIA asset address / …), NOT a
 *   reliable ERC-20 token contract address. Using it as the CAIP-19 asset
 *   reference would conflate asset identity with evidence source — exactly the
 *   conflation Raul's spec forbids. Instead, real token contract addresses come
 *   from the canonical `TWAP_TOKEN_ADDRESSES` / `ETHEREUM_TOKEN_ADDRESSES`
 *   registries (the same hardcoded addresses TWAP uses for on-chain pool
 *   discovery). These addresses are canonical and immutable per (symbol, chain),
 *   which is what CAIP-19 requires.
 *
 * Determinism: the resolver is pure & synchronous — no DB reads — so a given
 * (symbol, chainId) always produces the same CAIP-19 string. This is mandatory
 * for the v2 test vectors (requestHash + evaluatedAssetIdsHash must be
 * reproducible by both sides) and for signature stability.
 */

import { getAddress } from 'viem';

import { TWAP_TOKEN_ADDRESSES } from '@/lib/oracles/constants/twapConstants';

// ---------------------------------------------------------------------------
// Native (gas-token) assets → SLIP-44 coin types
// ---------------------------------------------------------------------------

/**
 * SLIP-44 coin types for native gas tokens on EVM chains.
 * Source: https://github.com/satoshilabs/slips/blob/master/slip-0044.md
 *
 * A native asset is only resolvable on chains where it IS the gas token. ETH is
 * native on Ethereum L1 + the canonical ETH-gas L2s; BNB on BSC; POL/MATIC on
 * Polygon; AVAX on Avalanche. On any other chain these symbols resolve to their
 * wrapped/bridged ERC-20 (if registered) — never a wrong slip44.
 */
const NATIVE_ASSETS: Record<string, Record<number, number>> = {
  ETH: {
    1: 60, // Ethereum mainnet
    42161: 60, // Arbitrum One
    10: 60, // Optimism
    8453: 60, // Base
    324: 60, // zkSync Era
    534352: 60, // Scroll
    59144: 60, // Linea
    81457: 60, // Blast
  },
  BNB: {
    56: 714, // BNB Chain (BSC)
  },
  MATIC: {
    137: 966, // Polygon PoS (gas token, now POL)
  },
  POL: {
    137: 966, // Polygon PoS post-migration ticker
  },
  AVAX: {
    43114: 9005, // Avalanche C-Chain
  },
};

// ---------------------------------------------------------------------------
// Symbol aliases — price-reference symbol → canonical on-chain token symbol
// ---------------------------------------------------------------------------

/**
 * The pre-trade API takes a price symbol (what oracle feeds report, e.g. "BTC"),
 * but on EVM chains there is no native BTC — BTC exposure is held as WBTC. This
 * map rewrites a price symbol to the canonical wrapped ERC-20 symbol so the
 * CAIP-19 reference points at the actual on-chain token.
 *
 * Native symbols (ETH/BNB/MATIC/AVAX as gas tokens) are NOT aliased here — they
 * are handled by {@link NATIVE_ASSETS} on chains where they are native, and
 * resolve to their wrapped ERC-20 (WETH/…) elsewhere via the token registry.
 */
const SYMBOL_ALIASES: Record<string, string> = {
  BTC: 'WBTC',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Caip19Namespace = 'erc20' | 'slip44';

export interface Caip19Asset {
  /** Canonical CAIP-19 string, e.g. `eip155:1/erc20:0xA0b8…eB48`. */
  id: string;
  /** How the reference was derived. */
  namespace: Caip19Namespace;
  /** EVM chain id the asset lives on. */
  chainId: number;
  /** ERC-20 contract address (checksummed) when namespace === 'erc20'. */
  tokenAddress: string | null;
  /** SLIP-44 coin type when namespace === 'slip44'. */
  coinType: number | null;
  /** Symbol after alias resolution (the on-chain token symbol). */
  resolvedSymbol: string;
  /** Original symbol passed in (before alias resolution). */
  inputSymbol: string;
}

export interface Caip19PairResolution {
  source: Caip19Asset | null;
  destination: Caip19Asset | null;
  /** True only when BOTH legs resolved. Caller must decide how to handle gaps. */
  complete: boolean;
}

// ---------------------------------------------------------------------------
// Builders (pure — exported for test-vector reproducibility)
// ---------------------------------------------------------------------------

/** Build a CAIP-19 ERC-20 id with an EIP-55 checksummed address. */
export function buildErc20Id(chainId: number, tokenAddress: string): string {
  return `eip155:${chainId}/erc20:${getAddress(tokenAddress)}`;
}

/** Build a CAIP-19 native-gas-token id via SLIP-44 coin type. */
export function buildNativeId(chainId: number, coinType: number): string {
  return `eip155:${chainId}/slip44:${coinType}`;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a (symbol, chainId) pair to a canonical CAIP-19 asset identifier.
 *
 * Resolution order:
 *   1. Normalize + apply price-symbol aliases (BTC → WBTC).
 *   2. If the (possibly-aliased) symbol is a native gas token on this chain →
 *      `eip155:{chainId}/slip44:{coinType}`.
 *   3. Else look up the ERC-20 token address in the canonical registry →
 *      `eip155:{chainId}/erc20:{checksummedAddress}`.
 *   4. Unknown symbol/chain → null (caller decides fallback / fail-closed).
 *
 * Pure & synchronous on purpose — see file header.
 */
export function resolveCaip19(symbol: string, chainId: number): Caip19Asset | null {
  if (!symbol || typeof chainId !== 'number' || chainId <= 0) return null;

  const inputSymbol = symbol.toUpperCase();
  const resolvedSymbol = SYMBOL_ALIASES[inputSymbol] ?? inputSymbol;

  // 1. Native gas token?
  const nativeCoinType = NATIVE_ASSETS[resolvedSymbol]?.[chainId];
  if (nativeCoinType !== undefined) {
    return {
      id: buildNativeId(chainId, nativeCoinType),
      namespace: 'slip44',
      chainId,
      tokenAddress: null,
      coinType: nativeCoinType,
      resolvedSymbol,
      inputSymbol,
    };
  }

  // 2. ERC-20 in the canonical token registry?
  const tokenAddress = TWAP_TOKEN_ADDRESSES[resolvedSymbol]?.[chainId];
  if (tokenAddress) {
    return {
      id: buildErc20Id(chainId, tokenAddress),
      namespace: 'erc20',
      chainId,
      tokenAddress: getAddress(tokenAddress),
      coinType: null,
      resolvedSymbol,
      inputSymbol,
    };
  }

  // 3. Unknown — caller handles (v2 attestation will fail-closed / mark gap).
  return null;
}

/**
 * Resolve both legs of a trade for the v2 pair binding.
 *
 * `destinationChainId` defaults to `sourceChainId` (cross-chain swaps are rare
 * in the pre-trade flow and the v2.0 evaluation scope is source-asset-only
 * anyway — destinationAssetId is BOUND but not EVALUATED).
 */
export function resolveAssetPair(
  sourceSymbol: string,
  sourceChainId: number,
  destinationSymbol: string,
  destinationChainId: number = sourceChainId
): Caip19PairResolution {
  const source = resolveCaip19(sourceSymbol, sourceChainId);
  const destination = resolveCaip19(destinationSymbol, destinationChainId);
  return {
    source,
    destination,
    complete: source !== null && destination !== null,
  };
}

// ---------------------------------------------------------------------------
// Parsing (inverse of the builders — used by the verify path + hashing helpers)
// ---------------------------------------------------------------------------

export interface ParsedCaip19 {
  chainNamespace: string;
  chainReference: number;
  assetNamespace: Caip19Namespace;
  /** Checksummed address (erc20) or coin type number (slip44). */
  assetReference: string;
}

/**
 * Parse a CAIP-19 string back into its parts. Returns null on malformed input.
 * Only supports the two forms this module emits (`eip155` / `erc20|slip44`).
 */
export function parseCaip19(id: string): ParsedCaip19 | null {
  const match = id.match(/^eip155:(\d+)\/(erc20|slip44):(.+)$/);
  if (!match) return null;
  const [, chainRef, namespace, reference] = match;
  const assetNamespace = namespace as Caip19Namespace;
  return {
    chainNamespace: 'eip155',
    chainReference: Number(chainRef),
    assetNamespace,
    assetReference: assetNamespace === 'erc20' ? getAddress(reference) : reference,
  };
}
