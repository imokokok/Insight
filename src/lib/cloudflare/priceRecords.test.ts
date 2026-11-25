import {
  listD1PriceRecords,
  saveD1PriceRecords,
  type D1Statement,
  type PriceRecordsD1Database,
} from './priceRecords';

function makeDatabase(rows: unknown[] = []) {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const database: PriceRecordsD1Database = {
    prepare(sql) {
      const query = { sql, values: [] as unknown[] };
      queries.push(query);
      const statement: D1Statement = {
        bind(...values) {
          query.values = values;
          return statement;
        },
        async all<T>() {
          return { results: rows as T[] };
        },
        async first<T>() {
          return (rows[0] as T | undefined) ?? null;
        },
        async run() {
          return { success: true, meta: { changes: 0 } };
        },
      };
      return statement;
    },
    async batch() {
      return [];
    },
  };
  return { database, queries };
}

describe('Cloudflare D1 price_records', () => {
  it('writes bounded, deduplicated records and reaps expired rows in the same batch', async () => {
    const { database, queries } = makeDatabase();
    const timestamp = Date.now();
    const record = {
      provider: 'chainlink',
      symbol: 'BTC',
      chain: 'ethereum',
      price: 50_100,
      timestamp,
      ttl: new Date(timestamp + 86_400_000).toISOString(),
      signal_vector: { freshness: 0.99 },
    };

    await expect(saveD1PriceRecords(database, [record, record], timestamp)).resolves.toBe(1);
    expect(queries).toHaveLength(2);
    expect(queries[0]?.sql).toContain('DELETE FROM price_records WHERE ttl_ms < ?');
    expect(queries[1]?.sql).toContain('INSERT INTO price_records');
    expect(queries[1]?.values).toContain('50100.00000000');
  });

  it('applies filters and validates every row returned by D1', async () => {
    const now = Date.now();
    const timestamp = now - 1000;
    const { database, queries } = makeDatabase([
      {
        id: 7,
        provider: 'chainlink',
        symbol: 'BTC',
        chain: 'ethereum',
        price_e8: '50100.00000000',
        timestamp_ms: timestamp,
        confidence_e4: 9900,
        source: 'live',
        created_at_ms: timestamp,
        ttl_ms: now + 60_000,
        failure_mode: null,
        signal_vector_json:
          '{"freshness":0.99,"sourceReliability":0.98,"metadataCompleteness":0.95,"consistency":0.99,"auditStatus":1}',
        decimals: null,
        verification_json: null,
        ingestion_timestamp_ms: null,
        metadata_fallback: 0,
      },
    ]);

    const records = await listD1PriceRecords(
      database,
      { provider: 'chainlink', symbol: 'BTC', chain: 'ethereum', startTime: timestamp, limit: 3 },
      now
    );
    expect(records).toMatchObject([
      {
        provider: 'chainlink',
        symbol: 'BTC',
        price: 50_100,
        confidence: 0.99,
        signal_vector: { freshness: 0.99 },
      },
    ]);
    expect(queries[0]?.sql).toContain('ttl_ms >= ?');
    expect(queries[0]?.sql).toContain('provider = ?');
    expect(queries[0]?.values).toEqual([now, 'chainlink', 'BTC', 'ethereum', timestamp, 3, 0]);
  });

  it('fails closed on malformed persisted rows', async () => {
    const { database } = makeDatabase([{ id: 'not-an-integer' }]);
    await expect(listD1PriceRecords(database, {})).rejects.toThrow(
      'Invalid price_records row from D1'
    );
  });
});
