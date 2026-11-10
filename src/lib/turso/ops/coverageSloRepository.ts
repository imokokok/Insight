// Turso repository for the coverage-SLO domain (egress retirement v4,
// 2026-11). Mirrors the Supabase write shape of src/lib/coverage/collector.ts:
// idempotent target enrollment, first-attempt slot dedupe keyed on
// (target_id, slot), and a duplicate-tolerant sample upsert. 90-day retention
// (migration 0138) is trimmed per run, keyed on recorded_at.
//
// Mode contract (house pattern):
//   'supabase' — write Supabase only (pre-migration behaviour)
//   'turso'    — write Turso only (egress-retired end state)
// No shadow mode: slots are immutable first-attempt samples and dual-writing
// would burn egress during the restricted window this migration exists to
// escape.
import type { Client, InStatement, InValue } from '@libsql/client/web';

export type TursoCoverageSloMode = 'supabase' | 'turso';

export function readTursoCoverageSloMode(
  value: string | undefined = process.env.TURSO_COVERAGE_SLO_MODE
): TursoCoverageSloMode {
  if (value === undefined || value === '' || value === 'supabase') return 'supabase';
  if (value === 'turso') return value;
  throw new Error('TURSO_COVERAGE_SLO_MODE must be supabase or turso');
}

export interface TursoCoverageTarget {
  id: string;
  asset: string;
  chainId: number;
  policyId: string;
  objectiveBps: number;
}

export interface TursoCoverageSample {
  targetId: string;
  slot: number;
  status: string;
  signedReady: boolean;
  reasons: readonly string[];
  /** Signed report payload (JSON-serializable; stored as TEXT). */
  proof: unknown;
  recordedAt: string;
}

/** Idempotent enrollment, mirroring `onConflict: 'id', ignoreDuplicates`. */
export async function enrollTursoCoverageTarget(
  client: Client,
  target: TursoCoverageTarget,
  enrolledAt: string = new Date().toISOString()
): Promise<void> {
  await client.execute({
    sql: `
      INSERT INTO coverage_slo_targets (id, asset, chain_id, policy_id, objective_bps, enrolled_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `,
    args: [
      target.id,
      target.asset,
      target.chainId,
      target.policyId,
      target.objectiveBps,
      enrolledAt,
    ],
  });
}

/** True when the slot already has a first-attempt sample. */
export async function hasTursoCoverageSample(
  client: Client,
  targetId: string,
  slot: number
): Promise<boolean> {
  const result = await client.execute({
    sql: 'SELECT 1 FROM coverage_slo_samples WHERE target_id = ? AND slot = ?',
    args: [targetId, slot],
  });
  return result.rows.length > 0;
}

const INSERT_SAMPLE_SQL = `
  INSERT INTO coverage_slo_samples (
    target_id, slot, status, signed_ready, reasons, proof, recorded_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (target_id, slot) DO NOTHING
`;

/** Duplicate-tolerant sample insert, mirroring the Supabase upsert. */
export async function insertTursoCoverageSample(
  client: Client,
  sample: TursoCoverageSample
): Promise<void> {
  const statements: InStatement[] = [
    {
      sql: INSERT_SAMPLE_SQL,
      args: [
        sample.targetId,
        sample.slot,
        sample.status,
        sample.signedReady ? 1 : 0,
        JSON.stringify(sample.reasons),
        sample.proof === null || sample.proof === undefined ? null : JSON.stringify(sample.proof),
        sample.recordedAt,
      ] satisfies InValue[],
    },
  ];
  await client.batch(statements, 'write');
}

export interface TursoCoverageAlertHistoryRow {
  target_id: string;
  slot: number;
  status: string;
  signed_ready: number;
}

/** Window history for alert state-change detection (previous 3 slots). */
export async function readTursoCoverageAlertHistory(
  client: Client,
  targetIds: readonly string[],
  fromSlot: number,
  toSlotExclusive: number
): Promise<TursoCoverageAlertHistoryRow[]> {
  if (targetIds.length === 0) return [];
  const placeholders = targetIds.map(() => '?').join(', ');
  const result = await client.execute({
    sql: `SELECT target_id, slot, status, signed_ready
          FROM coverage_slo_samples
          WHERE target_id IN (${placeholders}) AND slot >= ? AND slot < ?
          ORDER BY target_id, slot`,
    args: [...targetIds, fromSlot, toSlotExclusive],
  });
  return result.rows.map((row) => ({
    target_id: String(row.target_id),
    slot: Number(row.slot),
    status: String(row.status),
    signed_ready: Number(row.signed_ready),
  }));
}

