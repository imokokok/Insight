import type { OracleFeedInsert } from '@/lib/supabase/queries';

import { inferCategory } from './discoveryHelpers';

export const CHAINLINK_RDD_BY_CHAIN: Readonly<Record<number, string>> = {
  1: 'https://reference-data-directory.vercel.app/feeds-mainnet.json',
  42161: 'https://reference-data-directory.vercel.app/feeds-ethereum-mainnet-arbitrum-1.json',
  10: 'https://reference-data-directory.vercel.app/feeds-ethereum-mainnet-optimism-1.json',
  56: 'https://reference-data-directory.vercel.app/feeds-bsc-mainnet.json',
  137: 'https://reference-data-directory.vercel.app/feeds-matic-mainnet.json',
  8453: 'https://reference-data-directory.vercel.app/feeds-ethereum-mainnet-base-1.json',
  43114: 'https://reference-data-directory.vercel.app/feeds-avalanche-mainnet.json',
};

export const CHAINLINK_ADDRESSES_URL = 'https://docs.chain.link/data-feeds/price-feeds/addresses';

interface ChainlinkDirectoryEntry {
  proxyAddress?: string;
  decimals?: number;
  heartbeat?: number;
  name?: string;
  path?: string;
  feedCategory?: string;
  feedType?: string;
  docs?: {
    baseAsset?: string;
    quoteAsset?: string;
    productType?: string;
    productSubType?: string;
  };
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function readBalancedJsonArray(text: string, start: number): string | null {
  if (text[start] !== '[') return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '[') depth++;
    else if (char === ']') {
      depth--;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return null;
}

function unwrapTagged(value: unknown): unknown {
  if (Array.isArray(value)) {
    if (value.length === 2 && (value[0] === 0 || value[0] === 1)) {
      return unwrapTagged(value[1]);
    }
    return value.map(unwrapTagged);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        unwrapTagged(child),
      ])
    );
  }
  return value;
}

function normalizeDirectoryPayload(payload: unknown): ChainlinkDirectoryEntry[] {
  if (Array.isArray(payload)) return payload as ChainlinkDirectoryEntry[];
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Record<string, unknown>;
  for (const key of ['feeds', 'data', 'metadata']) {
    if (Array.isArray(obj[key])) return obj[key] as ChainlinkDirectoryEntry[];
  }
  return [];
}

function candidatePriority(entry: ChainlinkDirectoryEntry, base: string): number {
  const path = (entry.path || '').toLowerCase();
  const canonical = `${base.toLowerCase()}-usd`;
  if (path === canonical) return 0;
  if (!path.includes('svr')) return 1;
  if (path.includes('shared-svr')) return 2;
  return 3;
}

export function parseChainlinkDirectory(
  payload: unknown,
  chainId: number,
  source: string
): OracleFeedInsert[] {
  const entries = normalizeDirectoryPayload(payload);
  const feeds: OracleFeedInsert[] = [];
  for (const entry of entries) {
    const docs = entry.docs || {};
    const base = String(docs.baseAsset || '').trim();
    const quote = String(docs.quoteAsset || '').toUpperCase();
    const productType = String(docs.productType || '').toLowerCase();
    const address = String(entry.proxyAddress || '').trim();
    if (!base || quote !== 'USD' || productType !== 'price') continue;
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) continue;

    feeds.push({
      provider: 'chainlink',
      symbol: base,
      chain_id: chainId,
      address,
      name: entry.name || `${base} / USD`,
      decimals:
        typeof entry.decimals === 'number' && Number.isInteger(entry.decimals) ? entry.decimals : 8,
      category: inferCategory(base),
      is_active: true,
      source,
      metadata: {
        heartbeat: entry.heartbeat,
        path: entry.path,
        feedCategory: entry.feedCategory,
        feedType: entry.feedType,
        productSubType: docs.productSubType,
        candidatePriority: candidatePriority(entry, base),
        rddUrl: CHAINLINK_RDD_BY_CHAIN[chainId],
      },
    });
  }
  return feeds;
}

/** Parse the tagged metadata embedded in Chainlink's official address page. */
export function parseChainlinkAddressPage(html: string): OracleFeedInsert[] {
  const decoded = decodeHtmlEntities(html);
  const feeds: OracleFeedInsert[] = [];
  for (const [chainIdText, rddUrl] of Object.entries(CHAINLINK_RDD_BY_CHAIN)) {
    const marker = `"rddUrl":[0,"${rddUrl}"]`;
    const networkStart = decoded.indexOf(marker);
    if (networkStart < 0) continue;
    const metadataMarker = '"metadata":[1,';
    const metadataStart = decoded.indexOf(metadataMarker, networkStart);
    if (metadataStart < 0) continue;
    const arrayStart = metadataStart + metadataMarker.length;
    const json = readBalancedJsonArray(decoded, arrayStart);
    if (!json) continue;
    try {
      const unwrapped = unwrapTagged(JSON.parse(json));
      feeds.push(
        ...parseChainlinkDirectory(unwrapped, Number(chainIdText), 'chainlink-address-page')
      );
    } catch {
      // A single malformed network section must not discard other networks.
    }
  }
  return feeds;
}

interface SupraDirectoryFeed {
  symbol: string;
  pairIndex: number;
  pair: string;
  quote: string;
  category: string;
}

/** Parse the public Supra pair-index table and keep one live USD-equivalent pair per base. */
export function parseSupraPairPage(html: string): SupraDirectoryFeed[] {
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
  const bySymbol = new Map<string, SupraDirectoryFeed & { priority: number }>();
  for (const row of rows) {
    const cells = Array.from(row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
      decodeHtmlEntities(
        m[1]
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      )
    );
    if (cells.length < 2) continue;
    const rawPair = cells[0];
    const pair = rawPair.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const pairIndex = Number(cells[1]);
    const status = cells.join(' ').toLowerCase();
    if (
      !Number.isInteger(pairIndex) ||
      pairIndex < 0 ||
      /deprecated|inactive|retired/.test(status)
    ) {
      continue;
    }
    const match = pair.match(/^(.+)_((?:USD)|(?:USDT)|(?:USDC))$/i);
    if (!match) continue;
    const symbol = match[1].trim();
    const quote = match[2].toUpperCase();
    if (!symbol) continue;
    const priority = quote === 'USD' ? 0 : quote === 'USDT' ? 1 : 2;
    const candidate = {
      symbol,
      pairIndex,
      pair,
      quote,
      category: cells[2] || inferCategory(symbol),
      priority,
    };
    const current = bySymbol.get(symbol.toUpperCase());
    if (!current || priority < current.priority) bySymbol.set(symbol.toUpperCase(), candidate);
  }
  return Array.from(bySymbol.values()).map(({ priority: _priority, ...feed }) => feed);
}
