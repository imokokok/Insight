#!/usr/bin/env -S npx tsx
// ─────────────────────────────────────────────────────────────────────────
// sync-chainlink-catalog.ts
//
// Expands `src/lib/oracles/constants/chainlinkCatalog.json` to the FULL official
// Chainlink feed universe by probing the on-chain Feed Registry across every
// chain Chainlink deploys it on.
//
// WHY this exists:
//   The official feeds UI (feeds.chain.link / data.chain.link) is NOT
//   machine-readable (Vercel bot challenge / no JSON endpoint), and the Feed
//   Registry has no enumeration method (getFeed is point-lookup only). So the
//   catalog is committed to the repo and *this script* is how you refresh it.
//
// HOW to run:
//   npm run sync:chainlink-catalog
//   # in an env with reliable public RPC (or set CHAINLINK_RPC_<CHAINID> to override)
//
// BEHAVIOUR:
//   - Best-effort & defensive. Any chain/RPC/symbol that fails is skipped; a
//     transient RPC outage NEVER leaves the catalog in a broken state.
//   - Existing entries are preserved; newly-discovered feeds are ADDED, and
//     stale proxy addresses are UPDATED. The committed file is only rewritten
//     when at least one feed changed.
//   - If every probe fails (e.g. sandbox with no usable RPC), it exits 0 and
//     leaves the catalog untouched — so it is safe to wire into CI as a no-op.
//
// MANUAL FALLBACK:
//   If you cannot run this from an RPC-reachable machine, you can paste feeds
//   directly into chainlinkCatalog.json. Shape per entry:
//     { "base": "ETH", "quote": "USD", "proxyAddress": "0x…", "decimals": 8, "category": "crypto" }
//   Categories: crypto | forex | stablecoin | commodity | equity | etf
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { type Hex } from 'viem';
import { createPublicClient, http, encodeFunctionData } from 'viem';

import {
  getChainlinkDiscoverySymbols,
  inferCategory,
} from '../src/lib/oracles/services/feedDiscovery/discoveryHelpers';
import type { CatalogFeed } from '../src/lib/oracles/constants/chainlinkCatalogLoader';

const CATALOG_PATH = resolve(process.cwd(), 'src/lib/oracles/constants/chainlinkCatalog.json');

// Canonical Chainlink Feed Registry (Ethereum mainnet deployment; same address
// is used across every chain that deploys the registry).
const FEED_REGISTRY_ADDRESS = '0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf' as const;

// Chains we actively poll + where a Feed Registry exists. Public RPC endpoints
// are listed inline so this script does NOT depend on the project's `@/`
// path alias or serverEnv (which tsx cannot resolve without extra config).
// Override any chain's endpoints with CHAINLINK_RPC_<CHAINID> (comma-separated).
const FEED_REGISTRY_CHAINS: Array<{ chainId: number; rpcs: string[] }> = [
  {
    chainId: 1,
    rpcs: [
      process.env.CHAINLINK_RPC_1 ?? 'https://ethereum.publicnode.com',
      'https://rpc.ankr.com/eth',
      'https://eth.drpc.org',
    ],
  },
  {
    chainId: 42161,
    rpcs: [
      process.env.CHAINLINK_RPC_42161 ?? 'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.publicnode.com',
    ],
  },
  {
    chainId: 137,
    rpcs: [
      process.env.CHAINLINK_RPC_137 ?? 'https://polygon.publicnode.com',
      'https://polygon-rpc.com',
    ],
  },
  {
    chainId: 8453,
    rpcs: [
      process.env.CHAINLINK_RPC_8453 ?? 'https://mainnet.base.org',
      'https://base.publicnode.com',
    ],
  },
  {
    chainId: 43114,
    rpcs: [
      process.env.CHAINLINK_RPC_43114 ?? 'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche.publicnode.com',
    ],
  },
  {
    chainId: 56,
    rpcs: [
      process.env.CHAINLINK_RPC_56 ?? 'https://bsc-dataseed.binance.org',
      'https://bsc.publicnode.com',
    ],
  },
  {
    chainId: 10,
    rpcs: [
      process.env.CHAINLINK_RPC_10 ?? 'https://mainnet.optimism.io',
      'https://optimism.publicnode.com',
    ],
  },
];

