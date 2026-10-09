import { getIncidentAggregation } from '@/lib/api/services/incidentService';
import { getAllActiveFeedsByProviderWithStatus } from '@/lib/oracles/utils/dynamicFeedResolver';
import { ORACLE_WATCH_HISTORY_UNIVERSE } from '@/lib/reports/oracleWatchUniverse';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { get7dAgoUtc, getTodayUtc } from '@/lib/utils/date';
import { roundTo } from '@/lib/utils/format';

// All queries here run with the service-role client (bypass RLS) and are meant
// for the internal /ops console only. Aggregation is done in TS (not SQL) so no
// new migration is required — these read the existing 0025/0026 columns directly.

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function ageMinutes(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

// Row shapes for the paginated aggregations below. Kept narrow to what we select.
interface PreTradeCheckRow {
  created_at: string;
  signed: boolean;
  verdict: string | null;
  coverage_status: string | null;
  unresolved_asset: string | null;
  attester: string | null;
  schema_version: number | null;
}

interface ApiUsageRow {
  endpoint: string;
  status_code: number;
  response_time_ms: number | null;
  created_at: string;
}

/**
 * Page through a Supabase query that would otherwise be SILENTLY truncated at
 * the PostgREST `max_rows` cap (1000 in this project — see supabase/config.toml).
 *
 * supabase-js does NOT auto-paginate and does NOT warn when rows are truncated,
 * so a bare `.select().gte(...)` on a high-volume table (api_key_usage,
 * oracle_feeds with 1030 rows, pre_trade_checks) returns only the first 1000
 * rows and the /ops console would render undercounted, misleading numbers. We
 * loop `.range(from, to)` until a short page or an empty result, accumulating
 * every matching row. Filter + order MUST be applied inside `buildPage` so each
 * page is deterministic.
 */
const PAGE_SIZE = 1000;

export async function pagedSelect<T>(
  buildPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildPage(from, to);
    if (error) return { data: all, error };
    if (!data || data.length === 0) return { data: all, error: null };
    all.push(...data);
    if (data.length < PAGE_SIZE) return { data: all, error: null };
    from += PAGE_SIZE;
  }
}

// ---------------------------------------------------------------------------
// Signing integrity (pre_trade_checks + 0026 provenance columns)
// ---------------------------------------------------------------------------

export interface SigningIntegritySummary {
  windowHours: number;
  total: number;
  signed: number;
  unsigned: number;
  signedRatePct: number | null;
  unsignedBlocks: number;
  insufficientCoverage: number;
  unresolvedAssets: number;
  distinctAttesters: number;
  v1Rows: number;
  v2Rows: number;
  v3Rows: number;
  /** True when the underlying query failed — numbers above are incomplete/unreliable. */
  errored?: boolean;
}

export interface SigningTrendPoint {
  hour: string;
  signed: number;
  unsigned: number;
}

export interface UnsignedBlockRow {
  id: string;
  created_at: string;
  asset: string;
  chain_id: number;
  action: string;
  verdict: string;
  coverage_status: string | null;
  attester: string | null;
  schema_version: number | null;
}

export interface SigningIntegrity {
  summary: SigningIntegritySummary;
  trend: SigningTrendPoint[];
  unsignedBlocks: UnsignedBlockRow[];
}

export async function getSigningIntegrity(windowHours = 24): Promise<SigningIntegrity> {
  const supabase = createServiceRoleClient();
  const since = hoursAgoIso(windowHours);

  const { data, error } = await pagedSelect<PreTradeCheckRow>((from, to) =>
    supabase
      .from('pre_trade_checks')
      .select(
        'created_at, signed, verdict, coverage_status, unresolved_asset, attester, schema_version'
      )
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(from, to)
  );

  if (error || !data) {
    return {
      summary: {
        windowHours,
        total: 0,
        signed: 0,
        unsigned: 0,
        signedRatePct: null,
        unsignedBlocks: 0,
        insufficientCoverage: 0,
        unresolvedAssets: 0,
        distinctAttesters: 0,
        v1Rows: 0,
        v2Rows: 0,
        v3Rows: 0,
        errored: true,
      },
      trend: [],
      unsignedBlocks: [],
    };
  }

  const attesters = new Set<string>();
  let signed = 0;
  let unsigned = 0;
  let unsignedBlocks = 0;
  let insufficientCoverage = 0;
  let unresolvedAssets = 0;
  let v1Rows = 0;
  let v2Rows = 0;
  let v3Rows = 0;
  const buckets = new Map<string, { signed: number; unsigned: number }>();

  for (const row of data) {
    if (row.signed) {
      signed++;
      if (row.attester) attesters.add(row.attester);
    } else {
      unsigned++;
    }
    if (row.verdict === 'BLOCK' && !row.signed) unsignedBlocks++;
    if (row.coverage_status === 'INSUFFICIENT') insufficientCoverage++;
    if (row.unresolved_asset) unresolvedAssets++;
    if (row.schema_version === 3) v3Rows++;
    else if (row.schema_version === 2) v2Rows++;
    else if (row.schema_version === 1) v1Rows++;

    const hour = new Date(row.created_at).toISOString().slice(0, 13);
    const bucket = buckets.get(hour) ?? { signed: 0, unsigned: 0 };
    if (row.signed) bucket.signed++;
    else bucket.unsigned++;
    buckets.set(hour, bucket);
  }

  const trend: SigningTrendPoint[] = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, v]) => ({ hour, signed: v.signed, unsigned: v.unsigned }));

  return {
    summary: {
      windowHours,
      total: data.length,
      signed,
      unsigned,
      signedRatePct: data.length > 0 ? roundTo((signed / data.length) * 100, 1) : null,
      unsignedBlocks,
      insufficientCoverage,
      unresolvedAssets,
      distinctAttesters: attesters.size,
      v1Rows,
      v2Rows,
      v3Rows,
    },
    trend,
    unsignedBlocks: await getUnsignedBlocks(),
  };
}

