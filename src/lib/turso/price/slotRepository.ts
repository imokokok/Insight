import { createHash } from 'node:crypto';

import { z } from 'zod';

import { readTursoPriceRetentionPolicy } from './client';
import {
  absoluteDifference,
  CONFIDENCE_SCALE,
  decimalToScaled,
  DEVIATION_SCALE,
  maximum,
  PRICE_SCALE,
  scaledToCanonicalString,
} from './decimal';
import { TURSO_PRICE_SCHEMA_VERSION } from './schema';

import type {
  CapturedTursoPriceSlot,
  PriceWriteReason,
  TursoPriceInput,
  TursoPricePersistenceState,
  TursoPricePolicy,
  TursoPriceSlotSummary,
} from './types';
import type { Client, InStatement, Transaction } from '@libsql/client';

const MAX_SNAPSHOT_PRICE = 9_999_999_999_999_999.99999999;
const MAX_DEVIATION_PCT = 9_999.9999;
// Stay below SQLite's conservative 999-bound-parameter default even when the
// remote libSQL service accepts more. The transaction batch still turns each
// group into one network round trip.
const STATE_READ_BATCH_SIZE = 300;
const RAW_WRITE_BATCH_SIZE = 60;
const STATE_WRITE_BATCH_SIZE = 80;
const LATEST_WRITE_BATCH_SIZE = 50;
const MAINTENANCE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const inputSchema = z.object({
  provider: z.string().trim().min(1).max(128),
  symbol: z
    .string()
    .trim()
    .regex(/^[A-Z0-9][A-Z0-9._-]{0,31}$/),
  chainId: z.number().int().min(0),
  price: z.number().finite().min(0).max(MAX_SNAPSHOT_PRICE),
  consensusPrice: z.number().finite().min(0).max(MAX_SNAPSHOT_PRICE).nullable(),
  deviationPct: z.number().finite().min(-MAX_DEVIATION_PCT).max(MAX_DEVIATION_PCT).nullable(),
  latencyMs: z.number().int().min(0).max(2_147_483_647).nullable(),
  dataAgeSeconds: z.number().int().min(0).max(2_147_483_647).nullable(),
  confidence: z.number().finite().min(0).max(1).nullable(),
  isSuccess: z.boolean(),
  errorMessage: z.string().max(8_000).nullable(),
  snapshotHourMs: z.number().int().nonnegative().safe(),
});

const summarySchema = z
  .object({
    received: z.number().int().nonnegative(),
    candidates: z.number().int().nonnegative(),
    persisted: z.number().int().nonnegative(),
    fullResolution: z.number().int().nonnegative(),
    initial: z.number().int().nonnegative(),
    stateTransition: z.number().int().nonnegative(),
    errorChange: z.number().int().nonnegative(),
    hourlyBaseline: z.number().int().nonnegative(),
    priceChange: z.number().int().nonnegative(),
    deviationChange: z.number().int().nonnegative(),
    dataAgeChange: z.number().int().nonnegative(),
    confidenceChange: z.number().int().nonnegative(),
    stableSkipped: z.number().int().nonnegative(),
  })
  .strict();

const payloadSchema = z
  .object({
    slotMs: z.number().int().nonnegative().safe(),
    // Acknowledged slots can be compacted after the raw-retention window.
    // Pending slots must still carry at least one input (enforced at read).
    inputs: z.array(inputSchema).max(500),
  })
  .strict();

const persistenceStateSchema = z.object({
  provider: z.string().trim().min(1).max(128),
  symbol: z
    .string()
    .trim()
    .regex(/^[A-Z0-9][A-Z0-9._-]{0,31}$/),
  chainId: z.number().int().min(0),
  lastSnapshotMs: z.number().int().nonnegative().safe(),
  lastPrice: z.number().finite().min(0).max(MAX_SNAPSHOT_PRICE),
  lastDeviationPct: z.number().finite().min(-MAX_DEVIATION_PCT).max(MAX_DEVIATION_PCT).nullable(),
  lastDataAgeSeconds: z.number().int().min(0).max(2_147_483_647).nullable(),
  lastConfidence: z.number().finite().min(0).max(1).nullable(),
  lastIsSuccess: z.boolean(),
  lastErrorMessage: z.string().max(8_000).nullable(),
});

