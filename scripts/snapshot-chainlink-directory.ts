#!/usr/bin/env -S npx tsx

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  CHAINLINK_ADDRESSES_URL,
  parseChainlinkAddressPage,
} from '../src/lib/oracles/services/feedDiscovery/catalogSources';

const CATALOG_PATH = resolve(process.cwd(), 'src/lib/oracles/constants/chainlinkCatalog.json');

async function loadAddressPage(): Promise<string> {
  const inputIndex = process.argv.indexOf('--input');
  const input = inputIndex >= 0 ? process.argv[inputIndex + 1] : undefined;
  if (input) return readFileSync(resolve(input), 'utf8');

  const response = await fetch(CHAINLINK_ADDRESSES_URL, {
    headers: { Accept: 'text/html' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Chainlink address page returned ${response.status}`);
  return response.text();
}

async function main(): Promise<void> {
  const feeds = parseChainlinkAddressPage(await loadAddressPage());
  if (feeds.length < 100) {
    throw new Error(`Refusing to replace catalog with only ${feeds.length} parsed candidates`);
  }

  const selected = new Map<string, (typeof feeds)[number]>();
  for (const feed of feeds) {
    const key = `${feed.chain_id}:${feed.symbol.toUpperCase()}`;
    const current = selected.get(key);
    const priority = Number(feed.metadata?.candidatePriority ?? 50);
    const currentPriority = Number(current?.metadata?.candidatePriority ?? 50);
    if (!current || priority < currentPriority) selected.set(key, feed);
  }

  const networks: Record<string, Array<Record<string, unknown>>> = {};
  for (const feed of selected.values()) {
    const chainId = String(feed.chain_id);
    (networks[chainId] ||= []).push({
      base: feed.symbol,
      quote: 'USD',
      proxyAddress: feed.address,
      decimals: feed.decimals ?? 8,
      category: feed.category ?? 'crypto',
      heartbeat: feed.metadata?.heartbeat,
      path: feed.metadata?.path,
      feedCategory: feed.metadata?.feedCategory,
      feedType: feed.metadata?.feedType,
    });
  }
  for (const networkFeeds of Object.values(networks)) {
    networkFeeds.sort((a, b) => String(a.base).localeCompare(String(b.base)));
  }

  const snapshot = {
    version: new Date().toISOString().slice(0, 10),
    source: CHAINLINK_ADDRESSES_URL,
    networks: Object.fromEntries(
      Object.entries(networks).sort(([left], [right]) => Number(left) - Number(right))
    ),
  };
  writeFileSync(CATALOG_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    `[snapshot-chainlink-directory] wrote ${selected.size} canonical feeds from ${feeds.length} candidates`
  );
}

main().catch((error) => {
  console.error('[snapshot-chainlink-directory] failed:', error);
  process.exitCode = 1;
});