async function getUnsignedBlocks(limit = 100): Promise<UnsignedBlockRow[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('pre_trade_checks')
    .select(
      'id, created_at, asset, chain_id, action, verdict, coverage_status, attester, schema_version'
    )
    .eq('signed', false)
    .eq('verdict', 'BLOCK')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as UnsignedBlockRow[];
}

// ---------------------------------------------------------------------------
// Feed health (oracle_feeds + 0025 observability columns)
// ---------------------------------------------------------------------------

export interface FeedHealthSummary {
  total: number;
  active: number;
  inactive: number;
  byReason: Record<string, number>;
  failingFeeds: number;
  staleFeeds: number;
  rediscoverQueue: number;
  /** True when the underlying query failed — counts above are incomplete/unreliable. */
  errored?: boolean;
}

export interface FeedRow {
  provider: string;
  symbol: string;
  chain_id: number;
  consecutive_failures: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  deactivated_reason: string | null;
  absent_discovery_runs: number;
  is_active: boolean;
}

export interface FeedHealth {
  summary: FeedHealthSummary;
  problemFeeds: FeedRow[];
}

const STALE_FEED_MINUTES = 120;

export async function getFeedHealth(limit = 200): Promise<FeedHealth> {
  const supabase = createServiceRoleClient();
  const { data, error } = await pagedSelect<FeedRow>((from, to) =>
    supabase
      .from('oracle_feeds')
      .select(
        'provider, symbol, chain_id, is_active, consecutive_failures, last_success_at, last_failure_at, deactivated_reason, absent_discovery_runs'
      )
      .order('provider', { ascending: true })
      .range(from, to)
  );

  if (error || !data) {
    return {
      summary: {
        total: 0,
        active: 0,
        inactive: 0,
        byReason: {},
        failingFeeds: 0,
        staleFeeds: 0,
        rediscoverQueue: 0,
        errored: true,
      },
      problemFeeds: [],
    };
  }

  const byReason: Record<string, number> = {};
  let active = 0;
  let inactive = 0;
  let failingFeeds = 0;
  let staleFeeds = 0;
  let rediscoverQueue = 0;
  const problemFeeds: FeedRow[] = [];

  for (const f of data) {
    if (f.is_active) active++;
    else {
      inactive++;
      const reason = f.deactivated_reason ?? 'unknown';
      byReason[reason] = (byReason[reason] ?? 0) + 1;
    }
    if (f.absent_discovery_runs > 0) rediscoverQueue++;
    const isFailing = f.consecutive_failures > 0;
    const isStale =
      f.is_active &&
      f.last_success_at != null &&
      ageMinutes(f.last_success_at) != null &&
      ageMinutes(f.last_success_at)! > STALE_FEED_MINUTES;
    if (isFailing) failingFeeds++;
    if (isStale) staleFeeds++;
    if (!f.is_active || isFailing || isStale) {
      problemFeeds.push({
        provider: f.provider,
        symbol: f.symbol,
        chain_id: f.chain_id,
        consecutive_failures: f.consecutive_failures,
        last_success_at: f.last_success_at,
        last_failure_at: f.last_failure_at,
        deactivated_reason: f.deactivated_reason,
        absent_discovery_runs: f.absent_discovery_runs,
        is_active: f.is_active,
      });
    }
  }

  problemFeeds.sort((a, b) => b.consecutive_failures - a.consecutive_failures);
  const summary: FeedHealthSummary = {
    total: data.length,
    active,
    inactive,
    byReason,
    failingFeeds,
    staleFeeds,
    rediscoverQueue,
  };
  return { summary, problemFeeds: problemFeeds.slice(0, limit) };
}

// ---------------------------------------------------------------------------
// API usage (api_key_usage)
// ---------------------------------------------------------------------------

