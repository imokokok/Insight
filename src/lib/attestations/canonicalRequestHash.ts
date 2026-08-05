/**
 * @fileoverview requestHash — the v2 attestation's canonical commitment over
 * the pre-trade request.
 *
 * Raul's locked v2 spec (clarification ⑩, §7.7): `requestHash` is the EIP-712
 * typed hash of a `CanonicalPreTradeRequest` struct — NOT a JSON serialization.
 * It binds the trade's subject chain + both CAIP-19 asset ids + action + amount
 * so the signed attestation covers the exact request the agent is about to
 * execute. Because it commits the canonical request independently of the
 * attestation schema, future attestation field additions do not require
 * re-versioning the request commitment.
 *
 * Domain vs subject chain:
 *   - EIP-712 domain `chainId=1` is a SEPARATOR only (the request hash is
 *     offchain, never submitted on-chain).
 *   - The REAL execution chain is `subjectChainId` IN THE MESSAGE BODY. This is
 *     the distinction Raul explicitly asked us to draw (and to publish a test
 *     vector for — see the test file).
 *
 * The domain is intentionally separate from the OracleSafetyCheck attestation
 * domain (different `name`) so the two EIP-712 hashes can never collide or be
 * confused, even though both reuse chainId=1 as the separator. Its `version:'1'`
 * is the CanonicalPreTradeRequest schema version — stable across attestation
 * schema versions (v2/v3/…), which is the whole point of factoring it out.
 */

import { hashTypedData } from 'viem';

/** EIP-712 domain for the canonical pre-trade request commitment. */
export const CANONICAL_REQUEST_DOMAIN = {
  name: 'Insight Canonical Pre-Trade Request',
  version: '1',
  chainId: 1,
} as const;

export const CANONICAL_REQUEST_PRIMARY_TYPE = 'CanonicalPreTradeRequest';

/** EIP-712 type: the canonical, version-stable commitment over a pre-trade. */
export const CANONICAL_REQUEST_TYPES = {
  CanonicalPreTradeRequest: [
    { name: 'subjectChainId', type: 'uint256' },
    { name: 'sourceAssetId', type: 'string' }, // CAIP-19
    { name: 'destinationAssetId', type: 'string' }, // CAIP-19
    { name: 'action', type: 'string' },
    { name: 'tradeAmountUsd', type: 'uint256' }, // ×1e6
  ],
} as const;

/** USD amounts encoded as uint256 with 6 decimals (matches USDC precision). */
const USD_SCALE = 1e6;

export interface CanonicalPreTradeRequestInput {
  /** Real execution chain (goes in the message body, NOT the domain). */
  subjectChainId: number;
  /** CAIP-19 source asset id, e.g. `eip155:1/slip44:60`. */
  sourceAssetId: string;
  /** CAIP-19 destination asset id, e.g. `eip155:1/erc20:0xA0b8…eB48`. */
  destinationAssetId: string;
  /** swap | borrow | lend | liquidate | repay. */
  action: string;
  /** Raw USD trade amount (scaled ×1e6 internally to uint256). */
  tradeAmountUsd: number;
}

function toUint(n: number, scale: number): bigint {
  if (!Number.isFinite(n)) return 0n;
  return BigInt(Math.max(0, Math.round(n * scale)));
}

/**
 * Compute the canonical requestHash (full EIP-712 digest:
 * `0x1901 ‖ domainSeparator ‖ structHash`) via viem `hashTypedData`.
 *
 * Deterministic & pure — same inputs always yield the same digest, on both
 * Insight and ThoughtProof sides. This is the value that goes into the v2
 * attestation's signed `requestHash` field.
 */
export function computeRequestHash(input: CanonicalPreTradeRequestInput): `0x${string}` {
  const message = {
    subjectChainId: BigInt(input.subjectChainId),
    sourceAssetId: input.sourceAssetId,
    destinationAssetId: input.destinationAssetId,
    action: input.action,
    tradeAmountUsd: toUint(input.tradeAmountUsd, USD_SCALE),
  };
  return hashTypedData({
    domain: CANONICAL_REQUEST_DOMAIN,
    types: CANONICAL_REQUEST_TYPES,
    primaryType: CANONICAL_REQUEST_PRIMARY_TYPE,
    message,
  });
}
