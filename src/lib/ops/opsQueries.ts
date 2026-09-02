import { getIncidentAggregation } from '@/lib/api/services/incidentService';
import { getAllActiveFeedsByProvider } from '@/lib/oracles/utils/dynamicFeedResolver';
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

async function pagedSelect<T>(
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

  const snapshot = await latestTimestamp('hourly_price_snapshots', 'snapshot_hour');
  const report = await latestTimestamp('daily_reports', 'report_date');
  const reputation = await latestTimestamp('oracle_reputation', 'last_calculated_at');
  const checks = await latestTimestamp('pre_trade_checks', 'created_at');

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
      stale: age != null && age > threshold,
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
}

export async function getBillingSummary(): Promise<BillingSummary> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from('api_keys').select('plan, rate_limit, is_active');

  if (error || !data) {
    return { totalKeys: 0, activeKeys: 0, byPlan: {}, byRateLimit: {} };
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
  const [feeds, signing, incidents, cron, inactiveResult] = await Promise.all([
    getAllActiveFeedsByProvider(),
    getSigningIntegrity(windowHours),
    getIncidentAggregation({ from: get7dAgoUtc(), to: getTodayUtc(), limit: 1, offset: 0 }),
    getCronHealth(),
    supabase
      .from('oracle_feeds')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false),
  ]);

  const all = Array.from(feeds.values()).flat();
  const symbols = new Set(all.map((f) => f.symbol)).size;
  const chains = new Set(all.map((f) => f.chain_id)).size;

  const partial = Boolean(signing.summary.errored || cron.errored);

  return {
    feedsActive: all.length,
    feedsInactive: inactiveResult.count ?? 0,
    providers: feeds.size,
    symbols,
    chains,
    signedRatePct: signing.summary.signedRatePct,
    unsignedBlocks: signing.summary.unsignedBlocks,
    incidents7d: incidents.total,
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
