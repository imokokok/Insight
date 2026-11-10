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
  target: TursoCoverageTarget
): Promise<void> {
  await client.execute({
    sql: `
      INSERT INTO coverage_slo_targets (id, asset, chain_id, policy_id, objective_bps)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `,
    args: [target.id, target.asset, target.chainId, target.policyId, target.objectiveBps],
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
