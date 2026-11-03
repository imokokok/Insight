/**
 * ERC-8004 Validation Registry responder support (B1, opt-in until canonical
 * deployment exists).
 *
 * Unlike the Reputation Registry (Insight is the client and writes feedback
 * proactively), validation is a PULL model enforced on-chain: the requester
 * must be the owner/operator of the reviewed agentId and names Insight as the
 * validator via `validationRequest(validatorAddress, agentId, requestURI,
 * requestHash)`. Insight's job is to observe requests addressed to its
 * validator wallet and answer them with `validationResponse`.
 *
 * Reference implementation semantics (erc-8004/erc-8004-contracts, verified
 * 2026-10-21):
 * - `response` is a uint8 score 0-100 (getSummary averages it), NOT an enum.
 *   We mirror the reputation convention: the score never judges the trade
 *   outcome, so a completed validation always writes 100.
 * - `requestHash` is caller-supplied and must be unique. Public convention for
 *   Insight clients: requestHash = keccak256(attestation UID string), the same
 *   binding as reputation feedbackHash — the agent can later reveal the UID
 *   and anyone can recompute the hash.
 * - `responseHash` is the integrity hash of the responseURI content. We point
 *   responseURI at the static evidence spec and hash the checked-in file.
 *
 * Gating: no canonical Validation Registry deployment exists on any chain as
 * of 2026-10-21 (official deployments README lists none; Monad docs mark it
 * "coming soon"). The batch only polls chains when ERC8004_VALIDATION_REGISTRY
 * is set to a deployed address. External materials must NOT claim Validation
 * Registry support until canonical addresses are published — say
 * "architecture reserved" instead.
 */

import { keccak256, toHex } from 'viem';

/** tag: what kind of validation the response certifies. */
export const VALIDATION_TAG = 'oracle-safety-check';

/** Registry write value: 100/100 = "validation completed with signed evidence". */
export const VALIDATION_RESPONSE_COMPLETED = 100;

/** Static evidence spec — same artifact the reputation feedbackURI points at. */
export const VALIDATION_RESPONSE_URI =
  'https://www.oracleinsight.xyz/erc8004/v1/insight-evidence.v1.json';

export const VALIDATION_REGISTRY_ENV_KEY = 'ERC8004_VALIDATION_REGISTRY';

/** The write + read surface of the responder pass (reference implementation ABI). */
export const VALIDATION_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'getValidatorRequests',
    stateMutability: 'view',
    inputs: [{ name: 'validatorAddress', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    type: 'function',
    name: 'getValidationStatus',
    stateMutability: 'view',
    inputs: [{ name: 'requestHash', type: 'bytes32' }],
    outputs: [
      { name: 'validatorAddress', type: 'address' },
      { name: 'agentId', type: 'uint256' },
      { name: 'response', type: 'uint8' },
      { name: 'responseHash', type: 'bytes32' },
      { name: 'tag', type: 'string' },
      { name: 'lastUpdate', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'validationResponse',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestHash', type: 'bytes32' },
      { name: 'response', type: 'uint8' },
      { name: 'responseURI', type: 'string' },
      { name: 'responseHash', type: 'bytes32' },
      { name: 'tag', type: 'string' },
    ],
    outputs: [],
  },
] as const;

/**
 * keccak256 of the evidence spec content — the integrity hash for the
 * responseURI. Content comes from the checked-in file so the bundle stays
 * offline-safe and matches what the site serves.
 */
export function buildValidationResponseHash(evidenceJson: string): `0x${string}` {
  return keccak256(toHex(evidenceJson));
}

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * Read and validate the opt-in Validation Registry address. Returns null when
 * unset or malformed so the batch can degrade to reputation-only anchoring.
 */
export function validationRegistryAddress(
  env: Pick<Record<string, string | undefined>, typeof VALIDATION_REGISTRY_ENV_KEY>
): `0x${string}` | null {
  const raw = env[VALIDATION_REGISTRY_ENV_KEY]?.trim();
  if (!raw || !EVM_ADDRESS_RE.test(raw)) return null;
  return raw.toLowerCase() as `0x${string}`;
}

export interface ValidationRequestStatus {
  requestHash: `0x${string}`;
  /** Raw on-chain score (0-100). The reference getValidationStatus does not
   * expose the internal hasResponse flag; since our responder always writes
   * VALIDATION_RESPONSE_COMPLETED (100), response=0 ⇔ unanswered. */
  response: number;
  /** Present when the on-chain read failed (e.g. reverted for a stale hash). */
  readError?: string;
}

export interface PendingSelection {
  pending: Array<`0x${string}`>;
  alreadyAnswered: number;
  unreadable: number;
}

/**
 * Pick request hashes the validator has not answered yet. Idempotent: safe to
 * re-run daily; answered requests are skipped, unreadable ones are counted
 * and retried on the next batch.
 */
export function selectPendingValidations(statuses: ValidationRequestStatus[]): PendingSelection {
  const pending: Array<`0x${string}`> = [];
  let alreadyAnswered = 0;
  let unreadable = 0;
  for (const status of statuses) {
    if (status.readError) {
      unreadable += 1;
      continue;
    }
    if (status.response > 0) {
      alreadyAnswered += 1;
      continue;
    }
    pending.push(status.requestHash);
  }
  return { pending, alreadyAnswered, unreadable };
}
