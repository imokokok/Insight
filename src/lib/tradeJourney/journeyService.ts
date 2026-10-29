import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import type {
  PreTradeSafetyResult,
  SafetyVerdict,
  TradeAction,
} from '@/lib/api/services/preTradeSafetyService';
import type { X402AcquisitionSource } from '@/lib/api/x402/guard';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('trade-journey');

export type JourneyKind = 'pre_trade' | 'swap_intent';
export type JourneySource = 'rest' | 'mcp' | 'sdk';
export type ReceiptCreditState =
  | 'not_available'
  | 'pending_settlement'
  | 'available'
  | 'claiming'
  | 'consumed'
  | 'void';
export type JourneyExecutionState =
  | 'check_issued'
  | 'receipt_claiming'
  | 'receipt_issued'
  | 'not_executed_reported'
  | 'expired_unknown';

interface JourneyRow {
  id: string;
  kind: JourneyKind;
  request_id: string;
  source_pre_trade_uid: string | null;
  destination_pre_trade_uid: string | null;
  receipt_credit_state: ReceiptCreditState;
  execution_state: JourneyExecutionState;
  outcome_token_hash: string;
  receipt_uid: string | null;
}

export interface CreateJourneyInput {
  requestId: string;
  kind: JourneyKind;
  source: JourneySource;
  action: TradeAction;
  sourceAsset: string;
  destinationAsset?: string;
  subjectChainId: number;
  settlementChainId?: number;
  declaredNotionalUsd: number;
  venueClaim?: string;
  routerClaim?: string;
  receiptCreditState: ReceiptCreditState;
  /** Fixed, non-identifying source label used only for aggregate conversion analysis. */
  acquisitionSource?: X402AcquisitionSource;
}

export interface CreatedJourney {
  journeyId: string;
  /** Caller-held capability. Never persist or log this raw bearer token. */
  outcomeToken: string;
  receiptCreditState: ReceiptCreditState;
}

export interface JourneyCheckPair {
  source: PreTradeSafetyResult;
  destination?: PreTradeSafetyResult;
}

export type ClaimReceiptCreditResult =
  | { ok: true; journey: JourneyRow }
  | {
      ok: false;
      code:
        | 'NOT_FOUND'
        | 'TOKEN_INVALID'
        | 'CREDIT_UNAVAILABLE'
        | 'RECEIPT_IN_PROGRESS'
        | 'RECEIPT_ALREADY_ISSUED';
    };

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generatedOutcomeToken(): string {
  return randomBytes(32).toString('base64url');
}

function matchesToken(expectedHash: string, token: string): boolean {
  const candidate = tokenHash(token);
  try {
    return timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(candidate, 'hex'));
  } catch {
    return false;
  }
}

function validUntil(result: PreTradeSafetyResult): string | null {
  const raw = (result.attestation?.data as { validUntil?: unknown } | undefined)?.validUntil;
  return typeof raw === 'number' && Number.isInteger(raw)
    ? new Date(raw * 1000).toISOString()
    : null;
}

function earliestValidUntil(pair: JourneyCheckPair): string | null {
  const values = [
    validUntil(pair.source),
    pair.destination ? validUntil(pair.destination) : null,
  ].filter((value): value is string => value !== null);
  return values.length === 0
    ? null
    : values.reduce((earliest, value) => (value < earliest ? value : earliest));
}

function attestationUid(result: PreTradeSafetyResult): string | null {
  return result.attestation?.uid ?? null;
}

function asJourneyRow(value: unknown): JourneyRow {
  return value as JourneyRow;
}

