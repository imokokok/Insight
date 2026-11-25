import { type OracleFeedInsert } from '@/lib/supabase/queries';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger, normalizeError } from '@/lib/utils/logger';
import { Blockchain } from '@/types/oracle';

import {
  STORK_OTHER_EVM_CONTRACTS,
  STORK_OTHER_EVM_PUSHED_FEEDS,
} from '../constants/storkOtherEvm';
import { getAssetClass } from '../constants/supportedSymbols';

import { storkOtherEvmOnChainService } from './storkOtherEvmOnChainService';

const logger = createLogger('StorkOtherEvmFeedSync');

export interface StorkOtherEvmSyncResult {
  provider: 'stork';
  discovered: number;
  upserted: number;
  deactivated: number;
  errors: number;
}

async function upsertFeeds(feeds: OracleFeedInsert[]): Promise<number> {
  if (feeds.length === 0) return 0;
  const supabase = createServiceRoleClient();
  const rows = feeds.map(({ is_active: _isActive, ...feed }) => feed);
  const { data, error } = await supabase
    .from('oracle_feeds')
    .upsert(rows, { onConflict: 'provider,symbol,chain_id' })
    .select();
  if (error) {
    logger.error('Failed to upsert Stork EVM feeds', normalizeError(error));
    return 0;
  }
  return data?.length ?? 0;
}

async function retireRemovedFeeds(chain: Blockchain, catalogSymbols: readonly string[]) {
  const contract = STORK_OTHER_EVM_CONTRACTS[chain];
  if (!contract) return 0;
  const source = `stork-${chain}-pushed-registry`;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('oracle_feeds')
    .select('symbol')
    .eq('provider', 'stork')
    .eq('chain_id', contract.chainId)
    .eq('source', source)
    .eq('is_active', true);
  if (error) {
    logger.error('Failed to load Stork EVM feeds for reconciliation', normalizeError(error), {
      chain,
    });
    return 0;
  }

  const catalog = new Set(catalogSymbols);
  const retired = (data ?? [])
    .map((row) => row.symbol)
    .filter((symbol): symbol is string => typeof symbol === 'string' && !catalog.has(symbol));
  const now = new Date().toISOString();
  let deactivated = 0;
  for (const symbol of retired) {
    const { error: updateError } = await supabase
      .from('oracle_feeds')
      .update({
        is_active: false,
        updated_at: now,
        deactivated_reason: 'curated_registry_retired',
        deactivated_at: now,
      })
      .eq('provider', 'stork')
      .eq('symbol', symbol)
      .eq('chain_id', contract.chainId)
      .eq('source', source)
      .eq('is_active', true);
    if (updateError) {
      logger.error('Failed to retire removed Stork EVM feed', normalizeError(updateError), {
        chain,
        symbol,
      });
    } else {
      deactivated++;
    }
  }
  return deactivated;
}

/** Seeds Stork's reviewed non-Monad EVM feeds only after a fresh contract read. */
export async function seedStorkOtherEvmPushedFeeds(): Promise<StorkOtherEvmSyncResult> {
  const result: StorkOtherEvmSyncResult = {
    provider: 'stork',
    discovered: STORK_OTHER_EVM_PUSHED_FEEDS.length,
    upserted: 0,
    deactivated: 0,
    errors: 0,
  };
  const readings = await storkOtherEvmOnChainService.getPrices(STORK_OTHER_EVM_PUSHED_FEEDS);
  const usableIds = new Set(readings.map((reading) => reading.encodedAssetId.toLowerCase()));
  const usableFeeds = STORK_OTHER_EVM_PUSHED_FEEDS.filter((feed) =>
    usableIds.has(feed.encodedAssetId.toLowerCase())
  );
  result.errors = result.discovered - usableFeeds.length;

  const rows: OracleFeedInsert[] = usableFeeds.map((feed) => {
    const contract = STORK_OTHER_EVM_CONTRACTS[feed.chain];
    if (!contract) throw new Error(`Missing Stork contract for ${feed.chain}`);
    return {
      provider: 'stork',
      symbol: feed.alias,
      chain_id: feed.chainId,
      address: contract.address,
      name: `Stork ${feed.alias}`,
      decimals: 18,
      category: getAssetClass(feed.alias.split(/[\/_]/)[0]),
      is_active: true,
      source: `stork-${feed.chain}-pushed-registry`,
      metadata: {
        assetId: feed.assetId,
        encodedAssetId: feed.encodedAssetId,
        storkContract: contract.address,
        chainId: feed.chainId,
        maxStalenessSeconds: feed.maxStalenessSeconds,
        priceDeviationPercent: feed.priceDeviationPercent,
        quoteType: 'reference-rate',
        freshnessPolicy: 'getTemporalNumericValueV1 safe read and timestamp <= maxStalenessSeconds',
        quorumStatus: 'shadow-only-reference-rate',
        registrySource: 'https://docs.stork.network/resources/stork-pushed-assets',
      },
    };
  });
  result.upserted = await upsertFeeds(rows);

  for (const chain of [Blockchain.BNB_CHAIN, Blockchain.BASE, Blockchain.HYPEREVM] as const) {
    const feedsOnChain = STORK_OTHER_EVM_PUSHED_FEEDS.filter((feed) => feed.chain === chain);
    if (!readings.some((reading) => reading.feed.chain === chain)) continue;
    result.deactivated += await retireRemovedFeeds(
      chain,
      feedsOnChain.map((feed) => feed.alias)
    );
  }
  return result;
}
