/**
 * Full logical dump of the Turso data plane (price domain + ops domain).
 *
 * Generated as a plain SQLite-compatible .sql file: CREATE TABLE/INDEX plus
 * INSERT statements, wrapped in a transaction. Before the file is written the
 * statements are replayed into an in-memory database and every table's row
 * count is compared against the live source — a dump that cannot be restored
 * is never produced.
 *
 * Usage:
 *   TURSO_OPS_DATABASE_URL=libsql://… TURSO_OPS_AUTH_TOKEN=… \
 *     node --import tsx scripts/turso/dump-ops.ts --output /tmp/turso-ops.sql
 */
import { createClient, type Client, type InValue } from '@libsql/client';
import { writeFileSync } from 'node:fs';

const PAGE_SIZE = 2000;
const VERIFY_BATCH = 5000;

interface TableEntry {
  name: string;
  createSql: string;
}

interface DumpedTable {
  name: string;
  rowCount: number;
}

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function sqlQuoteText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlQuoteValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value);
    if (!Number.isFinite(value)) {
      // SQLite cannot hold NaN/Infinity; dumps must stay restorable.
      throw new Error(`Non-finite number cannot be dumped: ${value}`);
    }
    return String(value); // shortest round-trip repr for IEEE754 doubles
  }
  if (typeof value === 'bigint') return String(value);
  if (value instanceof Uint8Array) {
    return `X'${Buffer.from(value).toString('hex')}'`;
  }
  if (typeof value === 'string') return sqlQuoteText(value);
  throw new Error(`Unsupported column type: ${typeof value}`);
}

function quoteIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

async function listTables(client: Client): Promise<TableEntry[]> {
  const result = await client.execute({
    sql: "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid",
    args: [],
  });
  return result.rows.map((row) => ({
    name: String(row.name),
    createSql: String(row.sql),
  }));
}

async function listIndexes(client: Client): Promise<string[]> {
  const result = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL ORDER BY rowid",
    args: [],
  });
  return result.rows.map((row) => String(row.sql));
}

async function dumpTableRows(
  client: Client,
  table: string,
  write: (statement: string) => void
): Promise<number> {
  const quotedTable = quoteIdent(table);
  let lastRowid = 0n;
  let total = 0;
  for (;;) {
    // rowid is selected explicitly so paging is a simple keyset scan; it is
    // stripped from the INSERT column list below.
    const result = await client.execute({
      sql: `SELECT rowid AS __dump_rowid__, * FROM ${quotedTable} WHERE rowid > ? ORDER BY rowid LIMIT ${PAGE_SIZE}`,
      args: [lastRowid as unknown as InValue],
    });
    if (result.rows.length === 0) break;
    const columns = result.columns
      .filter((column) => column !== '__dump_rowid__')
      .map(quoteIdent)
      .join(', ');
    for (const row of result.rows) {
      const values = Array.from(row).slice(1).map(sqlQuoteValue).join(', ');
      write(`INSERT INTO ${quotedTable} (${columns}) VALUES (${values});`);
    }
    total += result.rows.length;
    const rowidValue = (result.rows[result.rows.length - 1] as unknown as Record<string, unknown>)[
      '__dump_rowid__'
    ];
    lastRowid = typeof rowidValue === 'bigint' ? rowidValue : BigInt(Number(rowidValue));
    if (result.rows.length < PAGE_SIZE) break;
  }
  return total;
}

async function countTable(client: Client, table: string): Promise<number> {
  const result = await client.execute(`SELECT COUNT(*) AS n FROM ${quoteIdent(table)}`);
  return Number(result.rows[0]?.n ?? 0);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
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

  const tables = await listTables(source);
  const indexes = await listIndexes(source);
  console.log(`[turso-dump] source=${url} tables=${tables.length} indexes=${indexes.length}`);

  const statements: string[] = [];
  for (const table of tables) statements.push(`${table.createSql};`);
  for (const index of indexes) statements.push(`${index};`);

  const dumped: DumpedTable[] = [];
  for (const table of tables) {
    const rowCount = await dumpTableRows(source, table.name, (statement) =>
      statements.push(statement)
    );
    dumped.push({ name: table.name, rowCount });
    console.log(`[turso-dump] ${table.name}: ${rowCount} rows`);
  }

  // Restore verification: replay into an in-memory database (libsql batch in
  // 'write' mode already runs as a transaction) and compare per-table counts.
  // A dump that fails this is never written to disk.
  const verify = createClient({ url: ':memory:' });
  for (const batch of chunk(statements, VERIFY_BATCH)) {
    await verify.batch(batch, 'write');
  }
  let mismatches = 0;
  for (const { name, rowCount } of dumped) {
    const restored = await countTable(verify, name);
    if (restored !== rowCount) {
      console.error(`[turso-dump] VERIFY FAILED ${name}: source=${rowCount} restored=${restored}`);
      mismatches++;
    }
  }
  if (mismatches > 0) {
    throw new Error(`Restore verification failed for ${mismatches} table(s); no dump written`);
  }

  const totalRows = dumped.reduce((sum, t) => sum + t.rowCount, 0);
  const header = [
    `-- Turso ops data-plane logical dump`,
    `-- source: ${url}`,
    `-- generated: ${new Date().toISOString()}`,
    `-- tables: ${dumped.length}, rows: ${totalRows}`,
    `-- restore: sqlite3 <file> (statements are transaction-wrapped)`,
    '',
  ].join('\n');
  const body = ['BEGIN TRANSACTION;', ...statements, 'COMMIT;'].join('\n') + '\n';
  writeFileSync(outputPath, header + body);
  console.log(
    `[turso-dump] verify OK (${dumped.length} tables, ${totalRows} rows); wrote ${outputPath}`
  );
}

main().catch((error) => {
  console.error('[turso-dump] FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