/** Start a durable logical lifecycle before immutable pre-trade audit rows are written. */
export async function createJourney(input: CreateJourneyInput): Promise<CreatedJourney> {
  const outcomeToken = generatedOutcomeToken();
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from('trade_journeys')
    .insert({
      request_id: input.requestId,
      kind: input.kind,
      source: input.source,
      action: input.action,
      source_asset: input.sourceAsset,
      destination_asset: input.destinationAsset ?? null,
      subject_chain_id: input.subjectChainId,
      settlement_chain_id: input.settlementChainId ?? input.subjectChainId,
      declared_notional_usd: input.declaredNotionalUsd,
      venue_claim: input.venueClaim ?? null,
      router_claim: input.routerClaim ?? null,
      receipt_credit_state: input.receiptCreditState,
      acquisition_source: input.acquisitionSource ?? 'unknown',
      payment_request_id: input.requestId,
      outcome_token_hash: tokenHash(outcomeToken),
    })
    .select('id')
    .single();
  if (error || !data?.id) {
    throw new Error(`trade journey creation failed: ${error?.message ?? 'missing id'}`);
  }
  return {
    journeyId: data.id as string,
    outcomeToken,
    receiptCreditState: input.receiptCreditState,
  };
}

/** Bind two signed source/destination gates required for a verifiable swap receipt. */
export async function attachJourneyChecks(
  journeyId: string,
  pair: JourneyCheckPair
): Promise<void> {
  const sourceUid = attestationUid(pair.source);
  const destinationUid = pair.destination ? attestationUid(pair.destination) : null;
  if (sourceUid === null || (pair.destination && destinationUid === null)) {
    throw new Error('Cannot attach an unsigned pre-trade result to a trade journey');
  }
  const client = createServiceRoleClient();
  const { error } = await client
    .from('trade_journeys')
    .update({
      source_pre_trade_uid: sourceUid,
      destination_pre_trade_uid: destinationUid,
      valid_until: earliestValidUntil(pair),
      execution_state: 'check_issued',
      updated_at: new Date().toISOString(),
    })
    .eq('id', journeyId);
  if (error) throw new Error(`trade journey check binding failed: ${error.message}`);
}

/** Bind a one-sided advisory check; it cannot itself authorize verified receipt issuance. */
export async function attachGenericJourneyCheck(
  journeyId: string,
  result: PreTradeSafetyResult
): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client
    .from('trade_journeys')
    .update({
      source_pre_trade_uid: attestationUid(result),
      valid_until: validUntil(result),
      execution_state: 'check_issued',
      updated_at: new Date().toISOString(),
    })
    .eq('id', journeyId);
  if (error) throw new Error(`trade journey check binding failed: ${error.message}`);
}

/** Unlock the included receipt credit only after its x402 payment settles. */
export async function activateJourneyReceiptCredit(input: {
  journeyId: string;
  requestId: string;
  payer: string;
  network: string | null;
  txHash: string | null;
}): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client
    .from('trade_journeys')
    .update({
      receipt_credit_state: 'available',
      payer: input.payer || null,
      payment_network: input.network,
      payment_tx_hash: input.txHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.journeyId)
    .eq('payment_request_id', input.requestId)
    .eq('receipt_credit_state', 'pending_settlement');
  if (error) throw new Error(`trade journey payment activation failed: ${error.message}`);
}

/** Record the payer without assuming it is also the execution taker. */
export async function recordJourneyPayment(input: {
  journeyId: string;
  requestId: string;
  payer: string;
  network: string | null;
  txHash: string | null;
}): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client
    .from('trade_journeys')
    .update({
      payer: input.payer || null,
      payment_network: input.network,
      payment_tx_hash: input.txHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.journeyId)
    .eq('payment_request_id', input.requestId);
  if (error) throw new Error(`trade journey payment record failed: ${error.message}`);
}

async function loadJourney(journeyId: string): Promise<JourneyRow | null> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from('trade_journeys')
    .select(
      'id, kind, request_id, source_pre_trade_uid, destination_pre_trade_uid, receipt_credit_state, execution_state, outcome_token_hash, receipt_uid'
    )
    .eq('id', journeyId)
    .maybeSingle();
  if (error) throw new Error(`trade journey lookup failed: ${error.message}`);
  return data ? asJourneyRow(data) : null;
}

