/**
 * Opt-in ERC-8004 reputation anchoring for paid pre-trade checks.
 *
 * When an agent opts in (query `reputationOptIn=1` + its own `reputationAgentId`),
 * every successfully-settled x402 check enqueues a feedback row here (including
 * the settlement network as payment_network); a daily GitHub Action batch
 * (scripts/anchor-erc8004-reputation.ts) writes them to the canonical ERC-8004
 * Reputation Registry (0x8004BAa17C55a88189AE136b182e5fdA19dE9b63, bound to the
 * Identity Registry at 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) on the chain
 * the payment settled on — eip155:143 rows anchor on Monad mainnet (Insight
 * agentId 10414), everything else on BNB Chain mainnet (agentId 375779).
 *
 * Privacy and semantics are deliberate:
 * - The anchor carries check *completion* and the verdict tag only — never
 *   trade amounts, assets, or attestation payloads. A BLOCK verdict is still a
 *   good outcome for the agent (it checked before signing); the value is
 *   constant and the verdict lives in tag2, not the score.
 * - `feedbackHash` binds the attestation UID (keccak256 of the uid string)
 *   without disclosing it: the agent can later reveal the UID and anyone can
 *   recompute the hash. The UID alone cannot be reversed into trade details.
 * - The anchor wallet must NOT be the owner/operator of the reviewed agentId
 *   (the registry enforces this); ownership of the declared agentId by the
 *   payer is verified on-chain at anchor time, not at enqueue time.
 */

import { keccak256, toHex } from 'viem';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('erc8004:reputationAnchor');

/** Off-chain evidence spec describing what Insight signs (static, no per-check data). */
export const REPUTATION_FEEDBACK_URI =
  'https://www.oracleinsight.xyz/erc8004/v1/insight-evidence.v1.json';

/** tag1: what kind of interaction the feedback certifies. */
export const REPUTATION_TAG1 = 'oracle-safety-check';

/** Registry write value: 100/0 = "check completed with a signed attestation". */
export const REPUTATION_FEEDBACK_VALUE = 100n;
export const REPUTATION_FEEDBACK_VALUE_DECIMALS = 0;

export type ReputationVerdictTag = 'pass' | 'warn' | 'block' | 'unknown';

const VERDICT_TAGS: ReputationVerdictTag[] = ['pass', 'warn', 'block'];

/** Map an Insight verdict to the on-chain tag2 (clamped, lowercase). */
export function normalizeVerdictTag(verdict?: string | null): ReputationVerdictTag {
  if (!verdict) return 'unknown';
  const normalized = verdict.trim().toLowerCase();
  return VERDICT_TAGS.includes(normalized as ReputationVerdictTag)
    ? (normalized as ReputationVerdictTag)
    : 'unknown';
}

/**
 * Bind the attestation UID without disclosing it: keccak256 of the uid string.
 * The agent can later reveal the UID and anyone can recompute the hash.
 */
export function buildFeedbackHash(attestationUid?: string | null): `0x${string}` {
  if (!attestationUid) return '0x0000000000000000000000000000000000000000000000000000000000000000';
  return keccak256(toHex(attestationUid));
}

export interface ReputationAnchorInput {
  requestId: string;
  /** Payer address from a settled x402 payment (the reviewed agent's wallet). */
  payer: string;
  /** Agent-declared ERC-8004 agentId (ownership verified at anchor time). */
  agentId: number;
  verdict?: string | null;
  attestationUid?: string | null;
  paymentNetwork?: string | null;
  paymentTxHash?: string | null;
  amountUsdc?: string | null;
}

export type EnqueueOutcome =
  | { queued: true }
  | {
      queued: false;
      reason: 'not_opted_in' | 'invalid_input' | 'duplicate' | 'error';
      detail?: string;
    };

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * Enqueue one settled check for the daily on-chain anchor batch. Fire-and-
 * forget by contract: never throws, never blocks the paid response. Dedupes
 * per payer+agentId+calendar-day via the table's unique index so a chatty
 * agent cannot inflate its own feedback count or our gas spend.
 */
export async function enqueueReputationAnchor(
  input: ReputationAnchorInput
): Promise<EnqueueOutcome> {
  if (!EVM_ADDRESS_RE.test(input.payer)) {
    return { queued: false, reason: 'invalid_input', detail: 'payer is not an EVM address' };
  }
  if (!Number.isInteger(input.agentId) || input.agentId <= 0) {
    return { queued: false, reason: 'invalid_input', detail: 'agentId must be a positive integer' };
  }
  if (!input.requestId) {
    return { queued: false, reason: 'invalid_input', detail: 'requestId is required' };
  }

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('reputation_anchor_queue').insert({
      request_id: input.requestId,
      payer: input.payer.toLowerCase(),
      agent_id: input.agentId,
      verdict: normalizeVerdictTag(input.verdict),
      attestation_uid: input.attestationUid ?? null,
      payment_network: input.paymentNetwork ?? null,
      payment_tx_hash: input.paymentTxHash ?? null,
      amount_usdc: input.amountUsdc ?? null,
    });
    if (error) {
      if (error.code === '23505') {
        return { queued: false, reason: 'duplicate' };
      }
      logger.warn('reputation anchor enqueue failed', {
        requestId: input.requestId,
        code: error.code,
        message: error.message,
      });
      return { queued: false, reason: 'error', detail: error.message };
    }
    logger.info('reputation anchor queued', {
      requestId: input.requestId,
      agentId: input.agentId,
    });
    return { queued: true };
  } catch (error) {
    logger.warn('reputation anchor enqueue threw', {
      requestId: input.requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      queued: false,
      reason: 'error',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
