/* eslint-disable no-console */
/**
 * Inspect actually-stored hourly_price_snapshots failures.
 * Uses explicit count + paginated failure fetch.
 *
 * Run: npx tsx --env-file=.env.local scripts/inspect-snapshot-failures.ts
 */
import { createServiceRoleClient } from '@/lib/supabase/server';

async function main() {
  const supabase = createServiceRoleClient();

  const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  // Total count in window
  const { count: totalCount, error: countErr } = await supabase
    .from('hourly_price_snapshots')
    .select('*', { count: 'exact', head: true })
    .gte('snapshot_hour', since);
  console.log(`Total rows since ${since}: ${totalCount}`);
  if (countErr) console.error('count error:', countErr);

  // Failure count in window
  const { count: failCount, error: failCountErr } = await supabase
    .from('hourly_price_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('is_success', false)
    .gte('snapshot_hour', since);
  console.log(`Failed rows since ${since}: ${failCount}`);
  if (failCountErr) console.error('failcount error:', failCountErr);

  // Distinct snapshot hours in window
  const { data: hoursData } = await supabase
    .from('hourly_price_snapshots')
    .select('snapshot_hour')
    .gte('snapshot_hour', since);
  const hours = new Set((hoursData ?? []).map((r) => r.snapshot_hour));
  console.log(`Distinct snapshot hours (capped by page): ${hours.size}`);

  // Paginate all failures in the window
  const PAGE = 1000;
  const allFailures: Array<{
    snapshot_hour: string;
    provider: string;
    symbol: string;
    chain_id: number;
    is_success: boolean;
    error_message: string | null;
  }> = [];
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from('hourly_price_snapshots')
      .select('snapshot_hour, provider, symbol, chain_id, is_success, error_message')
      .eq('is_success', false)
      .gte('snapshot_hour', since)
      .order('snapshot_hour', { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (error) {
      console.error('failure fetch error:', error);
      break;
    }
    const page = (data ?? []) as typeof allFailures;
    if (page.length === 0) break;
    allFailures.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }

  console.log(`\nFetched ${allFailures.length} failure rows`);

  if (allFailures.length === 0) {
    process.exit(0);
  }

  // Failures by provider
  console.log(`\n--- Failures by provider ---`);
  const byProvider = new Map<string, number>();
  for (const f of allFailures) byProvider.set(f.provider, (byProvider.get(f.provider) ?? 0) + 1);
  for (const [p, c] of [...byProvider.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`  ${p.padEnd(12)} ${c}`);

  // Failures by symbol
  console.log(`\n--- Failures by symbol ---`);
  const bySymbol = new Map<string, number>();
  for (const f of allFailures) bySymbol.set(f.symbol, (bySymbol.get(f.symbol) ?? 0) + 1);
  for (const [s, c] of [...bySymbol.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`  ${s.padEnd(10)} ${c}`);

  // Failures by provider/symbol/chain
  console.log(`\n--- Failures by provider/symbol/chain ---`);
  const byKey = new Map<string, number>();
  for (const f of allFailures) {
    const key = `${f.provider}/${f.symbol}/chain=${f.chain_id}`;
    byKey.set(key, (byKey.get(key) ?? 0) + 1);
  }
  for (const [k, c] of [...byKey.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`  ${k.padEnd(40)} ${c}`);

  // Distinct error messages
  console.log(`\n--- Distinct error messages ---`);
  const byMsg = new Map<string, number>();
  for (const f of allFailures) {
    const msg = (f.error_message ?? '(null)').slice(0, 220);
    byMsg.set(msg, (byMsg.get(msg) ?? 0) + 1);
  }
  for (const [m, c] of [...byMsg.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`  [${c}x] ${m}`);

  // Spread of failure hours
  console.log(`\n--- Failures per snapshot hour ---`);
  const byHour = new Map<string, number>();
  for (const f of allFailures) byHour.set(f.snapshot_hour, (byHour.get(f.snapshot_hour) ?? 0) + 1);
  for (const [h, c] of [...byHour.entries()].sort().reverse()) console.log(`  ${h}  ${c}`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
