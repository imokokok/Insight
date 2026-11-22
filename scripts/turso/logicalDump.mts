import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { createClient, type Client, type InValue } from '@libsql/client';

const INITIAL_PAGE_SIZE = 500;
const VERIFY_BATCH_SIZE = 100;
const MAX_PENDING_BYTES = 1024 * 1024;

interface TableEntry {
  name: string;
  createSql: string;
}

export interface DumpedTable {
  name: string;
  rowCount: number;
}

export interface LogicalDumpOptions {
  pageSize?: number;
  verifyBatchSize?: number;
  header?: string;
}

function sqlQuoteText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlQuoteValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value);
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite number cannot be dumped: ${value}`);
    }
    return String(value);
  }
  if (typeof value === 'bigint') return String(value);
  if (value instanceof ArrayBuffer) return `X'${Buffer.from(value).toString('hex')}'`;
  if (ArrayBuffer.isView(value)) {
    return `X'${Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('hex')}'`;
  }
  if (typeof value === 'string') return sqlQuoteText(value);
  throw new Error(`Unsupported column type: ${typeof value}`);
}

function quoteIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isResponseResourceExhausted(error: unknown): boolean {
  return /resource exhausted|mem_hrana_response/i.test(errorMessage(error));
}

async function listTables(client: Client): Promise<TableEntry[]> {
  const result = await client.execute(
    "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid"
  );
  return result.rows.map((row) => ({ name: String(row.name), createSql: String(row.sql) }));
}

async function listIndexes(client: Client): Promise<string[]> {
  const result = await client.execute(
    "SELECT sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL ORDER BY rowid"
  );
  return result.rows.map((row) => String(row.sql));
}

function toBigInt(value: unknown, table: string): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
  throw new Error(`Invalid rowid returned while dumping ${table}`);
}

async function dumpTableRows(
  client: Client,
  table: string,
  initialPageSize: number,
  write: (statement: string) => Promise<void>
): Promise<number> {
  const quotedTable = quoteIdent(table);
  let lastRowid = 0n;
  let total = 0;
  let pageSize = initialPageSize;

  for (;;) {
    let rows;
    let columns: string[];
    try {
      const result = await client.execute({
        sql: `SELECT rowid AS __dump_rowid__, * FROM ${quotedTable} WHERE rowid > ? ORDER BY rowid LIMIT ${pageSize}`,
        args: [lastRowid as unknown as InValue],
      });
      rows = result.rows;
      columns = result.columns;
    } catch (error) {
      if (isResponseResourceExhausted(error) && pageSize > 1) {
        pageSize = Math.max(1, Math.floor(pageSize / 2));
        console.warn(
          `[turso-dump] ${table}: response limit hit; retrying with page size ${pageSize}`
        );
        continue;
      }
      throw new Error(
        `Failed to read ${table} after rowid ${lastRowid} (page size ${pageSize}): ${errorMessage(error)}`
      );
    }

    if (rows.length === 0) break;
    const columnsSql = columns
      .filter((column) => column !== '__dump_rowid__')
      .map(quoteIdent)
      .join(', ');
    for (const row of rows) {
      const values = Array.from(row).slice(1).map(sqlQuoteValue).join(', ');
      await write(`INSERT INTO ${quotedTable} (${columnsSql}) VALUES (${values});`);
    }
    total += rows.length;
    const lastRow = rows[rows.length - 1] as unknown as Record<string, unknown>;
    lastRowid = toBigInt(lastRow.__dump_rowid__, table);
    if (rows.length < pageSize) break;
  }
  return total;
}

async function countTable(client: Client, table: string): Promise<number> {
  const result = await client.execute(`SELECT COUNT(*) AS n FROM ${quoteIdent(table)}`);
  return Number(result.rows[0]?.n ?? 0);
}

/**
 * Writes a bounded-memory logical dump, then replays it into a temporary
 * disk-backed SQLite database and compares table counts before publishing it.
 * Remote page reads shrink adaptively on Turso's response memory limit.
 */
export async function dumpTursoDatabase(
  source: Client,
  outputPath: string,
  options: LogicalDumpOptions = {}
): Promise<DumpedTable[]> {
  const pageSize = options.pageSize ?? INITIAL_PAGE_SIZE;
  const verifyBatchSize = options.verifyBatchSize ?? VERIFY_BATCH_SIZE;
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new Error('pageSize must be positive');
  if (!Number.isSafeInteger(verifyBatchSize) || verifyBatchSize < 1) {
    throw new Error('verifyBatchSize must be positive');
  }

  const tables = await listTables(source);
  const indexes = await listIndexes(source);
  const tempDir = mkdtempSync(join(tmpdir(), 'turso-logical-dump-'));
  const tempDatabase = join(tempDir, 'verify.db');
  const partialDump = `${outputPath}.${randomUUID()}.partial`;
  const verify = createClient({ url: `file:${tempDatabase}` });
  const statements: string[] = [];
  let pendingBytes = 0;
  let dumped: DumpedTable[] = [];

  const flush = async (): Promise<void> => {
    if (statements.length === 0) return;
    appendFileSync(partialDump, `${statements.join('\n')}\n`);
    await verify.batch(statements, 'write');
    statements.length = 0;
    pendingBytes = 0;
  };
  const addStatement = async (statement: string): Promise<void> => {
    statements.push(statement);
    pendingBytes += Buffer.byteLength(statement) + 1;
    if (statements.length >= verifyBatchSize || pendingBytes >= MAX_PENDING_BYTES) await flush();
  };

  try {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(partialDump, `${options.header ?? ''}BEGIN TRANSACTION;\n`);
    for (const table of tables) await addStatement(`${table.createSql};`);
    for (const index of indexes) await addStatement(`${index};`);

    dumped = [];
    for (const table of tables) {
      const rowCount = await dumpTableRows(source, table.name, pageSize, addStatement);
      dumped.push({ name: table.name, rowCount });
      console.log(`[turso-dump] ${table.name}: ${rowCount} rows`);
    }
    await flush();

    let mismatches = 0;
    for (const { name, rowCount } of dumped) {
      const restored = await countTable(verify, name);
      if (restored !== rowCount) {
        console.error(
          `[turso-dump] VERIFY FAILED ${name}: source=${rowCount} restored=${restored}`
        );
        mismatches++;
      }
    }
    if (mismatches > 0) {
      throw new Error(`Restore verification failed for ${mismatches} table(s); no dump published`);
    }

    appendFileSync(partialDump, 'COMMIT;\n');
    renameSync(partialDump, outputPath);
    const totalRows = dumped.reduce((sum, table) => sum + table.rowCount, 0);
    console.log(
      `[turso-dump] verify OK (${dumped.length} tables, ${totalRows} rows); wrote ${outputPath}`
    );
    return dumped;
  } catch (error) {
    rmSync(partialDump, { force: true });
    throw error;
  } finally {
    await verify.close();
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export const logicalDumpInternals = { dumpTableRows, sqlQuoteValue };
