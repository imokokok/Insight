/**
 * @fileoverview Durable Execution Receipt per-issuance evidence store.
 *
 * Mirrors `oracleWatchAudit.ts` in purpose and contract: the signed receipt is
 * the durable, authoritative artifact, and this table is the forensics trail a
 * counterparty needs when it asks "this agent claims it filled faithfully —
 * WHICH receipt, and what did it say?"
 *
 * A signed receipt is returned only after its complete envelope has been
 * persisted. Otherwise the service would advertise a forensic trail that may
 * not exist once the caller loses the response.
 */

import type { ExecutionReceipt } from '@/lib/attestations/executionReceipt';
import { createLogger } from '@/lib/utils/logger';

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
 * Record one complete Execution Receipt issuance. Throws when persistence
 * fails so issuing surfaces can fail closed instead of silently dropping proof.
 */
export async function recordExecutionReceipt(
  receipt: ExecutionReceipt,
  meta: ExecutionAuditMeta
): Promise<void> {
  const { createServiceRoleClient } = await import('@/lib/supabase/server');
  const client = createServiceRoleClient();

  const data = receipt.data;
  const { error } = await client.from('execution_receipts').upsert(
    {
      uid: receipt.uid,
      attested: true,
      attester: receipt.attester,
      schema_version: receipt.schemaVersion,
      valid_until: new Date(data.validUntil * 1000).toISOString(),

      pre_trade_uid: data.preTradeUid,
      destination_pre_trade_uid: data.destinationPreTradeUid ?? null,
      binding_mode: data.bindingMode ?? null,
      environment: data.environment ?? null,
      receipt_payload: receipt,

      source_asset_id: data.sourceAssetId,
      destination_asset_id: data.destinationAssetId,
      subject_chain_id: meta.subjectChainId ?? data.subjectChainId,
      settlement_chain_id: meta.settlementChainId ?? data.settlementChainId,

      action: data.action,
      // v3 renamed the signed field to priceExecutionStatus; both spellings
      // read here so every schema version lands the same column.
      execution_status: data.priceExecutionStatus ?? data.executionStatus,
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

      oracle_data_age_at_exec_seconds:
        data.oracleDataAgeAtExecSeconds ?? data.attestationAgeAtExecSeconds,
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
    },
    { onConflict: 'uid' }
  );

  if (error) {
    logger.error('Failed to persist execution receipt', new Error(error.message), {
      uid: receipt.uid,
      source: meta.source,
    });
    throw new Error(`execution receipt persistence failed: ${error.message}`);
  }
}
