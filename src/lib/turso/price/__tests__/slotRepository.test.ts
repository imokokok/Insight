import { createClient, type Client } from '@libsql/client';

import {
  acquireTursoPriceIngestLease,
  completeTursoPriceIngestLease,
  publishTursoFeedRegistry,
  readTursoFeedRegistry,
} from '../controlPlaneRepository';
import { ensureTursoPriceSchema } from '../schema';
import {
  acknowledgeTursoPriceSlot,
  captureTursoPriceSlot,
  getTursoPriceProjectionBacklog,
  listPendingTursoPriceSlots,
  pruneExpiredTursoPriceEvents,
  recordTursoPriceProjectionFailure,
  replaceTursoPricePersistenceProjection,
} from '../slotRepository';

import type { TursoPriceInput, TursoPricePolicy } from '../types';

function input(overrides: Partial<TursoPriceInput> = {}): TursoPriceInput {
  return {
    provider: 'dia',
    symbol: 'UNI',
    chainId: 1,
    price: 10,
    consensusPrice: 10,
    deviationPct: 0,
    latencyMs: 20,
    dataAgeSeconds: 1,
    confidence: 0.9,
    isSuccess: true,
    errorMessage: null,
    snapshotHourMs: 3_600_000,
    ...overrides,
  };
}

