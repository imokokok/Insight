import { pathToFileURL } from 'node:url';

import { z } from 'zod';

/** Candidate offline evaluation only. No production policy, InterAI API, wallet, or signer is called. */
export const INTERAI_SHADOW_CANDIDATE = 'interai-pretrade-shadow-candidate/v1' as const;

const labels = [
  'CLEAN_FRESH_BOUND',
  'STALE_EVIDENCE',
  'STALE_QUOTE',
  'PROVIDER_DIVERGENCE',
  'EVIDENCE_MISSING_OR_UNBOUND',
  'INTENT_MARKET_MISMATCH',
  'BENIGN_NEAR_THRESHOLD',
] as const;

const caseSchema = z
  .object({
    id: z.string().regex(/^IA-[0-9]{2}$/),
    label: z.enum(labels),
    provenance: z.literal('SYNTHETIC_FIXED_CASE'),
    asOfMs: z.number().int().nonnegative(),
    intent: z.object({
      chainId: z.number().int().positive(),
      venue: z.string().min(1),
      pool: z.string().min(1),
      tokenIn: z.string().min(1),
      tokenOut: z.string().min(1),
      amountInBaseUnits: z.string().regex(/^[1-9][0-9]*$/),
      minimumOutputBaseUnits: z.string().regex(/^[1-9][0-9]*$/),
      quoteOutputBaseUnits: z.string().regex(/^[1-9][0-9]*$/),
      quoteObservedAtMs: z.number().int().nonnegative(),
    }),
    evidence: z.object({
      chainId: z.number().int().positive(),
      venue: z.string().min(1),
      pool: z.string().min(1),
      tokenIn: z.string().min(1),
      tokenOut: z.string().min(1),
      sourceVerifiedBound: z.boolean(),
      destinationVerifiedBound: z.boolean(),
      observedAtMs: z.number().int().nonnegative(),
      crossProviderSpreadBps: z.number().int().nonnegative(),
      adjustedOutputBaseUnits: z.string().regex(/^[1-9][0-9]*$/),
    }),
    expectedEscalation: z.boolean(),
    deliberatelyUnsafe: z.boolean(),
    expectedReason: z.string().nullable(),
    /** No InterAI private decision is invented for a synthetic fixture. */
    currentInterAIOutcome: z.enum(['ALLOW', 'REVIEW_REQUIRED', 'BLOCK']).nullable(),
  })
  .strict();

export type FixedCase = z.infer<typeof caseSchema>;
export type Outcome = 'ALLOW' | 'REVIEW_REQUIRED' | 'BLOCK';

export interface ShadowResult {
  id: string;
  label: FixedCase['label'];
  provenance: 'SYNTHETIC_FIXED_CASE';
  currentInterAIOutcome: Outcome | null;
  shadowOutcome: Outcome;
  shadowReason: string | null;
  evidenceAgeSeconds: number;
  quoteAgeSeconds: number;
  spreadBand: 'CLEAN' | 'NEAR_THRESHOLD' | 'MATERIAL';
  quoteDriftBps: number;
  quoteDriftBand: 'CLEAN' | 'NEAR_THRESHOLD' | 'MATERIAL';
  expectedEscalation: boolean;
  deliberatelyUnsafe: boolean;
  expectedReason: string | null;
}

function ageSeconds(now: number, observed: number): number {
  if (observed > now) throw new TypeError('FUTURE_OBSERVATION');
  return (now - observed) / 1000;
}

function band(bps: number, cleanIncludes25: boolean): ShadowResult['spreadBand'] {
  if (bps < 25 || (cleanIncludes25 && bps === 25)) return 'CLEAN';
  if (bps <= 50) return 'NEAR_THRESHOLD';
  return 'MATERIAL';
}

/**
 * The candidate makes the ambiguous endpoints explicit: freshness <=15s is
 * fresh, (15,30]s is near, >30s is stale; spread <25/25..50/>50 bps;
 * quote drift <=25/(25,50]/>50 bps. Drift alone never causes BLOCK.
 */
