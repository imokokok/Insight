/* eslint-disable no-console */
/** Bounded live probe: reads four feeds; writes only verified optional metadata. */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

import { z } from 'zod';

import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { api3NetworkService } from '@/lib/oracles/services/api3NetworkService';
import { chainlinkOnChainService } from '@/lib/oracles/services/chainlinkOnChainService';
import { extractBaseSymbol } from '@/lib/oracles/utils/oracleDataUtils';
import { getRpcUsage, rpcUsageSince } from '@/lib/oracles/utils/rpcClientWithFallback';
import { flushRpcMetadataCache, primeRpcMetadataCache } from '@/lib/oracles/utils/rpcMetadataCache';
import { createServiceRoleClient } from '@/lib/supabase/server';

const mode = process.argv[2];
assert(mode === 'cold' || mode === 'warm', 'Expected cold or warm mode');
const output = process.argv[3];
assert(output, 'Expected evidence output path');
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
assert(
  url && new URL(url).hostname === 'naevwrexybqodxinkrug.supabase.co',
  'Unexpected Supabase project'
);
const feedSchema = z
  .array(
    z.object({
      provider: z.enum(['chainlink', 'api3']),
      symbol: z.string(),
      chain_id: z.number().int().positive(),
      address: z.string().min(1),
    })
  )
  .max(2);
const startedAt = Date.now();
const before = getRpcUsage();
const preloaded = mode === 'warm' ? await primeRpcMetadataCache() : 0;
const observations = [];
for (const provider of ['chainlink', 'api3'] as const) {
  const { data, error } = await createServiceRoleClient()
    .from('oracle_feeds')
    .select('provider,symbol,chain_id,address')
    .eq('provider', provider)
    .eq('is_active', true)
    .in('symbol', ['BTC', 'BTC/USD', 'ETH', 'ETH/USD'])
    .in('chain_id', [1, 8453, 42161, 137])
    .order('chain_id')
    .order('symbol')
    .limit(2)
    .abortSignal(AbortSignal.timeout(10000));
  if (error) throw new Error(`Feed selection failed (${error.code})`);
  const feeds = feedSchema.parse(data);
  assert.equal(feeds.length, 2, `Expected two active ${provider} sample feeds`);
  for (const feed of feeds) {
    const symbol = extractBaseSymbol(feed.symbol);
    const price =
      provider === 'chainlink'
        ? await chainlinkOnChainService.getPrice(
            symbol,
            feed.chain_id,
            AbortSignal.timeout(30000),
            z
              .string()
              .regex(/^0x[0-9a-fA-F]{40}$/)
              .parse(feed.address) as `0x${string}`
          )
        : await api3NetworkService.getPrice(
            symbol,
            getBlockchainByChainId(feed.chain_id),
            AbortSignal.timeout(30000),
            feed.address
          );
    assert(
      price && Number.isFinite(price.price) && price.price > 0,
      `Live ${provider} ${symbol} read failed`
    );
    observations.push({
      provider,
      symbol,
      chainId: feed.chain_id,
      price: price.price,
      decimals: price.decimals,
      timestamp: price.timestamp,
      ...('roundId' in price
        ? { roundId: price.roundId.toString() }
        : { confidence: price.confidence }),
    });
  }
}
const persisted = await flushRpcMetadataCache();
const evidence = {
  mode,
  measuredAt: new Date().toISOString(),
  elapsedMs: Date.now() - startedAt,
  preloaded,
  persisted,
  observations,
  rpc: rpcUsageSince(before),
};
await writeFile(output, JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 });
console.log(
  JSON.stringify({ mode, feeds: observations.length, preloaded, persisted, rpc: evidence.rpc })
);