export interface UsageByHour {
  hour: string;
  requests: number;
  errors: number;
  p50: number | null;
  p95: number | null;
  p99: number | null;
}

export interface UsageByEndpoint {
  endpoint: string;
  requests: number;
  errors: number;
  avgMs: number | null;
}

export interface ApiUsage {
  windowHours: number;
  totalRequests: number;
  totalErrors: number;
  errorRatePct: number | null;
  byHour: UsageByHour[];
  byEndpoint: UsageByEndpoint[];
  /** True when the underlying query failed — totals above are incomplete/unreliable. */
  errored?: boolean;
}

export async function getApiUsage(windowHours = 24): Promise<ApiUsage> {
  const supabase = createServiceRoleClient();
  const since = hoursAgoIso(windowHours);

  const { data, error } = await pagedSelect<ApiUsageRow>((from, to) =>
    supabase
      .from('api_key_usage')
      .select('endpoint, status_code, response_time_ms, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(from, to)
  );

  if (error || !data) {
    return {
      windowHours,
      totalRequests: 0,
      totalErrors: 0,
      errorRatePct: null,
      byHour: [],
      byEndpoint: [],
      errored: true,
    };
  }

  const hours = new Map<string, { requests: number; errors: number; latencies: number[] }>();
  const endpoints = new Map<string, { requests: number; errors: number; latencies: number[] }>();
  let totalRequests = 0;
  let totalErrors = 0;

  for (const row of data) {
    totalRequests++;
    const isError = row.status_code >= 500;
    if (isError) totalErrors++;

    const hour = new Date(row.created_at).toISOString().slice(0, 13);
    const h = hours.get(hour) ?? { requests: 0, errors: 0, latencies: [] };
    h.requests++;
    if (isError) h.errors++;
    if (typeof row.response_time_ms === 'number') h.latencies.push(row.response_time_ms);
    hours.set(hour, h);

    const ep = endpoints.get(row.endpoint) ?? { requests: 0, errors: 0, latencies: [] };
    ep.requests++;
    if (isError) ep.errors++;
    if (typeof row.response_time_ms === 'number') ep.latencies.push(row.response_time_ms);
    endpoints.set(row.endpoint, ep);
  }

  const byHour: UsageByHour[] = Array.from(hours.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, v]) => ({
      hour,
      requests: v.requests,
      errors: v.errors,
      p50: percentile(v.latencies, 50),
      p95: percentile(v.latencies, 95),
      p99: percentile(v.latencies, 99),
    }));

  const byEndpoint: UsageByEndpoint[] = Array.from(endpoints.entries())
    .map(([endpoint, v]) => ({
      endpoint,
      requests: v.requests,
      errors: v.errors,
      avgMs: v.latencies.length
        ? roundTo(v.latencies.reduce((s, n) => s + n, 0) / v.latencies.length, 1)
        : null,
    }))
    .sort((a, b) => b.requests - a.requests);

  return {
    windowHours,
    totalRequests,
    totalErrors,
    errorRatePct: totalRequests > 0 ? roundTo((totalErrors / totalRequests) * 100, 2) : null,
    byHour,
    byEndpoint,
  };
}

// ---------------------------------------------------------------------------
// Cron / pipeline freshness (derived from output-table latest rows)
// ---------------------------------------------------------------------------

export interface CronJob {
  name: string;
  table: string;
  column: string;
  lastRunAt: string | null;
  ageMinutes: number | null;
  staleThresholdMinutes: number;
  stale: boolean;
}

export interface CronHealth {
  jobs: CronJob[];
  /** True when any pipeline freshness query failed — treat freshness as unknown. */
  errored?: boolean;
}

export interface CronDispatchRun {
  id: string;
  workflowFile: string;
  scheduledFor: string;
  source: 'supabase_cron' | 'github_fallback' | 'manual';
  status: 'dispatching' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timed_out';
  githubRunUrl: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CronDispatchHistory {
  runs: CronDispatchRun[];
  /** True before migration 0045 is applied or when the ledger query fails. */
  errored: boolean;
}

async function latestTimestamp(
  table: string,
  column: string
): Promise<{ value: string | null; errored: boolean }> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .order(column, { ascending: false })
    .limit(1);
  // Distinguish a real query failure from "genuinely no rows" so the console can
  // show an error instead of a misleading green "fresh" signal.
  if (error) return { value: null, errored: true };
  if (!data || data.length === 0) return { value: null, errored: false };
  const value = (data[0] as unknown as Record<string, unknown>)[column];
  if (value == null) return { value: null, errored: false };
  // hourly_price_snapshots.snapshot_hour is a timestamptz; daily_reports.report_date is a date.
  return { value: String(value), errored: false };
}