const persistencePolicySchema = z.object({
  policyKey: z.string().trim().min(1).max(32),
  resolution: z.enum(['full', 'adaptive']),
  priceChangeBps: z.number().int().min(1).max(100_000),
  deviationChangeBps: z.number().int().min(1).max(100_000),
  dataAgeChangeSeconds: z.number().int().min(1).max(2_147_483_647),
  confidenceChangeE4: z.number().int().min(1).max(10_000),
});

interface StoredState {
  lastSnapshotMs: number;
  lastPriceE8: bigint;
  lastDeviationE4: number | null;
  lastDataAgeSeconds: number | null;
  lastConfidenceE4: number | null;
  lastIsSuccess: boolean;
  lastErrorMessage: string | null;
}

interface PlannedRow {
  input: TursoPriceInput;
  priceE8: bigint;
  consensusPriceE8: bigint | null;
  deviationE4: number | null;
  confidenceE4: number | null;
  reason: PriceWriteReason;
  policy: TursoPricePolicy;
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function asInteger(value: unknown, field: string): number {
  const parsed = typeof value === 'bigint' ? Number(value) : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`Invalid stored ${field}`);
  return parsed;
}

function asSignedInteger(value: unknown, field: string): number {
  const parsed = typeof value === 'bigint' ? Number(value) : Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`Invalid stored ${field}`);
  return parsed;
}

function asNullableInteger(value: unknown, field: string): number | null {
  return value === null || value === undefined ? null : asInteger(value, field);
}

function asNullableSignedInteger(value: unknown, field: string): number | null {
  return value === null || value === undefined ? null : asSignedInteger(value, field);
}

