/* eslint-disable no-console */
/**
 * 1) Verify actual DB symbol formats per provider (to confirm /USD suffix mismatch).
 * 2) Probe each problematic oracle client DIRECTLY (bypass active-feed gate) to
 *    capture the real root-cause error.
 *
 * Run: npx tsx --env-file=.env.local scripts/probe-failing-feeds.ts
 */
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { OracleProvider } from '@/types/oracle';

async function main() {
  const supabase = createServiceRoleClient();

  console.log('=== 1) DB symbol format sample per provider ===');
  const { data, error } = await supabase
    .from('oracle_feeds')
    .select('provider, symbol, chain_id, address')
    .limit(2000);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  const rows = (data ?? []) as Array<{
    provider: string;
    symbol: string;
    chain_id: number;
    address: string | null;
  }>;
  const byProvider = new Map<string, string[]>();
  for (const r of rows) {
    const list = byProvider.get(r.provider) ?? [];
    if (list.length < 4) list.push(`${r.symbol}|addr=${(r.address ?? '').slice(0, 16)}`);
    byProvider.set(r.provider, list);
  }
  for (const [p, samples] of [...byProvider.entries()].sort()) {
    console.log(`  ${p.padEnd(12)} ${samples.join('   ')}`);
  }

  console.log('\n=== 2) Direct client probes (bypass active-feed gate) ===');
  const factory = getDefaultFactory();

  // Each probe: provider, symbol, chain
  const probes: Array<{
    provider: OracleProvider;
    symbol: string;
    chain?: ReturnType<typeof getBlockchainByChainId>;
    label: string;
  }> = [
    { provider: OracleProvider.REDSTONE, symbol: 'SNX', label: 'redstone/SNX' },
    { provider: OracleProvider.DIA, symbol: 'BNB', label: 'dia/BNB' },
    { provider: OracleProvider.DIA, symbol: 'SNX', label: 'dia/SNX' },
    { provider: OracleProvider.DIA, symbol: 'ADA', label: 'dia/ADA' },
    { provider: OracleProvider.DIA, symbol: 'BTC', label: 'dia/BTC (should work)' },
    {
      provider: OracleProvider.TWAP,
      symbol: 'SNX',
      chain: getBlockchainByChainId(1),
      label: 'twap/SNX eth',
    },
    {
      provider: OracleProvider.TWAP,
      symbol: 'ETH',
      chain: getBlockchainByChainId(56),
      label: 'twap/ETH bsc',
    },
    {
      provider: OracleProvider.TWAP,
      symbol: 'BNB',
      chain: getBlockchainByChainId(56),
      label: 'twap/BNB bsc',
    },
    {
      provider: OracleProvider.API3,
      symbol: 'AAVE',
      chain: getBlockchainByChainId(42161),
      label: 'api3/AAVE arb',
    },
    {
      provider: OracleProvider.CHAINLINK,
      symbol: 'TBTC',
      chain: getBlockchainByChainId(1),
      label: 'chainlink/TBTC eth',
    },
    {
      provider: OracleProvider.FLARE,
      symbol: 'DAI',
      chain: getBlockchainByChainId(14),
      label: 'flare/DAI',
    },
  ];

  for (const p of probes) {
    const client = factory.getClient(p.provider);
    const start = Date.now();
    try {
      const price = await client.getPrice(p.symbol, p.chain);
      const dur = Date.now() - start;
      console.log(
        `  [OK ] ${p.label.padEnd(28)} price=${price.price} src=${price.source ?? '?'} (${dur}ms)`
      );
    } catch (e) {
      const dur = Date.now() - start;
      const msg = e instanceof Error ? `${e.message}` : String(e);
      const name = e instanceof Error ? e.constructor.name : 'Unknown';
      console.log(`  [FAIL] ${p.label.padEnd(28)} (${dur}ms) ${name}: ${msg.slice(0, 200)}`);
    }
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
