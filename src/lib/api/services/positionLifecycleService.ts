/**
 * @fileoverview Position Lifecycle Bundle service — begin, bundled guard,
 * bundled receipt, close.
 *
 * A lifecycle is the roadmap C2 product: one purchase (x402 USDC or credits,
 * see src/lib/billing/positionLifecycle.ts) pre-pays 24h of coverage for ONE
 * (symbol, chain) position subject — an embedded Oracle Watch monitored window
 * (the C1 machinery, reused verbatim), 4 guard assessments across any of the
 * six position-guard families, and 1 attested execution receipt.
 *
 * Auth model mirrors the monitored window exactly: the purchase returns a
 * one-time bearer token exactly once (`plc_<64 hex>`); only its SHA-256 hash
 * is stored. The embedded window row stores the SAME hash, so the lifecycle
 * token also authenticates against the existing
 * /api/v1/safety/oracle-watch-window/{windowId} poll/close routes — watch
 * polling needs no new surface.
 *
 * Failure semantics are fail-closed: unknown id, wrong token, closed or
 * expired lifecycle, and exhausted guard/receipt budgets all refuse to run.
 * A budget slot is consumed atomically (conditional update) before the
 * expensive work and released if the underlying assessment or issuance fails
 * on technical grounds — a BLOCK verdict is a complete, charged decision.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { POSITION_LIFECYCLE_PLAN } from '@/lib/billing/positionLifecycle';
import type { PositionLifecycleGuardFamily } from '@/lib/billing/positionLifecycle';
import { recordExecutionReceipt } from '@/lib/execution/executionReceiptAudit';
import { issueExecutionReceipt } from '@/lib/execution/executionReceiptService';
import type { ExecutionReceiptIssueBody } from '@/lib/execution/issueSchema';
import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/chainMapping';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import type { Blockchain } from '@/types/oracle';

import { closeOracleWatchWindow } from './oracleWatchWindowService';
import {
  isLifecycleGuardFamily,
  POSITION_LIFECYCLE_GUARD_REGISTRY,
} from './positionLifecycleGuards';
import {
  assertOpenLifecycleSlot,
  assertOpenWindowSlot,
  isConcurrencyTriggerError,
  ProductLimitError,
  PRODUCT_24H_LIMITS,
} from './productLimits';

import type { WindowSummary } from './oracleWatchWindowService';

const logger = createLogger('position-lifecycle');

const LIFECYCLE_DURATION_MS = POSITION_LIFECYCLE_PLAN.durationHours * 60 * 60 * 1000;

/** Bearer prefix on the raw lifecycle token. Cosmetic; stripped before hashing. */
const TOKEN_PREFIX = 'plc_';

/** A raw lifecycle token is 32 random bytes, hex-encoded. */
const RAW_TOKEN_HEX_LENGTH = 64;

/** How a lifecycle was paid for. Drives provenance in the lifecycles table. */
export type LifecyclePaymentMethod = 'x402' | 'credits';

/** A lifecycle row as returned to callers (never the token hash). */
export interface PositionLifecycleView {
  lifecycleId: string;
  symbol: string;
  chain: string | null;
  status: 'active' | 'closed';
  paymentMethod: LifecyclePaymentMethod;
  openedAt: string;
  expiresAt: string;
  closedAt: string | null;
  guardBudget: number;
  guardUsed: number;
  receiptState: 'available' | 'consumed';
  windowId: string;
}

export interface BeginLifecycleInput {
  symbol: string;
  chain?: string | null;
  paymentMethod: LifecyclePaymentMethod;
  apiKeyId?: string | null;
}

export interface BeginLifecycleUsage {
  watch: {
    note: string;
    poll: { method: 'GET'; url: string; authorization: string };
    close: { method: 'POST'; url: string; authorization: string };
  };
  guard: {
    method: 'POST';
    url: string;
    authorization: string;
    body: { family: string; params: string; transaction?: string };
    budget: number;
  };
  receipt: {
    method: 'POST';
    url: string;
    authorization: string;
    budget: number;
  };
  close: { method: 'POST'; url: string; authorization: string };
}

export interface BeginLifecycleResult {
  lifecycle: PositionLifecycleView;
  /** The embedded monitored window id; poll it with the SAME bearer token. */
  windowId: string;
  /** Raw bearer token, shown exactly once: `plc_<64 hex>`. */
  lifecycleToken: string;
  usage: BeginLifecycleUsage;
}

export interface BundledGuardResult {
  family: PositionLifecycleGuardFamily;
  /** The native guard result, unmodified. */
  result: unknown;
  guard: { used: number; budget: number };
  expiresAt: string;
}

