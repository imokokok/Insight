/**
 * @fileoverview Oracle Watch monitored-window lifecycle — begin, poll, close.
 *
 * A monitored window is the first non-per-call Insight product: one purchase
 * (x402 USDC or credits, see src/lib/billing/oracleWatchWindow.ts) pre-pays
 * continuous Oracle Watch coverage for a single (symbol, chain) subject for
 * the plan duration. Within the window the holder polls the current
 * halt/proceed signal at no per-call charge, bounded by a poll cap and a
 * minimum poll interval; closing returns a summary rebuilt from the
 * per-issuance audit rows (oracle_watch_checks.window_id).
 *
 * Auth model: the purchase returns a one-time bearer token exactly once; only
 * its SHA-256 hash is stored. Poll and close present that token — they never
 * accept an API key, so a keyless x402 buyer and an API-key buyer share one
 * surface and a leaked database dump cannot replay a window.
 *
 * Failure semantics are fail-closed: unknown id, wrong token, closed window,
 * expired window, and a exhausted poll budget all refuse to issue a signal.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { signWatchAttestation } from '@/lib/attestations/oracleWatchAttestation';
import type { OracleWatchAttestation } from '@/lib/attestations/oracleWatchAttestation';
import { ORACLE_WATCH_WINDOW_PLAN } from '@/lib/billing/oracleWatchWindow';
import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/chainMapping';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import type { Blockchain } from '@/types/oracle';

import { recordOracleWatchCheck } from './oracleWatchAudit';
import { getOracleWatchSignal } from './oracleWatchService';
import {
  assertOpenWindowSlot,
  consumePollRate,
  isConcurrencyTriggerError,
  ProductLimitError,
  PRODUCT_24H_LIMITS,
} from './productLimits';

import type { OracleWatchResult } from './oracleWatchService';

const logger = createLogger('oracle-watch-window');

const WINDOW_DURATION_MS = ORACLE_WATCH_WINDOW_PLAN.durationHours * 60 * 60 * 1000;

/** Bearer prefix on the raw window token. Cosmetic; stripped before hashing. */
const TOKEN_PREFIX = 'oww_';

/** A lifecycle hands out one token for itself and its embedded window. */
const LIFECYCLE_TOKEN_PREFIX = 'plc_';

/** Prefixes accepted when authenticating against a window token hash. */
const ACCEPTED_TOKEN_PREFIXES = [TOKEN_PREFIX, LIFECYCLE_TOKEN_PREFIX];

/** A raw window token is 32 random bytes, hex-encoded. */
const RAW_TOKEN_HEX_LENGTH = 64;

/** How a window was paid for. Drives provenance in the windows table. */
export type WindowPaymentMethod = 'x402' | 'credits';

/** A window row as returned to callers (never the token hash). */
export interface OracleWatchWindowView {
  windowId: string;
  symbol: string;
  chain: string | null;
  status: 'active' | 'closed';
  paymentMethod: WindowPaymentMethod;
  openedAt: string;
  expiresAt: string;
  closedAt: string | null;
  pollCount: number;
  pollCap: number;
}

export interface BeginWindowInput {
  symbol: string;
  chain?: string | null;
  paymentMethod: WindowPaymentMethod;
  apiKeyId?: string | null;
}

export interface BeginWindowResult {
  window: OracleWatchWindowView;
  /** Raw bearer token, shown exactly once: `oww_<64 hex>`. */
  windowToken: string;
}

export interface PollWindowResult {
  signal: OracleWatchResult;
  attestation: OracleWatchAttestation | null;
  window: {
    windowId: string;
    pollCount: number;
    pollCap: number;
    expiresAt: string;
  };
}

export interface WindowSummary {
  windowId: string;
  symbol: string;
  chain: string | null;
  status: 'closed';
  expired: boolean;
  openedAt: string;
  closedAt: string;
  expiresAt: string;
  /** Polls actually issued while the window was open and within budget. */
  pollsIssued: number;
  pollCap: number;
  verdictCounts: Record<'normal' | 'caution' | 'danger', number>;
  recommendationCounts: Record<'proceed' | 'proceed_with_caution' | 'halt', number>;
  haltCount: number;
  firstHaltAt: string | null;
  lastHaltAt: string | null;
}

