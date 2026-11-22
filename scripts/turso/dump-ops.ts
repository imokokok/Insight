/**
 * Full logical dump of the Turso data plane (price domain + ops domain).
 *
 * The dump is streamed in bounded batches, automatically retries smaller
 * remote pages when Turso rejects a large result, and is replayed into a
 * temporary disk-backed SQLite database before it is published.
 *
 * Usage:
 *   TURSO_OPS_DATABASE_URL=libsql://… TURSO_OPS_AUTH_TOKEN=… \
 *     node --import tsx scripts/turso/dump-ops.ts --output /tmp/turso-ops.sql
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

import { createClient } from '@libsql/client';

import { dumpTursoDatabase } from './logicalDump.mjs';

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main(): Promise<void> {
  const outputArg = process.argv.indexOf('--output');
  if (outputArg === -1 || !process.argv[outputArg + 1]) {
    throw new Error('Usage: --output <path>');
  }
  const outputPath = process.argv[outputArg + 1];
  const url = readEnv('TURSO_OPS_DATABASE_URL');
  const authToken = readEnv('TURSO_OPS_AUTH_TOKEN');
  const source = createClient({ url, authToken });

  try {
    console.log(`[turso-dump] source=${url}`);
    const header = [
      '-- Turso ops data-plane logical dump',
      `-- source: ${url}`,
      `-- generated: ${new Date().toISOString()}`,
      '-- restore: sqlite3 <file> (statements are transaction-wrapped)',
      '',
    ].join('\n');
    await dumpTursoDatabase(source, outputPath, { header });
  } finally {
    await source.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error('[turso-dump] FAILED:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
