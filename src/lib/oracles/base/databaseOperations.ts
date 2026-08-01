import { PriceFetchError, OracleClientError, UnsupportedSymbolError } from '@/lib/errors';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { type OracleFeed } from '@/lib/supabase/queries';
import { getAdminQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider } from '@/types/oracle';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { BLOCKCHAIN_TO_CHAIN_ID } from '../constants/chainMapping';
import { getActiveFeedsMap, matchesChainId } from '../utils/dynamicFeedResolver';
import { extractBaseSymbol } from '../utils/oracleDataUtils';
import {
  shouldUseDatabase,
  getPriceFromDatabase,
  savePriceToDatabase,
  getHistoricalPricesFromDatabase,
} from '../utils/storage';

const logger = createLogger('databaseOperations');

// Providers whose enriched on-chain/API metadata should not be persisted
// to the price database because the stored row cannot represent all fields.
const PROVIDERS_SKIPPING_DB_SAVE = new Set([OracleProvider.CHAINLINK, OracleProvider.API3]);

// Track consecutive fire-and-forget save failures so that a persistent
// database connectivity problem is surfaced instead of being silently logged
// away on every price fetch.
const SAVE_FAILURE_THRESHOLD = 10;
let consecutiveSaveFailures = 0;

function getOracleClient(provider: OracleProvider) {
  return getDefaultFactory().getClient(provider);
}

function getTargetChainId(chain: Blockchain | undefined, defaultChain: Blockchain): number {
  const targetChain = chain || defaultChain;
  return BLOCKCHAIN_TO_CHAIN_ID[targetChain] ?? 0;
}

async function checkSymbolActive(
  provider: OracleProvider,
  baseSymbol: string,
  chainId: number
): Promise<{ supported: boolean; activeFeeds: OracleFeed[] }> {
  // Hot-path optimization: iterate the cached feeds Map directly (no
  // `Array.from` allocation) with early exit. Only materialize the full
  // array when the symbol is NOT supported, since that array is used
  // solely for building the "supported symbols" error message.
  // Pure optimization — the `supported` boolean is identical to the
  // previous `getActiveFeeds(...).some(...)` computation.
  const feedsMap = await getActiveFeedsMap(provider).catch(() => new Map<string, OracleFeed>());

  if (feedsMap.size === 0) {
    // Database has no active feeds for this provider.  Instead of blanket-
    // allowing every symbol (which produces many failed fetches), fall back
    // to the client-level isSymbolSupported() check which uses a curated
    // hardcoded list.  This keeps the system usable when the DB is empty
    // while still rejecting clearly unsupported symbols.
    const client = getOracleClient(provider);
    return { supported: client.isSymbolSupported(baseSymbol, undefined), activeFeeds: [] };
  }

  let supported = false;
  for (const feed of feedsMap.values()) {
    if (
      extractBaseSymbol(feed.symbol).toUpperCase() === baseSymbol &&
      matchesChainId(feed, chainId)
    ) {
      supported = true;
      break;
    }
  }

  if (!supported) {
    const activeFeeds = Array.from(feedsMap.values());
    return { supported: false, activeFeeds };
  }

  return { supported: true, activeFeeds: [] };
}

function getSupportedSymbolsForError(
  activeFeeds: OracleFeed[],
  chainId: number,
  clientFallback: () => string[]
): string[] {
  if (activeFeeds.length > 0) {
    const symbols = new Set<string>();
    for (const feed of activeFeeds) {
      if (matchesChainId(feed, chainId)) {
        symbols.add(extractBaseSymbol(feed.symbol).toUpperCase());
      }
    }
    return Array.from(symbols).sort();
  }
  return clientFallback();
}

/**
 * Fire-and-forget: record a feed health failure for the given provider/symbol.
 * Resolves the actual chain_id from the database feed row (chain-agnostic
 * providers store chain_id=0) so the UPDATE matches the DB row.
 *
 * Called from the realtime fetch path so that feeds which only fail under
 * live traffic (but succeed in the hourly cron via DB cache) are still
 * tracked and eventually auto-deactivated.
 */
function recordFeedHealthFailure(
  provider: OracleProvider,
  baseSymbol: string,
  chain: Blockchain | undefined
): void {
  try {
    const queries = getAdminQueries();
    const client = getOracleClient(provider);
    const chainId = getTargetChainId(chain, client.getDefaultChain());
    // Resolve actual feed chain_id (chain-agnostic providers store 0) and
    // the feed's actual DB symbol. The DB symbol must be used for the health
    // update because some providers store the quote-suffixed pair
    // ("BTC/USD") while callers pass the base symbol ("BTC"); matching on the
    // base symbol would silently no-op, leaving consecutive_failures stuck at
    // 0 so the feed can never auto-deactivate.
    getActiveFeedsMap(provider)
      .then((feedsMap) => {
        let feedChainId = chainId;
        let feedSymbol = baseSymbol;
        for (const feed of feedsMap.values()) {
          if (
            extractBaseSymbol(feed.symbol).toUpperCase() === baseSymbol &&
            matchesChainId(feed, chainId)
          ) {
            feedChainId = feed.chain_id;
            feedSymbol = feed.symbol;
            break;
          }
        }
        return queries.updateFeedHealth(provider, feedSymbol, feedChainId, false);
      })
      .catch((err) => {
        logger.warn('Failed to record feed health failure', err instanceof Error ? err : undefined);
      });
  } catch (err) {
    logger.warn('Failed to record feed health failure', err instanceof Error ? err : undefined);
  }
}

