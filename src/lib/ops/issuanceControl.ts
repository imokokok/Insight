/**
 * @fileoverview Operator issuance control (kill switch) + privileged action audit.
 *
 * WHY THIS EXISTS
 * Before this module the only documented way to stop issuing pre-trade verdicts
 * was to roll back a deployment (docs/operations/production-readiness.md,
 * "Incident and rollback"). An operator now has an auditable switch backed by
 * `ops_issuance_control` (current state) and `ops_admin_actions` (who did what,
 * when, and why).
 *
 * HOT-PATH CONTRACT — readIssuanceHalt()
 * The pre-trade service reads this state BEFORE it touches any upstream data, so
 * an incident that implicates the oracle sources cannot influence the outcome:
 * while halted, every check short-circuits to a signed BLOCK. That is what makes
 * this a circuit breaker rather than an alert.
 *
 * FAILURE SEMANTICS — deliberately fail OPEN, and never silently.
 * If the control row cannot be read or does not exist, `readIssuanceHalt`
 * returns "not halted" and logs at error level; issuance then continues through
 * the normal pipeline. Two reasons:
 *   1. A genuinely unreadable database already fails closed downstream — the
 *      pre-trade audit write throws, so no verdict is returned unaccounted for.
 *      Failing closed HERE would add nothing but an earlier 5xx.
 *   2. The realistic partial failure is a deploy that lands before migration
 *      0081 is applied. Failing closed there would turn a schema-ordering
 *      mistake into a total withdrawal of service, which is strictly worse than
 *      a switch that is loudly inoperative until the migration lands.
 * Every read failure is logged, so the failure mode is visible rather than
 * silent, and the console shows the same unreadable state. This switch is not a
 * substitute for the edge/deploy backstop described in the runbook.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ops-issuance-control');

export const ISSUANCE_REASON_MIN_LENGTH = 3;
export const ISSUANCE_REASON_MAX_LENGTH = 2000;

export interface IssuanceControlState {
  halted: boolean;
  reason: string | null;
  changedBy: string | null;
  changedByEmail: string | null;
  changedAt: string | null;
  revision: number;
}

export interface IssuanceControlSnapshot {
  /** Null when the control row could not be read, or does not exist. */
  state: IssuanceControlState | null;
  /** True when the state is UNKNOWN — not an assertion that issuance is running. */
  errored: boolean;
}

export interface IssuanceHaltReading {
  halted: boolean;
  reason: string | null;
}

export interface OpsAdminAction {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  target: string | null;
  reason: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
}

export interface IssuanceHistory {
  actions: OpsAdminAction[];
  errored: boolean;
}

interface IssuanceControlRow {
  halted: boolean | null;
  reason: string | null;
  changed_by: string | null;
  changed_by_email: string | null;
  changed_at: string | null;
  revision: number | string | null;
}

interface OpsAdminActionRow {
  id: string | number;
  created_at: string | null;
  actor_id: string | null;
  actor_email: string | null;
  action: string | null;
  target: string | null;
  reason: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asRevision(value: number | string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toState(row: IssuanceControlRow): IssuanceControlState {
  return {
    halted: row.halted === true,
    reason: asString(row.reason),
    changedBy: asString(row.changed_by),
    changedByEmail: asString(row.changed_by_email),
    changedAt: asString(row.changed_at),
    revision: asRevision(row.revision),
  };
}

const UNREADABLE: IssuanceControlSnapshot = { state: null, errored: true };

function describeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Read the current control state. Returns `errored: true` when the state is
 * unknown (query failure or a missing singleton row) so callers can distinguish
 * "not halted" from "could not verify".
 */
export async function readIssuanceControl(): Promise<IssuanceControlSnapshot> {
  try {
    const { data, error } = await createServiceRoleClient()
      .from('ops_issuance_control')
      .select('halted, reason, changed_by, changed_by_email, changed_at, revision')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = (data ?? null) as IssuanceControlRow | null;
    if (!row) return UNREADABLE;
    return { state: toState(row), errored: false };
  } catch (error) {
    logger.error(
      'Failed to read ops_issuance_control; issuance is treated as NOT halted until it is readable again',
      describeError(error)
    );
    return UNREADABLE;
  }
}

/**
 * Hot-path read used by the pre-trade service. See the file header for the
 * fail-open contract and its justification.
 */
export async function readIssuanceHalt(): Promise<IssuanceHaltReading> {
  const snapshot = await readIssuanceControl();
  if (snapshot.errored || !snapshot.state) return { halted: false, reason: null };
  return { halted: snapshot.state.halted, reason: snapshot.state.reason };
}

export interface ApplyIssuanceChangeInput {
  halted: boolean;
  reason: string;
  actorId: string;
  actorEmail: string | null;
}

/**
 * Apply a halt engage/release. The state flip and its audit row are written by
 * one database function so they cannot diverge; a failure throws and nothing is
 * half-applied.
 */
export async function applyIssuanceChange(
  input: ApplyIssuanceChangeInput
): Promise<IssuanceControlState> {
  const { data, error } = await createServiceRoleClient().rpc('ops_apply_issuance_change', {
    p_halted: input.halted,
    p_reason: input.reason,
    p_actor: input.actorId,
    p_actor_email: input.actorEmail,
  });
  if (error) throw new Error(`Issuance change was not applied: ${error.message}`);
  const rows = (Array.isArray(data) ? data : data ? [data] : []) as IssuanceControlRow[];
  const row = rows[0];
  if (!row) throw new Error('Issuance change returned no resulting state');
  return toState(row);
}

/**
 * Read the privileged-action audit log, newest first. Failures are reported
 * rather than thrown so the console can render an explicit error instead of an
 * empty (and therefore misleading) history.
 */
export async function readIssuanceHistory(limit = 50): Promise<IssuanceHistory> {
  try {
    const { data, error } = await createServiceRoleClient()
      .from('ops_admin_actions')
      .select(
        'id, created_at, actor_id, actor_email, action, target, reason, before_state, after_state'
      )
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(limit, 200)));
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as OpsAdminActionRow[];
    return {
      actions: rows.map((row) => ({
        id: String(row.id),
        createdAt: asString(row.created_at) ?? '',
        actorId: asString(row.actor_id),
        actorEmail: asString(row.actor_email),
        action: asString(row.action) ?? 'unknown',
        target: asString(row.target),
        reason: asString(row.reason),
        beforeState: row.before_state ?? null,
        afterState: row.after_state ?? null,
      })),
      errored: false,
    };
  } catch (error) {
    logger.error('Failed to read ops_admin_actions', describeError(error));
    return { actions: [], errored: true };
  }
}
