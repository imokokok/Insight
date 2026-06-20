import { NextResponse } from 'next/server';

import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('SymbolsAPI');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface SymbolCache {
  data: {
    symbols: string[];
    oracleSymbols: Record<string, string[]>;
    categories: Record<string, string>;
  };
  timestamp: number;
}

let symbolCache: SymbolCache | null = null;

function inferCategory(symbol: string): string {
  const forex = [
    'EUR',
    'GBP',
    'JPY',
    'CHF',
    'AUD',
    'CAD',
    'NZD',
    'SGD',
    'HKD',
    'KRW',
    'INR',
    'MXN',
    'BRL',
    'SEK',
    'NOK',
    'TRY',
    'ZAR',
    'PHP',
    'IDR',
    'CNY',
  ];
  const commodity = ['XAU', 'XAG', 'XPT', 'XPD', 'USOILSPOT', 'UKOILSPOT'];
  const equity = [
    'AAPL',
    'AMZN',
    'TSLA',
    'GOOGL',
    'MSFT',
    'META',
    'NVDA',
    'COIN',
    'LMT',
    'PANW',
    'PFE',
    'TMUS',
    'PLD',
    'SCHW',
    'WM',
    'GLW',
    'FDX',
    'WDAY',
    'TROW',
    'PH',
    'VRT',
    'BRO',
    'IFF',
    'EQR',
    'HUM',
    'FLUT',
  ];
  const etf = ['ARKK', 'SGOV', 'VEA', 'DIVB', 'FBCG', 'ICSH', 'IVW', 'XLE'];
  const stablecoin = ['USDC', 'USDT', 'DAI', 'FRAX', 'BUSD', 'TUSD', 'USDD', 'LUSD', 'USDJ'];

  if (forex.includes(symbol)) return 'forex';
  if (commodity.includes(symbol)) return 'commodity';
  if (equity.includes(symbol)) return 'equity';
  if (etf.includes(symbol)) return 'etf';
  if (stablecoin.includes(symbol)) return 'stablecoin';
  return 'crypto';
}

async function loadSymbolsFromDatabase() {
  if (symbolCache && Date.now() - symbolCache.timestamp < CACHE_TTL_MS) {
    return symbolCache.data;
  }

  try {
    const queries = getServerQueries();
    const feeds = await queries.getOracleFeeds(''); // empty string = get all providers

    const allSymbols = new Set<string>();
    const oracleSymbols: Record<string, string[]> = {};
    const categories: Record<string, string> = {};

    for (const feed of feeds) {
      if (!feed.is_active) continue;

      allSymbols.add(feed.symbol);

      if (!oracleSymbols[feed.provider]) {
        oracleSymbols[feed.provider] = [];
      }
      if (!oracleSymbols[feed.provider].includes(feed.symbol)) {
        oracleSymbols[feed.provider].push(feed.symbol);
      }

      if (!categories[feed.symbol]) {
        categories[feed.symbol] = feed.category || inferCategory(feed.symbol);
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
    logger.error(
      'Failed to load symbols from database',
      error instanceof Error ? error : new Error(String(error))
    );

    // Return empty data if database is unavailable
    if (symbolCache) return symbolCache.data;
    return { symbols: [], oracleSymbols: {}, categories: {} };
  }
}

export async function GET() {
  const data = await loadSymbolsFromDatabase();
  return NextResponse.json(data);
}
