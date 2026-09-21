/**
 * @fileoverview Oracle Watch per-issuance audit log.
 *
 * `feed_health_snapshots` is the periodic time-series spine: a collector writes
 * one row per (symbol, chain) every 30 minutes for a fixed universe. It answers
 * "what did the feed look like at 14:00".
 *
 * It cannot answer the question a counterparty actually asks: "this agent says
 * it gated on one of our receipts — WHICH receipt, and what did it say?" Live
 * API polling wrote nothing, so the honest answer used to be "we don't know".
 * This module closes that gap with one row per judgment we actually issued.
 *
 * Deliberately lean: the full EIP-712 payload is recoverable by re-verifying
 * `uid`, so we store the gates and the verdict — enough to reconstruct WHY —
 * and not complete signed blobs, which would turn a hot path into a storage
 * problem.
 *
 * Issuance is conditional on this row being committed. A failed write must
 * prevent a signal or attestation from being returned as a successful check.
 */

import type { OracleWatchAttestation } from '@/lib/attestations/oracleWatchAttestation';
import { createLogger, normalizeError } from '@/lib/utils/logger';

import type { OracleWatchResult } from './oracleWatchService';

const logger = createLogger('oracle-watch-audit');

/** Which surface issued the judgment. Drives usage-evidence reporting. */
export type WatchCheckSource = 'rest' | 'mcp' | 'sample' | 'collector';

export interface WatchAuditMeta {
  source: WatchCheckSource;
  /** API key that made the call, when known (REST). Null for MCP, whose tool
   *  handler signature carries no auth context. */
  apiKeyId?: string | null;
  latencyMs?: number;
  /** Resolved chain id the receipt is bound to, when the caller computed it. */
  subjectChainId?: number;
}

/**
 * Persist one Oracle Watch judgment before issuing it to a caller.
 */
export async function recordOracleWatchCheck(
  signal: OracleWatchResult,
  attestation: OracleWatchAttestation | null,
  meta: WatchAuditMeta
): Promise<void> {
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server');
    const client = createServiceRoleClient();

    const { error } = await client.from('oracle_watch_checks').insert({
      uid: attestation?.uid ?? null,
      attested: attestation !== null,
      attester: attestation?.attester ?? null,
      schema_version: attestation?.schemaVersion ?? 2,
      valid_until: attestation ? new Date(attestation.validUntil * 1000).toISOString() : null,

      symbol: signal.symbol,
      chain: signal.chain,
      subject_chain_id: meta.subjectChainId ?? null,

      verdict: signal.verdict,
      recommendation: signal.recommendation,
      reason: signal.reason,
      reason_codes: signal.reasonCodes,

      participant_count: signal.participantCount,
      required_participant_count: signal.requiredParticipantCount,
      quorum_satisfied: signal.quorumSatisfied,
      source_group_count: signal.sourceGroupCount,
      required_source_group_count: signal.requiredSourceGroupCount,
      independence_satisfied: signal.independenceSatisfied,

      max_deviation_pct: signal.maxDeviationPct,
      agreement: signal.agreement,
      outlier_count: signal.outlierCount,
      stale_count: signal.staleCount,
      consensus_price: signal.consensusPrice,
      trust_score: signal.trustScore,
      trust_level: signal.trustLevel,
      ml_risk_score: signal.mlRiskScore,
      ml_risk_level: signal.mlRiskLevel,

      source: meta.source,
      api_key_id: meta.apiKeyId ?? null,
      latency_ms: meta.latencyMs ?? null,
    });

    if (error) throw error;
  } catch (error) {
    logger.warn('Oracle watch audit threw', {
      symbol: signal.symbol,
      error: normalizeError(error),
    });
    throw new Error('Oracle Watch audit persistence failed', { cause: error });
  }
}