export async function fetchPriceWithDatabase(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain | undefined,
  useDatabase: boolean,
  forceRefresh: boolean = false
): Promise<PriceData> {
  // Oracle services expect the base asset symbol (e.g. "BTC"), while some UI
  // and API callers pass the full pair (e.g. "BTC/USD"). Normalize early so
  // all downstream consumers receive the expected format.
  const baseSymbol = extractBaseSymbol(symbol);

  try {
    const client = await getOracleClient(provider);
    const chainId = getTargetChainId(chain, client.getDefaultChain());

    // Reject unsupported symbols before serving stale database entries or
    // attempting a live fetch. The active feed list comes from the weekly
    // GitHub Action discovery, so price APIs follow the same supported-symbol
    // set as the symbol list. Hard-coded constants are used as a fallback when
    // the database is unreachable.
    const { supported, activeFeeds } = await checkSymbolActive(provider, baseSymbol, chainId);
    if (!supported) {
      const supportedSymbols = getSupportedSymbolsForError(activeFeeds, chainId, () =>
        client.getSupportedSymbols()
      );
      throw UnsupportedSymbolError.create(baseSymbol, supportedSymbols, provider);
    }

    if (!forceRefresh && useDatabase && shouldUseDatabase()) {
      const dbPrice = await getPriceFromDatabase(provider, baseSymbol, chain);
      if (dbPrice) {
        return dbPrice;
      }
    }

    if (
      forceRefresh &&
      'clearCache' in client &&
      typeof (client as { clearCache: () => void }).clearCache === 'function'
    ) {
      (client as { clearCache: () => void }).clearCache();
    }

    const livePrice = await client.getPrice(baseSymbol, chain);
    if (!PROVIDERS_SKIPPING_DB_SAVE.has(provider)) {
      savePriceToDatabase(livePrice)
        .then(() => {
          consecutiveSaveFailures = 0;
        })
        .catch((err) => {
          consecutiveSaveFailures += 1;
          logger.error(
            'Failed to save price to database',
            err instanceof Error ? err : new Error(String(err)),
            { provider, symbol: baseSymbol }
          );
          if (consecutiveSaveFailures >= SAVE_FAILURE_THRESHOLD) {
            logger.warn(
              'Price database save has failed consecutively; check database connectivity',
              {
                provider,
                symbol: baseSymbol,
                consecutiveFailures: consecutiveSaveFailures,
                threshold: SAVE_FAILURE_THRESHOLD,
              }
            );
          }
        });
    }
    return livePrice;
  } catch (error) {
    // Record feed health failure for real fetch errors (network, upstream,
    // timeout). UnsupportedSymbolError means the feed itself is fine, just
    // not supported for this symbol — don't count it as a health failure.
    if (!(error instanceof UnsupportedSymbolError)) {
      recordFeedHealthFailure(provider, baseSymbol, chain);
    }
    if (error instanceof PriceFetchError || error instanceof OracleClientError) {
      throw error;
    }
    throw new PriceFetchError(
      `Failed to fetch price for ${baseSymbol} from ${provider}`,
      {
        provider,
        symbol: baseSymbol,
        chain,
        retryable: true,
      },
      error instanceof Error ? error : undefined
    );
  }
}

export async function fetchHistoricalPricesWithDatabase(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain | undefined,
  period: number,
  useDatabase: boolean
): Promise<PriceData[]> {
  const baseSymbol = extractBaseSymbol(symbol);

  try {
    const client = await getOracleClient(provider);
    const chainId = getTargetChainId(chain, client.getDefaultChain());

    const { supported, activeFeeds } = await checkSymbolActive(provider, baseSymbol, chainId);
    if (!supported) {
      const supportedSymbols = getSupportedSymbolsForError(activeFeeds, chainId, () =>
        client.getSupportedSymbols()
      );
      throw UnsupportedSymbolError.create(baseSymbol, supportedSymbols, provider);
    }

    if (useDatabase && shouldUseDatabase()) {
      const dbPrices = await getHistoricalPricesFromDatabase(provider, baseSymbol, chain, period);
      if (dbPrices && dbPrices.length > 0) {
        return dbPrices;
      }
    }

    const livePrices = await client.getHistoricalPrices(baseSymbol, chain, period);
    return livePrices;
  } catch (error) {
    if (error instanceof PriceFetchError || error instanceof OracleClientError) {
      throw error;
    }
    throw new PriceFetchError(
      `Failed to fetch historical prices for ${baseSymbol} from ${provider}`,
      {
        provider,
        symbol: baseSymbol,
        chain,
        timestamp: Date.now(),
        retryable: true,
      },
      error instanceof Error ? error : undefined
    );
  }
}