function asText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Invalid stored ${field}`);
  return value;
}

function inputKey(input: Pick<TursoPriceInput, 'provider' | 'symbol' | 'chainId'>): string {
  return `${input.provider}\u0000${input.symbol}\u0000${input.chainId}`;
}

/** Mirrors PostgreSQL DISTINCT ON(... ORDER BY is_success DESC, ordinality DESC). */
function normalizeInputs(inputs: readonly TursoPriceInput[]): TursoPriceInput[] {
  const selected = new Map<string, { input: TursoPriceInput; ordinal: number }>();
  inputs.forEach((raw, ordinal) => {
    const input = inputSchema.parse(raw);
    const key = inputKey(input);
    const existing = selected.get(key);
    if (
      !existing ||
      Number(input.isSuccess) > Number(existing.input.isSuccess) ||
      (input.isSuccess === existing.input.isSuccess && ordinal > existing.ordinal)
    ) {
      selected.set(key, { input, ordinal });
    }
  });
  return [...selected.values()]
    .map(({ input }) => input)
    .sort((left, right) => inputKey(left).localeCompare(inputKey(right)));
}

function buildInputHash(slotMs: number, inputs: readonly TursoPriceInput[]): string {
  return hash(JSON.stringify({ slotMs, inputs }));
}

function canonicalPayload(slotMs: number, inputs: readonly TursoPriceInput[]): string {
  return JSON.stringify({ slotMs, inputs });
}

function emptySummary(received: number, candidates: number): TursoPriceSlotSummary {
  return {
    received,
    candidates,
    persisted: 0,
    fullResolution: 0,
    initial: 0,
    stateTransition: 0,
    errorChange: 0,
    hourlyBaseline: 0,
    priceChange: 0,
    deviationChange: 0,
    dataAgeChange: 0,
    confidenceChange: 0,
    stableSkipped: 0,
  };
}

function incrementReason(summary: TursoPriceSlotSummary, reason: PriceWriteReason): void {
  switch (reason) {
    case 'full_resolution':
      summary.fullResolution++;
      break;
    case 'initial':
      summary.initial++;
      break;
    case 'state_transition':
      summary.stateTransition++;
      break;
    case 'error_change':
      summary.errorChange++;
      break;
    case 'hourly_baseline':
      summary.hourlyBaseline++;
      break;
    case 'price_change':
      summary.priceChange++;
      break;
    case 'deviation_change':
      summary.deviationChange++;
      break;
    case 'data_age_change':
      summary.dataAgeChange++;
      break;
    case 'confidence_change':
      summary.confidenceChange++;
      break;
    case 'stable':
      summary.stableSkipped++;
      break;
  }
}

function parsePolicy(row: Record<string, unknown>): TursoPricePolicy {
  const resolution = row.resolution;
  if (resolution !== 'full' && resolution !== 'adaptive')
    throw new Error('Invalid Turso persistence policy');
  return {
    policyKey: asText(row.policy_key, 'policy key'),
    resolution,
    priceChangeBps: asInteger(row.price_change_bps, 'price change bps'),
    deviationChangeBps: asInteger(row.deviation_change_bps, 'deviation change bps'),
    dataAgeChangeSeconds: asInteger(row.data_age_change_seconds, 'data-age threshold'),
    confidenceChangeE4: asInteger(row.confidence_change_e4, 'confidence threshold'),
  };
}

function parseState(row: Record<string, unknown> | undefined): StoredState | null {
  if (!row) return null;
  const success = row.last_is_success;
  if (success !== 0 && success !== 1 && success !== 0n && success !== 1n) {
    throw new Error('Invalid Turso persistence state success flag');
  }
  return {
    lastSnapshotMs: asInteger(row.last_snapshot_ms, 'state timestamp'),
    lastPriceE8: BigInt(asText(row.last_price_e8, 'state price')),
    lastDeviationE4: asNullableSignedInteger(row.last_deviation_e4, 'state deviation'),
    lastDataAgeSeconds: asNullableInteger(row.last_data_age_seconds, 'state data age'),
    lastConfidenceE4: asNullableInteger(row.last_confidence_e4, 'state confidence'),
    lastIsSuccess: success === 1 || success === 1n,
    lastErrorMessage:
      row.last_error_message === null || row.last_error_message === undefined
        ? null
        : asText(row.last_error_message, 'state error message'),
  };
}

function sameUtcHour(leftMs: number, rightMs: number): boolean {
  return Math.floor(leftMs / 3_600_000) === Math.floor(rightMs / 3_600_000);
}

function selectReason(
  input: TursoPriceInput,
  priceE8: bigint,
  deviationE4: number | null,
  confidenceE4: number | null,
  policy: TursoPricePolicy,
  state: StoredState | null,
  slotMs: number
): PriceWriteReason {
  if (policy.resolution === 'full') return 'full_resolution';
  if (!state) return 'initial';
  if (state.lastIsSuccess !== input.isSuccess) return 'state_transition';
  if (!input.isSuccess && state.lastErrorMessage !== input.errorMessage) return 'error_change';
  if (!sameUtcHour(state.lastSnapshotMs, slotMs)) return 'hourly_baseline';
  const base = maximum(state.lastPriceE8 < 0n ? -state.lastPriceE8 : state.lastPriceE8, 1n);
  if (
    absoluteDifference(priceE8, state.lastPriceE8) * 10_000n >=
    base * BigInt(policy.priceChangeBps)
  ) {
    return 'price_change';
  }
  if (
    deviationE4 !== state.lastDeviationE4 &&
    (deviationE4 === null ||
      state.lastDeviationE4 === null ||
      Math.abs(deviationE4 - state.lastDeviationE4) * 100 >= policy.deviationChangeBps * 10_000)
  ) {
    return 'deviation_change';
  }
  if (
    input.dataAgeSeconds !== state.lastDataAgeSeconds &&
    (input.dataAgeSeconds === null ||
      state.lastDataAgeSeconds === null ||
      Math.abs(input.dataAgeSeconds - state.lastDataAgeSeconds) >= policy.dataAgeChangeSeconds)
  ) {
    return 'data_age_change';
  }
  if (
    confidenceE4 !== state.lastConfidenceE4 &&
    (confidenceE4 === null ||
      state.lastConfidenceE4 === null ||
      Math.abs(confidenceE4 - state.lastConfidenceE4) >= policy.confidenceChangeE4)
  ) {
    return 'confidence_change';
  }
  return 'stable';
}

async function readPolicies(transaction: Transaction): Promise<Map<string, TursoPricePolicy>> {
  const result = await transaction.execute('SELECT * FROM persistence_policies');
  const policies = new Map<string, TursoPricePolicy>();
  for (const row of result.rows) {
    const policy = parsePolicy(row as Record<string, unknown>);
    policies.set(policy.policyKey, policy);
  }
  if (!policies.has('__default__')) throw new Error('Turso default persistence policy is missing');
  return policies;
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

/**
 * Read all adaptive baselines in a handful of statements, rather than one
 * remote SELECT per asset. Missing keys intentionally stay absent from the
 * map and are treated as an initial observation by the planner.
 */
async function readStates(
  transaction: Transaction,
  inputs: readonly TursoPriceInput[]
): Promise<Map<string, StoredState>> {
  const inputGroups = chunks(inputs, STATE_READ_BATCH_SIZE);
  const statements: InStatement[] = inputGroups.map((group) => ({
    sql: `WITH requested(provider,symbol,chain_id) AS (
      VALUES ${group.map(() => '(?,?,?)').join(',')}
    )
    SELECT state.provider,state.symbol,state.chain_id,state.last_snapshot_ms,state.last_price_e8,
      state.last_deviation_e4,state.last_data_age_seconds,state.last_confidence_e4,
      state.last_is_success,state.last_error_message
    FROM persistence_state AS state
    INNER JOIN requested
      ON requested.provider=state.provider
      AND requested.symbol=state.symbol
      AND requested.chain_id=state.chain_id`,
    args: group.flatMap((input) => [input.provider, input.symbol, input.chainId]),
  }));
  const results = await transaction.batch(statements);
  const states = new Map<string, StoredState>();
  for (const result of results) {
    for (const raw of result.rows) {
      const row = raw as Record<string, unknown>;
      const provider = asText(row.provider, 'state provider');
      const symbol = asText(row.symbol, 'state symbol');
      const chainId = asInteger(row.chain_id, 'state chain id');
      const parsed = parseState(row);
      if (!parsed) throw new Error('Invalid Turso persistence state');
      states.set(inputKey({ provider, symbol, chainId }), parsed);
    }
  }
  return states;
}

function toPlannedRow(
  input: TursoPriceInput,
  policy: TursoPricePolicy,
  state: StoredState | null,
  slotMs: number
): PlannedRow {
  const priceE8 = decimalToScaled(input.price, PRICE_SCALE, 'price');
  const consensusPriceE8 =
    input.consensusPrice === null
      ? null
      : decimalToScaled(input.consensusPrice, PRICE_SCALE, 'consensus price');
  const deviationE4 =
    input.deviationPct === null
      ? null
      : Number(decimalToScaled(input.deviationPct, DEVIATION_SCALE, 'deviation'));
  const confidenceE4 =
    input.confidence === null
      ? null
      : Number(decimalToScaled(input.confidence, CONFIDENCE_SCALE, 'confidence'));
  return {
    input,
    priceE8,
    consensusPriceE8,
    deviationE4,
    confidenceE4,
    reason: selectReason(input, priceE8, deviationE4, confidenceE4, policy, state, slotMs),
    policy,
  };
}

function rawDigest(rows: readonly PlannedRow[]): string {
  const persisted = rows
    .filter((row) => row.reason !== 'stable')
    .map((row) => ({
      key: inputKey(row.input),
      priceE8: scaledToCanonicalString(row.priceE8),
      consensusPriceE8:
        row.consensusPriceE8 === null ? null : scaledToCanonicalString(row.consensusPriceE8),
      deviationE4: row.deviationE4,
      confidenceE4: row.confidenceE4,
      reason: row.reason,
    }));
  return hash(JSON.stringify(persisted));
}

function rawInsertStatements(
  rows: readonly PlannedRow[],
  slotMs: number,
  nowMs: number
): InStatement[] {
  return chunks(
    rows.filter((row) => row.reason !== 'stable'),
    RAW_WRITE_BATCH_SIZE
  ).map((group) => ({
    sql: `INSERT INTO price_snapshots(
      slot_ms,snapshot_hour_ms,provider,symbol,chain_id,price_e8,consensus_price_e8,
      deviation_e4,latency_ms,data_age_seconds,confidence_e4,is_success,error_message,
      write_reason,created_at_ms
    ) VALUES ${group.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}
    ON CONFLICT(slot_ms,provider,symbol,chain_id) DO NOTHING`,
    args: group.flatMap((row) => [
      slotMs,
      row.input.snapshotHourMs,
      row.input.provider,
      row.input.symbol,
      row.input.chainId,
      scaledToCanonicalString(row.priceE8),
      row.consensusPriceE8 === null ? null : scaledToCanonicalString(row.consensusPriceE8),
      row.deviationE4,
      row.input.latencyMs,
      row.input.dataAgeSeconds,
      row.confidenceE4,
      Number(row.input.isSuccess),
      row.input.errorMessage,
      row.reason,
      nowMs,
    ]),
  }));
}

function stateUpsertStatements(
  rows: readonly PlannedRow[],
  slotMs: number,
  nowMs: number
): InStatement[] {
  const adaptive = rows.filter(
    (row) => row.reason !== 'stable' && row.policy.resolution === 'adaptive'
  );
  return chunks(adaptive, STATE_WRITE_BATCH_SIZE).map((group) => ({
    sql: `INSERT INTO persistence_state(
      provider,symbol,chain_id,last_snapshot_ms,last_price_e8,last_deviation_e4,
      last_data_age_seconds,last_confidence_e4,last_is_success,last_error_message,updated_at_ms
    ) VALUES ${group.map(() => '(?,?,?,?,?,?,?,?,?,?,?)').join(',')}
    ON CONFLICT(provider,symbol,chain_id) DO UPDATE SET
      last_snapshot_ms=excluded.last_snapshot_ms,
      last_price_e8=excluded.last_price_e8,
      last_deviation_e4=excluded.last_deviation_e4,
      last_data_age_seconds=excluded.last_data_age_seconds,
      last_confidence_e4=excluded.last_confidence_e4,
      last_is_success=excluded.last_is_success,
      last_error_message=excluded.last_error_message,
      updated_at_ms=excluded.updated_at_ms
    WHERE persistence_state.last_snapshot_ms < excluded.last_snapshot_ms`,
    args: group.flatMap((row) => [
      row.input.provider,
      row.input.symbol,
      row.input.chainId,
      slotMs,
      scaledToCanonicalString(row.priceE8),
      row.deviationE4,
      row.input.dataAgeSeconds,
      row.confidenceE4,
      Number(row.input.isSuccess),
      row.input.errorMessage,
      nowMs,
    ]),
  }));
}

function latestUpsertStatements(
  rows: readonly PlannedRow[],
  slotMs: number,
  nowMs: number
): InStatement[] {
  return chunks(rows, LATEST_WRITE_BATCH_SIZE).map((group) => ({
    sql: `INSERT INTO price_latest(
      provider,symbol,chain_id,slot_ms,snapshot_hour_ms,price_e8,consensus_price_e8,
      deviation_e4,latency_ms,data_age_seconds,confidence_e4,is_success,error_message,
      write_reason,updated_at_ms
    ) VALUES ${group.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}
    ON CONFLICT(provider,symbol,chain_id) DO UPDATE SET
      slot_ms=excluded.slot_ms,
      snapshot_hour_ms=excluded.snapshot_hour_ms,
      price_e8=excluded.price_e8,
      consensus_price_e8=excluded.consensus_price_e8,
      deviation_e4=excluded.deviation_e4,
      latency_ms=excluded.latency_ms,
      data_age_seconds=excluded.data_age_seconds,
      confidence_e4=excluded.confidence_e4,
      is_success=excluded.is_success,
      error_message=excluded.error_message,
      write_reason=excluded.write_reason,
      updated_at_ms=excluded.updated_at_ms
    WHERE price_latest.slot_ms <= excluded.slot_ms`,
    args: group.flatMap((row) => [
      row.input.provider,
      row.input.symbol,
      row.input.chainId,
      slotMs,
      row.input.snapshotHourMs,
      scaledToCanonicalString(row.priceE8),
      row.consensusPriceE8 === null ? null : scaledToCanonicalString(row.consensusPriceE8),
      row.deviationE4,
      row.input.latencyMs,
      row.input.dataAgeSeconds,
      row.confidenceE4,
      Number(row.input.isSuccess),
      row.input.errorMessage,
      row.reason,
      nowMs,
    ]),
  }));
}

async function rollbackQuietly(transaction: Transaction | undefined): Promise<void> {
  if (!transaction) return;
  try {
    await transaction.rollback();
  } catch {
    // Preserve the original error; a closed transaction is already safe.
  }
}

function parseStoredSummary(value: unknown): TursoPriceSlotSummary {
  if (typeof value !== 'string') throw new Error('Invalid Turso slot summary');
  return summarySchema.parse(JSON.parse(value));
}

/**
 * Capture one complete collection slot. All raw rows, adaptive state and the
 * immutable replay payload commit together in Turso before Supabase receives
 * the hourly projection.
 */
export async function captureTursoPriceSlot(
  client: Client,
  rawInputs: readonly TursoPriceInput[],
  slotMs: number,
  nowMs: number = Date.now()
): Promise<CapturedTursoPriceSlot> {
  if (!Number.isSafeInteger(slotMs) || slotMs < 0) throw new Error('Invalid Turso slot timestamp');
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error('Invalid Turso capture timestamp');
  const received = z.array(inputSchema).min(1).max(500).parse(rawInputs);
  const inputs = normalizeInputs(received);
  const inputHash = buildInputHash(slotMs, inputs);
  let transaction: Transaction | undefined;
  try {
    transaction = await client.transaction('write');
    const existing = await transaction.execute({
      sql: 'SELECT input_hash,raw_digest,canonical_payload,summary_json FROM snapshot_slots WHERE slot_ms=?',
      args: [slotMs],
    });
    const existingRow = existing.rows[0] as Record<string, unknown> | undefined;
    if (existingRow) {
      const storedHash = asText(existingRow.input_hash, 'slot hash');
      if (storedHash !== inputHash) {
        throw new Error(`Turso price slot ${slotMs} already exists with a different input hash`);
      }
      const captured: CapturedTursoPriceSlot = {
        slotMs,
        inputHash,
        rawDigest: asText(existingRow.raw_digest, 'slot raw digest'),
        inputs: payloadSchema.parse(
          JSON.parse(asText(existingRow.canonical_payload, 'slot payload'))
        ).inputs,
        summary: parseStoredSummary(existingRow.summary_json),
        replayed: true,
      };
      await transaction.commit();
      return captured;
    }

    // A libSQL transaction owns one stream; keep these two batched reads
    // serial instead of opening concurrent work on that stream.
    const policies = await readPolicies(transaction);
    const states = await readStates(transaction, inputs);
    const summary = emptySummary(received.length, inputs.length);
    const planned: PlannedRow[] = [];
    for (const input of inputs) {
      const policy = policies.get(input.symbol) ?? policies.get('__default__')!;
      const state = states.get(inputKey(input)) ?? null;
      const row = toPlannedRow(input, policy, state, slotMs);
      planned.push(row);
      incrementReason(summary, row.reason);
    }
    summary.persisted = planned.filter((row) => row.reason !== 'stable').length;
    const digest = rawDigest(planned);
    const payload = canonicalPayload(slotMs, inputs);

    await transaction.batch([
      ...rawInsertStatements(planned, slotMs, nowMs),
      ...stateUpsertStatements(planned, slotMs, nowMs),
      ...latestUpsertStatements(planned, slotMs, nowMs),
      {
        sql: `INSERT INTO snapshot_slots(
        slot_ms,input_hash,raw_digest,canonical_payload,policy_version,received_count,
        candidate_count,persisted_count,summary_json,created_at_ms
      ) VALUES(?,?,?,?,?,?,?,?,?,?)`,
        args: [
          slotMs,
          inputHash,
          digest,
          payload,
          TURSO_PRICE_SCHEMA_VERSION,
          summary.received,
          summary.candidates,
          summary.persisted,
          JSON.stringify(summary),
          nowMs,
        ],
      },
    ]);
    await transaction.commit();
    return { slotMs, inputHash, rawDigest: digest, inputs, summary, replayed: false };
  } catch (error) {
    await rollbackQuietly(transaction);
    throw error;
  }
}

export async function acknowledgeTursoPriceSlot(
  client: Client,
  slotMs: number,
  inputHash: string,
  nowMs: number = Date.now()
): Promise<void> {
  const result = await client.execute({
    sql: `UPDATE snapshot_slots SET supabase_acknowledged_at_ms=coalesce(supabase_acknowledged_at_ms, ?)
      WHERE slot_ms=? AND input_hash=?`,
    args: [nowMs, slotMs, inputHash],
  });
  if (result.rowsAffected !== 1) throw new Error('Cannot acknowledge an unknown Turso price slot');
}

/** The latest slot whose Supabase-primary result has been verified. */
export async function latestAcknowledgedTursoPriceSlot(client: Client): Promise<number | null> {
  const result = await client.execute(
    'SELECT max(slot_ms) AS slot_ms FROM snapshot_slots WHERE supabase_acknowledged_at_ms IS NOT NULL'
  );
  const value = result.rows[0]?.slot_ms;
  return value === null || value === undefined
    ? null
    : asInteger(value, 'acknowledged slot timestamp');
}

/**
 * Atomically replace only the mutable adaptive baseline and policy projection.
 * Immutable Turso slot evidence is deliberately retained for audit and replay.
 */
export async function replaceTursoPricePersistenceProjection(
  client: Client,
  rawStates: readonly TursoPricePersistenceState[],
  rawPolicies: readonly TursoPricePolicy[],
  nowMs: number = Date.now()
): Promise<void> {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new Error('Invalid Turso persistence projection timestamp');
  }
  const states = z.array(persistenceStateSchema).max(2_000).parse(rawStates);
  const policies = z.array(persistencePolicySchema).min(1).max(128).parse(rawPolicies);
  if (!policies.some((policy) => policy.policyKey === '__default__')) {
    throw new Error('Turso persistence projection is missing the default policy');
  }

  const statements: InStatement[] = [
    'DELETE FROM persistence_policies',
    ...policies.map((policy) => ({
      sql: `INSERT INTO persistence_policies(
        policy_key,resolution,price_change_bps,deviation_change_bps,
        data_age_change_seconds,confidence_change_e4,updated_at_ms
      ) VALUES(?,?,?,?,?,?,?)`,
      args: [
        policy.policyKey,
        policy.resolution,
        policy.priceChangeBps,
        policy.deviationChangeBps,
        policy.dataAgeChangeSeconds,
        policy.confidenceChangeE4,
        nowMs,
      ],
    })),
    'DELETE FROM persistence_state',
    ...states.map((state) => ({
      sql: `INSERT INTO persistence_state(
        provider,symbol,chain_id,last_snapshot_ms,last_price_e8,last_deviation_e4,
        last_data_age_seconds,last_confidence_e4,last_is_success,last_error_message,updated_at_ms
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        state.provider,
        state.symbol,
        state.chainId,
        state.lastSnapshotMs,
        scaledToCanonicalString(decimalToScaled(state.lastPrice, PRICE_SCALE, 'state price')),
        state.lastDeviationPct === null
          ? null
          : Number(decimalToScaled(state.lastDeviationPct, DEVIATION_SCALE, 'state deviation')),
        state.lastDataAgeSeconds,
        state.lastConfidence === null
          ? null
          : Number(decimalToScaled(state.lastConfidence, CONFIDENCE_SCALE, 'state confidence')),
        Number(state.lastIsSuccess),
        state.lastErrorMessage,
        nowMs,
      ],
    })),
  ];
  await client.batch(statements, 'write');
}

