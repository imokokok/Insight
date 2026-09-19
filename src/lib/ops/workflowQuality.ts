import { z } from 'zod';

import { createServiceRoleClient } from '@/lib/supabase/server';

import { requireOpsOwner } from './auth';

export const WorkflowFilters = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14),
  apiKeyId: z.string().uuid().optional(),
  workflow: z.string().max(80).optional(),
  asset: z.string().max(20).optional(),
  action: z.enum(['swap', 'borrow', 'repay', 'lend', 'liquidate']).optional(),
  chainId: z.coerce.number().int().nonnegative().optional(),
  modelVersion: z.string().max(100).optional(),
});
export type WorkflowFilterInput = z.infer<typeof WorkflowFilters>;

export interface WorkflowCheck {
  id: string;
  created_at: string;
  request_id: string | null;
  api_key_id: string | null;
  workflow_tag: string | null;
  asset: string;
  chain_id: number;
  action: string;
  verdict: string;
  baseline_verdict: string | null;
  baseline_version: string | null;
  latency_ms: number | null;
  signed: boolean | null;
  ml_model_version: string | null;
  schema_version: number | null;
  label_spec_version: string | null;
  outcome_label: number | null;
  contributing_factors: { rule: string }[] | null;
  assessment_scope: { unavailableDimensions?: { dimension: string; reason: string }[] } | null;
}
export interface WorkflowReview {
  id: string;
  check_id: string;
  reviewer_id: string;
  status: 'useful' | 'false_positive' | 'missed_event' | 'inconclusive';
  reason: string;
  created_at: string;
}

const EVIDENCE_RULES = new Set(['oracle_coverage', 'oracle_independence', 'data_stale_seconds']);
const MARKET_RULES = new Set([
  'max_provider_deviation_pct',
  'cross_provider_spread_pct',
  'cross_provider_agreement',
  'stablecoin_depeg_pct',
  'protocol_buffer_consumed',
  'protocol_buffer_frozen',
]);

/** Counts describe observations/reviews, never prevented losses or manipulation detection. */
export function summarizeWorkflowChecks(rows: WorkflowCheck[], reviews: WorkflowReview[]) {
  const latest = new Map<string, WorkflowReview>();
  for (const review of reviews) {
    const previous = latest.get(review.check_id);
    if (
      !previous ||
      review.created_at > previous.created_at ||
      (review.created_at === previous.created_at && review.id > previous.id)
    )
      latest.set(review.check_id, review);
  }
  let coverageStops = 0,
    marketAlerts = 0,
    evaluated = 0,
    unknownScope = 0;
  let pairedBaselines = 0,
    insightOnlyAlerts = 0,
    baselineOnlyAlerts = 0,
    overlappingAlerts = 0;
  const humanReviews = {
    useful: 0,
    false_positive: 0,
    missed_event: 0,
    inconclusive: 0,
    unreviewed: 0,
  };
  const slices = new Map<
    string,
    {
      apiKeyId: string | null;
      workflow: string;
      asset: string;
      chainId: number;
      action: string;
      checks: number;
      coverageStops: number;
      marketAlerts: number;
      signed: number;
    }
  >();
  for (const row of rows) {
    const rules = row.contributing_factors ?? [];
    const evidenceStop = row.verdict === 'BLOCK' && rules.some((f) => EVIDENCE_RULES.has(f.rule));
    const marketAlert = rules.some((f) => MARKET_RULES.has(f.rule));
    if (evidenceStop) coverageStops++;
    if (marketAlert) marketAlerts++;
    if (!row.assessment_scope) unknownScope++;
    else if (!evidenceStop && row.assessment_scope.unavailableDimensions?.length === 0) evaluated++;
    if (row.baseline_version && row.baseline_verdict && row.baseline_verdict !== 'unknown') {
      pairedBaselines++;
      const baselineAlert = row.baseline_verdict !== 'allow';
      if (marketAlert && baselineAlert) overlappingAlerts++;
      else if (marketAlert) insightOnlyAlerts++;
      else if (baselineAlert) baselineOnlyAlerts++;
    }
    const review = latest.get(row.id);
    humanReviews[review?.status ?? 'unreviewed']++;
    const key = JSON.stringify([
      row.api_key_id,
      row.workflow_tag,
      row.asset,
      row.chain_id,
      row.action,
    ]);
    const slice = slices.get(key) ?? {
      apiKeyId: row.api_key_id,
      workflow: row.workflow_tag ?? '(untagged)',
      asset: row.asset,
      chainId: row.chain_id,
      action: row.action,
      checks: 0,
      coverageStops: 0,
      marketAlerts: 0,
      signed: 0,
    };
    slice.checks++;
    slice.coverageStops += Number(evidenceStop);
    slice.marketAlerts += Number(marketAlert);
    slice.signed += Number(row.signed === true);
    slices.set(key, slice);
  }
  const latencies = rows
    .map((r) => r.latency_ms)
    .filter((n): n is number => n !== null && Number.isFinite(n))
    .sort((a, b) => a - b);
  return {
    totalChecks: rows.length,
    scopeCompleteChecks: evaluated,
    unknownScopeChecks: unknownScope,
    coverageStops,
    marketAlerts,
    signedChecks: rows.filter((r) => r.signed === true).length,
    pairedBaselines,
    insightOnlyAlerts,
    baselineOnlyAlerts,
    overlappingAlerts,
    humanReviews,
    p95LatencyMs: latencies.length ? latencies[Math.ceil(latencies.length * 0.95) - 1] : null,
    sampleAssessment: rows.length < 100 ? 'SMALL_SAMPLE' : 'DESCRIPTIVE_ONLY',
    slices: [...slices.values()],
    limitations: [
      'Completed assessments only: service failures and failed audit writes are not in this denominator.',
      'Market alerts and evidence gaps can coexist. Missing historical scope/baseline/review is unknown.',
      'Baseline comparisons require a supplied baseline version. Caller labels are unverified inputs.',
      'Automated outcome_label is an abnormal-market proxy, not a human finding or proof of prevented loss.',
      'Human reviews are selective. Counts do not estimate accuracy, recall, or causality.',
    ],
  };
}

