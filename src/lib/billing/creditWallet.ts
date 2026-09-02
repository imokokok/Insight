/**
 * @fileoverview Credit wallet client — the Read/Write layer over the
 * credit_wallet / credit_ledger tables and their SECURITY DEFINER RPCs.
 *
 * Model (see supabase/migrations/0039_credit_wallet.sql):
 *   - precheckCredits: read-only gate check (balance + optional per-key
 *     monthly budget). The quota middleware calls this to reject a request
 *     early with a 402 before doing any work.
 *   - consumeCredits: the authoritative, atomic, idempotent charge. It is
 *     fire-and-forget from the request path (a missed charge only means the
 *     user gets a marginally cheaper call), but unlike a plain counter the
 *     underlying RPC re-checks balance/budget atomically and a metering_key
 *     guarantees no double-charge on a retry.
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
}

export interface CreditCharge {
  ok: boolean;
  reason?: 'KEY_NOT_FOUND' | 'BUDGET_EXCEEDED' | 'INSUFFICIENT_CREDITS';
  idempotent?: boolean;
  balance?: number;
  cost?: number;
}

/** Random per-request metering key. Fresh per call, so concurrent requests
 *  never collide, while the DB UNIQUE constraint makes a duplicate retry a
 *  no-op rather than a double-charge. */
export function makeMeteringKey(prefix: string): string {
  return `${prefix}:${crypto.getRandomValues(new Uint8Array(16)).join('')}`;
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
      logger.warn('precheck_credits RPC error', { keyId, cost, error: error.message });
      // Fail open on transient DB errors — do not block the request.
      return { ok: true };
    }
    return (data ?? { ok: true }) as CreditPrecheck;
  } catch (error) {
    logger.warn('precheck_credits failed', { keyId, cost, error: normalizeError(error) });
    return { ok: true };
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
  ref?: string
): Promise<CreditCharge> {
  const client = createServiceRoleClient();
  try {
    const { data, error } = await client.rpc('consume_credits', {
      p_key_id: keyId,
      p_cost: cost,
      p_metering_key: meteringKey,
      p_ref: ref ?? null,
    });
    if (error) {
      logger.warn('consume_credits RPC error', { keyId, cost, error: error.message });
      return { ok: true };
    }
    return (data ?? { ok: true }) as CreditCharge;
  } catch (error) {
    logger.warn('consume_credits failed', { keyId, cost, error: normalizeError(error) });
    return { ok: true };
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
}): Promise<number | null> {
  const client = createServiceRoleClient();
  try {
    const { data, error } = await client.rpc('top_up_credits', {
      p_user_id: params.userId,
      p_amount: params.amount,
      p_metering_key: params.meteringKey,
      p_kind: params.kind,
      p_ref: params.ref ?? null,
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