export type WindowFailureCode =
  | 'NOT_FOUND'
  | 'INVALID_TOKEN'
  | 'WINDOW_CLOSED'
  | 'WINDOW_EXPIRED'
  | 'POLL_CAP_REACHED'
  | 'POLL_TOO_SOON';

/** A structured refusal; the route layer maps codes onto HTTP statuses. */
export class OracleWatchWindowError extends Error {
  constructor(
    readonly code: WindowFailureCode,
    readonly retryAfterSeconds?: number
  ) {
    super(`Oracle Watch window failure: ${code}`);
    this.name = 'OracleWatchWindowError';
  }
}

/** SHA-256 hex of a raw token — the only token form ever persisted. */
function hashToken(presented: string): string | null {
  const prefix = ACCEPTED_TOKEN_PREFIXES.find((candidate) => presented.startsWith(candidate));
  const raw = prefix ? presented.slice(prefix.length) : presented;
  if (!new RegExp(`^[0-9a-f]{${RAW_TOKEN_HEX_LENGTH}}$`).test(raw)) return null;
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

/** Constant-time comparison of two sha256 hex digests. */
function tokenHashesMatch(presentedHash: string, storedHash: string): boolean {
  const a = Buffer.from(presentedHash, 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

interface WindowRow {
  id: string;
  symbol: string;
  chain: string | null;
  status: 'active' | 'closed';
  payment_method: WindowPaymentMethod;
  token_hash: string;
  created_at: string;
  expires_at: string;
  closed_at: string | null;
  poll_count: number;
  last_poll_at: string | null;
  api_key_id: string | null;
}

function toView(row: WindowRow): OracleWatchWindowView {
  return {
    windowId: row.id,
    symbol: row.symbol,
    chain: row.chain,
    status: row.status,
    paymentMethod: row.payment_method,
    openedAt: row.created_at,
    expiresAt: row.expires_at,
    closedAt: row.closed_at,
    pollCount: row.poll_count,
    pollCap: ORACLE_WATCH_WINDOW_PLAN.pollCap,
  };
}

/**
 * Open a monitored window. Called only after the purchase itself succeeded —
 * an x402 settlement (keyless) or a wallet debit (API key). A failed insert
 * throws so the caller never returns a windowId without durable storage.
 */
export async function beginOracleWatchWindow(input: BeginWindowInput): Promise<BeginWindowResult> {
  await assertOpenWindowSlot(input.apiKeyId);

  const rawToken = randomBytes(RAW_TOKEN_HEX_LENGTH / 2).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken, 'utf8').digest('hex');
  const expiresAt = new Date(Date.now() + WINDOW_DURATION_MS).toISOString();
  const chain = input.chain ?? null;

  const client = createServiceRoleClient();
  const { data, error } = await client
    .from('oracle_watch_windows')
    .insert({
      symbol: input.symbol,
      chain,
      subject_chain_id: chain ? (BLOCKCHAIN_TO_CHAIN_ID[chain as Blockchain] ?? null) : null,
      status: 'active',
      token_hash: tokenHash,
      expires_at: expiresAt,
      payment_method: input.paymentMethod,
      api_key_id: input.apiKeyId ?? null,
    })
    .select(
      'id, symbol, chain, status, payment_method, token_hash, created_at, expires_at, closed_at, poll_count, last_poll_at, api_key_id'
    )
    .single();

  if (error || !data) {
    if (isConcurrencyTriggerError(error?.message)) {
      throw new ProductLimitError(
        'open_windows',
        PRODUCT_24H_LIMITS.maxOpenWindowsPerKey,
        PRODUCT_24H_LIMITS.maxOpenWindowsPerKey,
        null,
        'recheck'
      );
    }
    logger.error(
      'Monitored window insert failed',
      new Error(error?.message ?? 'unknown supabase error'),
      { symbol: input.symbol, chain }
    );
    throw new Error('Monitored window persistence failed', { cause: error });
  }

  logger.info('Monitored window opened', {
    windowId: data.id,
    symbol: input.symbol,
    chain,
    paymentMethod: input.paymentMethod,
    expiresAt,
  });

  return { window: toView(data as WindowRow), windowToken: TOKEN_PREFIX + rawToken };
}

/** Load a window row or fail closed. */
async function loadWindow(
  client: ReturnType<typeof createServiceRoleClient>,
  windowId: string,
  presentedToken: string
): Promise<WindowRow> {
  const presentedHash = hashToken(presentedToken);
  if (presentedHash === null) throw new OracleWatchWindowError('INVALID_TOKEN');

  const { data, error } = await client
    .from('oracle_watch_windows')
    .select(
      'id, symbol, chain, status, payment_method, token_hash, created_at, expires_at, closed_at, poll_count, last_poll_at, api_key_id'
    )
    .eq('id', windowId)
    .maybeSingle();

  if (error) {
    logger.warn('Monitored window lookup failed', { windowId, error: error.message });
    throw new OracleWatchWindowError('NOT_FOUND');
  }
  // Unknown id and known id answer identically to a wrong token: never reveal
  // whether a windowId exists to an unauthenticated caller.
  if (!data || !tokenHashesMatch(presentedHash, (data as WindowRow).token_hash)) {
    throw new OracleWatchWindowError('INVALID_TOKEN');
  }
  return data as WindowRow;
}

function assertOpen(row: WindowRow): void {
  if (row.status === 'closed') throw new OracleWatchWindowError('WINDOW_CLOSED');
  if (Date.parse(row.expires_at) <= Date.now()) {
    throw new OracleWatchWindowError('WINDOW_EXPIRED');
  }
}

/**
 * Issue one signal inside an open window. Counts against the poll budget via a
 * conditional update (`poll_count < cap`), so concurrent polls cannot exceed
 * the cap; the minimum poll interval is an advisory guard checked before the
 * (much more expensive) oracle assessment runs.
 */
export async function pollOracleWatchWindow(
  windowId: string,
  presentedToken: string
): Promise<PollWindowResult> {
  const client = createServiceRoleClient();
  const row = await loadWindow(client, windowId, presentedToken);
  assertOpen(row);

  if (row.poll_count >= ORACLE_WATCH_WINDOW_PLAN.pollCap) {
    throw new OracleWatchWindowError('POLL_CAP_REACHED');
  }

  const now = Date.now();
  if (row.last_poll_at) {
    const elapsedSeconds = (now - Date.parse(row.last_poll_at)) / 1000;
    if (elapsedSeconds < ORACLE_WATCH_WINDOW_PLAN.minPollIntervalSeconds) {
      throw new OracleWatchWindowError(
        'POLL_TOO_SOON',
        Math.ceil(ORACLE_WATCH_WINDOW_PLAN.minPollIntervalSeconds - elapsedSeconds)
      );
    }
  }

  // Per-key poll rate, checked after the token/interval guards so a rejected
  // poll does not consume budget. Keyless windows are bounded by their token.
  await consumePollRate(row.api_key_id ? `key:${row.api_key_id}` : `window:${row.id}`);

  const { data: updated, error: updateError } = await client
    .from('oracle_watch_windows')
    .update({ poll_count: row.poll_count + 1, last_poll_at: new Date(now).toISOString() })
    .eq('id', row.id)
    .lt('poll_count', ORACLE_WATCH_WINDOW_PLAN.pollCap)
    .select('poll_count')
    .maybeSingle();

  if (updateError) {
    logger.warn('Monitored window poll accounting failed', {
      windowId,
      error: updateError.message,
    });
    throw new Error('Monitored window poll accounting failed', { cause: updateError });
  }
  if (!updated) {
    // A concurrent poll consumed the last budget slot between our read and
    // write. Fail closed rather than issue an unpaid signal.
    throw new OracleWatchWindowError('POLL_CAP_REACHED');
  }
  const pollCount = Number((updated as { poll_count: number }).poll_count);

  const signal = await getOracleWatchSignal(row.symbol, row.chain ?? undefined);
  const subjectChainId = row.chain ? (BLOCKCHAIN_TO_CHAIN_ID[row.chain as Blockchain] ?? 0) : 0;
  const attestation = await signWatchAttestation({
    signal,
    providers: signal.providers,
    subjectChainId,
  });

  // The audit row is what the close summary is rebuilt from; a failed write
  // must not leave a billed window with unrecorded judgments.
  await recordOracleWatchCheck(signal, attestation, {
    source: 'rest',
    windowId: row.id,
    subjectChainId,
  });

  return {
    signal,
    attestation,
    window: {
      windowId: row.id,
      pollCount,
      pollCap: ORACLE_WATCH_WINDOW_PLAN.pollCap,
      expiresAt: row.expires_at,
    },
  };
}

/**
 * Close a window (idempotent) and return the summary rebuilt from the
 * per-issuance audit rows. Closing an already-closed window re-reads and
 * re-returns the same summary rather than erroring, so a lost response is
 * recoverable. Closing an expired window is also allowed — the summary is the
 * record of what the window covered.
 */
export async function closeOracleWatchWindow(
  windowId: string,
  presentedToken: string
): Promise<WindowSummary> {
  const client = createServiceRoleClient();
  const row = await loadWindow(client, windowId, presentedToken);
  const expired = Date.parse(row.expires_at) <= Date.now();

  let closedAt = row.closed_at;
  if (row.status === 'active') {
    closedAt = new Date(Date.now()).toISOString();
    const { error } = await client
      .from('oracle_watch_windows')
      .update({ status: 'closed', closed_at: closedAt })
      .eq('id', row.id)
      .eq('status', 'active');
    if (error) {
      logger.warn('Monitored window close failed', { windowId, error: error.message });
      throw new Error('Monitored window close failed', { cause: error });
    }
  }

  const { data: checks, error: checksError } = await client
    .from('oracle_watch_checks')
    .select('verdict, recommendation, created_at')
    .eq('window_id', row.id)
    .order('created_at', { ascending: true });

  if (checksError) {
    logger.warn('Monitored window summary query failed', { windowId, error: checksError.message });
    throw new Error('Monitored window summary query failed', { cause: checksError });
  }

  const verdictCounts = { normal: 0, caution: 0, danger: 0 };
  const recommendationCounts = { proceed: 0, proceed_with_caution: 0, halt: 0 };
  let firstHaltAt: string | null = null;
  let lastHaltAt: string | null = null;
  for (const check of (checks ?? []) as Array<{
    verdict: keyof typeof verdictCounts;
    recommendation: keyof typeof recommendationCounts;
    created_at: string;
  }>) {
    verdictCounts[check.verdict] = (verdictCounts[check.verdict] ?? 0) + 1;
    recommendationCounts[check.recommendation] =
      (recommendationCounts[check.recommendation] ?? 0) + 1;
    if (check.recommendation === 'halt') {
      firstHaltAt ??= check.created_at;
      lastHaltAt = check.created_at;
    }
  }

  logger.info('Monitored window closed', {
    windowId: row.id,
    expired,
    pollsIssued: checks?.length ?? 0,
    haltCount: recommendationCounts.halt,
  });

  return {
    windowId: row.id,
    symbol: row.symbol,
    chain: row.chain,
    status: 'closed',
    expired,
    openedAt: row.created_at,
    closedAt: closedAt ?? new Date().toISOString(),
    expiresAt: row.expires_at,
    pollsIssued: checks?.length ?? 0,
    pollCap: ORACLE_WATCH_WINDOW_PLAN.pollCap,
    verdictCounts,
    recommendationCounts,
    haltCount: recommendationCounts.halt,
    firstHaltAt,
    lastHaltAt,
  };
}
