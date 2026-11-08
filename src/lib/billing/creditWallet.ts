/**
 * @fileoverview Credit wallet client — the Read/Write layer over the
 * credit_wallet / credit_ledger tables and their SECURITY DEFINER RPCs.
 *
 * Model (see supabase/migrations/0039_credit_wallet.sql):
 *   - precheckCredits: read-only gate check (balance + optional per-key
 *     monthly budget). The quota middleware calls this to reject a request
 *     early with a 402 before doing any work.
 *   - consumeCredits: the authoritative, atomic, idempotent charge. It is
 *     awaited after a successful result. RPC failures preserve availability
 *     with confirmed:false; callers must not treat that as a confirmed debit.
 *     The RPC re-checks balance/budget atomically; reusing its metering_key
 *     prevents duplicate charges. Callers pass a deterministic request key
 *     (see requestIdempotency.ts), so a retry of the same logical request is
 *     at most one debit across instances.
 *   - topUpCredits: credits a wallet (subscription grant, manual top-up,
 *     refund). Idempotent on metering_key.
 *   - getWalletBalance: read a user's current balance (settings UI).
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger, normalizeError } from '@/lib/utils/logger';

import {
  allocateFifoLots,
  allocationCoversCost,
  dominantLotSource,
  grantBucket,
  type CreditLot,
  type FundedBucket,
} from './sourceAttribution';

const logger = createLogger('credit-wallet');

export interface CreditPrecheck {
  ok: boolean;
  reason?: 'KEY_NOT_FOUND' | 'BUDGET_EXCEEDED' | 'INSUFFICIENT_CREDITS';
  balance?: number;
  cost?: number;
  budget?: number;
  used?: number;
  /** The RPC failed and the gate was opened for availability. The charge is
   *  still authoritative; a degraded precheck is never a free pass. */
  degraded?: boolean;
  /** True when this call brings the key to >=80% of its monthly spend cap.
   *  The cap itself is a hard stop; the warning is advisory. */
  budgetWarning?: boolean;
}

export interface CreditCharge {
  ok: boolean;
  /** False when the RPC outcome is unknown; ok:true is the availability policy,
   * not evidence that a debit was durably recorded. A pending settlement row
   * is written so the billing cron can reconcile it. */
  confirmed?: boolean;
  reason?: 'KEY_NOT_FOUND' | 'BUDGET_EXCEEDED' | 'INSUFFICIENT_CREDITS';
  idempotent?: boolean;
  balance?: number;
  cost?: number;
}

export interface CreditChargeContext {
  /** Ledger `reason` (billed SKU or batch outcome: prices.batch | batch_partial | insufficient_data | upstream_failed | timeout). */
  reason?: string;
  /** Client-visible request/receipt id. */
  requestId?: string;
  /** Per-charge detail, e.g. { requested, charged } for batches. */
  meta?: Record<string, unknown>;
  /**
   * Ledger key of the request's previous idempotency window. When that row
   * exists, this charge is a replay whose retry straddled the window boundary
   * and must not debit again.
   */
  previousMeteringKey?: string;
}

/**
 * How this charge was funded. Derived from the ledger, never supplied by the
 * caller: `source` is the bucket with the largest allocated share and `meta`
 * carries the per-lot FIFO allocations.
 */
type ChargeAttribution = {
  source: FundedBucket | null;
  meta: Record<string, unknown> | undefined;
};

/**
 * Attribute a charge to its funding lots (FIFO).
 *
 * Exhaustion is derived, not stored: `sum(lot amounts) - wallet balance` is
 * exactly the amount the ledger has consumed so far, so no new column or table
 * is needed. Historical lots whose grant row has no `source` stay unattributed
 * (`null`); they are not retroactively labelled.
 *
 * Read-only and best effort: if any read fails the charge proceeds with
 * `source: null` rather than blocking billing or guessing a bucket.
 */