export interface BundledReceiptResult {
  receipt: Awaited<ReturnType<typeof issueExecutionReceipt>> extends infer R
    ? R extends { ok: true; receipt: infer T }
      ? T
      : never
    : never;
  receiptState: 'consumed';
  expiresAt: string;
}

export interface LifecycleSummary {
  lifecycleId: string;
  symbol: string;
  chain: string | null;
  status: 'closed';
  expired: boolean;
  openedAt: string;
  closedAt: string;
  expiresAt: string;
  guardUsed: number;
  guardBudget: number;
  receiptState: 'available' | 'consumed';
  receiptUid: string | null;
  /** Coverage summary of the embedded monitored window. */
  watch: WindowSummary;
}

export type LifecycleFailureCode =
  | 'NOT_FOUND'
  | 'INVALID_TOKEN'
  | 'LIFECYCLE_CLOSED'
  | 'LIFECYCLE_EXPIRED'
  | 'GUARD_BUDGET_REACHED'
  | 'RECEIPT_UNAVAILABLE';

/** A structured refusal; the route layer maps codes onto HTTP statuses. */
export class PositionLifecycleError extends Error {
  constructor(readonly code: LifecycleFailureCode) {
    super(`Position lifecycle failure: ${code}`);
    this.name = 'PositionLifecycleError';
  }
}