describe('Turso price-slot repository', () => {
  let client: Client;

  beforeEach(async () => {
    client = createClient({ url: 'file::memory:' });
    await ensureTursoPriceSchema(client, 1);
  });

  afterEach(() => {
    client.close();
  });

  it('upgrades an existing v2 slot store with control-plane columns and tables', async () => {
    const legacy = createClient({ url: 'file::memory:' });
    try {
      await legacy.batch([
        `CREATE TABLE _insight_schema_migrations (
          version INTEGER PRIMARY KEY,
          applied_at_ms INTEGER NOT NULL
        )`,
        `CREATE TABLE snapshot_slots (
          slot_ms INTEGER PRIMARY KEY,
          input_hash TEXT NOT NULL,
          raw_digest TEXT NOT NULL,
          canonical_payload TEXT NOT NULL,
          policy_version INTEGER NOT NULL,
          received_count INTEGER NOT NULL,
          candidate_count INTEGER NOT NULL,
          persisted_count INTEGER NOT NULL,
          summary_json TEXT NOT NULL,
          supabase_acknowledged_at_ms INTEGER,
          created_at_ms INTEGER NOT NULL
        )`,
        'INSERT INTO _insight_schema_migrations(version,applied_at_ms) VALUES(2, 1)',
      ]);
      await ensureTursoPriceSchema(legacy, 2);
      const [columns, leases, registry] = await Promise.all([
        legacy.execute('PRAGMA table_info(snapshot_slots)'),
        legacy.execute(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='snapshot_ingest_leases'"
        ),
        legacy.execute(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='feed_registry_snapshots'"
        ),
      ]);
      expect(columns.rows.map((row) => row.name)).toEqual(
        expect.arrayContaining([
          'projection_attempts',
          'projection_last_error',
          'projection_retry_after_ms',
          'projection_quarantined_at_ms',
        ])
      );
      expect(leases.rows).toHaveLength(1);
      expect(registry.rows).toHaveLength(1);
    } finally {
      legacy.close();
    }
  });

  it('resumes an interrupted v2-to-v3 column migration without masking other DDL failures', async () => {
    const legacy = createClient({ url: 'file::memory:' });
    try {
      await legacy.batch([
        `CREATE TABLE _insight_schema_migrations (
          version INTEGER PRIMARY KEY,
          applied_at_ms INTEGER NOT NULL
        )`,
        `CREATE TABLE snapshot_slots (
          slot_ms INTEGER PRIMARY KEY,
          input_hash TEXT NOT NULL,
          raw_digest TEXT NOT NULL,
          canonical_payload TEXT NOT NULL,
          policy_version INTEGER NOT NULL,
          received_count INTEGER NOT NULL,
          candidate_count INTEGER NOT NULL,
          persisted_count INTEGER NOT NULL,
          summary_json TEXT NOT NULL,
          supabase_acknowledged_at_ms INTEGER,
          projection_attempts INTEGER NOT NULL DEFAULT 0,
          created_at_ms INTEGER NOT NULL
        )`,
        'INSERT INTO _insight_schema_migrations(version,applied_at_ms) VALUES(2, 1)',
      ]);
      await expect(ensureTursoPriceSchema(legacy, 2)).resolves.toBeUndefined();
      const columns = await legacy.execute('PRAGMA table_info(snapshot_slots)');
      expect(columns.rows.map((row) => row.name)).toEqual(
        expect.arrayContaining([
          'projection_attempts',
          'projection_last_error',
          'projection_retry_after_ms',
          'projection_quarantined_at_ms',
        ])
      );
    } finally {
      legacy.close();
    }
  });

  it('persists a bounded slot atomically and replays the exact same hash', async () => {
    const first = await captureTursoPriceSlot(client, [input()], 3_600_000, 2);
    expect(first.replayed).toBe(false);
    expect(first.summary).toMatchObject({ received: 1, candidates: 1, persisted: 1, initial: 1 });

    const retry = await captureTursoPriceSlot(client, [input()], 3_600_000, 3);
    expect(retry).toEqual({ ...first, replayed: true });

    await expect(
      captureTursoPriceSlot(client, [input({ price: 11 })], 3_600_000, 4)
    ).rejects.toThrow('different input hash');

    const rows = await client.execute('SELECT count(*) AS count FROM price_snapshots');
    expect(Number(rows.rows[0].count)).toBe(1);
    const latest = await client.execute(
      'SELECT slot_ms,price_e8,write_reason FROM price_latest WHERE provider=? AND symbol=? AND chain_id=?',
      ['dia', 'UNI', 1]
    );
    expect(latest.rows).toEqual([
      expect.objectContaining({
        slot_ms: 3_600_000,
        price_e8: '1000000000',
        write_reason: 'initial',
      }),
    ]);
  });

  it('serializes independent schedulers with a Turso slot lease', async () => {
    const first = await acquireTursoPriceIngestLease(
      client,
      3_600_000,
      'github_actions',
      60_000,
      1
    );
    expect(first).toMatchObject({ state: 'acquired', slotMs: 3_600_000 });
    const second = await acquireTursoPriceIngestLease(
      client,
      3_600_000,
      'github_actions',
      60_000,
      2
    );
    expect(second).toMatchObject({ state: 'busy', slotMs: 3_600_000 });

    await completeTursoPriceIngestLease(client, 3_600_000, first.leaseId!, 3);
    await expect(
      acquireTursoPriceIngestLease(client, 3_600_000, 'github_actions', 60_000, 4)
    ).resolves.toMatchObject({ state: 'completed', slotMs: 3_600_000 });
  });

  it('stores a versioned, last-known-good active feed registry in Turso', async () => {
    const published = await publishTursoFeedRegistry(
      client,
      [
        {
          id: 'feed-1',
          provider: 'redstone',
          symbol: 'ETH',
          chain_id: 0,
          address: 'ETH',
          name: 'Ethereum',
          decimals: 8,
          category: 'crypto',
          is_active: true,
          source: 'redstone-api',
          metadata: { canonical: true },
        },
      ],
      10
    );
    const loaded = await readTursoFeedRegistry(client);
    expect(loaded).toEqual(published);
    expect(loaded?.versionHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('persists an intentionally empty active-feed registry without reviving stale feeds', async () => {
    const published = await publishTursoFeedRegistry(client, [], 10);
    await expect(readTursoFeedRegistry(client)).resolves.toEqual(published);
    expect(published.feeds).toEqual([]);
  });

  it('keeps adaptive state only for persisted adaptive observations', async () => {
    const first = await captureTursoPriceSlot(client, [input()], 3_600_000, 2);
    expect(first.summary.initial).toBe(1);

    const stable = await captureTursoPriceSlot(
      client,
      [input({ snapshotHourMs: 3_600_000 })],
      3_900_000,
      3
    );
    expect(stable.summary).toMatchObject({ persisted: 0, stableSkipped: 1 });

    const baseline = await captureTursoPriceSlot(
      client,
      [input({ snapshotHourMs: 7_200_000 })],
      7_200_000,
      4
    );
    expect(baseline.summary).toMatchObject({ persisted: 1, hourlyBaseline: 1 });
  });

  it('uses a full-resolution policy and retains pending payloads until acknowledged', async () => {
    const captured = await captureTursoPriceSlot(
      client,
      [input({ symbol: 'ETH', price: 2_000, snapshotHourMs: 10_800_000 })],
      10_800_000,
      2
    );
    expect(captured.summary).toMatchObject({ persisted: 1, fullResolution: 1 });

    const pending = await listPendingTursoPriceSlots(client);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ slotMs: 10_800_000, inputHash: captured.inputHash });
    expect(pending[0].inputs[0]).toMatchObject({ symbol: 'ETH', price: 2_000 });

    await acknowledgeTursoPriceSlot(client, captured.slotMs, captured.inputHash, 3);
    await expect(listPendingTursoPriceSlots(client)).resolves.toEqual([]);
  });

  it('backs off a transient projection failure and quarantines only a deterministic one', async () => {
    const captured = await captureTursoPriceSlot(client, [input()], 3_600_000, 2);
    const transient = await recordTursoPriceProjectionFailure(
      client,
      captured.slotMs,
      captured.inputHash,
      new Error('Supabase gateway timed out'),
      { nowMs: 10 }
    );
    expect(transient).toEqual({ attempts: 1, retryAfterMs: 60_010, quarantined: false });
    await expect(listPendingTursoPriceSlots(client, 4, 11)).resolves.toEqual([]);
    await expect(listPendingTursoPriceSlots(client, 4, 60_010)).resolves.toHaveLength(1);

    const quarantined = await recordTursoPriceProjectionFailure(
      client,
      captured.slotMs,
      captured.inputHash,
      new Error('Invalid immutable projection payload'),
      { permanent: true, nowMs: 70_000 }
    );
    expect(quarantined).toEqual({ attempts: 2, retryAfterMs: null, quarantined: true });
    await expect(listPendingTursoPriceSlots(client, 4, 80_000)).resolves.toEqual([]);
    await expect(getTursoPriceProjectionBacklog(client)).resolves.toEqual({
      pendingCount: 0,
      oldestSlotMs: null,
      retryingCount: 0,
      quarantinedCount: 1,
    });
  });

  it('atomically replaces the mutable projection without discarding immutable slot evidence', async () => {
    await captureTursoPriceSlot(client, [input()], 3_600_000, 2);
    const policies: TursoPricePolicy[] = [
      {
        policyKey: '__default__',
        resolution: 'adaptive',
        priceChangeBps: 25,
        deviationChangeBps: 10,
        dataAgeChangeSeconds: 300,
        confidenceChangeE4: 500,
      },
    ];

    await replaceTursoPricePersistenceProjection(
      client,
      [
        {
          provider: 'dia',
          symbol: 'UNI',
          chainId: 1,
          lastSnapshotMs: 7_200_000,
          lastPrice: 11,
          lastDeviationPct: 0,
          lastDataAgeSeconds: 1,
          lastConfidence: 0.9,
          lastIsSuccess: true,
          lastErrorMessage: null,
        },
      ],
      policies,
      5
    );

    const state = await client.execute(
      'SELECT last_snapshot_ms,last_price_e8,last_confidence_e4 FROM persistence_state'
    );
    expect(state.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          last_snapshot_ms: 7_200_000,
          last_price_e8: '1100000000',
          last_confidence_e4: 9_000,
        }),
      ])
    );
    const immutableSlots = await client.execute('SELECT count(*) AS count FROM snapshot_slots');
    expect(Number(immutableSlots.rows[0].count)).toBe(1);

    const stable = await captureTursoPriceSlot(
      client,
      [input({ price: 11, snapshotHourMs: 7_200_000 })],
      7_500_000,
      6
    );
    expect(stable.summary).toMatchObject({ persisted: 0, stableSkipped: 1 });
  });

  it('batches large slots and keeps the current-price model for stable rows', async () => {
    const inputs = Array.from({ length: 301 }, (_, index) =>
      input({ symbol: `T${index}`, snapshotHourMs: 3_600_000 })
    );
    const captured = await captureTursoPriceSlot(client, inputs, 3_600_000, 2);
    expect(captured.summary).toMatchObject({ received: 301, candidates: 301, persisted: 301 });

    const stable = await captureTursoPriceSlot(
      client,
      inputs.map((row) => ({ ...row, snapshotHourMs: 3_600_000 })),
      3_900_000,
      3
    );
    expect(stable.summary).toMatchObject({ persisted: 0, stableSkipped: 301 });
    const latest = await client.execute(
      'SELECT count(*) AS count,min(slot_ms) AS oldest FROM price_latest'
    );
    expect(latest.rows[0]).toMatchObject({ count: 301, oldest: 3_900_000 });
  });

  it('prunes only expired raw events while preserving slot audit payloads and latest prices', async () => {
    const previous = process.env.TURSO_PRICE_RAW_RETENTION_DAYS;
    process.env.TURSO_PRICE_RAW_RETENTION_DAYS = '1';
    try {
      const first = await captureTursoPriceSlot(client, [input({ snapshotHourMs: 0 })], 0, 1);
      const latest = await captureTursoPriceSlot(
        client,
        [input({ price: 11, snapshotHourMs: 3 * 24 * 60 * 60 * 1000 })],
        3 * 24 * 60 * 60 * 1000,
        2
      );
      await acknowledgeTursoPriceSlot(client, first.slotMs, first.inputHash, 3);
      await acknowledgeTursoPriceSlot(client, latest.slotMs, latest.inputHash, 3);
      await expect(pruneExpiredTursoPriceEvents(client, 3 * 24 * 60 * 60 * 1000)).resolves.toEqual({
        rawEventsPruned: 1,
        acknowledgedPayloadsCompacted: 1,
      });

      const [raw, slots, latestRow, compactedPayload] = await Promise.all([
        client.execute('SELECT count(*) AS count FROM price_snapshots'),
        client.execute('SELECT count(*) AS count FROM snapshot_slots'),
        client.execute('SELECT price_e8 FROM price_latest'),
        client.execute('SELECT canonical_payload FROM snapshot_slots WHERE slot_ms=0'),
      ]);
      expect(raw.rows[0]).toMatchObject({ count: 1 });
      expect(slots.rows[0]).toMatchObject({ count: 2 });
      expect(latestRow.rows[0]).toMatchObject({ price_e8: '1100000000' });
      expect(compactedPayload.rows[0]).toMatchObject({
        canonical_payload: '{"slotMs":0,"inputs":[]}',
      });
    } finally {
      if (previous === undefined) delete process.env.TURSO_PRICE_RAW_RETENTION_DAYS;
      else process.env.TURSO_PRICE_RAW_RETENTION_DAYS = previous;
    }
  });
});
