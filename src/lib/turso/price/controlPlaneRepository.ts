import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { z } from 'zod';

import type { OracleFeed } from '@/lib/supabase/queries';

import type { Client, Transaction } from '@libsql/client';

const REGISTRY_KEY = 'active-oracle-feeds';
const MAX_ERROR_LENGTH = 2_000;
const feedSchema = z
  .object({
    id: z.string().optional(),
    provider: z.string().trim().min(1).max(128),
    symbol: z.string().trim().min(1).max(256),
    chain_id: z.number().int().min(0).max(2_147_483_647),
    address: z.string().max(1_024),
    name: z.string().max(1_024),
    decimals: z.number().int().min(0).max(255),
    category: z.string().max(128),
    is_active: z.literal(true),
    source: z.string().max(256),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    consecutive_failures: z.number().int().min(0).optional(),
    last_success_at: z.string().datetime({ offset: true }).nullable().optional(),
    last_failure_at: z.string().datetime({ offset: true }).nullable().optional(),
    deactivated_reason: z.string().nullable().optional(),
    deactivated_at: z.string().datetime({ offset: true }).nullable().optional(),
    absent_discovery_runs: z.number().int().min(0).optional(),
    last_discovery_at: z.string().datetime({ offset: true }).nullable().optional(),
    created_at: z.string().datetime({ offset: true }).optional(),
    updated_at: z.string().datetime({ offset: true }).optional(),
  })
  .strict();
const feedRegistrySchema = z.object({ feeds: z.array(feedSchema).max(10_000) }).strict();

export type TursoIngestTriggerSource = 'cloudflare_cron' | 'github_actions' | 'manual';

export interface TursoIngestLease {
  state: 'acquired' | 'busy' | 'completed';
  slotMs: number;
  leaseId: string | null;
  leaseExpiresAtMs: number | null;
}

export interface TursoFeedRegistrySnapshot {
  feeds: OracleFeed[];
  versionHash: string;
  publishedAtMs: number;
}

export interface TursoIngestStatus {
  latestCapturedSlotMs: number | null;
  activeLeaseCount: number;
}

function asInteger(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`Invalid ${label}`);
  return parsed;
}

