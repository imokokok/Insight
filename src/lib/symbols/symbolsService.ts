import {
  getAllSupportedSymbols,
  getAssetClass,
  oracleSupportedSymbols,
} from '@/lib/oracles/constants/supportedSymbols';
import { getAdminQueries } from '@/lib/supabase/server';
import { createLogger, normalizeError } from '@/lib/utils/logger';
import { ORACLE_PROVIDER_VALUES } from '@/types/oracle';

const logger = createLogger('SymbolsService');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface SymbolsData {
  symbols: string[];
  oracleSymbols: Record<string, string[]>;
  categories: Record<string, string>;
}

interface SymbolCache {
  data: SymbolsData;
  timestamp: number;
}

let symbolCache: SymbolCache | null = null;

// Single-flight: deduplicate concurrent cache-miss DB queries so that
// N simultaneous requests only trigger one DB call instead of N.
let loadPromise: Promise<SymbolsData> | null = null;

/**
 * Normalize a symbol to base form without quote currency suffix.
 * e.g. "BTC/USD" → "BTC", "USD/JPY" → "USD/JPY" (forex kept as-is)
 */
function normalizeSymbol(symbol: string): string {
  // Strip /USD suffix (some providers store "BTC/USD")
  return symbol.replace(/\/USD$/, '');
}

export async function loadSymbolsFromDatabase(): Promise<SymbolsData> {
  if (symbolCache && Date.now() - symbolCache.timestamp < CACHE_TTL_MS) {
    return symbolCache.data;
  }

  // Single-flight: if another request is already loading, reuse its promise.
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const queries = getAdminQueries();
      const feeds = await queries.getOracleFeeds(''); // empty string = get all providers

      const allSymbols = new Set<string>();
      const oracleSymbols: Record<string, string[]> = {};
      const categories: Record<string, string> = {};

      for (const feed of feeds) {
        if (!feed.is_active) continue;

        const provider = feed.provider.toLowerCase();
        const symbol = normalizeSymbol(feed.symbol);

        allSymbols.add(symbol);

        if (!oracleSymbols[provider]) {
          oracleSymbols[provider] = [];
        }
        if (!oracleSymbols[provider].includes(symbol)) {
          oracleSymbols[provider].push(symbol);
        }

        if (!categories[symbol]) {
          categories[symbol] = feed.category || getAssetClass(symbol);
        }
      }

      // Ensure all known oracle providers are present in oracleSymbols even if
      // the database has no feeds for them.  This prevents the client-side
      // intersection logic from producing an empty set when a provider is
      // missing from the DB.
      for (const provider of ORACLE_PROVIDER_VALUES) {
        if (!oracleSymbols[provider]) {
          oracleSymbols[provider] = [];
        }
      }

      // Sort symbols alphabetically within each provider
      for (const provider of Object.keys(oracleSymbols)) {
        oracleSymbols[provider].sort();
      }

      const sortedSymbols = Array.from(allSymbols).sort();

      const data = { symbols: sortedSymbols, oracleSymbols, categories };
      symbolCache = { data, timestamp: Date.now() };

      logger.info(
        `Loaded ${sortedSymbols.length} symbols from ${Object.keys(oracleSymbols).length} providers`
      );
      return data;
    } catch (error) {
      logger.error('Failed to load symbols from database', normalizeError(error));

      // Return cached data if available
      if (symbolCache) return symbolCache.data;

      // Hardcoded fallback: avoid returning an empty symbol list when the
      // database is unavailable so the UI can still query basic assets.
      const fallbackSymbols = getAllSupportedSymbols();
      const fallbackOracleSymbols: Record<string, string[]> = {};
      for (const [provider, symbols] of Object.entries(oracleSupportedSymbols)) {
        fallbackOracleSymbols[provider] = [...symbols];
      }
      const fallbackCategories: Record<string, string> = {};
      for (const symbol of fallbackSymbols) {
        fallbackCategories[symbol] = getAssetClass(symbol);
      }

      return {
        symbols: fallbackSymbols,
        oracleSymbols: fallbackOracleSymbols,
        categories: fallbackCategories,
      };
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}