export interface PendingTursoPriceSlot {
  slotMs: number;
  inputHash: string;
  rawDigest: string;
  inputs: TursoPriceInput[];
}

export interface TursoPriceProjectionBacklog {
  pendingCount: number;
  oldestSlotMs: number | null;
}

export interface TursoPriceMaintenanceSummary {
  rawEventsPruned: number;
  acknowledgedPayloadsCompacted: number;
}

export async function listPendingTursoPriceSlots(
  client: Client,
  limit: number = 4
): Promise<PendingTursoPriceSlot[]> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 32)
    throw new Error('Invalid pending slot limit');
  const result = await client.execute({
    sql: `SELECT slot_ms,input_hash,raw_digest,canonical_payload FROM snapshot_slots
      WHERE supabase_acknowledged_at_ms IS NULL ORDER BY slot_ms ASC LIMIT ?`,
    args: [limit],
  });
  return result.rows.map((row) => {
    const stored = row as Record<string, unknown>;
    const payload = payloadSchema.parse(
      JSON.parse(asText(stored.canonical_payload, 'slot payload'))
    );
    if (payload.inputs.length === 0) {
      throw new Error('Pending Turso price slot is missing its immutable payload');
    }
    return {
      slotMs: asInteger(stored.slot_ms, 'slot timestamp'),
      inputHash: asText(stored.input_hash, 'slot hash'),
      rawDigest: asText(stored.raw_digest, 'slot raw digest'),
      inputs: payload.inputs,
    };
  });
}