export function evaluateFixedCase(raw: unknown): ShadowResult {
  const value = caseSchema.parse(raw);
  const evidenceAgeSeconds = ageSeconds(value.asOfMs, value.evidence.observedAtMs);
  const quoteAgeSeconds = ageSeconds(value.asOfMs, value.intent.quoteObservedAtMs);
  const quoteOutput = BigInt(value.intent.quoteOutputBaseUnits);
  const adjustedOutput = BigInt(value.evidence.adjustedOutputBaseUnits);
  const minimumOutput = BigInt(value.intent.minimumOutputBaseUnits);
  const driftNumerator =
    quoteOutput > adjustedOutput ? quoteOutput - adjustedOutput : adjustedOutput - quoteOutput;
  const scaledDrift = driftNumerator * 10_000n;
  const quoteDriftBps = Number(scaledDrift) / Number(quoteOutput);
  if (!Number.isFinite(quoteDriftBps)) throw new TypeError('QUOTE_DRIFT_OUT_OF_RANGE');
  const quoteDriftBand =
    scaledDrift <= quoteOutput * 25n
      ? 'CLEAN'
      : scaledDrift <= quoteOutput * 50n
        ? 'NEAR_THRESHOLD'
        : 'MATERIAL';

  let shadowOutcome: Outcome = 'ALLOW';
  let shadowReason: string | null = null;
  if (!value.evidence.sourceVerifiedBound || !value.evidence.destinationVerifiedBound) {
    shadowOutcome = 'REVIEW_REQUIRED';
    shadowReason = 'INSUFFICIENT_VERIFIED_BOUND_EVIDENCE';
  } else if (
    value.intent.chainId !== value.evidence.chainId ||
    value.intent.venue !== value.evidence.venue ||
    value.intent.pool !== value.evidence.pool ||
    value.intent.tokenIn !== value.evidence.tokenIn ||
    value.intent.tokenOut !== value.evidence.tokenOut
  ) {
    shadowOutcome = 'REVIEW_REQUIRED';
    shadowReason = 'INTENT_MARKET_MISMATCH';
  } else if (evidenceAgeSeconds > 30) {
    shadowOutcome = 'REVIEW_REQUIRED';
    shadowReason = 'STALE_EVIDENCE';
  } else if (adjustedOutput < minimumOutput) {
    shadowOutcome = 'BLOCK';
    shadowReason =
      quoteAgeSeconds > 30
        ? 'STALE_QUOTE_MINIMUM_OUTPUT_UNSUPPORTED'
        : 'MINIMUM_OUTPUT_UNSUPPORTED';
  } else if (value.evidence.crossProviderSpreadBps > 50) {
    shadowOutcome = 'REVIEW_REQUIRED';
    shadowReason = 'PROVIDER_DIVERGENCE';
  } else if (quoteAgeSeconds > 30) {
    shadowOutcome = 'REVIEW_REQUIRED';
    shadowReason = 'STALE_QUOTE';
  }

  return {
    id: value.id,
    label: value.label,
    provenance: value.provenance,
    currentInterAIOutcome: value.currentInterAIOutcome,
    shadowOutcome,
    shadowReason,
    evidenceAgeSeconds,
    quoteAgeSeconds,
    spreadBand: band(value.evidence.crossProviderSpreadBps, false),
    quoteDriftBps,
    quoteDriftBand,
    expectedEscalation: value.expectedEscalation,
    deliberatelyUnsafe: value.deliberatelyUnsafe,
    expectedReason: value.expectedReason,
  };
}

const asOfMs = Date.UTC(2026, 8, 29, 12, 0, 0);
const base = {
  provenance: 'SYNTHETIC_FIXED_CASE' as const,
  asOfMs,
  intent: {
    chainId: 8453,
    venue: 'synthetic-uniswap-v3',
    pool: 'synthetic-weth-usdc-3000',
    tokenIn: 'WETH',
    tokenOut: 'USDC',
    amountInBaseUnits: '1000000000000000',
    minimumOutputBaseUnits: '2950000',
    quoteOutputBaseUnits: '3000000',
    quoteObservedAtMs: asOfMs - 5_000,
  },
  evidence: {
    chainId: 8453,
    venue: 'synthetic-uniswap-v3',
    pool: 'synthetic-weth-usdc-3000',
    tokenIn: 'WETH',
    tokenOut: 'USDC',
    sourceVerifiedBound: true,
    destinationVerifiedBound: true,
    observedAtMs: asOfMs - 5_000,
    crossProviderSpreadBps: 10,
    adjustedOutputBaseUnits: '3000000',
  },
  currentInterAIOutcome: null,
};