/** SHA-256 hex of a raw token — the only token form ever persisted. */
function hashToken(presented: string): string | null {
  const raw = presented.startsWith(TOKEN_PREFIX) ? presented.slice(TOKEN_PREFIX.length) : presented;
  if (!new RegExp(`^[0-9a-f]{${RAW_TOKEN_HEX_LENGTH}}$`).test(raw)) return null;
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

/** Constant-time comparison of two sha256 hex digests. */
function tokenHashesMatch(presentedHash: string, storedHash: string): boolean {
  const a = Buffer.from(presentedHash, 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

interface LifecycleRow {
  id: string;
  symbol: string;
  chain: string | null;
  status: 'active' | 'closed';
  payment_method: LifecyclePaymentMethod;
  token_hash: string;
  created_at: string;
  expires_at: string;
  closed_at: string | null;
  guard_budget: number;
  guard_used: number;
  receipt_state: 'available' | 'consumed';
  receipt_uid: string | null;
  window_id: string;
}

const LIFECYCLE_COLUMNS =
  'id, symbol, chain, status, payment_method, token_hash, created_at, expires_at, closed_at, guard_budget, guard_used, receipt_state, receipt_uid, window_id';

function toView(row: LifecycleRow): PositionLifecycleView {
  return {
    lifecycleId: row.id,
    symbol: row.symbol,
    chain: row.chain,
    status: row.status,
    paymentMethod: row.payment_method,
    openedAt: row.created_at,
    expiresAt: row.expires_at,
    closedAt: row.closed_at,
    guardBudget: row.guard_budget,
    guardUsed: row.guard_used,
    receiptState: row.receipt_state,
    windowId: row.window_id,
  };
}

/** Dependency seams for tests; production callers use the defaults. */
export interface PositionLifecycleDependencies {
  /** Runs one bundled guard assessment for a family. */
  assessGuard?: (
    family: PositionLifecycleGuardFamily,
    params: unknown,
    transaction?: unknown
  ) => Promise<unknown>;
  /** Issues one attested execution receipt. */
  issueReceipt?: typeof issueExecutionReceipt;
}

/**
 * Open a lifecycle. Called only after the purchase itself succeeded — an x402
 * settlement (keyless) or a wallet debit (API key). Creates the embedded
 * monitored window first; if the lifecycle insert then fails, the window row
 * is removed best-effort so no orphan paid window is left behind, and the
 * caller is never returned a lifecycleId without durable storage.
 */
export async function beginPositionLifecycle(
  input: BeginLifecycleInput
): Promise<BeginLifecycleResult> {
  // A lifecycle embeds a window, so both inventory caps apply before any row
  // is written. The DB trigger (migration 0122) re-checks them atomically.
  await assertOpenWindowSlot(input.apiKeyId);
  await assertOpenLifecycleSlot(input.apiKeyId);

  const rawToken = randomBytes(RAW_TOKEN_HEX_LENGTH / 2).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken, 'utf8').digest('hex');
  const expiresAt = new Date(Date.now() + LIFECYCLE_DURATION_MS).toISOString();
  const chain = input.chain ?? null;
  const subjectChainId = chain ? (BLOCKCHAIN_TO_CHAIN_ID[chain as Blockchain] ?? null) : null;

  const client = createServiceRoleClient();
  const { data: window, error: windowError } = await client
    .from('oracle_watch_windows')
    .insert({
      symbol: input.symbol,
      chain,
      subject_chain_id: subjectChainId,
      status: 'active',
      token_hash: tokenHash,
      expires_at: expiresAt,
      payment_method: input.paymentMethod,
      api_key_id: input.apiKeyId ?? null,
    })
    .select('id')
    .single();

  if (windowError || !window) {
    if (isConcurrencyTriggerError(windowError?.message)) {
      throw new ProductLimitError(
        'open_windows',
        PRODUCT_24H_LIMITS.maxOpenWindowsPerKey,
        PRODUCT_24H_LIMITS.maxOpenWindowsPerKey,
        null,
        'recheck'
      );
    }
    logger.error(
      'Embedded watch window insert failed',
      new Error(windowError?.message ?? 'unknown supabase error'),
      { symbol: input.symbol, chain }
    );
    throw new Error('Position lifecycle persistence failed', { cause: windowError });
  }
  const windowId = (window as { id: string }).id;

  const { data, error } = await client
    .from('position_lifecycles')
    .insert({
      symbol: input.symbol,
      chain,
      subject_chain_id: subjectChainId,
      status: 'active',
      token_hash: tokenHash,
      expires_at: expiresAt,
      guard_budget: POSITION_LIFECYCLE_PLAN.guardBudget,
      receipt_state: 'available',
      window_id: windowId,
      payment_method: input.paymentMethod,
      api_key_id: input.apiKeyId ?? null,
    })
    .select(LIFECYCLE_COLUMNS)
    .single();

  if (error || !data) {
    logger.error(
      'Position lifecycle insert failed; removing embedded window',
      new Error(error?.message ?? 'unknown supabase error'),
      { symbol: input.symbol, chain, windowId }
    );
    await client.from('oracle_watch_windows').delete().eq('id', windowId);
    if (isConcurrencyTriggerError(error?.message)) {
      throw new ProductLimitError(
        'open_lifecycles',
        PRODUCT_24H_LIMITS.maxOpenLifecyclesPerKey,
        PRODUCT_24H_LIMITS.maxOpenLifecyclesPerKey,
        null,
        'recheck'
      );
    }
    throw new Error('Position lifecycle persistence failed', { cause: error });
  }

  logger.info('Position lifecycle opened', {
    lifecycleId: (data as LifecycleRow).id,
    windowId,
    symbol: input.symbol,
    chain,
    paymentMethod: input.paymentMethod,
    expiresAt,
  });

  const base = `/api/v1/safety/position-lifecycle/${(data as LifecycleRow).id}`;
  const watchBase = `/api/v1/safety/oracle-watch-window/${windowId}`;
  const authorization = 'Bearer <lifecycleToken>';
  return {
    lifecycle: toView(data as LifecycleRow),
    windowId,
    lifecycleToken: TOKEN_PREFIX + rawToken,
    usage: {
      watch: {
        note: 'The embedded monitored window authenticates with the SAME lifecycle token.',
        poll: { method: 'GET', url: watchBase, authorization },
        close: { method: 'POST', url: watchBase, authorization },
      },
      guard: {
        method: 'POST',
        url: `${base}/guard`,
        authorization,
        body: { family: '<guardFamily>', params: '<family-native guard params>' },
        budget: POSITION_LIFECYCLE_PLAN.guardBudget,
      },
      receipt: {
        method: 'POST',
        url: `${base}/receipt`,
        authorization,
        budget: POSITION_LIFECYCLE_PLAN.receiptBudget,
      },
      close: { method: 'POST', url: base, authorization },
    },
  };
}

/** Load a lifecycle row or fail closed. */
async function loadLifecycle(
  client: ReturnType<typeof createServiceRoleClient>,
  lifecycleId: string,
  presentedToken: string
): Promise<LifecycleRow> {
  const presentedHash = hashToken(presentedToken);
  if (presentedHash === null) throw new PositionLifecycleError('INVALID_TOKEN');

  const { data, error } = await client
    .from('position_lifecycles')
    .select(LIFECYCLE_COLUMNS)
    .eq('id', lifecycleId)
    .maybeSingle();

  if (error) {
    logger.warn('Position lifecycle lookup failed', { lifecycleId, error: error.message });
    throw new PositionLifecycleError('NOT_FOUND');
  }
  // Unknown id and known id answer identically to a wrong token: never reveal
  // whether a lifecycleId exists to an unauthenticated caller.
  if (!data || !tokenHashesMatch(presentedHash, (data as LifecycleRow).token_hash)) {
    throw new PositionLifecycleError('INVALID_TOKEN');
  }
  return data as LifecycleRow;
}

function assertOpen(row: LifecycleRow): void {
  if (row.status === 'closed') throw new PositionLifecycleError('LIFECYCLE_CLOSED');
  if (Date.parse(row.expires_at) <= Date.now()) {
    throw new PositionLifecycleError('LIFECYCLE_EXPIRED');
  }
}

/**
 * Run one bundled guard assessment. The budget slot is consumed with a
 * conditional update (`guard_used < guard_budget`) so concurrent calls cannot
 * exceed the cap; the slot is released if the assessor itself throws, so a
 * technical failure never burns bundled coverage. A BLOCK verdict is a
 * complete assessment and DOES consume the slot.
 */
export async function runBundledGuard(
  lifecycleId: string,
  presentedToken: string,
  family: PositionLifecycleGuardFamily,
  params: unknown,
  transaction?: unknown,
  dependencies: PositionLifecycleDependencies = {}
): Promise<BundledGuardResult> {
  const client = createServiceRoleClient();
  const row = await loadLifecycle(client, lifecycleId, presentedToken);
  assertOpen(row);

  const { data: updated, error: updateError } = await client
    .from('position_lifecycles')
    .update({ guard_used: row.guard_used + 1 })
    .eq('id', row.id)
    .lt('guard_used', row.guard_budget)
    .select('guard_used, expires_at')
    .maybeSingle();

  if (updateError) {
    logger.warn('Bundled guard accounting failed', { lifecycleId, error: updateError.message });
    throw new Error('Bundled guard accounting failed', { cause: updateError });
  }
  if (!updated) {
    // A concurrent call consumed the last budget slot between our read and
    // write. Fail closed rather than run an unpaid assessment.
    throw new PositionLifecycleError('GUARD_BUDGET_REACHED');
  }
  const guardUsed = Number((updated as { guard_used: number }).guard_used);

  try {
    const entry = POSITION_LIFECYCLE_GUARD_REGISTRY[family];
    // The transaction-bearing families pass their second argument straight
    // through; each native assessor parses it with the same schema the native
    // route uses, so the dispatch itself stays uniform.
    const result = await (dependencies.assessGuard
      ? dependencies.assessGuard(family, params, transaction)
      : entry.assess(
          entry.paramsSchema.parse(params),
          entry.requiresTransaction ? transaction : undefined
        ));
    return {
      family,
      result,
      guard: { used: guardUsed, budget: row.guard_budget },
      expiresAt: row.expires_at,
    };
  } catch (error) {
    await client
      .from('position_lifecycles')
      .update({ guard_used: row.guard_used })
      .eq('id', row.id)
      .eq('guard_used', guardUsed);
    throw error;
  }
}

/**
 * Issue the bundled execution receipt. The single credit is claimed
 * atomically before issuance and released if issuance fails on technical
 * grounds, so a lost RPC race never consumes bundled coverage.
 */
export async function issueBundledReceipt(
  lifecycleId: string,
  presentedToken: string,
  body: ExecutionReceiptIssueBody,
  dependencies: PositionLifecycleDependencies = {}
): Promise<BundledReceiptResult> {
  const client = createServiceRoleClient();
  const row = await loadLifecycle(client, lifecycleId, presentedToken);
  assertOpen(row);

  const { data: updated, error: updateError } = await client
    .from('position_lifecycles')
    .update({ receipt_state: 'consumed' })
    .eq('id', row.id)
    .eq('receipt_state', 'available')
    .select('expires_at, subject_chain_id')
    .maybeSingle();

  if (updateError) {
    logger.warn('Bundled receipt claim failed', { lifecycleId, error: updateError.message });
    throw new Error('Bundled receipt claim failed', { cause: updateError });
  }
  if (!updated) {
    throw new PositionLifecycleError('RECEIPT_UNAVAILABLE');
  }

  try {
    const result = await (dependencies.issueReceipt ?? issueExecutionReceipt)({
      preTradeUid: body.preTradeUid as `0x${string}`,
      requestHash: body.requestHash as `0x${string}`,
      sourceAssetId: body.sourceAssetId,
      destinationAssetId: body.destinationAssetId,
      subjectChainId: body.subjectChainId,
      settlementChainId: body.settlementChainId,
      participantCount: body.participantCount,
      sourceGroupCount: body.sourceGroupCount,
      preTradeSignedAt: body.preTradeSignedAt,
      quotedPrice: body.quotedPrice,
      maxSlippageBps: body.maxSlippageBps,
      action: body.action,
      quotedAmountUsd: body.quotedAmountUsd,
      executedAmountUsd: body.executedAmountUsd,
      actualFeeUsd: body.actualFeeUsd,
      mevRiskScore: body.mevRiskScore,
      quoteVenueIndependent: body.quoteVenueIndependent,
      quoteBasis: body.quoteBasis,
      quoteBlockNumber: body.quoteBlockNumber,
      priceStateAgeAtExecSeconds: body.priceStateAgeAtExecSeconds,
      claimRole: body.claimRole,
      destinationPreTradeUid: (body.destinationPreTradeUid ?? null) as `0x${string}` | null,
      txHash: body.txHash as `0x${string}`,
      selectedSwapLogIndex: body.selectedSwapLogIndex,
      taker: body.taker as `0x${string}` | undefined,
      preTradeAttestations: body.preTradeAttestations
        ? {
            source: body.preTradeAttestations.source as never,
            destination: body.preTradeAttestations.destination as never,
          }
        : null,
    });

    if (!result.ok) {
      // Thrown below so the single release path restores the credit: a failed
      // issuance (unsupported chain, RPC error, signing unavailable) never
      // consumes bundled coverage.
      const releaseError = new Error(
        `bundled receipt issuance failed: ${result.code}: ${result.message}`
      );
      (releaseError as Error & { code?: string; status?: number }).code = result.code;
      (releaseError as Error & { code?: string; status?: number }).status = 400;
      throw releaseError;
    }

    // The audit row is the forensics trail; a failed write must not leave a
    // consumed credit without durable evidence.
    await recordExecutionReceipt(result.receipt, {
      source: 'rest',
      apiKeyId: null,
      subjectChainId: Number(
        (updated as { subject_chain_id: number | null }).subject_chain_id ?? 0
      ),
    });
    await client
      .from('position_lifecycles')
      .update({ receipt_uid: result.receipt.uid })
      .eq('id', row.id);

    logger.info('Bundled execution receipt issued', {
      lifecycleId: row.id,
      receiptUid: result.receipt.uid,
    });

    return { receipt: result.receipt, receiptState: 'consumed', expiresAt: row.expires_at };
  } catch (error) {
    // Any failure after the claim — issuer error, audit-write error, this
    // function's own error — restores the credit; only a successful, recorded
    // issuance consumes it.
    await client
      .from('position_lifecycles')
      .update({ receipt_state: 'available' })
      .eq('id', row.id)
      .eq('receipt_state', 'consumed');
    throw error;
  }
}

/**
 * Close a lifecycle (idempotent) and return the combined summary: guard and
 * receipt usage plus the embedded window's coverage summary. Closing an
 * already-closed lifecycle re-reads and re-returns the same summary rather
 * than erroring, so a lost response is recoverable. Closing an expired
 * lifecycle is also allowed — the summary is the record of what it covered.
 * The embedded window is closed first, so a failure cannot leave a closed
 * lifecycle whose window still occupies a paid concurrency slot.
 */
export async function closePositionLifecycle(
  lifecycleId: string,
  presentedToken: string
): Promise<LifecycleSummary> {
  const client = createServiceRoleClient();
  const row = await loadLifecycle(client, lifecycleId, presentedToken);
  const expired = Date.parse(row.expires_at) <= Date.now();

  const watch = await closeOracleWatchWindow(row.window_id, presentedToken);

  let closedAt = row.closed_at;
  if (row.status === 'active') {
    closedAt = new Date(Date.now()).toISOString();
    const { error } = await client
      .from('position_lifecycles')
      .update({ status: 'closed', closed_at: closedAt })
      .eq('id', row.id)
      .eq('status', 'active');
    if (error) {
      logger.warn('Position lifecycle close failed', { lifecycleId, error: error.message });
      throw new Error('Position lifecycle close failed', { cause: error });
    }
  }

  logger.info('Position lifecycle closed', {
    lifecycleId: row.id,
    expired,
    guardUsed: row.guard_used,
    receiptState: row.receipt_state,
    haltCount: watch.haltCount,
  });

  return {
    lifecycleId: row.id,
    symbol: row.symbol,
    chain: row.chain,
    status: 'closed',
    expired,
    openedAt: row.created_at,
    closedAt: closedAt ?? new Date().toISOString(),
    expiresAt: row.expires_at,
    guardUsed: row.guard_used,
    guardBudget: row.guard_budget,
    receiptState: row.receipt_state,
    receiptUid: row.receipt_uid,
    watch,
  };
}

export { isLifecycleGuardFamily };
