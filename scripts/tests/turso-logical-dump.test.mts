import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createClient } from '@libsql/client';

import { dumpTursoDatabase, logicalDumpInternals } from '../turso/logicalDump.mjs';

test('logical dump shrinks Turso pages after response memory exhaustion', async () => {
  const limits: number[] = [];
  const fakeClient = {
    execute: async ({ sql, args }: { sql: string; args: unknown[] }) => {
      const pageSize = Number(sql.match(/LIMIT (\d+)$/)?.[1]);
      limits.push(pageSize);
      if (pageSize > 2) throw new Error('SQLITE_UNKNOWN: Resource exhausted: mem_hrana_response');
      const lastRowid = BigInt(String(args[0]));
      const rows = [1n, 2n]
        .filter((rowid) => rowid > lastRowid)
        .slice(0, pageSize)
        .map((rowid) =>
          Object.assign([rowid, Number(rowid), `row-${rowid}`], { __dump_rowid__: rowid })
        );
      return {
        rows,
        columns: ['__dump_rowid__', 'id', 'value'],
      };
    },
  };
  const inserts: string[] = [];

  const rowCount = await logicalDumpInternals.dumpTableRows(
    fakeClient as never,
    'probe',
    4,
    async (statement) => {
      inserts.push(statement);
    }
  );

  assert.equal(rowCount, 2);
  assert.deepEqual(limits, [4, 2, 2]);
  assert.match(inserts[0] ?? '', /VALUES \(1, 'row-1'\)/);
  assert.match(inserts[1] ?? '', /VALUES \(2, 'row-2'\)/);
});

test('logical dump publishes only after replay verification and restores its rows', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'turso-dump-test-'));
  const dumpPath = join(directory, 'backup.sql');
  const source = createClient({ url: 'file::memory:' });
  const restored = createClient({ url: `file:${join(directory, 'restored.db')}` });

  try {
    await source.execute(
      'CREATE TABLE sample (id INTEGER PRIMARY KEY, body TEXT NOT NULL, payload BLOB)'
    );
    await source.execute('CREATE INDEX sample_body_idx ON sample(body)');
    await source.batch(
      [
        {
          sql: 'INSERT INTO sample VALUES (?, ?, ?)',
          args: [1, "it's a test", new Uint8Array([0, 1, 255])],
        },
        { sql: 'INSERT INTO sample VALUES (?, ?, ?)', args: [2, 'second row', null] },
        {
          sql: 'INSERT INTO sample VALUES (?, ?, ?)',
          args: [3, 'third row', new Uint8Array([9, 8])],
        },
      ],
      'write'
    );

    const result = await dumpTursoDatabase(source, dumpPath, {
      pageSize: 2,
      verifyBatchSize: 2,
      header: '-- test backup\n',
    });
    const sql = readFileSync(dumpPath, 'utf8');

    assert.deepEqual(result, [{ name: 'sample', rowCount: 3 }]);
    assert.match(sql, /^-- test backup\nBEGIN TRANSACTION;/);
    assert.match(sql, /COMMIT;\n$/);
    await restored.executeMultiple(sql);

    const rows = await restored.execute('SELECT id, body FROM sample ORDER BY id');
    assert.deepEqual(
      rows.rows.map((row) => [Number(row.id), String(row.body)]),
      [
        [1, "it's a test"],
        [2, 'second row'],
        [3, 'third row'],
      ]
    );
    const blob = await restored.execute('SELECT payload FROM sample WHERE id = 1');
    const payload = blob.rows[0]?.payload;
    const bytes =
      payload instanceof ArrayBuffer
        ? Array.from(new Uint8Array(payload))
        : ArrayBuffer.isView(payload)
          ? Array.from(new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength))
          : [];
    assert.deepEqual(bytes, [0, 1, 255]);
  } finally {
    await source.close();
    await restored.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