async function attributeCharge(
  client: ReturnType<typeof createServiceRoleClient>,
  keyId: string,
  cost: number,
  meta: Record<string, unknown> | undefined
): Promise<ChargeAttribution> {
  if (cost <= 0) return { source: null, meta };

  try {
    const { data: keyRow } = await client
      .from('api_keys')
      .select('user_id')
      .eq('id', keyId)
      .maybeSingle();
    const userId = (keyRow as { user_id?: string } | null)?.user_id;
    if (!userId) {
      logger.warn('credit attribution skipped — api key has no owner', { keyId, cost });
      return { source: null, meta };
    }

    const { data: walletRow } = await client
      .from('credit_wallet')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    const balance = Number((walletRow as { balance?: number | string } | null)?.balance);
    if (!Number.isFinite(balance)) {
      logger.warn('credit attribution skipped — wallet balance unavailable', { keyId, cost });
      return { source: null, meta };
    }

    const { data: lotRows } = await client
      .from('credit_ledger')
      .select('id, delta, source')
      .eq('user_id', userId)
      .gt('delta', 0)
      .in('kind', ['grant', 'topup', 'refund'])
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    const rows = (lotRows ?? []) as Array<{
      id: number | string;
      delta: number | string;
      source: string | null;
    }>;
    const lots: CreditLot[] = rows.map((row) => ({
      lotId: Number(row.id),
      amount: Number(row.delta),
      source: grantBucket(row.source),
    }));

    const granted = lots.reduce((total, lot) => total + lot.amount, 0);
    const consumed = Math.max(0, granted - balance);
    const allocations = allocateFifoLots(lots, consumed, cost);

    if (allocations.length === 0) {
      logger.warn('credit attribution found no funding lot', { keyId, cost, granted, balance });
      return { source: null, meta };
    }
    if (!allocationCoversCost(allocations, cost)) {
      logger.warn('credit attribution covered only part of the charge', {
        keyId,
        cost,
        granted,
        balance,
      });
    }

    return { source: dominantLotSource(allocations), meta: { ...meta, allocations } };
  } catch (error) {
    logger.warn('credit attribution unavailable — source left null', {
      keyId,
      cost,
      error: normalizeError(error),
    });
    return { source: null, meta };
  }
}

/** Fallback metering key. Only used when a caller has no deterministic
 *  request key (e.g. internal/tooling calls); the HTTP paths always pass one,
 *  so a retry of the same logical request is a no-op rather than a double
 *  charge via the ledger UNIQUE constraint. */