/** Exactly 30 fixed synthetic cases: 20 controls and 10 deliberately escalated cases. */
export function fixedCases(): FixedCase[] {
  const cases: FixedCase[] = [];
  function add(
    label: FixedCase['label'],
    expectedEscalation: boolean,
    expectedReason: string | null,
    intent: Partial<FixedCase['intent']> = {},
    evidence: Partial<FixedCase['evidence']> = {}
  ): void {
    cases.push(
      caseSchema.parse({
        ...base,
        id: `IA-${String(cases.length + 1).padStart(2, '0')}`,
        label,
        expectedEscalation,
        deliberatelyUnsafe: label === 'STALE_QUOTE',
        expectedReason,
        intent: { ...base.intent, ...intent },
        evidence: { ...base.evidence, ...evidence },
      })
    );
  }

  for (const [age, spread, drift] of [
    [0, 0, 0],
    [5, 10, 5],
    [10, 20, 10],
    [15, 24, 25],
    [2, 5, 3],
    [7, 12, 8],
    [12, 22, 15],
    [15, 0, 20],
    [1, 24, 0],
    [9, 14, 12],
    [14, 23, 24],
    [5, 1, 1],
  ]) {
    add(
      'CLEAN_FRESH_BOUND',
      false,
      null,
      { quoteObservedAtMs: asOfMs - age * 1000 },
      {
        observedAtMs: asOfMs - age * 1000,
        crossProviderSpreadBps: spread,
        adjustedOutputBaseUnits: String(3_000_000 - drift * 300),
      }
    );
  }
  for (const [age, spread, drift] of [
    [16, 25, 26],
    [20, 30, 30],
    [25, 40, 40],
    [30, 50, 50],
    [15, 25, 25],
    [18, 49, 35],
    [29, 50, 26],
    [30, 25, 50],
  ]) {
    add(
      'BENIGN_NEAR_THRESHOLD',
      false,
      null,
      { quoteObservedAtMs: asOfMs - age * 1000 },
      {
        observedAtMs: asOfMs - age * 1000,
        crossProviderSpreadBps: spread,
        adjustedOutputBaseUnits: String(3_000_000 - drift * 300),
      }
    );
  }
  for (const age of [31, 45])
    add('STALE_EVIDENCE', true, 'STALE_EVIDENCE', {}, { observedAtMs: asOfMs - age * 1000 });
  for (const [age, output] of [
    [31, '2940000'],
    [60, '2900000'],
  ] as const) {
    add(
      'STALE_QUOTE',
      true,
      'STALE_QUOTE_MINIMUM_OUTPUT_UNSUPPORTED',
      { quoteObservedAtMs: asOfMs - age * 1000 },
      { adjustedOutputBaseUnits: output }
    );
  }
  for (const spread of [51, 80])
    add('PROVIDER_DIVERGENCE', true, 'PROVIDER_DIVERGENCE', {}, { crossProviderSpreadBps: spread });
  add(
    'EVIDENCE_MISSING_OR_UNBOUND',
    true,
    'INSUFFICIENT_VERIFIED_BOUND_EVIDENCE',
    {},
    { sourceVerifiedBound: false }
  );
  add(
    'EVIDENCE_MISSING_OR_UNBOUND',
    true,
    'INSUFFICIENT_VERIFIED_BOUND_EVIDENCE',
    {},
    { destinationVerifiedBound: false }
  );
  add(
    'INTENT_MARKET_MISMATCH',
    true,
    'INTENT_MARKET_MISMATCH',
    {},
    { pool: 'synthetic-other-pool' }
  );
  add('INTENT_MARKET_MISMATCH', true, 'INTENT_MARKET_MISMATCH', {}, { tokenOut: 'DAI' });
  return cases;
}

export function runFixedEvaluation() {
  const cases = fixedCases();
  const results = cases.map(evaluateFixedCase);
  const controls = results.filter((row) => !row.expectedEscalation);
  const escalations = results.filter((row) => row.expectedEscalation);
  const unsafe = results.filter((row) => row.deliberatelyUnsafe);
  const falseBlocks = controls.filter((row) => row.shadowOutcome === 'BLOCK').length;
  const falseReviews = controls.filter((row) => row.shadowOutcome === 'REVIEW_REQUIRED').length;
  const missedEscalations = escalations.filter((row) => row.shadowOutcome === 'ALLOW').length;
  const missedUnsafe = unsafe.filter((row) => row.shadowOutcome === 'ALLOW').length;
  const wrongReasons = escalations.filter((row) => row.shadowReason !== row.expectedReason).length;
  return {
    schema: INTERAI_SHADOW_CANDIDATE,
    status: 'SYNTHETIC_CANDIDATE_ONLY',
    productionPolicyChanged: false,
    pairedInterAIComparisonAvailable: false,
    fixedCaseCount: results.length,
    controlCount: controls.length,
    escalatedCaseCount: escalations.length,
    deliberatelyUnsafeCaseCount: unsafe.length,
    falseBlocks,
    falseReviews,
    falseReviewRate: falseReviews / controls.length,
    missedEscalations,
    missedUnsafe,
    wrongReasons,
    candidateChecksPass:
      results.length === 30 &&
      controls.length >= 20 &&
      falseBlocks === 0 &&
      falseReviews / controls.length <= 0.05 &&
      missedEscalations === 0 &&
      missedUnsafe === 0 &&
      wrongReasons === 0,
    cases,
    results,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`${JSON.stringify(runFixedEvaluation(), null, 2)}\n`);
}