/** A compact operational read used by the independent projection worker. */
export async function getTursoPriceProjectionBacklog(
  client: Client
): Promise<TursoPriceProjectionBacklog> {
  const result = await client.execute(
    `SELECT count(*) AS pending_count,min(slot_ms) AS oldest_slot_ms
      FROM snapshot_slots WHERE supabase_acknowledged_at_ms IS NULL`
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error('Missing Turso projection backlog result');
  const pendingCount = asInteger(row.pending_count, 'pending slot count');
  const oldest = row.oldest_slot_ms;
  return {
    pendingCount,
    oldestSlotMs:
      oldest === null || oldest === undefined
        ? null
        : asInteger(oldest, 'oldest pending slot timestamp'),
  };
}

/**
 * Retain the bounded, high-resolution event stream only. This never touches
 * acknowledged slot payloads, Supabase's hourly business projection, or the
 * hot `price_latest` model. At most one indexed delete runs per day.
 */
export async function pruneExpiredTursoPriceEvents(
  client: Client,
  nowMs: number = Date.now()
): Promise<TursoPriceMaintenanceSummary> {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new Error('Invalid Turso price maintenance timestamp');
  }
  const { rawRetentionDays } = readTursoPriceRetentionPolicy();
  const maintenance = await client.execute({
    sql: 'SELECT last_run_ms FROM price_maintenance WHERE task_key=?',
    args: ['raw-event-retention'],
  });
  const previous = maintenance.rows[0]?.last_run_ms;
  if (
    previous !== null &&
    previous !== undefined &&
    nowMs - asInteger(previous, 'raw-event retention timestamp') < MAINTENANCE_INTERVAL_MS
  ) {
    return { rawEventsPruned: 0, acknowledgedPayloadsCompacted: 0 };
  }

  const cutoffMs = nowMs - rawRetentionDays * 24 * 60 * 60 * 1000;
  let transaction: Transaction | undefined;
  try {
    transaction = await client.transaction('write');
    const compacted = await transaction.execute({
      // The payload is needed only until Supabase acknowledges the immutable
      // hand-off. Afterwards the slot's hashes, digest and summary remain as
      // durable audit evidence; retaining hundreds of source inputs forever
      // would erase most of the intended storage saving.
      sql: `UPDATE snapshot_slots
        SET canonical_payload='{"slotMs":' || slot_ms || ',"inputs":[]}'
        WHERE supabase_acknowledged_at_ms IS NOT NULL
          AND slot_ms < ?
          AND canonical_payload NOT LIKE '%"inputs":[]%'`,
      args: [cutoffMs],
    });
    const deletion = await transaction.execute({
      sql: 'DELETE FROM price_snapshots WHERE slot_ms < ?',
      args: [cutoffMs],
    });
    await transaction.execute({
      sql: `INSERT INTO price_maintenance(task_key,last_run_ms) VALUES(?,?)
        ON CONFLICT(task_key) DO UPDATE SET last_run_ms=excluded.last_run_ms`,
      args: ['raw-event-retention', nowMs],
    });
    await transaction.commit();
    return {
      rawEventsPruned: Number(deletion.rowsAffected ?? 0),
      acknowledgedPayloadsCompacted: Number(compacted.rowsAffected ?? 0),
    };
  } catch (error) {
    await rollbackQuietly(transaction);
    throw error;
  }
}