/** Atomically reserve the one receipt credit after validating caller capability and both gate ids. */
export async function claimJourneyReceiptCredit(input: {
  journeyId: string;
  outcomeToken: string;
  sourcePreTradeUid: string;
  destinationPreTradeUid: string;
}): Promise<ClaimReceiptCreditResult> {
  const journey = await loadJourney(input.journeyId);
  if (!journey) return { ok: false, code: 'NOT_FOUND' };
  if (!matchesToken(journey.outcome_token_hash, input.outcomeToken)) {
    return { ok: false, code: 'TOKEN_INVALID' };
  }
  if (
    journey.source_pre_trade_uid !== input.sourcePreTradeUid ||
    journey.destination_pre_trade_uid !== input.destinationPreTradeUid
  ) {
    return { ok: false, code: 'TOKEN_INVALID' };
  }
  if (journey.receipt_credit_state === 'consumed' || journey.receipt_uid !== null) {
    return { ok: false, code: 'RECEIPT_ALREADY_ISSUED' };
  }
  if (journey.receipt_credit_state === 'claiming')
    return { ok: false, code: 'RECEIPT_IN_PROGRESS' };
  if (journey.receipt_credit_state !== 'available' || journey.execution_state !== 'check_issued') {
    return { ok: false, code: 'CREDIT_UNAVAILABLE' };
  }
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from('trade_journeys')
    .update({
      receipt_credit_state: 'claiming',
      execution_state: 'receipt_claiming',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.journeyId)
    .eq('receipt_credit_state', 'available')
    .eq('execution_state', 'check_issued')
    .select(
      'id, kind, request_id, source_pre_trade_uid, destination_pre_trade_uid, receipt_credit_state, execution_state, outcome_token_hash, receipt_uid'
    )
    .maybeSingle();
  if (error) throw new Error(`trade journey receipt claim failed: ${error.message}`);
  return data
    ? { ok: true, journey: asJourneyRow(data) }
    : { ok: false, code: 'RECEIPT_IN_PROGRESS' };
}

export async function releaseJourneyReceiptCredit(journeyId: string): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client
    .from('trade_journeys')
    .update({
      receipt_credit_state: 'available',
      execution_state: 'check_issued',
      updated_at: new Date().toISOString(),
    })
    .eq('id', journeyId)
    .eq('receipt_credit_state', 'claiming');
  if (error) logger.warn('Could not release receipt credit', { journeyId, error: error.message });
}

export async function completeJourneyReceiptCredit(
  journeyId: string,
  receiptUid: string
): Promise<void> {
  const client = createServiceRoleClient();
  const { error } = await client
    .from('trade_journeys')
    .update({
      receipt_credit_state: 'consumed',
      receipt_uid: receiptUid,
      execution_state: 'receipt_issued',
      updated_at: new Date().toISOString(),
    })
    .eq('id', journeyId)
    .eq('receipt_credit_state', 'claiming');
  if (error) throw new Error(`trade journey receipt completion failed: ${error.message}`);
}

export async function findJourneyReceipt(journeyId: string): Promise<unknown | null> {
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from('execution_receipts')
    .select('receipt_payload')
    .eq('journey_id', journeyId)
    .maybeSingle();
  if (error) throw new Error(`trade journey receipt lookup failed: ${error.message}`);
  return data?.receipt_payload ?? null;
}

