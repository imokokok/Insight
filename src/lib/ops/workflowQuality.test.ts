import { createServiceRoleClient } from '@/lib/supabase/server';

import { requireOpsOwner } from './auth';
import {
  appendWorkflowReview,
  getWorkflowQualityReport,
  summarizeWorkflowChecks,
  type WorkflowCheck,
  type WorkflowReview,
} from './workflowQuality';

jest.mock('./auth', () => ({ requireOpsOwner: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));

function check(id: string, overrides: Partial<WorkflowCheck> = {}): WorkflowCheck {
  return {
    id,
    created_at: '2026-09-19T00:00:00Z',
    request_id: null,
    api_key_id: 'a',
    workflow_tag: 'swap',
    asset: 'ETH',
    chain_id: 1,
    action: 'swap',
    verdict: 'PASS',
    baseline_verdict: null,
    baseline_version: null,
    latency_ms: 10,
    signed: true,
    ml_model_version: null,
    schema_version: 3,
    label_spec_version: null,
    outcome_label: null,
    contributing_factors: [],
    assessment_scope: { unavailableDimensions: [] },
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

it('keeps missing baselines, proxy outcomes and human reviews separate', () => {
  const result = summarizeWorkflowChecks(
    [
      check('1', {
        verdict: 'BLOCK',
        contributing_factors: [{ rule: 'oracle_coverage' }],
        outcome_label: 0,
      }),
      check('2', {
        baseline_verdict: 'allow',
        baseline_version: 'v1',
        contributing_factors: [{ rule: 'stablecoin_depeg_pct' }],
      }),
      check('3', { baseline_verdict: 'block', baseline_version: null, assessment_scope: null }),
      check('4', { baseline_verdict: 'block', baseline_version: 'v1' }),
    ],
    []
  );
  expect(result.coverageStops).toBe(1);
  expect(result.marketAlerts).toBe(1);
  expect(result.pairedBaselines).toBe(2);
  expect(result.insightOnlyAlerts).toBe(1);
  expect(result.baselineOnlyAlerts).toBe(1);
  expect(result.unknownScopeChecks).toBe(1);
  expect(result.humanReviews.unreviewed).toBe(4);
  expect(result.humanReviews.false_positive).toBe(0);
  expect(result.sampleAssessment).toBe('SMALL_SAMPLE');
});

it('preserves customer slices and counts only the latest human label, retaining history separately', () => {
  const rows = [check('1'), check('2', { api_key_id: 'b' })];
  const reviews = [
    { id: '1', check_id: '1', status: 'false_positive', created_at: '2026-09-18' },
    { id: '2', check_id: '1', status: 'inconclusive', created_at: '2026-09-19' },
  ] as WorkflowReview[];
  const result = summarizeWorkflowChecks(rows, reviews);
  expect(result.slices).toHaveLength(2);
  expect(result.humanReviews.inconclusive).toBe(1);
  expect(result.humanReviews.false_positive).toBe(0);
  expect(result.humanReviews.unreviewed).toBe(1);
});

it('rejects report and review access before constructing a privileged client', async () => {
  jest.mocked(requireOpsOwner).mockRejectedValue(new Error('not owner'));
  await expect(getWorkflowQualityReport({ days: 14 })).rejects.toThrow('not owner');
  await expect(appendWorkflowReview({})).rejects.toThrow('not owner');
  expect(createServiceRoleClient).not.toHaveBeenCalled();
});

it('rejects invalid review payloads after authentication, before any write', async () => {
  jest.mocked(requireOpsOwner).mockResolvedValue({ userId: 'owner' });
  await expect(
    appendWorkflowReview({ checkId: 'bad', status: 'useful', reason: '' })
  ).rejects.toThrow();
  expect(createServiceRoleClient).not.toHaveBeenCalled();
});