/** Retention trim (90-day window, migration 0138). Best-effort per run. */
export async function trimTursoCoverageSamples(
  client: Client,
  retentionDays: number,
  now: Date = new Date()
): Promise<number> {
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1) {
    throw new Error('retentionDays must be a positive integer');
  }
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000).toISOString();
  const result = await client.execute({
    sql: 'DELETE FROM coverage_slo_samples WHERE recorded_at < ?',
    args: [cutoff],
  });
  return Number(result.rowsAffected ?? 0);
}

export interface TursoCoverageSummaryRow {
  id: string;
  asset: string;
  chain_id: number;
  policy_id: string;
  objective_bps: number;
  expected: number;
  observed: number;
  data_ready: number;
  signed_ready: number;
  unavailable: number;
  missing: number;
  latest: {
    slot: number;
    status: string;
    signedReady: boolean;
    reasons: string[];
    providers: unknown;
  } | null;
}

const SUPPORTED_WINDOWS = [24, 168, 672] as const;

/**
 * JS port of the coverage_slo_summary Postgres RPC (migration 0056): per
 * target, aggregate the samples inside the slot window
 * [max(enrolled_slot, end_slot - window), end_slot) and attach the newest
 * sample. The repository does not filter by policy — callers do that.
 */
export async function readTursoCoverageSummary(
  client: Client,
  windowHours: 24 | 168 | 672,
  now: Date = new Date()
): Promise<TursoCoverageSummaryRow[]> {
  if (!SUPPORTED_WINDOWS.includes(windowHours)) {
    throw new Error('Unsupported SLO window');
  }
  const endSlot = Math.floor(now.getTime() / 900_000) * 900;
  const targets = await client.execute(
    `SELECT id, asset, chain_id, policy_id, objective_bps, enrolled_at
     FROM coverage_slo_targets ORDER BY asset, chain_id, policy_id`
  );

  const rows: TursoCoverageSummaryRow[] = [];
  for (const target of targets.rows) {
    const enrolledMs = Date.parse(String(target.enrolled_at ?? ''));
    // Rows enrolled before the v5 column existed carry an empty string; treat
    // them as enrolled at the epoch so the full window is evaluated.
    const enrolledSlot = Number.isFinite(enrolledMs) ? Math.ceil(enrolledMs / 900_000) * 900 : 0;
    const startSlot = Math.max(enrolledSlot, endSlot - windowHours * 3600);
    const samples = await client.execute({
      sql: `SELECT slot, status, signed_ready, reasons, proof
            FROM coverage_slo_samples
            WHERE target_id = ? AND slot >= ? AND slot < ?
            ORDER BY slot ASC`,
      args: [String(target.id), startSlot, endSlot],
    });

    let dataReady = 0;
    let signedReady = 0;
    let unavailable = 0;
    let latest: TursoCoverageSummaryRow['latest'] = null;
    for (const sample of samples.rows) {
      const status = String(sample.status);
      if (status === 'PASS') dataReady++;
      if (Number(sample.signed_ready) === 1) signedReady++;
      if (status === 'UNAVAILABLE') unavailable++;
      const proof =
        sample.proof === null || sample.proof === undefined
          ? null
          : (JSON.parse(String(sample.proof)) as Record<string, unknown>);
      const providers =
        proof !== null &&
        typeof proof === 'object' &&
        'report' in proof &&
        typeof proof.report === 'object' &&
        proof.report !== null &&
        'evaluation' in proof.report &&
        typeof (proof.report as Record<string, unknown>).evaluation === 'object'
          ? ((proof.report as Record<string, unknown>).evaluation as Record<string, unknown>)
              .providers
          : undefined;
      latest = {
        slot: Number(sample.slot),
        status,
        signedReady: Number(sample.signed_ready) === 1,
        reasons: JSON.parse(String(sample.reasons)) as string[],
        providers,
      };
    }

    const expected = Math.max(0, Math.floor((endSlot - startSlot) / 900));
    const observed = samples.rows.length;
    rows.push({
      id: String(target.id),
      asset: String(target.asset),
      chain_id: Number(target.chain_id),
      policy_id: String(target.policy_id),
      objective_bps: Number(target.objective_bps),
      expected,
      observed,
      data_ready: dataReady,
      signed_ready: signedReady,
      unavailable,
      missing: Math.max(0, expected - observed),
      latest,
    });
  }
  return rows;
}
