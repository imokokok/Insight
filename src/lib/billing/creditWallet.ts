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
  /** Ledger `source` (signup | x402 | subscription | wallet). */
  source?: string;
  /** Ledger `reason` (billed SKU or batch/timeout/insufficient_data outcome). */
  reason?: string;
  /** Client-visible request/receipt id. */
  requestId?: string;
  /** Per-charge detail, e.g. { requested, charged } for batches. */
  meta?: Record<string, unknown>;
}

/** Fallback metering key. Only used when a caller has no deterministic
 *  request key (e.g. internal/tooling calls); the HTTP paths always pass one,
 *  so a retry of the same logical request is a no-op rather than a double
 *  charge via the ledger UNIQUE constraint. */
export function makeMeteringKey(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
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
    return (data ?? { ok: true }) as CreditPrecheck;
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
  try {
    const { data, error } = await client.rpc('consume_credits', {
      p_key_id: keyId,
      p_cost: cost,
      p_metering_key: meteringKey,
      p_ref: ref ?? null,
      p_source: context.source ?? null,
      p_reason: context.reason ?? null,
      p_request_id: context.requestId ?? null,
      p_meta: context.meta ?? null,
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
      await recordPendingSettlement(keyId, cost, meteringKey, ref, context, error.message);
      return { ok: true, confirmed: false };
    }
    if (!data || typeof data.ok !== 'boolean') {
      logger.error(
        'consume_credits returned an unexpected payload — recording pending settlement',
        new Error('UNEXPECTED_CONSUME_PAYLOAD'),
        { keyId, cost, meteringKey }
      );
      await recordPendingSettlement(keyId, cost, meteringKey, ref, context, 'unexpected_payload');
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
    await recordPendingSettlement(keyId, cost, meteringKey, ref, context, message);
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
  errorMessage: string
): Promise<void> {
  try {
    const client = createServiceRoleClient();
    const { error } = await client.rpc('record_pending_settlement', {
      p_key_id: keyId,
      p_cost: cost,
      p_metering_key: meteringKey,
      p_ref: ref ?? null,
      p_source: context.source ?? null,
      p_reason: context.reason ?? null,
      p_request_id: context.requestId ?? null,
      p_meta: context.meta ?? null,
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
 * (insufficient_data / timeout / no usable data), so the bill itself proves
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
  /** Zero reason: insufficient_data | timeout | no_data. */
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
