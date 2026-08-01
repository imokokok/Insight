/* eslint-disable no-console */
/**
 * Full oracle_feeds inventory + locate feed rows for failing combos on any chain.
 *
 * Run: npx tsx --env-file=.env.local scripts/inspect-feed-inventory.ts
 */
import { createServiceRoleClient } from '@/lib/supabase/server';

async function main() {
  const supabase = createServiceRoleClient();

  // 1) Per-provider active/inactive feed counts
  const { data: allFeeds, error } = await supabase
    .from('oracle_feeds')
    .select(
      'provider, symbol, chain_id, is_active, consecutive_failures, last_success_at, address'
    );
  if (error) {
    console.error(error);
    process.exit(1);
  }
  const feeds = (allFeeds ?? []) as Array<{
    provider: string;
    symbol: string;
    chain_id: number;
    is_active: boolean;
    consecutive_failures: number;
    last_success_at: string | null;
    address: string | null;
  }>;

  console.log(`Total oracle_feeds rows: ${feeds.length}\n`);

  const providers = new Set(feeds.map((f) => f.provider));
  console.log('--- Per-provider feed counts (active / total) ---');
  for (const p of [...providers].sort()) {
    const pf = feeds.filter((f) => f.provider === p);
    const active = pf.filter((f) => f.is_active);
    console.log(
      `${p.padEnd(12)} active=${String(active.length).padStart(3)} / total=${String(pf.length).padStart(3)}`
    );
  }

  // 2) Active feeds symbols per provider
  console.log('\n--- Active feed symbols per provider ---');
  for (const p of [...providers].sort()) {
    const active = feeds.filter((f) => f.provider === p && f.is_active);
    const syms = active.map((f) => `${f.symbol}(c${f.chain_id})`);
    console.log(`${p} [${active.length}]: ${syms.join(', ')}`);
  }

  // 3) Locate feed rows for failing combos on ANY chain
  const failingCombos: Array<{ provider: string; symbol: string }> = [
    { provider: 'dia', symbol: 'DOGE' },
    { provider: 'dia', symbol: 'XRP' },
    { provider: 'twap', symbol: 'SNX' },
    { provider: 'twap', symbol: 'MKR' },
    { provider: 'twap', symbol: 'COMP' },
    { provider: 'twap', symbol: 'CRV' },
    { provider: 'chainlink', symbol: 'TBTC' },
    { provider: 'chainlink', symbol: 'CBBTC' },
    { provider: 'redstone', symbol: 'SNX' },
    { provider: 'flare', symbol: 'DAI' },
    { provider: 'api3', symbol: 'AAVE' },
  ];

  console.log('\n--- Feed rows for failing combos (any chain) ---');
  for (const c of failingCombos) {
    const matches = feeds.filter(
      (f) => f.provider === c.provider && f.symbol.toUpperCase().startsWith(c.symbol.toUpperCase())
    );
    if (matches.length === 0) {
      console.log(`${c.provider}/${c.symbol} -> NO ROW on any chain`);
    } else {
      for (const m of matches) {
        console.log(
          `${c.provider}/${c.symbol} -> found: symbol=${m.symbol} chain=${m.chain_id} active=${m.is_active} cf=${m.consecutive_failures} addr=${(m.address ?? '').slice(0, 20)}`
        );
      }
    }
  }

  // 4) Show all INACTIVE feeds with high consecutive_failures (recently deactivated)
  console.log('\n--- Inactive feeds with consecutive_failures >= 3 (recently deactivated) ---');
  const staleInactive = feeds
    .filter((f) => !f.is_active && f.consecutive_failures >= 3)
    .sort((a, b) => b.consecutive_failures - a.consecutive_failures);
  for (const f of staleInactive.slice(0, 30)) {
    console.log(
      `  ${f.provider}/${f.symbol}/c${f.chain_id} active=${f.is_active} cf=${f.consecutive_failures} addr=${(f.address ?? '').slice(0, 20)}`
    );
  }
  console.log(`... (${staleInactive.length} total)`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