/** Explicit owner gate on every data access, including exports and server actions. */
export async function getWorkflowQualityReport(input: WorkflowFilterInput) {
  await requireOpsOwner();
  const filters = WorkflowFilters.parse(input);
  const db = createServiceRoleClient();
  let query = db
    .from('pre_trade_checks')
    .select(
      'id,created_at,request_id,api_key_id,workflow_tag,asset,chain_id,action,verdict,baseline_verdict,baseline_version,latency_ms,signed,ml_model_version,schema_version,label_spec_version,outcome_label,contributing_factors,assessment_scope',
      { count: 'exact' }
    )
    .gte('created_at', new Date(Date.now() - filters.days * 86400000).toISOString())
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1001);
  if (filters.apiKeyId) query = query.eq('api_key_id', filters.apiKeyId);
  if (filters.workflow) query = query.eq('workflow_tag', filters.workflow);
  if (filters.asset) query = query.eq('asset', filters.asset.toUpperCase());
  if (filters.action) query = query.eq('action', filters.action);
  if (filters.chainId !== undefined) query = query.eq('chain_id', filters.chainId);
  if (filters.modelVersion) query = query.eq('ml_model_version', filters.modelVersion);
  const { data, error, count } = await query;
  if (error)
    throw new Error('Workflow report unavailable. Check migration 0055 and database availability.');
  const all = (data ?? []) as WorkflowCheck[];
  const rows = all.slice(0, 1000);
  let reviews: WorkflowReview[] = [];
  if (rows.length) {
    const result = await db
      .from('pre_trade_workflow_reviews')
      .select('id,check_id,reviewer_id,status,reason,created_at', { count: 'exact' })
      .in(
        'check_id',
        rows.map((r) => r.id)
      )
      .order('created_at', { ascending: false })
      .limit(10001);
    if (result.error) throw new Error('Human review history unavailable; report was not produced.');
    reviews = (result.data ?? []) as WorkflowReview[];
    if (reviews.length > 10000 || (result.count !== null && result.count > reviews.length))
      throw new Error('Review export limit reached; narrow the report filters.');
  }
  return {
    generatedAt: new Date().toISOString(),
    filters,
    truncated: count === null || count > rows.length,
    matchingCount: count,
    rowLimit: 1000,
    summary: summarizeWorkflowChecks(rows, reviews),
    rows,
    reviews,
  };
}

export async function appendWorkflowReview(input: unknown) {
  const { userId } = await requireOpsOwner();
  const review = z
    .object({
      checkId: z.string().uuid(),
      status: z.enum(['useful', 'false_positive', 'missed_event', 'inconclusive']),
      reason: z.string().trim().min(1).max(2000),
    })
    .parse(input);
  const { error } = await createServiceRoleClient().from('pre_trade_workflow_reviews').insert({
    check_id: review.checkId,
    reviewer_id: userId,
    status: review.status,
    reason: review.reason,
  });
  if (error)
    throw new Error(
      'Review was not saved. Confirm the check exists and migration 0055 is installed.'
    );
}