export async function getCronHealth(): Promise<CronHealth> {
  const jobs: CronJob[] = [];

  const [snapshot, report, reputation, checks] = await Promise.all([
    latestTimestamp('hourly_price_snapshots', 'snapshot_hour'),
    latestTimestamp('daily_reports', 'report_date'),
    latestTimestamp('oracle_reputation', 'last_calculated_at'),
    latestTimestamp('pre_trade_checks', 'created_at'),
  ]);

  const errored = [snapshot, report, reputation, checks].some((r) => r.errored);

  const mk = (
    name: string,
    table: string,
    column: string,
    last: string | null,
    threshold: number
  ): CronJob => {
    const age = ageMinutes(last);
    return {
      name,
      table,
      column,
      lastRunAt: last,
      ageMinutes: age,
      staleThresholdMinutes: threshold,
      // No output is unknown/unhealthy, never "fresh". Query failures are
      // additionally surfaced through CronHealth.errored.
      stale: age == null || age > threshold,
    };
  };

  jobs.push(
    mk('Snapshot collection (15m)', 'hourly_price_snapshots', 'snapshot_hour', snapshot.value, 90)
  );
  jobs.push(mk('Daily report (24h)', 'daily_reports', 'report_date', report.value, 26 * 60));
  jobs.push(
    mk('Reputation recalc (1h)', 'oracle_reputation', 'last_calculated_at', reputation.value, 90)
  );
  jobs.push(mk('Pre-trade checks (live)', 'pre_trade_checks', 'created_at', checks.value, 24 * 60));

  return { jobs, errored };
}

/** End-to-end scheduler history. Output freshness above remains the final
 * product-health signal; this ledger identifies whether a failure occurred in
 * Supabase dispatch, GitHub queueing, or the runner itself. */
export async function getCronDispatchHistory(limit = 30): Promise<CronDispatchHistory> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('cron_dispatch_runs')
    .select(
      'id, workflow_file, scheduled_for, source, status, github_run_url, started_at, completed_at'
    )
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));

  if (error || !data) return { runs: [], errored: true };

  return {
    runs: data.map((row) => ({
      id: String(row.id),
      workflowFile: String(row.workflow_file),
      scheduledFor: String(row.scheduled_for),
      source: row.source as CronDispatchRun['source'],
      status: row.status as CronDispatchRun['status'],
      githubRunUrl: row.github_run_url ? String(row.github_run_url) : null,
      startedAt: row.started_at ? String(row.started_at) : null,
      completedAt: row.completed_at ? String(row.completed_at) : null,
    })),
    errored: false,
  };
}

// ---------------------------------------------------------------------------
// Credit ledger (credit_ledger) — per-call credit economics for ops
// ---------------------------------------------------------------------------

export interface CreditUsage {
  windowHours: number;
  /** Credits consumed by usage charges (kind='usage', negative delta). */
  totalSpent: number;
  /** Credits added by topups + grants (positive delta). */
  totalCredited: number;
  /** totalCredited - totalSpent. */
  net: number;
  /** Number of billed (credit-charged) calls. */
  billedCalls: number;
  /** True when the query failed (e.g. migration 0039 not applied) — unreliable. */
  errored?: boolean;
}

export async function getCreditUsage(windowHours = 24): Promise<CreditUsage> {
  const supabase = createServiceRoleClient();
  const since = hoursAgoIso(windowHours);

  const { data, error } = await pagedSelect<{ delta: number; kind: string }>((from, to) =>
    supabase
      .from('credit_ledger')
      .select('delta, kind')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(from, to)
  );

  if (error || !data) {
    return {
      windowHours,
      totalSpent: 0,
      totalCredited: 0,
      net: 0,
      billedCalls: 0,
      errored: true,
    };
  }

  let spent = 0;
  let credited = 0;
  let billedCalls = 0;
  for (const row of data) {
    const delta = Number(row.delta);
    if (row.kind === 'usage' && delta < 0) {
      spent += -delta;
      billedCalls++;
    } else if (row.kind === 'refund' && delta < 0) {
      // Refund clawbacks reverse previously credited funds; include them in
      // net issuance without counting them as billed API calls.
      credited += delta;
    } else if (delta > 0) {
      credited += delta;
    }
  }

  return {
    windowHours,
    totalSpent: roundTo(spent, 2),
    totalCredited: roundTo(credited, 2),
    net: roundTo(credited - spent, 2),
    billedCalls,
  };
}

// ---------------------------------------------------------------------------
// Billing summary (api_keys)
// ---------------------------------------------------------------------------

export interface BillingSummary {
  totalKeys: number;
  activeKeys: number;
  byPlan: Record<string, number>;
  byRateLimit: Record<string, number>;
  /** True when the database query failed; zero counts are then placeholders. */
  errored?: boolean;
}

