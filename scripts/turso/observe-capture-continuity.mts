/* eslint-disable no-console */
/**
 * Weekly capture-continuity baseline for the Turso price control plane.
 *
 * Metrics (all from the production receipt ledger, read-only):
 *   - captured slots per UTC day against the nominal 96 (15-minute cadence)
 *   - receipt gaps > 15 minutes with first-receipt recovery lag after each gap
 *   - max and p50 projection lag (projected_at - snapshot_ts) per day
 *   - dispatcher ledger failures per day (cron_dispatch_runs)
 *   - pg_cron `job startup timeout` failures per day (needs the Supabase CLI;
 *     if the CLI is unavailable the exact SQL is emitted instead)
 *
 * Usage:
 *   npm run turso:observe:capture-continuity [days]
 * Requires SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local pointing at
 * the production project. Read-only: no writes anywhere.
 */
import { spawnSync } from 'node:child_process';

import { createServiceRoleClient } from '@/lib/supabase/server';

const SLOT_INTERVAL_MS = 15 * 60 * 1000;
const SLOTS_PER_DAY = (24 * 60 * 60 * 1000) / SLOT_INTERVAL_MS;

function readDays(): number {
  const raw = process.argv[2] ?? '7';
  if (!/^\d+$/.test(raw)) {
    throw new Error('Usage: npm run turso:observe:capture-continuity [days]');
  }
  const days = Number(raw);
  if (days < 1 || days > 30) {
    throw new Error('Observation window must be 1-30 days');
  }
  return days;
}

const days = readDays();
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !new URL(url).hostname.endsWith('supabase.co')) {
  throw new Error('Set SUPABASE_URL (production project) in .env.local');
}

const client = createServiceRoleClient();
const endMs = Date.now();
const startMs = endMs - days * 24 * 60 * 60 * 1000;
const startIso = new Date(startMs).toISOString();

const receiptResult = await client
  .from('turso_price_slot_receipts')
  .select('snapshot_ts,projected_at')
  .gte('snapshot_ts', startIso)
  .order('snapshot_ts', { ascending: true });

if (receiptResult.error) {
  throw new Error(`Receipt ledger read failed: ${receiptResult.error.message}`);
}

const receipts = receiptResult.data.map((row) => ({
  slotMs: Math.floor(new Date(row.snapshot_ts).getTime() / SLOT_INTERVAL_MS) * SLOT_INTERVAL_MS,
  slotTs: new Date(row.snapshot_ts).getTime(),
  projectedAt: row.projected_at ? new Date(row.projected_at).getTime() : null,
}));

function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[index]);
}

const dayKeys: string[] = [];
for (let d = 0; d < days; d += 1) {
  dayKeys.push(utcDay(startMs + (d + 1) * 24 * 60 * 60 * 1000 - 1));
}

const daily = dayKeys.map((day) => {
  const dayStartMs = Date.parse(`${day}T00:00:00.000Z`);
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
  const isPartial = dayEndMs > endMs;
  const inDay = receipts.filter(
    (r) => r.slotTs >= dayStartMs && r.slotTs < Math.min(dayEndMs, endMs)
  );
  const distinctSlots = new Set(inDay.map((r) => r.slotMs));
  const lags = inDay.filter((r) => r.projectedAt !== null).map((r) => r.projectedAt! - r.slotTs);
  const expectedSlots = isPartial
    ? Math.max(0, Math.floor((Math.min(dayEndMs, endMs) - dayStartMs) / SLOT_INTERVAL_MS))
    : SLOTS_PER_DAY;
  return {
    day,
    partial: isPartial,
    capturedSlots: distinctSlots.size,
    expectedSlots,
    missingSlots: Math.max(0, expectedSlots - distinctSlots.size),
    projectionLagSeconds: {
      max: lags.length > 0 ? Math.round(Math.max(...lags) / 1000) : null,
      p50: percentile(lags, 50),
    },
  };
});

const gapEvents: Array<{
  gapStart: string;
  gapEnd: string;
  gapMinutes: number;
  firstReceiptProjectionLagSeconds: number | null;
}> = [];
for (let i = 1; i < receipts.length; i += 1) {
  const gap = receipts[i].slotMs - receipts[i - 1].slotMs;
  if (gap > SLOT_INTERVAL_MS) {
    gapEvents.push({
      gapStart: new Date(receipts[i - 1].slotTs).toISOString(),
      gapEnd: new Date(receipts[i].slotTs).toISOString(),
      gapMinutes: Math.round(gap / 60000),
      firstReceiptProjectionLagSeconds:
        receipts[i].projectedAt !== null
          ? Math.round((receipts[i].projectedAt! - receipts[i].slotTs) / 1000)
          : null,
    });
  }
}

const dispatchResult = await client
  .from('cron_dispatch_runs')
  .select('created_at,status')
  .gte('created_at', startIso)
  .in('status', ['failed', 'timed_out', 'cancelled']);

if (dispatchResult.error) {
  throw new Error(`Dispatch ledger read failed: ${dispatchResult.error.message}`);
}

const dispatchFailuresByDay: Record<string, number> = {};
for (const row of dispatchResult.data) {
  const day = utcDay(new Date(row.created_at).getTime());
  dispatchFailuresByDay[day] = (dispatchFailuresByDay[day] ?? 0) + 1;
}

const STARTUP_TIMEOUT_SQL = `SELECT to_char(date_trunc('day', jrd.start_time),'YYYY-MM-DD') AS day, count(*) AS startup_timeouts, count(DISTINCT j.jobname) AS jobs_affected FROM cron.job_run_details jrd JOIN cron.job j ON j.jobid = jrd.jobid WHERE jrd.status = 'failed' AND jrd.return_message LIKE '%startup%' AND jrd.start_time > now() - interval '${days} days' GROUP BY 1 ORDER BY 1 DESC;`;

function readStartupTimeoutsViaCli():
  | { source: 'cli'; byDay: Record<string, number> }
  | {
      source: 'unavailable';
      sql: string;
    } {
  try {
    const run = spawnSync('supabase', ['db', 'query', '--linked', STARTUP_TIMEOUT_SQL], {
      encoding: 'utf8',
      timeout: 60_000,
    });
    if (run.status !== 0 || !run.stdout) {
      throw new Error(run.stderr ?? 'supabase db query failed');
    }
    const byDay: Record<string, number> = {};
    for (const line of run.stdout.split('\n')) {
      const match = line.match(/^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(\d+)\s*\|/);
      if (match) {
        byDay[match[1]] = Number(match[2]);
      }
    }
    return { source: 'cli', byDay };
  } catch {
    return { source: 'unavailable', sql: STARTUP_TIMEOUT_SQL };
  }
}

const summary = {
  window: { startIso, endIso: new Date(endMs).toISOString(), days },
  daily,
  gapEvents,
  dispatchFailuresByDay,
  startupTimeouts: readStartupTimeoutsViaCli(),
  thresholds: {
    slotsPerDayNominal: SLOTS_PER_DAY,
    note: 'A healthy week has 0 gap events, missingSlots 0-1 per day, max startup timeouts 0 after migration 0141, and projection lag within maxLagSeconds (1800).',
  },
};

console.log(JSON.stringify(summary, null, 2));
