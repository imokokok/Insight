// Turso repository for the daily-report domain (egress retirement v7,
// 2026-11). Mirrors Supabase public.daily_reports: one row per UTC
// report_date, upsert-on-publish, plus the read paths the site reports pages
// use (by-date, list, lightweight summary list).
//
// Mode contract (house pattern):
//   'supabase' — read/write Supabase only (pre-migration behaviour)
//   'turso'    — read/write Turso only (egress-retired end state)
// No shadow mode: a daily report is a deterministic artifact regenerated from
// Turso-resident snapshot history, and dual-writing would burn egress.
import type { Client, InValue } from '@libsql/client/web';

export type TursoDailyReportsMode = 'supabase' | 'turso';

export function readTursoDailyReportsMode(
  value: string | undefined = process.env.TURSO_DAILY_REPORTS_MODE
): TursoDailyReportsMode {
  if (value === undefined || value === '' || value === 'supabase') return 'supabase';
  if (value === 'turso') return value;
  throw new Error('TURSO_DAILY_REPORTS_MODE must be supabase or turso');
}

/** JSON-payload columns stored as TEXT (stringify on write, parse on read). */
const JSON_COLUMNS = [
  'recommendations',
  'metrics',
  'top_assets',
  'provider_rankings',
  'deviation_events',
  'anomaly_summary',
  'coverage_matrix',
  'failure_breakdown',
  'previous_day_comparison',
  'risk_impacts',
  'protocol_liquidation_risks',
  'stablecoin_depeg',
  'wrapped_asset_peg',
  'settlement_evidence',
] as const;

const UPSERT_COLUMNS = [
  'report_date',
  'report_title',
  'summary',
  ...JSON_COLUMNS,
  'generated_at',
  'updated_at',
] as const;

function toText(value: unknown): InValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function parseColumn(row: Record<string, unknown>, column: string): unknown {
  const raw = row[column];
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Upsert one report row (payload = the same shape persistReport builds for
 * Supabase: JSON payloads as objects, timestamps as ISO strings). Conflicts
 * on report_date update every other column, matching the Supabase upsert.
 */
export async function upsertTursoDailyReport(
  client: Client,
  payload: Record<string, unknown>
): Promise<void> {
  const columns = UPSERT_COLUMNS;
  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns
    .filter((c) => c !== 'report_date')
    .map((c) => `${c} = excluded.${c}`)
    .join(', ');
  await client.execute({
    sql: `INSERT INTO daily_reports (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (report_date) DO UPDATE SET ${updates}`,
    args: columns.map((c) => toText(payload[c])),
  });
}

/**
 * Parse a raw Turso row into the shape Supabase REST returned (JSON columns
 * as objects) so mapDbRowToReport consumes it unchanged.
 */
function toServiceRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = (JSON_COLUMNS as readonly string[]).includes(key) ? parseColumn(row, key) : value;
  }
  return out;
}

export async function readTursoDailyReportByDate(
  client: Client,
  reportDate: string
): Promise<Record<string, unknown> | null> {
  const result = await client.execute({
    sql: 'SELECT * FROM daily_reports WHERE report_date = ?',
    args: [reportDate],
  });
  const row = result.rows[0];
  if (!row) return null;
  return toServiceRow(row as unknown as Record<string, unknown>);
}

export async function listTursoDailyReports(
  client: Client,
  limit: number,
  offset: number
): Promise<Record<string, unknown>[]> {
  const result = await client.execute({
    sql: `SELECT * FROM daily_reports
          ORDER BY report_date DESC
          LIMIT ${Math.max(1, Math.floor(limit))} OFFSET ${Math.max(0, Math.floor(offset))}`,
  });
  return result.rows.map((row) => toServiceRow(row as unknown as Record<string, unknown>));
}

export async function listTursoDailyReportSummaries(
  client: Client,
  limit: number,
  offset: number
): Promise<Record<string, unknown>[]> {
  const result = await client.execute({
    sql: `SELECT report_date, summary, metrics, deviation_events
          FROM daily_reports
          ORDER BY report_date DESC
          LIMIT ${Math.max(1, Math.floor(limit))} OFFSET ${Math.max(0, Math.floor(offset))}`,
  });
  return result.rows.map((row) => toServiceRow(row as unknown as Record<string, unknown>));
}
