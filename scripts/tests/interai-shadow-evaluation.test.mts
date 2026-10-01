import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateFixedCase,
  fixedCases,
  runFixedEvaluation,
} from '../interai-shadow-evaluation.mts';

const base = fixedCases()[0];

test('30 fixed cases cover seven labels and at least 20 clean or benign controls', () => {
  const report = runFixedEvaluation();
  assert.equal(report.status, 'SYNTHETIC_CANDIDATE_ONLY');
  assert.equal(report.pairedInterAIComparisonAvailable, false);
  assert.equal(report.productionPolicyChanged, false);
  assert.equal(report.fixedCaseCount, 30);
  assert.equal(report.controlCount, 20);
  assert.equal(report.deliberatelyUnsafeCaseCount, 2);
  assert.equal(new Set(report.results.map((row) => row.label)).size, 7);
  assert.equal(report.falseBlocks, 0);
  assert.equal(report.falseReviews, 0);
  assert.equal(report.missedEscalations, 0);
  assert.equal(report.missedUnsafe, 0);
  assert.equal(report.wrongReasons, 0);
  assert.equal(report.candidateChecksPass, true);
  assert.ok(report.results.every((row) => row.currentInterAIOutcome === null));
  assert.ok(report.cases.every((row) => row.intent.chainId === 84532));
  assert.ok(report.cases.every((row) => row.evidence.chainId === 84532));
});

test('reviewable JSON report matches the executable fixed-case evaluation', async () => {
  const reportUrl = new URL('../interai-shadow-fixed-report.v1.json', import.meta.url);
  const retained = JSON.parse(await readFile(reportUrl, 'utf8')) as unknown;
  assert.deepEqual(retained, runFixedEvaluation());
});

test('15 seconds is fresh, 30 seconds remains near, over 30 seconds is stale', () => {
  for (const seconds of [15, 30]) {
    const result = evaluateFixedCase({
      ...base,
      evidence: { ...base.evidence, observedAtMs: base.asOfMs - seconds * 1000 },
    });
    assert.equal(result.shadowOutcome, 'ALLOW');
  }
  const stale = evaluateFixedCase({
    ...base,
    evidence: { ...base.evidence, observedAtMs: base.asOfMs - 30_001 },
  });
  assert.equal(stale.shadowReason, 'STALE_EVIDENCE');
});

test('spread and drift endpoint rules remain separate from minimum-output safety', () => {
  for (const spread of [24, 25, 50]) {
    const result = evaluateFixedCase({
      ...base,
      evidence: { ...base.evidence, crossProviderSpreadBps: spread },
    });
    assert.equal(result.spreadBand, spread < 25 ? 'CLEAN' : 'NEAR_THRESHOLD');
    assert.equal(result.shadowOutcome, 'ALLOW');
  }
  const divergent = evaluateFixedCase({
    ...base,
    evidence: { ...base.evidence, crossProviderSpreadBps: 51 },
  });
  assert.equal(divergent.shadowReason, 'PROVIDER_DIVERGENCE');
  const drift25 = evaluateFixedCase({
    ...base,
    evidence: { ...base.evidence, adjustedOutputBaseUnits: '2992500' },
  });
  assert.equal(drift25.quoteDriftBand, 'CLEAN');
  const drift26 = evaluateFixedCase({
    ...base,
    evidence: { ...base.evidence, adjustedOutputBaseUnits: '2992200' },
  });
  assert.equal(drift26.quoteDriftBand, 'NEAR_THRESHOLD');
  const driftFractional = evaluateFixedCase({
    ...base,
    evidence: { ...base.evidence, adjustedOutputBaseUnits: '2992470' },
  });
  assert.equal(driftFractional.quoteDriftBps, 25.1);
  assert.equal(driftFractional.quoteDriftBand, 'NEAR_THRESHOLD');
  const driftAbove50 = evaluateFixedCase({
    ...base,
    evidence: { ...base.evidence, adjustedOutputBaseUnits: '2984700' },
  });
  assert.equal(driftAbove50.quoteDriftBand, 'MATERIAL');
  assert.equal(driftAbove50.shadowOutcome, 'ALLOW');
  const belowMinimum = evaluateFixedCase({
    ...base,
    evidence: { ...base.evidence, adjustedOutputBaseUnits: '2949999' },
  });
  assert.equal(belowMinimum.shadowOutcome, 'BLOCK');
  assert.equal(belowMinimum.shadowReason, 'MINIMUM_OUTPUT_UNSUPPORTED');
});

test('missing, unbound, and mismatched facts do not become adverse market claims', () => {
  const missing = evaluateFixedCase({
    ...base,
    evidence: { ...base.evidence, sourceVerifiedBound: false },
  });
  assert.deepEqual(
    [missing.shadowOutcome, missing.shadowReason],
    ['REVIEW_REQUIRED', 'INSUFFICIENT_VERIFIED_BOUND_EVIDENCE']
  );
  const mismatch = evaluateFixedCase({
    ...base,
    evidence: { ...base.evidence, pool: 'another-pool' },
  });
  assert.deepEqual(
    [mismatch.shadowOutcome, mismatch.shadowReason],
    ['REVIEW_REQUIRED', 'INTENT_MARKET_MISMATCH']
  );
});

test('malformed, future, and non-synthetic inputs fail closed', () => {
  assert.throws(() => evaluateFixedCase({ ...base, provenance: 'LIVE' }));
  assert.throws(() => evaluateFixedCase({ ...base, extra: true }));
  assert.throws(
    () =>
      evaluateFixedCase({ ...base, evidence: { ...base.evidence, observedAtMs: base.asOfMs + 1 } }),
    /FUTURE_OBSERVATION/
  );
  assert.throws(() =>
    evaluateFixedCase({ ...base, intent: { ...base.intent, minimumOutputBaseUnits: '-1' } })
  );
});
