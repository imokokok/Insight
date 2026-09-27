import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('metadata persistence validates data, rejects stale overwrite and isolates privileged cache', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      'CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;'
    );
    const sql = await readFile(
      new URL('../../supabase/migrations/0070_verified_rpc_metadata_cache.sql', import.meta.url),
      'utf8'
    );
    await db.exec(sql);
    await db.exec(sql);
    const current = Date.now() - 1000;
    const row = {
      provider: 'chainlink',
      chain_id: 1,
      address: '0x' + 'AB'.repeat(20),
      checked_at: new Date(current).toISOString(),
      data: { decimals: 8, description: 'ETH / USD', version: '4', phase: 0 },
    };
    const save = (rows: unknown) =>
      db.query<{ n: number }>('SELECT save_oracle_rpc_metadata($1::jsonb) AS n', [
        JSON.stringify(rows),
      ]);
    await db.exec('SET ROLE service_role');
    assert.equal((await save([row])).rows[0].n, 1);
    assert.equal(
      (
        await save([
          {
            ...row,
            checked_at: new Date(current - 1000).toISOString(),
            data: { ...row.data, decimals: 18 },
          },
        ])
      ).rows[0].n,
      0
    );
    assert.deepEqual((await db.query('SELECT address,data FROM oracle_rpc_metadata_cache')).rows, [
      { address: row.address.toLowerCase(), data: row.data },
    ]);
    for (const data of [
      {},
      { decimals: 256 },
      { decimals: -1 },
      { decimals: 8.5 },
      { decimals: 8, description: 'ETH / USD' },
      { ...row.data, version: 'garbage' },
    ]) {
      await assert.rejects(
        save([{ ...row, data, checked_at: new Date(current + 100).toISOString() }])
      );
    }
    assert.equal(
      (await save([{ ...row, checked_at: new Date(current - 3600000).toISOString() }])).rows[0].n,
      0
    );
    assert.equal(
      (await save([{ ...row, checked_at: new Date(current + 3600000).toISOString() }])).rows[0].n,
      0
    );
    await assert.rejects(save(null));
    await assert.rejects(save(Array.from({ length: 101 }, () => row)));
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`RESET ROLE; SET ROLE ${role}`);
      await assert.rejects(db.query('SELECT * FROM oracle_rpc_metadata_cache'));
      await assert.rejects(save([row]));
    }
  } finally {
    await db.close();
  }
});