export async function reportJourneyNotExecuted(input: {
  journeyId: string;
  outcomeToken: string;
  reason: string;
}): Promise<'updated' | 'not_found' | 'token_invalid' | 'not_open'> {
  const journey = await loadJourney(input.journeyId);
  if (!journey) return 'not_found';
  if (!matchesToken(journey.outcome_token_hash, input.outcomeToken)) return 'token_invalid';
  if (journey.execution_state !== 'check_issued') return 'not_open';
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from('trade_journeys')
    .update({
      execution_state: 'not_executed_reported',
      outcome_reason: input.reason,
      outcome_reported_at: new Date().toISOString(),
      receipt_credit_state:
        journey.receipt_credit_state === 'available' ||
        journey.receipt_credit_state === 'pending_settlement'
          ? 'void'
          : journey.receipt_credit_state,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.journeyId)
    .eq('execution_state', 'check_issued')
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`trade journey outcome update failed: ${error.message}`);
  return data ? 'updated' : 'not_open';
}

export function nextActions(input: {
  kind: JourneyKind;
  journeyId: string;
  outcomeToken: string;
  verdict: SafetyVerdict;
  receiptCreditState: ReceiptCreditState;
  receiptRequestTemplate?: Record<string, unknown>;
  contributingFactors?: PreTradeSafetyResult['contributingFactors'];
  recommendedActions?: PreTradeSafetyResult['recommendedActions'];
}): Record<string, unknown> {
  const outcome = {
    url: '/api/v1/trade-journeys/outcome',
    method: 'POST',
    required: ['journeyId', 'outcomeToken', 'reason'],
    statement:
      'This is the caller’s voluntary non-execution report, not evidence that no on-chain transaction occurred.',
  };
  if (input.kind === 'pre_trade') {
    const cautionRecovery =
      input.verdict === 'CAUTION'
        ? {
            state: 'RECHECK_BEFORE_EXECUTION',
            instruction:
              'Do not execute from a CAUTION result alone. Recheck immediately before execution with the same trade parameters and the original attestation references, then decide from the fresh verdict.',
            recheck: {
              url: '/api/v1/safety/pre-trade/recheck',
              method: 'POST',
              required: [
                'asset',
                'chainId',
                'action',
                'tradeAmountUsd',
                'originalUid',
                'originalRequestHash',
              ],
              note: 'Copy these fields from this check and its signed attestation. A recheck creates a separate, fresh attestation; it never mutates the original.',
            },
            triggers: (input.contributingFactors ?? [])
              .filter((factor) => factor.triggeredVerdict === 'CAUTION')
              .slice(0, 3)
              .map((factor) => ({ rule: factor.rule, message: factor.message })),
            ...(input.recommendedActions && input.recommendedActions.length > 0
              ? { lendingActions: input.recommendedActions }
              : {}),
          }
        : undefined;
    return {
      journeyId: input.journeyId,
      closeWith: 'swap_intent',
      swapIntent: {
        url: '/api/v1/safety/swap-intent',
        method: 'POST',
        required: [
          'sourceAsset',
          'destinationAsset',
          'subjectChainId',
          'settlementChainId',
          'declaredNotionalUsd',
        ],
        note: 'A basic check is advisory only. A verified swap receipt needs two signed gates.',
      },
      outcome,
      ...(cautionRecovery ? { cautionRecovery } : {}),
      recommendation:
        input.verdict === 'PASS'
          ? 'Use Swap Intent before execution when you need a transaction-verifiable outcome.'
          : input.verdict === 'CAUTION'
            ? 'Recheck immediately before execution; inspect the listed CAUTION triggers and wait for a fresh PASS or apply the returned lending action.'
            : 'Do not execute until the risk evidence is remediated and a fresh check permits it.',
    };
  }
  return {
    journeyId: input.journeyId,
    executionReceipt: {
      url: '/api/v1/execution/attestation/issue/journey',
      method: 'POST',
      required: ['journeyId', 'outcomeToken', 'txHash', 'preTradeAttestations'],
      receiptCreditState: input.receiptCreditState,
      ...(input.receiptRequestTemplate ? { requestTemplate: input.receiptRequestTemplate } : {}),
      note:
        input.receiptCreditState === 'available'
          ? 'One receipt issuance is included for this settled Swap Intent.'
          : 'The included receipt becomes available only after the originating x402 payment settles.',
    },
    outcome,
  };
}
