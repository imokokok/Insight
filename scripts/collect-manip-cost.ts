/* eslint-disable no-console */
/**
 * Manipulation-cost collector entry (the step inside snapshot-collect.yml).
 * Delegates to `collectManipCost()` (DEX pool depth -> closed-form cost to
 * move price, arXiv:2606.03548) and upserts one row per (snapshot_ts, pool_key)
 * into `manip_cost_pool_snapshots` (migration 0082).
 *
 * Run locally:
 *   npx tsx --env-file=.env.local scripts/collect-manip-cost.ts
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (writes); RPC via
 * ALCHEMY_ETHEREUM_RPC with public fallbacks.
 */
import { collectManipCost, type ManipCostRow } from '@/lib/manipCost/collector';
import { createServiceRoleClient } from '@/lib/supabase/server';

async function upsertRows(rows: ManipCostRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('manip_cost_pool_snapshots').upsert(
    rows.map((r) => ({ ...r })),
    {
      onConflict: 'snapshot_ts,pool_key',
      ignoreDuplicates: true,
    }
  );
  if (error) {
    throw new Error(
      `Failed to upsert manipulation-cost rows: ${
        typeof error.message === 'string' ? error.message : '[object Object]'
      }`
    );
  }
  return rows.length;
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[collect-manip-cost] starting…');
  const snapshotTs = new Date();

  const { rows, summary } = await collectManipCost(snapshotTs);
  const inserted = await upsertRows(rows);

  console.log(
    `[collect-manip-cost] rows=${rows.length} inserted=${inserted} ` +
      `covered=${summary.covered.join(',') || '(none)'} ` +
      `failed=${summary.failed.join(',') || '(none)'} ` +
      `ethUsdMid=${summary.ethUsdMid?.toFixed(2) ?? 'n/a'} ` +
      `block=${summary.blockNumber ?? 'n/a'}`
  );

  // Fail-closed: if NO pool succeeded, the depth layer is down — fail the run
  // loudly. Partial coverage is reported but tolerated (error rows persisted).
  if (summary.covered.length === 0) {
    console.error('[collect-manip-cost] zero coverage — manipulation-cost layer down');
    process.exit(1);
  }

  console.log(`[collect-manip-cost] done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

const HARD_DEADLINE_MS = Number(process.env.MANIP_COST_DEADLINE_MS) || 10 * 60 * 1000;
const deadlineTimer = setTimeout(() => {
  console.error(
    `[collect-manip-cost] hard deadline (${HARD_DEADLINE_MS}ms) exceeded — forcing exit`
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
    console.error('[collect-manip-cost] unhandled error:', error);
    process.exit(1);
  });
