import { z } from 'zod';

import type { SupabaseClient } from '@supabase/supabase-js';

const timestamp = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const fields = {
  id: z.number().int().positive().safe(),
  snapshot_ts: timestamp,
  snapshot_hour: timestamp,
  provider: z.string().min(1),
  symbol: z.string().min(1),
  chain_id: z.number().int().nonnegative(),
  price: z.number().finite(),
  consensus_price: z.number().finite().nullable(),
  deviation_pct: z.number().finite().nullable(),
  latency_ms: z.number().finite().nullable(),
  data_age_seconds: z.number().int().nullable(),
  confidence: z.number().finite().nullable(),
  is_success: z.boolean(),
  error_message: z.string().nullable(),
  created_at: timestamp.nullable(),
};
type Column = keyof typeof fields;
type Snapshot = z.infer<z.ZodObject<typeof fields>>;

interface PageOptions {
  providers?: string[];
  symbol?: string;
  chainId?: number;
  successOnly?: boolean;
  ascending?: boolean;
  limit?: number;
  offset?: number;
  inclusiveBefore?: boolean;
}

/** The database expands only dates needed for this page, with hot rows preferred. */
export async function loadSnapshotHistoryPage<C extends Column>(
  client: SupabaseClient,
  kind: 'price' | 'hourly',
  from: string,
  before: string,
  columns: readonly C[],
  options: PageOptions = {}
): Promise<Pick<Snapshot, C>[]> {
  const start = Date.parse(from);
  const end = Date.parse(before);
  const limit = options.limit ?? 1000;
  const offset = options.offset ?? 0;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 10001 ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    columns.length === 0 ||
    columns.some((column) => !Object.hasOwn(fields, column))
  ) {
    throw new Error('Invalid snapshot history page');
  }
  const time = kind === 'price' ? 'snapshot_ts' : 'snapshot_hour';
  const selected: Column[] = [
    ...new Set<Column>([
      ...columns,
      'id',
      time,
      'provider',
      'symbol',
      'chain_id',
      ...(options.successOnly ? (['price', 'is_success'] as const) : []),
    ]),
  ];
  const schema = z.object(Object.fromEntries(selected.map((column) => [column, fields[column]])));
  const { data, error } = await client
    .rpc('get_snapshot_history_page', {
      p_kind: kind,
      p_from: from,
      p_before: before,
      p_columns: selected,
      p_providers: options.providers ?? null,
      p_symbol: options.symbol ?? null,
      p_chain_id: options.chainId ?? null,
      p_success_only: options.successOnly ?? false,
      p_ascending: options.ascending ?? false,
      p_limit: limit,
      p_offset: offset,
      p_inclusive_before: options.inclusiveBefore ?? false,
    })
    .abortSignal(AbortSignal.timeout(30_000));
  if (error) throw new Error(`Snapshot history read failed: ${error.message}`);
  const rows = z.array(schema).max(limit).parse(data);
  const ids = new Set<number>();
  let previous: { time: number; id: number } | undefined;
  return rows.map((raw) => {
    const row = raw as Pick<Snapshot, C> & Snapshot;
    const at = Date.parse(row[time]);
    if (
      at < start ||
      at > end ||
      (!options.inclusiveBefore && at === end) ||
      (options.providers && !options.providers.includes(row.provider)) ||
      (options.symbol !== undefined && row.symbol !== options.symbol) ||
      (options.chainId !== undefined && row.chain_id !== options.chainId) ||
      (options.successOnly && (!row.is_success || !(row.price! > 0))) ||
      ids.has(row.id) ||
      (previous &&
        (options.ascending
          ? at < previous.time || (at === previous.time && row.id <= previous.id)
          : at > previous.time || (at === previous.time && row.id >= previous.id)))
    )
      throw new Error('Snapshot history identity, order or window mismatch');
    ids.add(row.id);
    previous = { time: at, id: row.id };
    return Object.fromEntries(columns.map((column) => [column, row[column]])) as Pick<Snapshot, C>;
  });
}

export async function loadSnapshotHistoryRange<C extends Column>(
  client: SupabaseClient,
  kind: 'price' | 'hourly',
  from: string,
  before: string,
  columns: readonly C[],
  options: Omit<PageOptions, 'offset'> = {}
): Promise<Pick<Snapshot, C>[]> {
  const maximum = options.limit ?? Number.MAX_SAFE_INTEGER;
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new Error('Invalid history limit');
  const rows: Pick<Snapshot, C>[] = [];
  while (rows.length < maximum) {
    const limit = Math.min(10000, maximum - rows.length);
    const page = await loadSnapshotHistoryPage(client, kind, from, before, columns, {
      ...options,
      limit,
      offset: rows.length,
    });
    rows.push(...page);
    if (page.length < limit) break;
  }
  return rows;
}

export async function loadSnapshotUptime(
  client: SupabaseClient,
  from: string,
  before: string,
  provider?: string,
  symbol?: string
) {
  if (!Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(before))) {
    throw new Error('Invalid uptime window');
  }
  const { data, error } = await client
    .rpc('get_snapshot_uptime', {
      p_from: from,
      p_before: before,
      p_providers: provider ? [provider] : null,
      p_symbol: symbol ?? null,
    })
    .abortSignal(AbortSignal.timeout(30_000));
  if (error) throw new Error(`Snapshot uptime read failed: ${error.message}`);
  const count = z.number().int().nonnegative().safe();
  const rows = z
    .array(
      z
        .object({
          provider: z.string().min(1),
          symbol: z.string().min(1),
          snapshots: count,
          successes: count,
          hours: count,
        })
        .refine(
          (row) =>
            row.successes <= row.snapshots &&
            row.hours <= row.snapshots &&
            (provider === undefined || row.provider === provider) &&
            (symbol === undefined || row.symbol === symbol)
        )
    )
    .parse(data);
  if (new Set(rows.map((row) => JSON.stringify([row.provider, row.symbol]))).size !== rows.length) {
    throw new Error('Duplicate snapshot uptime identity');
  }
  return rows;
}
