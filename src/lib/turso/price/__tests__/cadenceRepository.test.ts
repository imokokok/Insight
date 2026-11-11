import { createClient, type Client } from '@libsql/client';

import type { OracleFeed } from '@/lib/supabase/queries';

import {
  readTursoFeedCadenceBaselines,
  refreshTursoFeedCadenceBaselines,
} from '../cadenceRepository';
import { publishTursoFeedRegistry } from '../controlPlaneRepository';
import { ensureTursoPriceSchema } from '../schema';

let client: Client;

const POLICY = { maxAgeMs: 86_400_000 };

let nextFeedId = 1;

function makeFeed(overrides: Partial<OracleFeed> = {}): OracleFeed {
  const id = String(nextFeedId++);
  return {
    provider: 'chainlink',
    symbol: 'BTC',
    chain_id: 1,
    address: '0xfeed',
    name: `feed-${id}`,
    decimals: 8,
    category: 'crypto',
    is_active: true,
    source: 'test',
    metadata: null,
    ...overrides,
  } as OracleFeed;
}

async function publishFeeds(feeds: OracleFeed[], publishedAtMs: number): Promise<void> {
  await publishTursoFeedRegistry(client, feeds, publishedAtMs);
}

async function insertSnapshot(params: {
  slotMs: number;
  provider: string;
  symbol: string;
  chainId: number;
  dataAgeSeconds: number;
}): Promise<void> {
  await client.execute({
    sql: `INSERT INTO price_snapshots(
      slot_ms,snapshot_hour_ms,provider,symbol,chain_id,price_e8,
      is_success,write_reason,created_at_ms,data_age_seconds
    ) VALUES(?,?,?,?,?,?,?,?,?,?)`,
    args: [
      params.slotMs,
      Math.floor(params.slotMs / 3_600_000) * 3_600_000,
      params.provider,
      params.symbol,
      params.chainId,
      '100000000',
      1,
      'test',
      params.slotMs,
      params.dataAgeSeconds,
    ],
  });
}

/** n snapshots for one feed with the given data ages, spread over 5 minutes. */
async function insertAges(
  feed: { provider: string; symbol: string; chain_id: number },
  ages: number[],
  startMs: number
): Promise<void> {
  for (let i = 0; i < ages.length; i++) {
    await insertSnapshot({
      slotMs: startMs + i * 300_000,
      provider: feed.provider,
      symbol: feed.symbol,
      chainId: feed.chain_id,
      dataAgeSeconds: ages[i],
    });
  }
}

beforeEach(async () => {
  client = createClient({ url: 'file::memory:' });
  await ensureTursoPriceSchema(client, 1);
});

afterEach(() => {
  client.close();
});