export function makeMeteringKey(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

/**
 * precheck_credits returns snake_case JSONB. Map it field by field: casting
 * the payload wholesale leaves `budget_warning` under a key nothing reads, so
 * `budgetWarning` stays undefined and the spend-cap warning never fires.
 */
function parsePrecheckPayload(data: unknown): CreditPrecheck {
  if (data === null || typeof data !== 'object') return { ok: true };
  const payload = data as Record<string, unknown>;
  const num = (value: unknown) => (typeof value === 'number' ? value : undefined);
  const reason = payload.reason;
  return {
    ok: payload.ok === true,
    reason:
      reason === 'KEY_NOT_FOUND' ||
      reason === 'BUDGET_EXCEEDED' ||
      reason === 'INSUFFICIENT_CREDITS'
        ? reason
        : undefined,
    balance: num(payload.balance),
    cost: num(payload.cost),
    budget: num(payload.budget),
    used: num(payload.used),
    budgetWarning: payload.budget_warning === true,
  };
}

/**
 * Read-only gate check for an API-key request that costs `cost` credits.
 * Returns whether the call may proceed, plus balance/budget for headers and
 * error reporting. Callers should always treat consumeCredits as the source
 * of truth — this is an optimization to short-circuit empty/budget-capped keys.
 */
export async function precheckCredits(keyId: string, cost: number): Promise<CreditPrecheck> {
  const client = createServiceRoleClient();
  try {
    const { data, error } = await client.rpc('precheck_credits', {
      p_key_id: keyId,
      p_cost: cost,
    });
    if (error) {
      // Availability is preserved, but mark the gate degraded so callers do
      // not render it as a healthy balance check and so the spend-cap
      // threshold is skipped (we do not know `used`).
      logger.warn('precheck_credits RPC error (degraded)', { keyId, cost, error: error.message });
      return { ok: true, degraded: true };
    }
    return parsePrecheckPayload(data);
  } catch (error) {
    logger.warn('precheck_credits failed (degraded)', {
      keyId,
      cost,
      error: normalizeError(error),
    });
    return { ok: true, degraded: true };
  }
}

/**
 * Atomically charge `cost` credits to the API key's owning user wallet.
 *
 * Fire-and-forget from the request path (see file docstring). The RPC
 * re-checks balance and the optional monthly budget inside one statement, so
 * a transient overdraw that slips through the precheck cannot spiral — the
 * next request will be rejected by the precheck.
 */
export async function consumeCredits(
  keyId: string,
  cost: number,
  meteringKey: string,
  ref?: string,
  context: CreditChargeContext = {}
): Promise<CreditCharge> {
  const client = createServiceRoleClient();
  // A retry that straddles the idempotency window boundary gets a new ledger
  // key, so the unique constraint alone cannot see it. One primary-key lookup
  // on the previous window closes that gap before any debit is attempted.
  if (context.previousMeteringKey) {
    const { data: prior, error: priorError } = await client
      .from('credit_ledger')
      .select('balance_after')
      .eq('metering_key', context.previousMeteringKey)
      .maybeSingle();
    if (!priorError && prior) {
      logger.info('charge treated as a window-boundary replay; not debited again', {
        keyId,
        meteringKey,
        previousMeteringKey: context.previousMeteringKey,
      });
      return {
        ok: true,
        confirmed: true,
        idempotent: true,
        balance: Number((prior as { balance_after: number | string }).balance_after),
        cost,
      };
    }
    if (priorError) {
      // Fail open: a broken readback must not block a legitimate charge. The
      // unique key still prevents same-window double debits.
      logger.warn('previous-window idempotency lookup failed', {
        keyId,
        meteringKey,
        error: priorError.message,
      });
    }
  }
  const attribution = await attributeCharge(client, keyId, cost, context.meta);
  try {
    const { data, error } = await client.rpc('consume_credits', {
      p_key_id: keyId,
      p_cost: cost,
      p_metering_key: meteringKey,
      p_ref: ref ?? null,
      p_source: attribution.source,
      p_reason: context.reason ?? null,
      p_request_id: context.requestId ?? null,
      p_meta: attribution.meta ?? null,
    });
    if (error) {
      logger.error(
        'consume_credits RPC error — recording pending settlement',
        new Error(error.message),
        {
          keyId,
          cost,
          meteringKey,
          error: error.message,
        }
      );
      await recordPendingSettlement(
        keyId,
        cost,
        meteringKey,
        ref,
        context,
        attribution,
        error.message
      );
      return { ok: true, confirmed: false };
    }
    if (!data || typeof data.ok !== 'boolean') {
      logger.error(
        'consume_credits returned an unexpected payload — recording pending settlement',
        new Error('UNEXPECTED_CONSUME_PAYLOAD'),
        { keyId, cost, meteringKey }
      );
      await recordPendingSettlement(
        keyId,
        cost,
        meteringKey,
        ref,
        context,
        attribution,
        'unexpected_payload'
      );
      return { ok: true, confirmed: false };
    }
    return { ...data, confirmed: true } as CreditCharge;
  } catch (error) {
    const message = normalizeError(error).message;
    logger.error('consume_credits failed — recording pending settlement', new Error(message), {
      keyId,
      cost,
      meteringKey,
    });
    await recordPendingSettlement(keyId, cost, meteringKey, ref, context, attribution, message);
    return { ok: true, confirmed: false };
  }
}

/**
 * Write the charge to the reconciliation ledger when the authoritative RPC
 * failed. Best effort by design: if this also fails we at least emit a
 * (alertable) error log, but we never silently treat the request as free.
 */
async function recordPendingSettlement(
  keyId: string,
  cost: number,
  meteringKey: string,
  ref: string | undefined,
  context: CreditChargeContext,
  attribution: ChargeAttribution,
  errorMessage: string
): Promise<void> {
  try {
    const client = createServiceRoleClient();
    const { error } = await client.rpc('record_pending_settlement', {
      p_key_id: keyId,
      p_cost: cost,
      p_metering_key: meteringKey,
      p_ref: ref ?? null,
      p_source: attribution.source,
      p_reason: context.reason ?? null,
      p_request_id: context.requestId ?? null,
      p_meta: attribution.meta ?? null,
      p_error: errorMessage,
    });
    if (error) {
      logger.error(
        'record_pending_settlement RPC error — charge unrecorded',
        new Error(error.message),
        { keyId, cost, meteringKey }
      );
    }
  } catch (error) {
    logger.error('record_pending_settlement failed — charge unrecorded', normalizeError(error), {
      keyId,
      cost,
      meteringKey,
    });
  }
}

/**
 * Replay charges that could not be written when the request ran. Idempotent
 * on the original metering key, so a row already settled is a no-op.
 * Called by the billing cron; results are logged for reconciliation.
 */
export async function settlePendingCredits(): Promise<{
  settled: number;
  abandoned: number;
  pending: number;
} | null> {
  const client = createServiceRoleClient();
  try {
    const { data, error } = await client.rpc('settle_pending_credits', { p_limit: 50 });
    if (error) {
      logger.error('settle_pending_credits RPC error', new Error(error.message));
      return null;
    }
    const result = (data ?? {}) as { settled?: number; abandoned?: number; pending?: number };
    return {
      settled: Number(result.settled ?? 0),
      abandoned: Number(result.abandoned ?? 0),
      pending: Number(result.pending ?? 0),
    };
  } catch (error) {
    logger.error('settle_pending_credits failed', normalizeError(error));
    return null;
  }
}

/**
 * Append a 0-delta `waiver` ledger row for a zero-charge outcome
 * (insufficient_data / upstream_failed / timeout), so the bill itself proves
 * the request was free. The row uses a `waive:`-prefixed metering key and
 * `kind='waiver'`, so it can never be mistaken for a usage debit and never
 * blocks a later real charge for the same logical request.
 *
 * Best effort: a failed audit write must not change the user-facing outcome,
 * but it is warned about so the gap is visible.
 */
export async function recordWaivedCredit(params: {
  keyId: string;
  /** Base ledger key of the logical request (the charge key). */
  meteringKey: string;
  ref?: string;
  /** Ledger `source`; defaults to `free` (no money moved). */
  source?: string;
  /** Zero reason: insufficient_data | upstream_failed | timeout. */
  reason: string;
  requestId?: string;
  meta?: Record<string, unknown>;
}): Promise<boolean> {
  const client = createServiceRoleClient();
  const waiverKey = `waive:${params.meteringKey}`;
  try {
    const { error } = await client.rpc('record_waived_credit', {
      p_key_id: params.keyId,
      p_metering_key: waiverKey,
      p_ref: params.ref ?? null,
      p_source: params.source ?? 'free',
      p_reason: params.reason,
      p_request_id: params.requestId ?? params.meteringKey,
      p_meta: params.meta ?? null,
    });
    if (error) {
      logger.warn('record_waived_credit RPC error — waiver row missing', {
        keyId: params.keyId,
        reason: params.reason,
        error: error.message,
      });
      return false;
    }
    return true;
  } catch (error) {
    logger.warn('record_waived_credit failed — waiver row missing', {
      keyId: params.keyId,
      reason: params.reason,
      error: normalizeError(error),
    });
    return false;
  }
}

/**
 * Credit a wallet (monthly grant, manual top-up, refund). Idempotent on
 * metering_key: re-running with the same key (e.g. a duplicate IPN) is a no-op.
 * Returns the new balance, or null on failure.
 */
export async function topUpCredits(params: {
  userId: string;
  amount: number;
  meteringKey: string;
  kind: 'topup' | 'grant' | 'refund';
  ref?: string;
  /** Ledger `source` (signup | x402 | subscription | wallet). */
  source?: string;
  /** Ledger `reason` (e.g. signup_grant, monthly_grant, pack_topup). */
  reason?: string;
  requestId?: string;
  meta?: Record<string, unknown>;
}): Promise<number | null> {
  const client = createServiceRoleClient();
  try {
    const { data, error } = await client.rpc('top_up_credits', {
      p_user_id: params.userId,
      p_amount: params.amount,
      p_metering_key: params.meteringKey,
      p_kind: params.kind,
      p_ref: params.ref ?? null,
      p_source: params.source ?? null,
      p_reason: params.reason ?? null,
      p_request_id: params.requestId ?? null,
      p_meta: params.meta ?? null,
    });
    if (error) {
      logger.warn('top_up_credits RPC error', {
        userId: params.userId,
        amount: params.amount,
        error: error.message,
      });
      return null;
    }
    return typeof data === 'number' ? data : null;
  } catch (error) {
    logger.warn('top_up_credits failed', { userId: params.userId, error: normalizeError(error) });
    return null;
  }
}

/**
 * Read a user's current wallet (settings UI / billing panel).
 * Returns { balance, frozen } or null when the user has no wallet yet.
 */
export async function getWalletBalance(
  userId: string
): Promise<{ balance: number; frozen: number } | null> {
  const client = createServiceRoleClient();
  try {
    const { data, error } = await client
      .from('credit_wallet')
      .select('balance, frozen')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return { balance: Number(data.balance ?? 0), frozen: Number(data.frozen ?? 0) };
  } catch (error) {
    logger.warn('getWalletBalance failed', { userId, error: normalizeError(error) });
    return null;
  }
}

/**
 * Grant every active subscriber their plan's monthly credit allowance.
 * Called by the billing cron (daily; idempotent per user+month). Returns the
 * number of users granted, or null on failure.
 */
export async function addMonthlyCredits(): Promise<number | null> {
  const client = createServiceRoleClient();
  try {
    const { data, error } = await client.rpc('add_monthly_credits');
    if (error) {
      logger.error('add_monthly_credits RPC error', new Error(error.message));
      return null;
    }
    return typeof data === 'number' ? data : null;
  } catch (error) {
    logger.error('add_monthly_credits failed', normalizeError(error));
    return null;
  }
}
