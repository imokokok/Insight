/* eslint-disable no-console */
/**
 * Market-reference collector entry (the step inside snapshot-collect.yml and
 * the manual market-reference-collect.yml workflow). Delegates to
 * `collectMarketReference()` only after the source-rights register records a
 * reviewed vendor permission for a venue. Without one, the job exits cleanly
 * without contacting a CEX or writing rows. The source register also records
 * whether the venue permits only Insight-derived analytics or raw customer
 * delivery; that boundary is persisted with each row. It then
 * upserts one row per (symbol, exchange, snapshot_ts) into
 * `market_reference_snapshots` (migration 0037).
 *
 * Run locally:
 *   npx tsx --env-file=.env.local scripts/collect-market-reference.ts
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import {
  collectMarketReference,
  MARKET_REFERENCE_CORE_SYMBOLS,
  MARKET_REFERENCE_SYMBOLS,
  type MarketReferenceRow,
} from '@/lib/marketReference/collector';
import { customerEligibleMarketReferenceVenues } from '@/lib/dataRights/evidenceRights';
import { createServiceRoleClient } from '@/lib/supabase/server';

async function insertRows(rows: MarketReferenceRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('market_reference_snapshots').upsert(
    rows.map((r) => ({ ...r })),
    {
      onConflict: 'snapshot_ts,symbol,quote,exchange',
      ignoreDuplicates: true,
    }
  );
  if (error) {
    throw new Error(
      `Failed to upsert market reference rows: ${
        typeof error.message === 'string' ? error.message : '[object Object]'
      }`
    );
  }
  return rows.length;
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[collect-market-reference] starting…');
  const snapshotTs = new Date();
  const eligibleExchanges = customerEligibleMarketReferenceVenues();
  if (eligibleExchanges.length === 0) {
    console.log(
      '[collect-market-reference] skipped: no reviewed vendor market-data permission is registered; no CEX request or database write was made'
    );
    return;
  }

  // Preserve 15-minute truth for the five strategic/core assets, while the
  // eight demand-led additions run hourly. This reuses the same workflow but
  // roughly halves new rows and exchange requests for the Supabase/GitHub free
  // tiers. Dispatcher-triggered runs provide the exact scheduled slot; manual
  // runs intentionally collect the full universe.
  const scheduledFor = process.env.CRON_SCHEDULED_FOR;
  const cadenceTime = scheduledFor ? new Date(scheduledFor) : snapshotTs;
  const manual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' && !scheduledFor;
  const fullUniverse = manual || cadenceTime.getUTCMinutes() < 15;
  const symbols = fullUniverse ? MARKET_REFERENCE_SYMBOLS : MARKET_REFERENCE_CORE_SYMBOLS;

  const { rows, summary } = await collectMarketReference(snapshotTs, {
    symbols,
    purpose: 'customer-facing',
  });
  const inserted = await insertRows(rows);

  console.log(
    `[collect-market-reference] eligibleExchanges=${summary.eligibleExchanges.join(',') || '(none)'} ` +
      `rows=${rows.length} inserted=${inserted} ` +
      `covered=${summary.covered.join(',') || '(none)'} ` +
      `uncovered=${summary.uncovered.join(',') || '(none)'} ` +
      `maxCrossExchangeSpreadPct=${summary.maxCrossExchangeSpreadPct?.toFixed(3) ?? 'n/a'}`
  );

  // Fail-closed: if NO symbol had a single successful quote, the reference
  // layer is down — fail the run loudly so the on-call sees it. Partial
  // coverage is reported but tolerated (per-exchange rows already persisted).
  if (summary.covered.length === 0) {
    console.error('[collect-market-reference] zero coverage — reference layer down');
    process.exit(1);
  }

  console.log(
    `[collect-market-reference] done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
  );
}

const HARD_DEADLINE_MS = Number(process.env.MARKET_REF_DEADLINE_MS) || 10 * 60 * 1000;
const deadlineTimer = setTimeout(() => {
  console.error(
    `[collect-market-reference] hard deadline (${HARD_DEADLINE_MS}ms) exceeded — forcing exit`
  );
  process.exit(1);
}, HARD_DEADLINE_MS);
deadlineTimer.unref?.();

main()
  .then(() => {
    clearTimeout(deadlineTimer);
    const graceTimer = setTimeout(() => process.exit(0), 2000);
    graceTimer.unref?.();
  })
  .catch((error) => {
    clearTimeout(deadlineTimer);
    console.error('[collect-market-reference] unhandled error:', error);
    process.exit(1);
  });
