/**
 * @fileoverview Pins the Oracle Watch window terms to one runtime source.
 *
 * New purchases are 48 polls at a 30-minute minimum interval; rows sold before
 * migration 0132 keep 300 polls at a 30-second interval. The migration backfills
 * the old terms for legacy rows, but its column defaults must be the current
 * plan so an insert that omits the columns cannot resurrect 300/30.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ORACLE_WATCH_WINDOW_PLAN } from '@/lib/billing/oracleWatchWindow';

function migrationSql(): string {
  return readFileSync(
    join(process.cwd(), 'supabase/migrations/0132_oracle_watch_window_terms.sql'),
    'utf8'
  );
}

describe('Oracle Watch window terms', () => {
  it('sells new windows at 48 polls with a 30-minute minimum interval', () => {
    expect(ORACLE_WATCH_WINDOW_PLAN.pollCap).toBe(48);
    expect(ORACLE_WATCH_WINDOW_PLAN.minPollIntervalSeconds).toBe(1800);
  });

  it('backfills legacy rows at 300/30 but defaults new rows to 48/1800', () => {
    const flat = migrationSql().replace(/\s+/g, ' ');

    expect(flat).toContain('SET "poll_cap" = 300 WHERE "poll_cap" IS NULL');
    expect(flat).toContain(
      'SET "min_poll_interval_seconds" = 30 WHERE "min_poll_interval_seconds" IS NULL'
    );
    expect(flat).toContain('ALTER COLUMN "poll_cap" SET DEFAULT 48');
    expect(flat).toContain('ALTER COLUMN "min_poll_interval_seconds" SET DEFAULT 1800');
    expect(flat).not.toContain('SET DEFAULT 300');
    expect(flat).not.toContain('SET DEFAULT 30 ');
  });
});
