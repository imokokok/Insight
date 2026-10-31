import { createClient, type Client } from '@libsql/client';

import { ensureTursoPriceSchema } from '../schema';
import {
  acknowledgeTursoPriceSlot,
  captureTursoPriceSlot,
  listPendingTursoPriceSlots,
  pruneExpiredTursoPriceEvents,
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