export async function getBillingSummary(): Promise<BillingSummary> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from('api_keys').select('plan, rate_limit, is_active');

  if (error || !data) {
    return { totalKeys: 0, activeKeys: 0, byPlan: {}, byRateLimit: {}, errored: true };
  }

  const byPlan: Record<string, number> = {};
  const byRateLimit: Record<string, number> = {};
  let activeKeys = 0;
  for (const k of data) {
    byPlan[k.plan] = (byPlan[k.plan] ?? 0) + 1;
    byRateLimit[String(k.rate_limit)] = (byRateLimit[String(k.rate_limit)] ?? 0) + 1;
    if (k.is_active) activeKeys++;
  }
  return { totalKeys: data.length, activeKeys, byPlan, byRateLimit };
}

// ---------------------------------------------------------------------------
// x402 lifecycle and settlement operations
// ---------------------------------------------------------------------------

export interface X402OpsRow {
  id: string;
  requestId: string;
  createdAt: string;
  status: string;
  protocol: 'x402' | 'mpp';
  surface: 'rest' | 'mcp' | 'legacy';
  resource: string | null;
  network: string;
  amountUsdc: number | null;
  payer: string | null;
  txHash: string | null;
  responseTimeMs: number | null;
  errorReason: string | null;
}

export interface X402OpsResourceSummary {
  protocol: 'x402' | 'mpp';
  surface: string;
  resource: string;
  quotes: number;
  verified: number;
  businessSucceeded: number;
  businessFailed: number;
  settled: number;
  settlementFailed: number;
  grossUsdc: number;
  avgResponseMs: number | null;
}

export interface X402OpsTrendPoint {
  hour: string;
  quotes: number;
  verified: number;
  settled: number;
  grossUsdc: number;
}

export interface X402Ops {
  windowHours: number;
  quotes: number;
  paymentRejected: number;
  verified: number;
  businessSucceeded: number;
  businessFailed: number;
  settled: number;
  lifecycleSettled: number;
  settlementFailed: number;
  lifecycleSettlementFailed: number;
  grossUsdc: number;
  uniquePayers: number;
  repeatPayers: number;
  avgResponseMs: number | null;
  p95ResponseMs: number | null;
  quoteToVerifiedPct: number | null;
  verificationToBusinessPct: number | null;
  businessToSettlementPct: number | null;
  byResource: X402OpsResourceSummary[];
  byHour: X402OpsTrendPoint[];
  recent: X402OpsRow[];
  errored?: boolean;
}

interface X402OpsDbRow {
  id: string;
  request_id: string;
  created_at: string;
  status: string;
  protocol: string | null;
  surface: string | null;
  resource: string | null;
  network: string;
  amount_usdc: number | string | null;
  payer: string | null;
  tx_hash: string | null;
  response_time_ms: number | null;
  error_reason: string | null;
}

function asUsdc(value: number | string | null): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function countDistinctRequestIds(rows: X402OpsDbRow[], status: string): number {
  return new Set(rows.filter((row) => row.status === status).map((row) => row.request_id)).size;
}

function percentage(numerator: number, denominator: number): number | null {
  return denominator > 0 ? roundTo((numerator / denominator) * 100, 1) : null;
}

