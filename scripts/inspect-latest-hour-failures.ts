/* eslint-disable no-console */
/**
 * Show failures for the MOST RECENT snapshot hour only, to distinguish
 * current vs historical problems.
 *
 * Run: npx tsx --env-file=.env.local scripts/inspect-latest-hour-failures.ts
 */
import { createServiceRoleClient } from '@/lib/supabase/server';

async function main() {
  const supabase = createServiceRoleClient();

  // Get distinct snapshot hours, most recent first
  const { data: allHours } = await supabase
    .from('hourly_price_snapshots')
    .select('snapshot_hour')
    .order('snapshot_hour', { ascending: false })
    .limit(2000);
  const distinctHours = [...new Set((allHours ?? []).map((r) => r.snapshot_hour))].sort().reverse();
  console.log(`Most recent snapshot hours: ${distinctHours.slice(0, 6).join(', ')}`);

  for (const hour of distinctHours.slice(0, 3)) {
    const { data, error } = await supabase
      .from('hourly_price_snapshots')
      .select('provider, symbol, chain_id, is_success, error_message')
      .eq('snapshot_hour', hour)
      .eq('is_success', false);
    if (error) continue;
    const fails = (data ?? []) as Array<{
      provider: string;
      symbol: string;
      chain_id: number;
      error_message: string | null;
    }>;
    console.log(`\n=== Hour ${hour}: ${fails.length} failures ===`);
    for (const f of fails) {
      console.log(
        `  ${f.provider}/${f.symbol}/c${f.chain_id} :: ${(f.error_message ?? '').slice(0, 120)}`
      );
    }
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