const REGISTRY_ABI = [
  {
    inputs: [
      { name: 'base', type: 'bytes32' },
      { name: 'quote', type: 'bytes32' },
    ],
    name: 'getFeed',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const AGGREGATOR_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'description',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const RPC_TIMEOUT_MS = 8_000;

function symbolToBytes32(symbol: string): `0x${string}` {
  const hex = Buffer.from(symbol, 'utf8').toString('hex');
  return ('0x' + hex.padEnd(64, '0')) as `0x${string}`;
}

function decodeAddress(data: Hex | undefined): `0x${string}` | null {
  const clean = data?.startsWith('0x') ? data.slice(2) : '';
  if (!clean || clean.length < 64) return null;
  const addressHex = clean.slice(24, 64);
  if (addressHex === '0'.repeat(40)) return null; // zero address = no feed
  return ('0x' + addressHex) as `0x${string}`;
}

function decodeDecimals(data: Hex | undefined): number {
  const clean = data?.startsWith('0x') ? data.slice(2) : '';
  if (!clean) return 8;
  const parsed = parseInt(clean, 16);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8;
}

function decodeString(data: Hex | undefined): string {
  const clean = data?.startsWith('0x') ? data.slice(2) : '';
  if (!clean || clean.length < 128) return '';
  const length = parseInt(clean.slice(64, 128), 16);
  if (!Number.isFinite(length) || length <= 0) return '';
  const stringData = clean.slice(128, 128 + length * 2);
  let result = '';
  for (let i = 0; i < stringData.length; i += 2) {
    const charCode = parseInt(stringData.slice(i, i + 2), 16);
    if (!Number.isFinite(charCode) || charCode === 0) break;
    result += String.fromCharCode(charCode);
  }
  return result;
}

interface DiscoveredFeed {
  base: string;
  quote: string;
  proxyAddress: string;
  decimals: number;
  category: CatalogFeed['category'];
}

async function readRegistry(
  chainId: number,
  rpcs: string[],
  base: string
): Promise<DiscoveredFeed | null> {
  const baseBytes32 = symbolToBytes32(base);
  const quoteBytes32 = symbolToBytes32('USD');
  const getFeedData = encodeFunctionData({
    abi: REGISTRY_ABI,
    functionName: 'getFeed',
    args: [baseBytes32, quoteBytes32],
  });

  for (const url of rpcs) {
    try {
      const client = createPublicClient({ transport: http(url, { timeout: RPC_TIMEOUT_MS }) });

      const getFeedResult = await client.call({ to: FEED_REGISTRY_ADDRESS, data: getFeedData });
      const address = decodeAddress(getFeedResult.data);
      if (!address) return null; // no feed for this pair on this chain

      const decimalsData = encodeFunctionData({ abi: AGGREGATOR_ABI, functionName: 'decimals' });
      const descriptionData = encodeFunctionData({
        abi: AGGREGATOR_ABI,
        functionName: 'description',
      });

      const [decRes, descRes] = await Promise.all([
        client.call({ to: address, data: decimalsData }).catch(() => ({ data: '0x08' as Hex })),
        client.call({ to: address, data: descriptionData }).catch(() => ({ data: '0x' as Hex })),
      ]);

      return {
        base,
        quote: 'USD',
        proxyAddress: address,
        decimals: decodeDecimals(decRes.data),
        category: inferCategory(base) as CatalogFeed['category'],
      };
    } catch {
      // try next rpc for this chain
      continue;
    }
  }
  return null;
}

async function main(): Promise<void> {
  let raw: string;
  try {
    raw = readFileSync(CATALOG_PATH, 'utf8');
  } catch (err) {
    console.error(`[sync-chainlink-catalog] Cannot read catalog at ${CATALOG_PATH}:`, err);
    process.exit(1);
    return;
  }

  const file = JSON.parse(raw) as {
    version: string;
    source: string;
    networks: Record<string, CatalogFeed[]>;
  };

  // Preserve existing entries; we merge discoveries on top.
  const networks: Record<string, CatalogFeed[]> = {};
  for (const [chainId, feeds] of Object.entries(file.networks)) {
    networks[chainId] = feeds.map((f) => ({ ...f }));
  }

  // Symbol universe = catalog bases ∪ curated discovery whitelist.
  const catalogSymbols = new Set<string>();
  for (const feeds of Object.values(networks)) {
    for (const f of feeds) catalogSymbols.add(f.base.toUpperCase());
  }
  for (const s of getChainlinkDiscoverySymbols()) catalogSymbols.add(s.toUpperCase());

  const symbols = Array.from(catalogSymbols).sort();
  let discovered = 0;
  let updated = 0;
  let failedChains = 0;

  for (const { chainId, rpcs } of FEED_REGISTRY_CHAINS) {
    const key = String(chainId);
    const existing = new Map((networks[key] ?? []).map((f) => [f.base.toUpperCase(), f]));
    let chainHits = 0;

    for (const symbol of symbols) {
      const found = await readRegistry(chainId, rpcs, symbol);
      if (!found) continue;
      chainHits++;
      const prev = existing.get(symbol);
      if (!prev) {
        discovered++;
      } else if (prev.proxyAddress.toLowerCase() !== found.proxyAddress.toLowerCase()) {
        updated++;
      }
      existing.set(symbol, found);
    }

    networks[key] = Array.from(existing.values()).sort((a, b) => a.base.localeCompare(b.base));

    if (chainHits > 0) {
      console.log(`[sync-chainlink-catalog] chain ${chainId}: ${chainHits} feeds`);
    } else {
      failedChains++;
      console.warn(
        `[sync-chainlink-catalog] chain ${chainId}: 0 feeds (RPC/registry unreachable?)`
      );
    }
  }

  const changed = discovered + updated;
  if (changed === 0) {
    console.log(
      `[sync-chainlink-catalog] no changes (discovered=${discovered}, updated=${updated}). Catalog unchanged.`
    );
    if (failedChains === FEED_REGISTRY_CHAINS.length) {
      console.warn(
        '[sync-chainlink-catalog] ALL chains unreachable — run this from an env with reliable RPC, or paste feeds manually into chainlinkCatalog.json.'
      );
    }
    process.exit(0);
    return;
  }

  const next = {
    version: new Date().toISOString().slice(0, 10),
    source: `expanded via on-chain Feed Registry (scripts/sync-chainlink-catalog.ts); seed was ${file.version}`,
    networks,
  };

  writeFileSync(CATALOG_PATH, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log(
    `[sync-chainlink-catalog] wrote catalog: +${discovered} new, ${updated} updated, ${failedChains} chains unreachable.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('[sync-chainlink-catalog] fatal error:', err);
  process.exit(1);
});