export async function getX402Ops(windowHours = 24): Promise<X402Ops> {
  const supabase = createServiceRoleClient();
  const since = hoursAgoIso(windowHours);
  const { data, error } = await pagedSelect<X402OpsDbRow>((from, to) =>
    supabase
      .from('x402_settlements')
      .select(
        'id, request_id, created_at, status, protocol, surface, resource, network, amount_usdc, payer, tx_hash, response_time_ms, error_reason'
      )
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(from, to)
  );

  const recentResult = await supabase
    .from('x402_settlements')
    .select(
      'id, request_id, created_at, status, protocol, surface, resource, network, amount_usdc, payer, tx_hash, response_time_ms, error_reason'
    )
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100);

  const empty: X402Ops = {
    windowHours,
    quotes: 0,
    paymentRejected: 0,
    verified: 0,
    businessSucceeded: 0,
    businessFailed: 0,
    settled: 0,
    lifecycleSettled: 0,
    settlementFailed: 0,
    lifecycleSettlementFailed: 0,
    grossUsdc: 0,
    uniquePayers: 0,
    repeatPayers: 0,
    avgResponseMs: null,
    p95ResponseMs: null,
    quoteToVerifiedPct: null,
    verificationToBusinessPct: null,
    businessToSettlementPct: null,
    byResource: [],
    byHour: [],
    recent: [],
  };

  if (error || !data || recentResult.error || !recentResult.data) {
    return { ...empty, errored: true };
  }

  const rows = data;
  const quotes = countDistinctRequestIds(rows, 'quote_issued');
  const instrumentedRows = rows.filter((row) => row.surface === 'rest' || row.surface === 'mcp');
  const paymentRejected = countDistinctRequestIds(instrumentedRows, 'payment_rejected');
  const verified = countDistinctRequestIds(instrumentedRows, 'payment_verified');
  const businessSucceeded = countDistinctRequestIds(instrumentedRows, 'business_succeeded');
  const businessFailed = new Set(
    instrumentedRows.filter((row) => row.status === 'business_failed').map((row) => row.request_id)
  ).size;
  const settled = countDistinctRequestIds(rows, 'settled');
  const settlementFailed = countDistinctRequestIds(rows, 'settlement_failed');
  const instrumentedSettled = countDistinctRequestIds(instrumentedRows, 'settled');
  const instrumentedSettlementFailed = countDistinctRequestIds(
    instrumentedRows,
    'settlement_failed'
  );

  let grossUsdc = 0;
  const payerCounts = new Map<string, number>();
  const responseTimes: number[] = [];
  const resources = new Map<
    string,
    {
      protocol: 'x402' | 'mpp';
      surface: string;
      resource: string;
      quotes: Set<string>;
      verified: Set<string>;
      businessSucceeded: Set<string>;
      businessFailed: Set<string>;
      settled: Set<string>;
      settlementFailed: Set<string>;
      grossUsdc: number;
      responseTimes: number[];
    }
  >();
  const hours = new Map<string, X402OpsTrendPoint>();
  const quoteRequestsByHour = new Map<string, Set<string>>();

  for (const row of rows) {
    const protocol = row.protocol === 'mpp' ? 'mpp' : 'x402';
    const surface = row.surface ?? 'legacy';
    const resource = row.resource ?? 'historical / unclassified';
    const resourceKey = `${protocol}\0${surface}\0${resource}`;
    const group = resources.get(resourceKey) ?? {
      protocol,
      surface,
      resource,
      quotes: new Set<string>(),
      verified: new Set<string>(),
      businessSucceeded: new Set<string>(),
      businessFailed: new Set<string>(),
      settled: new Set<string>(),
      settlementFailed: new Set<string>(),
      grossUsdc: 0,
      responseTimes: [],
    };

    if (row.status === 'quote_issued') group.quotes.add(row.request_id);
    if (row.status === 'payment_verified') group.verified.add(row.request_id);
    if (row.status === 'business_succeeded') {
      group.businessSucceeded.add(row.request_id);
    }
    if (row.status === 'business_failed') {
      group.businessFailed.add(row.request_id);
    }
    if (
      (row.status === 'business_succeeded' || row.status === 'business_failed') &&
      typeof row.response_time_ms === 'number'
    ) {
      responseTimes.push(row.response_time_ms);
      group.responseTimes.push(row.response_time_ms);
    }
    if (row.status === 'settled') {
      group.settled.add(row.request_id);
      const amount = asUsdc(row.amount_usdc) ?? 0;
      grossUsdc += amount;
      group.grossUsdc += amount;
      if (row.payer) payerCounts.set(row.payer, (payerCounts.get(row.payer) ?? 0) + 1);
    }
    if (row.status === 'settlement_failed') group.settlementFailed.add(row.request_id);
    resources.set(resourceKey, group);

    const hour = new Date(row.created_at).toISOString().slice(0, 13);
    const trend = hours.get(hour) ?? { hour, quotes: 0, verified: 0, settled: 0, grossUsdc: 0 };
    if (row.status === 'quote_issued') {
      const quoteRequests = quoteRequestsByHour.get(hour) ?? new Set<string>();
      if (!quoteRequests.has(row.request_id)) {
        quoteRequests.add(row.request_id);
        trend.quotes++;
        quoteRequestsByHour.set(hour, quoteRequests);
      }
    }
    if (row.status === 'payment_verified') trend.verified++;
    if (row.status === 'settled') {
      trend.settled++;
      trend.grossUsdc += asUsdc(row.amount_usdc) ?? 0;
    }
    hours.set(hour, trend);
  }

  const recent = (recentResult.data as X402OpsDbRow[]).map((row) => ({
    id: String(row.id),
    requestId: row.request_id,
    createdAt: row.created_at,
    status: row.status,
    protocol: row.protocol === 'mpp' ? 'mpp' : 'x402',
    surface: row.surface === 'rest' || row.surface === 'mcp' ? row.surface : 'legacy',
    resource: row.resource,
    network: row.network,
    amountUsdc: asUsdc(row.amount_usdc),
    payer: row.payer,
    txHash: row.tx_hash,
    responseTimeMs: row.response_time_ms,
    errorReason: row.error_reason,
  })) as X402OpsRow[];

  const payers = Array.from(payerCounts.values());
  return {
    windowHours,
    quotes,
    paymentRejected,
    verified,
    businessSucceeded,
    businessFailed,
    settled,
    lifecycleSettled: instrumentedSettled,
    settlementFailed,
    lifecycleSettlementFailed: instrumentedSettlementFailed,
    grossUsdc: roundTo(grossUsdc, 6),
    uniquePayers: payers.length,
    repeatPayers: payers.filter((count) => count > 1).length,
    avgResponseMs: responseTimes.length
      ? roundTo(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length, 1)
      : null,
    p95ResponseMs: percentile(responseTimes, 95),
    quoteToVerifiedPct: percentage(verified, quotes),
    verificationToBusinessPct: percentage(businessSucceeded, verified),
    businessToSettlementPct: percentage(instrumentedSettled, businessSucceeded),
    byResource: Array.from(resources.values())
      .map((group) => ({
        protocol: group.protocol,
        surface: group.surface,
        resource: group.resource,
        quotes: group.quotes.size,
        verified: group.verified.size,
        businessSucceeded: group.businessSucceeded.size,
        businessFailed: group.businessFailed.size,
        settled: group.settled.size,
        settlementFailed: group.settlementFailed.size,
        grossUsdc: roundTo(group.grossUsdc, 6),
        avgResponseMs: group.responseTimes.length
          ? roundTo(
              group.responseTimes.reduce((sum, value) => sum + value, 0) /
                group.responseTimes.length,
              1
            )
          : null,
      }))
      .sort((a, b) => b.grossUsdc - a.grossUsdc || b.verified - a.verified),
    byHour: Array.from(hours.values()).sort((a, b) => a.hour.localeCompare(b.hour)),
    recent,
  };
}