describe('refreshTursoFeedCadenceBaselines', () => {
  const NOW = Date.parse('2026-11-11T12:00:00Z');
  const START = NOW - 6 * 3_600_000; // six hours ago, inside the 48h window

  it('throws when the registry mirror is missing', async () => {
    await expect(refreshTursoFeedCadenceBaselines(client, { nowMs: NOW }, POLICY)).rejects.toThrow(
      /registry missing/
    );
  });

  it('throws when the registry mirror is stale', async () => {
    await publishFeeds([makeFeed()], NOW - POLICY.maxAgeMs - 1);
    await expect(refreshTursoFeedCadenceBaselines(client, { nowMs: NOW }, POLICY)).rejects.toThrow(
      /stale/
    );
  });

  it('computes p90 with percentile_cont interpolation and skips under-sampled feeds', async () => {
    const trusted = makeFeed({ provider: 'chainlink', symbol: 'BTC', chain_id: 1 });
    await publishFeeds([trusted], NOW - 1_000);

    // 12 samples: sorted p90 index = 0.9 * 11 = 9.9 -> 40 + 0.9 * 10 = 49.
    await insertAges(trusted, [10, 20, 30, 40, 50, 10, 20, 30, 40, 50, 10, 20], START);

    const result = await refreshTursoFeedCadenceBaselines(client, { nowMs: NOW }, POLICY);
    expect(result).toEqual({ updated: 1, scanned: 1 });

    const stored = await client.execute(
      `SELECT p90_seconds FROM feed_cadence_baselines
        WHERE provider='chainlink' AND symbol='BTC' AND chain_id=1`
    );
    expect(Number(stored.rows[0].p90_seconds)).toBe(49);
  });

  it('writes NULL for feeds without enough samples and for untrusted providers', async () => {
    const underSampled = makeFeed({ provider: 'chainlink', symbol: 'ETH', chain_id: 1 });
    const untrusted = makeFeed({ provider: 'dia', symbol: 'BTC', chain_id: 1 });
    await publishFeeds([underSampled, untrusted], NOW - 1_000);

    await insertAges(underSampled, [10, 10, 10], START); // 3 < minSamples 12
    await insertAges(untrusted, Array(20).fill(5), START); // trusted-list gate

    await refreshTursoFeedCadenceBaselines(client, { nowMs: NOW }, POLICY);

    const rows = await client.execute(
      'SELECT symbol, p90_seconds FROM feed_cadence_baselines ORDER BY symbol'
    );
    expect(rows.rows.length).toBe(2);
    expect(rows.rows.every((row) => row.p90_seconds === null)).toBe(true);
  });

  it('rounds the interpolated p90 half-up like PG round()', async () => {
    const feed = makeFeed({ provider: 'api3', symbol: 'LINK', chain_id: 1 });
    await publishFeeds([feed], NOW - 1_000);
    // 12 samples: sorted p90 index = 9.9 -> a[9]=20, a[10]=30 -> 29.
    await insertAges(feed, [10, 10, 10, 10, 10, 20, 20, 20, 20, 20, 30, 30], START);

    await refreshTursoFeedCadenceBaselines(client, { nowMs: NOW }, POLICY);

    const stored = await client.execute(
      `SELECT p90_seconds FROM feed_cadence_baselines WHERE symbol='LINK'`
    );
    expect(Number(stored.rows[0].p90_seconds)).toBe(29);
  });

  it('ignores negative and out-of-window samples', async () => {
    const feed = makeFeed({ provider: 'supra', symbol: 'SOL', chain_id: 1 });
    await publishFeeds([feed], NOW - 1_000);
    // 12 in-window samples (p90 = 60) plus an out-of-window and a negative one.
    await insertAges(feed, Array(12).fill(60), START);
    await insertSnapshot({
      slotMs: NOW - 72 * 3_600_000, // outside the 48h window
      provider: 'supra',
      symbol: 'SOL',
      chainId: 1,
      dataAgeSeconds: 9999,
    });
    await insertSnapshot({
      slotMs: START + 60_000,
      provider: 'supra',
      symbol: 'SOL',
      chainId: 1,
      dataAgeSeconds: -5,
    });

    await refreshTursoFeedCadenceBaselines(client, { nowMs: NOW }, POLICY);

    const stored = await client.execute(
      `SELECT p90_seconds FROM feed_cadence_baselines WHERE symbol='SOL'`
    );
    expect(Number(stored.rows[0].p90_seconds)).toBe(60);
  });

  it('refreshes baselines on subsequent runs and sweeps rows of deactivated feeds', async () => {
    const kept = makeFeed({ provider: 'chainlink', symbol: 'BTC', chain_id: 1 });
    const removed = makeFeed({ provider: 'chainlink', symbol: 'DOGE', chain_id: 1 });
    await publishFeeds([kept, removed], NOW - 1_000);
    await insertAges(kept, Array(12).fill(100), START);
    await insertAges(removed, Array(12).fill(100), START);
    await refreshTursoFeedCadenceBaselines(client, { nowMs: NOW }, POLICY);

    // Second run: DOGE left the registry, BTC cadence changed.
    await publishFeeds([kept], NOW - 500);
    await client.execute({
      sql: `DELETE FROM price_snapshots WHERE symbol='BTC'`,
      args: [],
    });
    await insertAges(kept, Array(12).fill(200), START + 3_600_000);
    await refreshTursoFeedCadenceBaselines(client, { nowMs: NOW + 1_000 }, POLICY);

    const rows = await client.execute(
      'SELECT symbol, p90_seconds FROM feed_cadence_baselines ORDER BY symbol'
    );
    expect(rows.rows.length).toBe(1);
    expect(rows.rows[0].symbol).toBe('BTC');
    expect(Number(rows.rows[0].p90_seconds)).toBe(200);
  });
});

describe('readTursoFeedCadenceBaselines', () => {
  it('returns the most lenient (max) p90 per provider for a symbol', async () => {
    const now = Date.now();
    const ethBase = { provider: 'chainlink', symbol: 'ETH', chain_id: 1 };
    await publishFeeds(
      [makeFeed({ ...ethBase, chain_id: 1 }), makeFeed({ ...ethBase, chain_id: 56 })],
      now
    );
    await insertAges({ ...ethBase, chain_id: 1 }, Array(12).fill(30), now - 3_600_000);
    await insertAges({ ...ethBase, chain_id: 56 }, Array(12).fill(90), now - 3_600_000);

    await refreshTursoFeedCadenceBaselines(client, { nowMs: now }, POLICY);

    const map = await readTursoFeedCadenceBaselines(client, 'ETH');
    expect(map.get('chainlink')).toBe(90);
  });
});
