/**
 * @fileoverview Execution Receipt per-issuance audit log (fire-and-forget).
 *
 * Mirrors `oracleWatchAudit.ts` in purpose and contract: the signed receipt is
 * the durable, authoritative artifact, and this table is the forensics trail a
 * counterparty needs when it asks "this agent claims it filled faithfully —
 * WHICH receipt, and what did it say?"
 *
 * Non-blocking by construction. Audit failure must never fail, slow, or change
 * the signal itself; the caller awaits nothing on the critical path. A dropped
 * audit row is a reporting gap, not a correctness gap.
 */

import type { ExecutionReceipt } from '@/lib/attestations/executionReceipt';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('execution-receipt-audit');

/** Which surface issued the receipt. Drives usage-evidence reporting. */
export type ExecutionCheckSource = 'rest' | 'mcp' | 'sample' | 'collector';

export interface ExecutionAuditMeta {
  source: ExecutionCheckSource;
  apiKeyId?: string | null;
  latencyMs?: number;
  subjectChainId?: number;
  settlementChainId?: number;
}

/**
 * Record one Execution Receipt issuance. Fire-and-forget: never throws, never
 * blocks. Call it without awaiting on anything a user is waiting for.
 */
export async function recordExecutionReceipt(
  receipt: ExecutionReceipt,
  meta: ExecutionAuditMeta
): Promise<void> {
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server');
    const client = createServiceRoleClient();

    const data = receipt.data;
    const { error } = await client.from('execution_receipts').insert({
      uid: receipt.uid,
      attested: true,
      attester: receipt.attester,
      schema_version: receipt.schemaVersion,
      valid_until: new Date(data.validUntil * 1000).toISOString(),

      pre_trade_uid: data.preTradeUid,

      source_asset_id: data.sourceAssetId,
      destination_asset_id: data.destinationAssetId,
      subject_chain_id: meta.subjectChainId ?? data.subjectChainId,
      settlement_chain_id: meta.settlementChainId ?? data.settlementChainId,

      action: data.action,
      execution_status: data.executionStatus,
      fill_status: data.fillStatus,

      quoted_price: data.quotedPrice / 1e8,
      executed_price: data.executedPrice / 1e8,
      price_delta_bps: data.priceDeltaBps,
      max_slippage_bps: data.maxSlippageBps,
      slippage_satisfied: data.slippageSatisfied,

      quoted_amount_usd: data.quotedAmountUsd / 1e6,
      executed_amount_usd: data.executedAmountUsd / 1e6,
      actual_fee_usd: data.actualFeeUsd / 1e6,

      tx_hash: data.txHash,
      block_number: data.blockNumber,
      executed_at: new Date(data.executedAt * 1000).toISOString(),

      oracle_data_age_at_exec_seconds: data.oracleDataAgeAtExecSeconds,
      participant_count: data.participantCount,
      required_participant_count: data.requiredParticipantCount,
      source_group_count: data.sourceGroupCount,
      required_source_group_count: data.requiredSourceGroupCount,
      independence_satisfied: data.independenceSatisfied,

      mev_risk_bps: data.mevRiskBps,

      reason_codes_hash: data.reasonCodesHash,

      source: meta.source,
      api_key_id: meta.apiKeyId ?? null,
      latency_ms: meta.latencyMs ?? null,
    });

    if (error) {
      logger.warn('Failed to record execution receipt', {
        uid: receipt.uid,
        source: meta.source,
        error: error.message,
      });
    }
  } catch (error) {
    // Audit logging is strictly additive — a DB outage must never surface to an
    // agent that is mid-trade on the signal.
    logger.warn('Execution receipt audit threw', {
      uid: receipt.uid,
      error: normalizeError(error),
    });
  }
}

/**
 * Non-blocking wrapper: kicks the write off without making the caller wait.
 * `void` + `.catch()` rather than a bare floating promise, so an unhandled
 * rejection can never take the process down.
 */
export function recordExecutionReceiptAsync(
  receipt: ExecutionReceipt,
  meta: ExecutionAuditMeta
): void {
  void recordExecutionReceipt(receipt, meta).catch(() => {
    /* already logged inside */
  });
}