// ---------------------------------------------------------------------------
// Overview (composes the above)
// ---------------------------------------------------------------------------

export interface OverviewStats {
  feedsActive: number;
  feedsInactive: number;
  providers: number;
  symbols: number;
  chains: number;
  signedRatePct: number | null;
  unsignedBlocks: number;
  incidents7d: number;
  cronStale: number;
  /** True when one of the composed sub-queries failed — at least one stat is unreliable. */
  partial?: boolean;
}

export async function getOverviewStats(windowHours = 24): Promise<OverviewStats> {
  const supabase = createServiceRoleClient();
  const [feedResult, signing, incidentResult, cron, inactiveResult] = await Promise.all([
    getAllActiveFeedsByProviderWithStatus(),
    getSigningIntegrity(windowHours),
    getIncidentAggregation({ from: get7dAgoUtc(), to: getTodayUtc(), limit: 1, offset: 0 })
      .then((value) => ({ value, errored: false }))
      .catch(() => ({ value: null, errored: true })),
    getCronHealth(),
    supabase
      .from('oracle_feeds')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false),
  ]);

  const feeds = feedResult.feeds;
  const all = Array.from(feeds.values()).flat();
  const symbols = new Set(all.map((f) => f.symbol)).size;
  const chains = new Set(all.map((f) => f.chain_id)).size;

  const partial = Boolean(
    feedResult.errored ||
    signing.summary.errored ||
    incidentResult.errored ||
    cron.errored ||
    inactiveResult.error
  );

  return {
    feedsActive: all.length,
    feedsInactive: inactiveResult.count ?? 0,
    providers: feeds.size,
    symbols,
    chains,
    signedRatePct: signing.summary.signedRatePct,
    unsignedBlocks: signing.summary.unsignedBlocks,
    incidents7d: incidentResult.value?.total ?? 0,
    cronStale: cron.jobs.filter((j) => j.stale).length,
    partial,
  };
}

// ---------------------------------------------------------------------------
// Oracle Watch integrity (oracle_watch_checks + feed_health_snapshots)
// ---------------------------------------------------------------------------
//
// Two things can go silently wrong with Watch, and neither was visible before
// this section existed:
//
//   1. Signing can break while the signal keeps working. Watch signing is
//      deliberately additive — a missing key must never change a verdict — so a
//      broken attester produced perfectly healthy-looking API responses with no
//      receipt attached. `attestedRatePct` is the only way to see it.
//
//   2. The 30-min collector can stop writing while the live endpoint keeps
//      answering. `/history` then returns a short or empty series, which a
//      dependent agent reads as "quiet". `spineStale` + `universeGaps` surface
//      that as a monitoring failure rather than a feed verdict.

/**
 * Collector cadence is 30 min. Allow one missed pass plus scheduling slack
 * before declaring the spine stale — a cron job that drifts a few minutes is
 * normal, one that missed a full cycle is not.
 */
const WATCH_SPINE_STALE_MINUTES = 75;

/** Newest spine rows pulled for the freshness / universe-gap check. */
const WATCH_SPINE_LOOKBACK_ROWS = 3000;

interface OracleWatchCheckRow {
  created_at: string;
  symbol: string;
  chain: string | null;
  attested: boolean;
  verdict: string | null;
  recommendation: string | null;
  quorum_satisfied: boolean;
  independence_satisfied: boolean;
  reason_codes: string[] | null;
  uid: string | null;
}

export interface OracleWatchHaltRow {
  created_at: string;
  symbol: string;
  chain: string | null;
  verdict: string | null;
  reason_codes: string[] | null;
}

