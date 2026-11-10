/* eslint-disable no-console */
/**
 * Turso logical backup: exports every user table to gzipped JSONL and writes
 * them under a timestamped directory for the GH Actions artifact uploader
 * (.github/workflows/turso-backup.yml, 90-day retention). This compensates
 * for the free tier's 1-day point-in-time restore window.
 *
 * Data-plane only: it reads the configured Turso database and writes local
 * files; it needs no organization-level tokens. Runs on Node 22 inside
 * Actions via tsx with the repo's own dependencies.
 *
 * Requires: TURSO_OPS_DATABASE_URL (or TURSO_PRICE_DATABASE_URL) and the
 * matching *_AUTH_TOKEN.
 */
import { gzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { getTursoOpsClient, readTursoOpsConfig } from '@/lib/turso/ops/client';

readTursoOpsConfig();
const client = getTursoOpsClient();

const OUT_ROOT = process.env.TURSO_BACKUP_DIR ?? join('artifacts', 'turso-backup');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = join(OUT_ROOT, stamp);
mkdirSync(outDir, { recursive: true });

/** Internal/ephemeral tables that a restore would rebuild or not need. */
const SKIP_TABLES = new Set([
  'ops_schema_meta',
  'snapshot_ingest_leases',
  'price_maintenance',
]);

interface ExportedTable {
  table: string;
  rows: number;
  bytes: number;
}

const PAGE_SIZE = 2_000;

async function exportTable(table: string): Promise<ExportedTable> {
  const quoted = `"${table.replace(/"/g, '""')}"`;
  const chunks: Buffer[] = [];
  let rows = 0;
  let lastRid = -1;

  for (;;) {
    const result = await client.execute(
      `SELECT rowid AS rid, * FROM ${quoted} WHERE rowid > ${lastRid} ORDER BY rowid LIMIT ${PAGE_SIZE}`
    );
    if (result.rows.length === 0) break;

    for (const row of result.rows) {
      const record: Record<string, unknown> = {};
      for (const column of result.columns) {
        if (column === 'rid') continue;
        record[column] = row[column];
      }
      chunks.push(Buffer.from(`${JSON.stringify(record)}\n`, 'utf8'));
    }
    rows += result.rows.length;
    lastRid = Number(result.rows[result.rows.length - 1].rid);
    if (result.rows.length < PAGE_SIZE) break;
  }

  const gz = gzipSync(Buffer.concat(chunks));
  const file = join(outDir, `${table}.jsonl.gz`);
  writeFileSync(file, gz);
  return { table, rows, bytes: gz.length };
}

try {
  const tablesResult = await client.execute(
    "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_%' ESCAPE '\\'"
  );
  const tables = tablesResult.rows
    .map((r) => String(r.name))
    .filter((t) => !SKIP_TABLES.has(t));

  const exported: ExportedTable[] = [];
  for (const table of tables) {
    try {
      exported.push(await exportTable(table));
    } catch (error) {
      // A single table failure must not sink the whole backup.
      console.error(`[turso-backup] failed to export ${table}:`, error);
    }
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    database: readTursoOpsConfig().url,
    schema_note: 'jsonl per table; one JSON object per row; restore by replaying INSERTs',
    tables: exported,
  };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`[turso-backup] wrote ${exported.length} tables to ${outDir}`);
  for (const item of exported) {
    console.log(`  ${item.table}: ${item.rows} rows, ${(item.bytes / 1024).toFixed(1)} KiB gz`);
  }
  if (exported.length === 0) {
    throw new Error('no tables were exported — backup is empty');
  }
} finally {
  client.close();
}