function asText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Invalid ${label}`);
  return value;
}

function assertSlotMs(slotMs: number): void {
  if (!Number.isSafeInteger(slotMs) || slotMs < 0)
    throw new Error('Invalid Turso ingest slot timestamp');
}

function assertTimestamp(nowMs: number): void {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0)
    throw new Error('Invalid Turso control-plane timestamp');
}

function assertLeaseDuration(leaseDurationMs: number): void {
  if (
    !Number.isSafeInteger(leaseDurationMs) ||
    leaseDurationMs < 1_000 ||
    leaseDurationMs > 60 * 60 * 1_000
  ) {
    throw new Error('Invalid Turso ingest lease duration');
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}

function canonicalRegistry(feeds: readonly OracleFeed[]): { payload: string; versionHash: string } {
  // An empty registry is a valid authoritative state during a controlled
  // deactivation. Mirroring it prevents stale providers from being revived by
  // a Supabase fallback while the control plane is impaired.
  const validated = z.array(feedSchema).max(10_000).parse(feeds);
  const sorted = [...validated].sort((left, right) => {
    const leftKey = `${left.provider}\u0000${left.symbol}\u0000${left.chain_id}`;
    const rightKey = `${right.provider}\u0000${right.symbol}\u0000${right.chain_id}`;
    return leftKey.localeCompare(rightKey);
  });
  const payload = JSON.stringify(canonicalize({ feeds: sorted }));
  return { payload, versionHash: bytesToHex(sha256(new TextEncoder().encode(payload))) };
}

function rowLease(
  slotMs: number,
  row: Record<string, unknown> | undefined,
  leaseId: string
): TursoIngestLease {
  if (!row) throw new Error('Turso ingest lease was not created');
  const completedAt = row.completed_at_ms;
  if (completedAt !== null && completedAt !== undefined) {
    return { state: 'completed', slotMs, leaseId: null, leaseExpiresAtMs: null };
  }
  const storedLeaseId = asText(row.lease_id, 'ingest lease id');
  const leaseExpiresAtMs = asInteger(row.lease_expires_at_ms, 'ingest lease expiry');
  if (storedLeaseId === leaseId) {
    return { state: 'acquired', slotMs, leaseId, leaseExpiresAtMs };
  }
  return { state: 'busy', slotMs, leaseId: null, leaseExpiresAtMs };
}

async function rollbackQuietly(transaction: Transaction | undefined): Promise<void> {
  if (!transaction) return;
  try {
    await transaction.rollback();
  } catch {
    // Preserve the original error; a closed transaction is already safe.
  }
}

/**
 * Acquire the only active collector lease for a 15-minute slot. A completed
 * raw slot is treated as completed even when it predates the lease table, so
 * this can be introduced without replaying historical slots.
 */
export async function acquireTursoPriceIngestLease(
  client: Client,
  slotMs: number,
  triggerSource: TursoIngestTriggerSource,
  leaseDurationMs: number,
  nowMs: number = Date.now()
): Promise<TursoIngestLease> {
  assertSlotMs(slotMs);
  assertLeaseDuration(leaseDurationMs);
  assertTimestamp(nowMs);
  const leaseId = crypto.randomUUID();
  let transaction: Transaction | undefined;
  try {
    transaction = await client.transaction('write');
    const rawSlot = await transaction.execute({
      sql: 'SELECT slot_ms FROM snapshot_slots WHERE slot_ms=?',
      args: [slotMs],
    });
    if (rawSlot.rows.length > 0) {
      await transaction.execute({
        sql: `INSERT INTO snapshot_ingest_leases(
          slot_ms,lease_id,lease_expires_at_ms,trigger_source,completed_at_ms,last_error,created_at_ms,updated_at_ms
        ) VALUES(?,?,?,?,?,?,?,?)
        ON CONFLICT(slot_ms) DO UPDATE SET
          completed_at_ms=coalesce(snapshot_ingest_leases.completed_at_ms, excluded.completed_at_ms),
          updated_at_ms=excluded.updated_at_ms`,
        args: [slotMs, leaseId, nowMs, triggerSource, nowMs, null, nowMs, nowMs],
      });
      await transaction.commit();
      return { state: 'completed', slotMs, leaseId: null, leaseExpiresAtMs: null };
    }

    await transaction.execute({
      sql: `INSERT OR IGNORE INTO snapshot_ingest_leases(
        slot_ms,lease_id,lease_expires_at_ms,trigger_source,created_at_ms,updated_at_ms
      ) VALUES(?,?,?,?,?,?)`,
      args: [slotMs, leaseId, nowMs + leaseDurationMs, triggerSource, nowMs, nowMs],
    });
    await transaction.execute({
      sql: `UPDATE snapshot_ingest_leases
        SET lease_id=?,lease_expires_at_ms=?,trigger_source=?,last_error=NULL,updated_at_ms=?
        WHERE slot_ms=? AND completed_at_ms IS NULL AND lease_expires_at_ms<=?`,
      args: [leaseId, nowMs + leaseDurationMs, triggerSource, nowMs, slotMs, nowMs],
    });
    const leaseResult = await transaction.execute({
      sql: `SELECT lease_id,lease_expires_at_ms,completed_at_ms
        FROM snapshot_ingest_leases WHERE slot_ms=?`,
      args: [slotMs],
    });
    const lease = rowLease(
      slotMs,
      leaseResult.rows[0] as Record<string, unknown> | undefined,
      leaseId
    );
    await transaction.commit();
    return lease;
  } catch (error) {
    await rollbackQuietly(transaction);
    throw error;
  }
}

export async function completeTursoPriceIngestLease(
  client: Client,
  slotMs: number,
  leaseId: string,
  nowMs: number = Date.now()
): Promise<void> {
  assertSlotMs(slotMs);
  assertTimestamp(nowMs);
  if (!leaseId) throw new Error('Missing Turso ingest lease id');
  const result = await client.execute({
    sql: `UPDATE snapshot_ingest_leases
      SET completed_at_ms=coalesce(completed_at_ms, ?),last_error=NULL,updated_at_ms=?
      WHERE slot_ms=? AND lease_id=?`,
    args: [nowMs, nowMs, slotMs, leaseId],
  });
  if (result.rowsAffected !== 1) throw new Error('Cannot complete an unowned Turso ingest lease');
}

/** Release an owned lease immediately after a failed pre-capture attempt. */
export async function failTursoPriceIngestLease(
  client: Client,
  slotMs: number,
  leaseId: string,
  error: unknown,
  nowMs: number = Date.now()
): Promise<void> {
  assertSlotMs(slotMs);
  assertTimestamp(nowMs);
  if (!leaseId) return;
  const message = (error instanceof Error ? error.message : String(error)).slice(
    0,
    MAX_ERROR_LENGTH
  );
  await client.execute({
    sql: `UPDATE snapshot_ingest_leases
      SET lease_expires_at_ms=?,last_error=?,updated_at_ms=?
      WHERE slot_ms=? AND lease_id=? AND completed_at_ms IS NULL`,
    args: [nowMs, message, nowMs, slotMs, leaseId],
  });
}

/** Publish a complete active-feed registry after an authoritative Supabase read. */
export async function publishTursoFeedRegistry(
  client: Client,
  feeds: readonly OracleFeed[],
  nowMs: number = Date.now()
): Promise<TursoFeedRegistrySnapshot> {
  assertTimestamp(nowMs);
  const { payload, versionHash } = canonicalRegistry(feeds);
  const result = await client.execute({
    sql: `INSERT INTO feed_registry_snapshots(
      registry_key,version_hash,canonical_payload,feed_count,published_at_ms
    ) VALUES(?,?,?,?,?)
    ON CONFLICT(registry_key) DO UPDATE SET
      version_hash=excluded.version_hash,
      canonical_payload=excluded.canonical_payload,
      feed_count=excluded.feed_count,
      published_at_ms=excluded.published_at_ms
    WHERE excluded.published_at_ms>=feed_registry_snapshots.published_at_ms`,
    args: [REGISTRY_KEY, versionHash, payload, feeds.length, nowMs],
  });
  if (result.rowsAffected !== 1) throw new Error('Turso feed registry publish was superseded');
  return { feeds: z.array(feedSchema).parse(feeds), versionHash, publishedAtMs: nowMs };
}

/** Return the last complete registry; callers must enforce their own freshness bound. */
export async function readTursoFeedRegistry(
  client: Client
): Promise<TursoFeedRegistrySnapshot | null> {
  const result = await client.execute({
    sql: `SELECT version_hash,canonical_payload,published_at_ms
      FROM feed_registry_snapshots WHERE registry_key=?`,
    args: [REGISTRY_KEY],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  const parsed = feedRegistrySchema.parse(
    JSON.parse(asText(row.canonical_payload, 'feed registry payload'))
  );
  return {
    feeds: parsed.feeds,
    versionHash: asText(row.version_hash, 'feed registry version hash'),
    publishedAtMs: asInteger(row.published_at_ms, 'feed registry publication time'),
  };
}

/** Small operational read used by readiness checks; it never touches Supabase. */
export async function getTursoPriceIngestStatus(
  client: Client,
  nowMs: number = Date.now()
): Promise<TursoIngestStatus> {
  assertTimestamp(nowMs);
  const [latest, active] = await Promise.all([
    client.execute('SELECT max(slot_ms) AS slot_ms FROM snapshot_slots'),
    client.execute({
      sql: `SELECT count(*) AS count FROM snapshot_ingest_leases
        WHERE completed_at_ms IS NULL AND lease_expires_at_ms>?`,
      args: [nowMs],
    }),
  ]);
  const rawSlot = latest.rows[0]?.slot_ms;
  return {
    latestCapturedSlotMs:
      rawSlot === null || rawSlot === undefined ? null : asInteger(rawSlot, 'latest Turso slot'),
    activeLeaseCount: asInteger(active.rows[0]?.count, 'active Turso ingest lease count'),
  };
}