export interface OracleWatchIntegritySummary {
  windowHours: number;
  /** Judgments issued in the window (one row per oracle_watch / REST call). */
  total: number;
  /** Of those, how many carried a verifiable receipt. */
  attested: number;
  attestedRatePct: number | null;
  /** Judgments that told a caller to halt. */
  halts: number;
  /**
   * Halts issued WITHOUT a receipt. This is the canary quadrant: we told an
   * agent to stop and handed it nothing it can prove later.
   */
  unattestedHalts: number;
  quorumFailures: number;
  /** Independence-gate failures — providers all resolve to one operator. */
  independenceFailures: number;
  /** Distinct (symbol, chain) pairs judged — usage breadth. */
  distinctPairs: number;

  /** Newest feed_health_snapshots row, and its age. */
  spineLastEvaluatedAt: string | null;
  spineAgeMinutes: number | null;
  /** True when the collector has gone quiet. */
  spineStale: boolean;
  /** Committed-universe pairs with NO spine row in the window. */
  universeGaps: string[];

  /** True when a sub-query failed — numbers above are unreliable. */
  errored?: boolean;
}

export interface OracleWatchIntegrity {
  summary: OracleWatchIntegritySummary;
  unattestedHalts: OracleWatchHaltRow[];
}

const EMPTY_WATCH_INTEGRITY = (windowHours: number): OracleWatchIntegrity => ({
  summary: {
    windowHours,
    total: 0,
    attested: 0,
    attestedRatePct: null,
    halts: 0,
    unattestedHalts: 0,
    quorumFailures: 0,
    independenceFailures: 0,
    distinctPairs: 0,
    spineLastEvaluatedAt: null,
    spineAgeMinutes: null,
    spineStale: true,
    universeGaps: ORACLE_WATCH_HISTORY_UNIVERSE.map((t) => `${t.symbol}@${t.chain}`),
  },
  unattestedHalts: [],
});

export async function getOracleWatchIntegrity(windowHours = 24): Promise<OracleWatchIntegrity> {
  const supabase = createServiceRoleClient();
  const since = hoursAgoIso(windowHours);

  const [checksResult, spineResult] = await Promise.all([
    pagedSelect<OracleWatchCheckRow>((from, to) =>
      supabase
        .from('oracle_watch_checks')
        .select(
          'created_at, symbol, chain, attested, verdict, recommendation, quorum_satisfied, independence_satisfied, reason_codes, uid'
        )
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .range(from, to)
    ),
    supabase
      .from('feed_health_snapshots')
      .select('evaluated_at, symbol, chain')
      .gte('evaluated_at', since)
      .order('evaluated_at', { ascending: false })
      .limit(WATCH_SPINE_LOOKBACK_ROWS),
  ]);

  if (checksResult.error) {
    return {
      ...EMPTY_WATCH_INTEGRITY(windowHours),
      summary: { ...EMPTY_WATCH_INTEGRITY(windowHours).summary, errored: true },
    };
  }

  const rows = checksResult.data ?? [];

  let attested = 0;
  let halts = 0;
  let unattestedHalts = 0;
  let quorumFailures = 0;
  let independenceFailures = 0;
  const pairs = new Set<string>();
  const haltRows: OracleWatchHaltRow[] = [];

  for (const row of rows) {
    if (row.attested) attested++;
    pairs.add(`${row.symbol}@${row.chain ?? 'global'}`);
    if (!row.quorum_satisfied) quorumFailures++;
    if (!row.independence_satisfied) independenceFailures++;
    if (row.recommendation === 'halt') {
      halts++;
      if (!row.attested) {
        unattestedHalts++;
        // Bound the payload: ops needs the recent failures, not all of them.
        if (haltRows.length < 25) {
          haltRows.push({
            created_at: row.created_at,
            symbol: row.symbol,
            chain: row.chain,
            verdict: row.verdict,
            reason_codes: row.reason_codes,
          });
        }
      }
    }
  }

  // ---- Spine freshness + universe gaps -------------------------------------
  const spineRows = spineResult.data ?? [];
  const spineLastEvaluatedAt = spineRows.length > 0 ? spineRows[0].evaluated_at : null;
  const spineAgeMinutes = ageMinutes(spineLastEvaluatedAt);
  const spineStale = spineAgeMinutes === null || spineAgeMinutes > WATCH_SPINE_STALE_MINUTES;

  const seen = new Set(spineRows.map((r) => `${r.symbol}@${r.chain ?? 'global'}`));
  const universeGaps = ORACLE_WATCH_HISTORY_UNIVERSE.map((t) => `${t.symbol}@${t.chain}`).filter(
    (key) => !seen.has(key)
  );

  return {
    summary: {
      windowHours,
      total: rows.length,
      attested,
      attestedRatePct: rows.length > 0 ? roundTo((attested / rows.length) * 100, 1) : null,
      halts,
      unattestedHalts,
      quorumFailures,
      independenceFailures,
      distinctPairs: pairs.size,
      spineLastEvaluatedAt,
      spineAgeMinutes,
      spineStale,
      universeGaps,
      errored: Boolean(spineResult.error) || undefined,
    },
    unattestedHalts: haltRows,
  };
}
