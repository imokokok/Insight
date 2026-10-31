import { createClient, type Client } from '@libsql/client';

import { ensureTursoPriceSchema } from '../schema';
import {
  acknowledgeTursoPriceSlot,
  captureTursoPriceSlot,
  listPendingTursoPriceSlots,
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
});
