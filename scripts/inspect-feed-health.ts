/* eslint-disable no-console */
/**
 * Inspect oracle_feeds health columns for the persistently-failing feeds,
 * and probe each failing feed directly to capture root cause.
 *
 * Run: npx tsx --env-file=.env.local scripts/inspect-feed-health.ts
 */
import { createServiceRoleClient } from '@/lib/supabase/server';

async function main() {
  const supabase = createServiceRoleClient();

  // The persistently-failing provider/symbol combos from snapshot inspection
  const targets: Array<{ provider: string; symbol: string; chainId: number }> = [
    // DIA failures
    ...[
      'BNB',
      'SNX',
      'MKR',
      'COMP',
      'CRV',
      'UNI',
      'AAVE',
      'WBTC',
      'DAI',
      'USDT',
      'USDC',
      'LINK',
      'DOGE',
      'ADA',
      'XRP',
    ].map((s) => ({ provider: 'dia', symbol: s, chainId: 0 })),
    // TWAP failures
    ...['SNX', 'MKR', 'COMP', 'CRV'].map((s) => ({ provider: 'twap', symbol: s, chainId: 0 })),
    // Chainlink failures
    { provider: 'chainlink', symbol: 'TBTC', chainId: 0 },
    { provider: 'chainlink', symbol: 'CBBTC', chainId: 0 },
    // Redstone
    { provider: 'redstone', symbol: 'SNX', chainId: 0 },
    // Flare
    { provider: 'flare', symbol: 'DAI', chainId: 0 },
    // API3
    { provider: 'api3', symbol: 'AAVE', chainId: 0 },
  ];

  console.log('=== oracle_feeds health for failing combos ===\n');
  console.log(
    'provider/symbol/chain | is_active | consec_fail | last_success | last_failure | address'
  );

  for (const t of targets) {
    // DIA/TWAP/etc store symbol as SYMBOL/USD or just SYMBOL; match flexibly
    const { data, error } = await supabase
      .from('oracle_feeds')
      .select(
        'provider, symbol, chain_id, is_active, consecutive_failures, last_success_at, last_failure_at, address, updated_at'
      )
      .eq('provider', t.provider)
      .eq('chain_id', t.chainId)
      .ilike('symbol', `${t.symbol}%`);
    if (error) {
      console.error(`query error for ${t.provider}/${t.symbol}:`, error);
      continue;
    }
    const rows = (data ?? []) as Array<{
      provider: string;
      symbol: string;
      chain_id: number;
      is_active: boolean;
      consecutive_failures: number;
      last_success_at: string | null;
      last_failure_at: string | null;
      address: string | null;
      updated_at: string;
    }>;
    if (rows.length === 0) {
      console.log(`${t.provider}/${t.symbol}/chain=${t.chainId} -> NO ROW in oracle_feeds`);
      continue;
    }
    for (const r of rows) {
      console.log(
        `${r.provider}/${r.symbol}/chain=${r.chain_id} | active=${r.is_active} | cf=${r.consecutive_failures} | ls=${r.last_success_at ?? 'null'} | lf=${r.last_failure_at ?? 'null'} | addr=${(r.address ?? '').slice(0, 24)}`
      );
    }
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
