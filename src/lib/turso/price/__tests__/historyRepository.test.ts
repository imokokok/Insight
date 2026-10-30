import { createClient, type Client } from '@libsql/client';

import { loadTursoPriceHistoryPage } from '../historyRepository';
import { ensureTursoPriceSchema } from '../schema';
import { captureTursoPriceSlot } from '../slotRepository';

describe('Turso price history repository', () => {
  let client: Client;

  beforeEach(async () => {
    client = createClient({ url: 'file::memory:' });
    await ensureTursoPriceSchema(client, 1);
    await captureTursoPriceSlot(
      client,
      [
        {
          provider: 'dia',
          symbol: 'ETH',
          chainId: 1,
          price: 2_000.12345678,
          consensusPrice: 2_001,
          deviationPct: -0.0432,
          latencyMs: 12,
          dataAgeSeconds: 3,
          confidence: 0.9876,
          isSuccess: true,
          errorMessage: null,
          snapshotHourMs: 3_600_000,
        },
        {
          provider: 'pyth',
          symbol: 'UNI',
          chainId: 1,
          price: 10,
          consensusPrice: null,
          deviationPct: null,
          latencyMs: null,
          dataAgeSeconds: null,
          confidence: null,
          isSuccess: false,
          errorMessage: 'upstream unavailable',
          snapshotHourMs: 3_600_000,
        },
      ],
      3_600_000,
      2
    );
  });

  afterEach(() => {
    client.close();
  });

  it('returns typed immutable rows with a stable synthetic cursor', async () => {
    const rows = await loadTursoPriceHistoryPage(client, 0, 7_200_000, { ascending: true });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: expect.any(Number),
      snapshot_ts: '1970-01-01T01:00:00.000Z',
      snapshot_hour: '1970-01-01T01:00:00.000Z',
      provider: 'dia',
      symbol: 'ETH',
      price: 2_000.12345678,
      deviation_pct: -0.0432,
      confidence: 0.9876,
      is_success: true,
    });
    expect(rows[1]).toMatchObject({
      symbol: 'UNI',
      is_success: false,
      error_message: 'upstream unavailable',
    });
    expect(rows[0].id).toBeLessThan(rows[1].id);
  });

  it('applies source filters before pagination', async () => {
    await expect(
      loadTursoPriceHistoryPage(client, 0, 7_200_000, {
        providers: ['dia'],
        successOnly: true,
        limit: 1,
      })
    ).resolves.toMatchObject([{ symbol: 'ETH', is_success: true }]);
    await expect(
      loadTursoPriceHistoryPage(client, 0, 7_200_000, { symbol: 'UNI', successOnly: true })
    ).resolves.toEqual([]);
  });
});
