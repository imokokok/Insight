/**
 * Jupiter-route Swap Guard for Solana mainnet spot swaps.
 *
 * This guard is bound to a *Jupiter quote and its route plan*, not to an Orca
 * pool. It reuses the reviewed dimensions already used by `solanaSwapGuard`
 * (reviewed mints, slippage/min-out economics, oracle consensus on both legs)
 * and adds the route-level dimension Jupiter needs: every pool in the route
 * must be an individually reviewed pool address.
 *
 * The guard is read-only and never builds, signs, or submits a transaction.
 * `prepareSolanaJupiterSwap` consumes `riskVerdictRef` as its gate.
 *
 * Outcome mapping for the three-state product contract (there is no fourth
 * state):
 *   - PASS               -> status `decided`,     product `approved`,    chargeable, executable
 *   - CAUTION            -> status `decided`,     product `rejected`,    chargeable, not executable
 *   - BLOCK (rule hit)   -> status `decided`,     product `rejected`,    chargeable
 *   - coverage gap (unreviewed mint/pool, unsupported venue) or missing,
 *     stale, unverifiable evidence -> status `unavailable`, product
 *     `unavailable`, not chargeable, verdict fails closed to BLOCK.
 *
 * CAUTION stays an internal signal only. It is deliberately folded into
 * `rejected` for the customer-facing contract and can never be executed.
 */

import { createHash } from 'node:crypto';

import { z } from 'zod';

import {
  preTradeSafetyCheck,
  type PreTradeSafetyResult,
} from '@/lib/api/services/preTradeSafetyService';
import type { RejectedVerdictEvidence } from '@/lib/billing/exemptions';

import {
  REVIEWED_SOLANA_SWAP_PROFILES,
  SOLANA_USDC_MINT,
  SOLANA_USDT_MINT,
  SOLANA_WSOL_MINT,
} from './solanaOrcaWhirlpool';

export const SOLANA_JUPITER_SWAP_GUARD_SCHEMA = 'insight.solana-jupiter-swap-guard.v1' as const;
export const SOLANA_JUPITER_SWAP_GUARD_RULE_SET = 'solana-jupiter-swap-guard-2026-11-08.1';
export const SOLANA_JUPITER_CHAIN_REF = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;

const DEFAULT_MAX_SLIPPAGE_BPS = 300;
const DEFAULT_MAX_PRICE_IMPACT_PCT = 1;
const DEFAULT_CAUTION_PRICE_IMPACT_PCT = 0.5;
const DEFAULT_MAX_QUOTE_AGE_SECONDS = 30;
const DEFAULT_MAX_ROUTE_STEPS = 6;
const DEFAULT_ORACLE_TIMEOUT_MS = 8_000;

export type SolanaJupiterSwapGuardVerdict = 'PASS' | 'CAUTION' | 'BLOCK';
export type SolanaJupiterSwapGuardStatus = 'decided' | 'unavailable';
export type SolanaJupiterSwapProductOutcome = 'approved' | 'rejected' | 'unavailable';

/**
 * Why an asset/pool cannot be assessed. Coverage gaps are explicitly *not*
 * rejections: they are Insight's incomplete review surface, so they map to
 * `unavailable` and are never charged.
 */
export type SolanaJupiterCoverageClass =
  | 'reviewed'
  | 'integrated_not_reviewed'
  | 'not_integrated'
  | 'ecosystem_unknown';

export interface ReviewedJupiterSwapToken {
  symbol: 'SOL' | 'USDC' | 'USDT';
  mint: string;
}

/**
 * Mint allowlist derived from the already-reviewed Solana swap profiles.
 * Adding a token here is a review decision, not a runtime configuration.
 */
export const REVIEWED_JUPITER_SWAP_TOKENS: readonly ReviewedJupiterSwapToken[] = [
  { symbol: 'SOL', mint: SOLANA_WSOL_MINT },
  { symbol: 'USDC', mint: SOLANA_USDC_MINT },
  { symbol: 'USDT', mint: SOLANA_USDT_MINT },
];

/**
 * Pool allowlist derived from the reviewed Orca Whirlpool profiles. At the
 * Jupiter route level this is a *pool address* allowlist; callers may extend it
 * through `policy.reviewedPools` after their own review.
 */
export const REVIEWED_JUPITER_ROUTE_POOLS: readonly string[] = [
  ...new Set(Object.values(REVIEWED_SOLANA_SWAP_PROFILES).map((profile) => profile.pool)),
];

/**
 * Jupiter `routePlan[].label` values whose venue program is already integrated
 * in this repository (see `solanaOrcaWhirlpool`). A pool carrying one of these
 * labels but missing from the reviewed pool allowlist is a *review gap*, not a
 * verdict; an unknown label means the venue itself is not integrated.
 */
export const INTEGRATED_SOLANA_DEX_LABELS: readonly string[] = ['Orca Whirlpool'];

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Bytes(value: string): Uint8Array | null {
  let accumulator = 0n;
  const base = BigInt(BASE58_ALPHABET.length);
  for (const char of value) {
    const index = BASE58_ALPHABET.indexOf(char);
    if (index < 0) return null;
    accumulator = accumulator * base + BigInt(index);
  }
  const bytes: number[] = [];
  while (accumulator > 0n) {
    bytes.unshift(Number(accumulator % 256n));
    accumulator /= 256n;
  }
  for (const char of value) {
    if (char !== '1') break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

function isSolanaAddress(value: string): boolean {
  const bytes = base58Bytes(value);
  return bytes !== null && bytes.length === 32;
}

const COVERAGE_REASON_CODE: Record<Exclude<SolanaJupiterCoverageClass, 'reviewed'>, string> = {
  ecosystem_unknown: 'COVERAGE_ECOSYSTEM_UNKNOWN',
  not_integrated: 'COVERAGE_EXISTS_NOT_INTEGRATED',
  integrated_not_reviewed: 'COVERAGE_INTEGRATED_NOT_REVIEWED',
};

function coverageReason(
  label: Exclude<SolanaJupiterCoverageClass, 'reviewed'>,
  subject: string,
  detail: string
): string {
  return `${COVERAGE_REASON_CODE[label]}_${subject}: ${detail}`;
}

const RawAmount = z.string().regex(/^(?:0|[1-9]\d*)$/);
/** Validated later by `isSolanaAddress` so coverage gaps stay distinguishable. */
const SolanaAddress = z.string().min(1).max(80);

export const SolanaJupiterSwapRouteStepSchema = z
  .object({
    ammKey: SolanaAddress,
    label: z.string().min(1).max(80),
    inputMint: SolanaAddress,
    outputMint: SolanaAddress,
    inAmountRaw: RawAmount,
    outAmountRaw: RawAmount,
    percent: z.number().int().min(1).max(100),
  })
  .strict();

export const SolanaJupiterSwapGuardInputSchema = z
  .object({
    inputMint: SolanaAddress,
    outputMint: SolanaAddress,
    amountInRaw: RawAmount,
    amountOutRaw: RawAmount,
    minimumOutRaw: RawAmount,
    /** Jupiter `priceImpactPct`, in percent units (e.g. 0.42 = 0.42%). */
    priceImpactPct: z.number().finite().min(-100).max(100),
    /** Slippage requested from Jupiter, in basis points. */
    slippageBps: z.number().int().min(0).max(10_000),
    /** Jupiter `contextSlot` or the finalized slot the quote was read at. */
    quoteContextSlot: z.number().int().nonnegative(),
    quotedAt: z.string().min(10),
    /** USD notional used for the two oracle checks. */
    tradeAmountUsd: z.number().finite().positive().max(1_000_000_000),
    routePlan: z.array(SolanaJupiterSwapRouteStepSchema).min(1).max(16),
    policy: z
      .object({
        maxSlippageBps: z.number().int().min(0).max(1_000).optional(),
        maxPriceImpactPct: z.number().finite().min(0).max(100).optional(),
        cautionPriceImpactPct: z.number().finite().min(0).max(100).optional(),
        maxQuoteAgeSeconds: z.number().int().min(1).max(300).optional(),
        maxRouteSteps: z.number().int().min(1).max(16).optional(),
        /** Additional reviewed pool addresses on top of the defaults. */
        reviewedPools: z.array(SolanaAddress).max(100).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type SolanaJupiterSwapGuardInput = z.infer<typeof SolanaJupiterSwapGuardInputSchema>;

export type SolanaJupiterOracleSummary = {
  verdict: PreTradeSafetyResult['verdict'] | 'UNAVAILABLE';
  maxDeviationPct: number | null;
  staleDataRisk: boolean | null;
  participantCount: number | null;
  attestationUid: string | null;
  attester: string | null;
};

export interface SolanaJupiterSwapGuardMetrics {
  priceImpactPct: number | null;
  slippageBps: number | null;
  minimumOutSlippageBps: number | null;
  routeSteps: number | null;
  reviewedPools: string[];
  unknownPools: string[];
  quoteAgeSeconds: number | null;
}

export interface SolanaJupiterSwapRiskVerdictRef {
  source: 'solana_jupiter_swap_guard';
  schema: typeof SOLANA_JUPITER_SWAP_GUARD_SCHEMA;
  ruleSetVersion: string;
  verdict: SolanaJupiterSwapGuardVerdict;
  status: SolanaJupiterSwapGuardStatus;
  productOutcome: SolanaJupiterSwapProductOutcome;
  evaluatedAt: string;
  quoteDigest: `0x${string}` | null;
  reasonsDigest: `0x${string}`;
  reasons: string[];
}

export interface SolanaJupiterSwapGuardResult {
  schema: typeof SOLANA_JUPITER_SWAP_GUARD_SCHEMA;
  ruleSetVersion: string;
  chainId: 0;
  chainRef: typeof SOLANA_JUPITER_CHAIN_REF;
  verdict: SolanaJupiterSwapGuardVerdict;
  status: SolanaJupiterSwapGuardStatus;
  productOutcome: SolanaJupiterSwapProductOutcome;
  chargeable: boolean;
  executable: boolean;
  evaluatedAt: string;
  scope: {
    transactionAuthority: 'none';
    binding: 'jupiter_quote_and_route_plan';
    enforcement: 'reviewed_pool_allowlist_and_oracle_consensus';
  };
  route: {
    inputMint: string;
    outputMint: string;
    sourceAsset: string;
    destinationAsset: string;
    amountInRaw: string;
    amountOutRaw: string;
    minimumOutRaw: string;
    contextSlot: number;
    pools: string[];
    steps: Array<{
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmountRaw: string;
      outAmountRaw: string;
      percent: number;
      reviewed: boolean;
    }>;
  } | null;
  policy: {
    maxSlippageBps: number;
    maxPriceImpactPct: number;
    cautionPriceImpactPct: number;
    maxQuoteAgeSeconds: number;
    maxRouteSteps: number;
    reviewedPools: string[];
  };
  metrics: SolanaJupiterSwapGuardMetrics;
  oracleChecks: {
    source: SolanaJupiterOracleSummary;
    destination: SolanaJupiterOracleSummary;
  } | null;
  reasons: string[];
  riskVerdictRef: SolanaJupiterSwapRiskVerdictRef;
  /**
   * Reproducibility package for a rejected verdict. `null` for approved and
   * unavailable outcomes, which are not billed as refusals.
   */
  evidence: RejectedVerdictEvidence | null;
  next: {
    execution: 'not_performed';
    priorSeal: string;
  };
}

export interface SolanaJupiterSwapGuardDependencies {
  checkOracle?: typeof preTradeSafetyCheck;
  now?: () => Date;
  /** Hard upper bound for both oracle checks together. */
  timeoutMs?: number;
}

const UNAVAILABLE_ORACLE: SolanaJupiterOracleSummary = {
  verdict: 'UNAVAILABLE',
  maxDeviationPct: null,
  staleDataRisk: null,
  participantCount: null,
  attestationUid: null,
  attester: null,
};

function summarize(result: PreTradeSafetyResult): SolanaJupiterOracleSummary {
  return {
    verdict: result.verdict,
    maxDeviationPct: result.maxDeviationPct,
    staleDataRisk: result.staleDataRisk,
    participantCount: result.participantCount,
    attestationUid: result.attestation?.uid ?? null,
    attester: result.attestation?.attester ?? null,
  };
}

function sha256(value: string): `0x${string}` {
  return `0x${createHash('sha256').update(value).digest('hex')}`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs} ms`)),
      timeoutMs
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function tokenByMint(mint: string): ReviewedJupiterSwapToken | null {
  return REVIEWED_JUPITER_SWAP_TOKENS.find((token) => token.mint === mint) ?? null;
}

/**
 * Classify why a mint that is not on the reviewed allowlist cannot be assessed.
 * Never returns `rejected`: the three classes are Insight coverage statements,
 * not trade verdicts.
 */
function classifyMint(
  mint: string,
  routePlan: SolanaJupiterSwapGuardInput['routePlan']
): Exclude<SolanaJupiterCoverageClass, 'reviewed'> {
  if (!isSolanaAddress(mint)) return 'ecosystem_unknown';
  const tradesOnIntegratedVenue = routePlan.some(
    (step) =>
      (step.inputMint === mint || step.outputMint === mint) &&
      INTEGRATED_SOLANA_DEX_LABELS.includes(step.label)
  );
  return tradesOnIntegratedVenue ? 'integrated_not_reviewed' : 'not_integrated';
}

function classifyPool(
  ammKey: string,
  label: string
): Exclude<SolanaJupiterCoverageClass, 'reviewed'> {
  if (!isSolanaAddress(ammKey)) return 'ecosystem_unknown';
  return INTEGRATED_SOLANA_DEX_LABELS.includes(label)
    ? 'integrated_not_reviewed'
    : 'not_integrated';
}

function coverageByMintDetail(
  coverage: Exclude<SolanaJupiterCoverageClass, 'reviewed'>,
  mint: string
): string {
  switch (coverage) {
    case 'ecosystem_unknown':
      return `${mint} is not a valid Solana mint address`;
    case 'integrated_not_reviewed':
      return 'the token trades on an integrated venue but is not on the reviewed mint allowlist';
    case 'not_integrated':
      return 'the token exists on Solana but no reviewed venue integration covers it';
  }
}

/**
 * Group every route pool that is outside the reviewed allowlist by the reason it
 * is missing, so the caller gets one coverage reason per class instead of one
 * blanket "unreviewed pools" message.
 */
function poolCoverage(
  routePlan: SolanaJupiterSwapGuardInput['routePlan'],
  reviewedPools: ReadonlySet<string>
): { reasons: string[]; unknownPools: string[] } {
  const unknownPools: string[] = [];
  const byClass = new Map<Exclude<SolanaJupiterCoverageClass, 'reviewed'>, string[]>();
  for (const step of routePlan) {
    if (reviewedPools.has(step.ammKey)) continue;
    unknownPools.push(step.ammKey);
    const coverage = classifyPool(step.ammKey, step.label);
    const bucket = byClass.get(coverage) ?? [];
    bucket.push(`${step.ammKey} (${step.label})`);
    byClass.set(coverage, bucket);
  }
  const reasons = [...byClass].map(([coverage, pools]) =>
    coverageReason(
      coverage,
      'POOL',
      `route uses pools outside the reviewed allowlist: ${pools.join(', ')}`
    )
  );
  return { reasons, unknownPools };
}

function effectivePolicy(
  policy: SolanaJupiterSwapGuardInput['policy']
): SolanaJupiterSwapGuardResult['policy'] {
  const reviewedPools = [
    ...new Set([...REVIEWED_JUPITER_ROUTE_POOLS, ...(policy?.reviewedPools ?? [])]),
  ];
  return {
    maxSlippageBps: policy?.maxSlippageBps ?? DEFAULT_MAX_SLIPPAGE_BPS,
    maxPriceImpactPct: policy?.maxPriceImpactPct ?? DEFAULT_MAX_PRICE_IMPACT_PCT,
    cautionPriceImpactPct: policy?.cautionPriceImpactPct ?? DEFAULT_CAUTION_PRICE_IMPACT_PCT,
    maxQuoteAgeSeconds: policy?.maxQuoteAgeSeconds ?? DEFAULT_MAX_QUOTE_AGE_SECONDS,
    maxRouteSteps: policy?.maxRouteSteps ?? DEFAULT_MAX_ROUTE_STEPS,
    reviewedPools,
  };
}

function outcomeFor(
  verdict: SolanaJupiterSwapGuardVerdict,
  status: SolanaJupiterSwapGuardStatus
): {
  productOutcome: SolanaJupiterSwapProductOutcome;
  chargeable: boolean;
  executable: boolean;
} {
  if (status === 'unavailable') {
    return { productOutcome: 'unavailable', chargeable: false, executable: false };
  }
  // CAUTION is internal only; the customer-facing contract has three states and
  // a caution-band trade is rejected, never executed.
  if (verdict === 'BLOCK' || verdict === 'CAUTION') {
    return { productOutcome: 'rejected', chargeable: true, executable: false };
  }
  return { productOutcome: 'approved', chargeable: true, executable: true };
}

function routeDigest(input: SolanaJupiterSwapGuardInput): `0x${string}` {
  return sha256(
    JSON.stringify({
      inputMint: input.inputMint,
      outputMint: input.outputMint,
      amountInRaw: input.amountInRaw,
      amountOutRaw: input.amountOutRaw,
      minimumOutRaw: input.minimumOutRaw,
      priceImpactPct: input.priceImpactPct,
      slippageBps: input.slippageBps,
      quoteContextSlot: input.quoteContextSlot,
      routePlan: input.routePlan,
    })
  );
}

function rejectedEvidence(args: {
  input: SolanaJupiterSwapGuardInput;
  policy: SolanaJupiterSwapGuardResult['policy'];
  metrics: SolanaJupiterSwapGuardMetrics;
  reasons: string[];
  oracleChecks: SolanaJupiterSwapGuardResult['oracleChecks'];
  quoteDigest: `0x${string}` | null;
}): RejectedVerdictEvidence {
  const rules = [
    ...new Set(args.reasons.map((reason) => reason.split(':')[0]?.trim()).filter(Boolean)),
  ] as string[];
  const oracleSources = args.oracleChecks
    ? [
        { source: 'pre-trade-oracle:source', ...args.oracleChecks.source },
        { source: 'pre-trade-oracle:destination', ...args.oracleChecks.destination },
      ]
    : [];
  return {
    reason_code: rules[0] ?? 'POLICY_REJECTION',
    input_digest: args.quoteDigest ?? sha256(JSON.stringify(args.input)),
    triggered_threshold: {
      rules,
      maxSlippageBps: args.policy.maxSlippageBps,
      slippageBps: args.input.slippageBps,
      maxPriceImpactPct: args.policy.maxPriceImpactPct,
      priceImpactPct: args.input.priceImpactPct,
      maxRouteSteps: args.policy.maxRouteSteps,
      routeSteps: args.input.routePlan.length,
      maxQuoteAgeSeconds: args.policy.maxQuoteAgeSeconds,
      quoteAgeSeconds: args.metrics.quoteAgeSeconds,
    },
    data_sources: [
      {
        source: 'jupiter-quote-and-route-plan',
        quoteDigest: args.quoteDigest,
        contextSlot: args.input.quoteContextSlot,
        quotedAt: args.input.quotedAt,
        reviewedPools: args.metrics.reviewedPools,
      },
      ...oracleSources,
    ],
    risk_ruleset_version: SOLANA_JUPITER_SWAP_GUARD_RULE_SET,
  };
}

function buildResult(args: {
  input: SolanaJupiterSwapGuardInput | null;
  policy: SolanaJupiterSwapGuardResult['policy'];
  evaluatedAt: string;
  verdict: SolanaJupiterSwapGuardVerdict;
  status: SolanaJupiterSwapGuardStatus;
  reasons: string[];
  metrics: SolanaJupiterSwapGuardMetrics;
  route: SolanaJupiterSwapGuardResult['route'];
  oracleChecks: SolanaJupiterSwapGuardResult['oracleChecks'];
  quoteDigest: `0x${string}` | null;
}): SolanaJupiterSwapGuardResult {
  const { productOutcome, chargeable, executable } = outcomeFor(args.verdict, args.status);
  const evidence =
    productOutcome === 'rejected' && args.input
      ? rejectedEvidence({
          input: args.input,
          policy: args.policy,
          metrics: args.metrics,
          reasons: args.reasons,
          oracleChecks: args.oracleChecks,
          quoteDigest: args.quoteDigest,
        })
      : null;
  const riskVerdictRef: SolanaJupiterSwapRiskVerdictRef = {
    source: 'solana_jupiter_swap_guard',
    schema: SOLANA_JUPITER_SWAP_GUARD_SCHEMA,
    ruleSetVersion: SOLANA_JUPITER_SWAP_GUARD_RULE_SET,
    verdict: args.verdict,
    status: args.status,
    productOutcome,
    evaluatedAt: args.evaluatedAt,
    quoteDigest: args.quoteDigest,
    reasonsDigest: sha256(JSON.stringify(args.reasons)),
    reasons: [...args.reasons],
  };
  return {
    schema: SOLANA_JUPITER_SWAP_GUARD_SCHEMA,
    ruleSetVersion: SOLANA_JUPITER_SWAP_GUARD_RULE_SET,
    chainId: 0,
    chainRef: SOLANA_JUPITER_CHAIN_REF,
    verdict: args.verdict,
    status: args.status,
    productOutcome,
    chargeable,
    executable,
    evaluatedAt: args.evaluatedAt,
    scope: {
      transactionAuthority: 'none',
      binding: 'jupiter_quote_and_route_plan',
      enforcement: 'reviewed_pool_allowlist_and_oracle_consensus',
    },
    route: args.route,
    policy: args.policy,
    metrics: args.metrics,
    oracleChecks: args.oracleChecks,
    reasons: args.reasons,
    riskVerdictRef,
    evidence,
    next: {
      execution: 'not_performed',
      priorSeal:
        'Bind only a PASS decision to the exact Jupiter quote digest before user authorization. CAUTION is internal and maps to rejected; nothing else is executable.',
    },
  };
}

const EMPTY_METRICS: SolanaJupiterSwapGuardMetrics = {
  priceImpactPct: null,
  slippageBps: null,
  minimumOutSlippageBps: null,
  routeSteps: null,
  reviewedPools: [],
  unknownPools: [],
  quoteAgeSeconds: null,
};

/**
 * Assess one Jupiter spot quote against the reviewed route policy and the two
 * oracle legs. Never throws for upstream/data problems: those return
 * `status: 'unavailable'` so the product surface does not charge for them.
 */
export async function assessSolanaJupiterSwapGuard(
  rawInput: unknown,
  dependencies: SolanaJupiterSwapGuardDependencies = {}
): Promise<SolanaJupiterSwapGuardResult> {
  const now = (dependencies.now ?? (() => new Date()))();
  const evaluatedAt = now.toISOString();
  const parsed = SolanaJupiterSwapGuardInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    const policy = effectivePolicy(
      rawInput && typeof rawInput === 'object' && 'policy' in rawInput
        ? ((rawInput as { policy?: SolanaJupiterSwapGuardInput['policy'] }).policy ?? undefined)
        : undefined
    );
    return buildResult({
      input: null,
      policy,
      evaluatedAt,
      verdict: 'BLOCK',
      status: 'unavailable',
      reasons: [
        `GUARD_INPUT_INCOMPLETE_OR_INVALID: ${parsed.error.issues
          .map((issue) => `${issue.path.join('.') || 'input'} ${issue.message}`)
          .join('; ')}`,
      ],
      metrics: EMPTY_METRICS,
      route: null,
      oracleChecks: null,
      quoteDigest: null,
    });
  }

  const input = parsed.data;
  const policy = effectivePolicy(input.policy);
  const reasons: string[] = [];
  const reviewedPoolSet = new Set(policy.reviewedPools);
  const routeCoverage = poolCoverage(input.routePlan, reviewedPoolSet);
  const unknownPools: string[] = [...routeCoverage.unknownPools];
  const sourceToken = tokenByMint(input.inputMint);
  const destinationToken = tokenByMint(input.outputMint);

  const route = {
    inputMint: input.inputMint,
    outputMint: input.outputMint,
    sourceAsset: sourceToken?.symbol ?? 'UNKNOWN',
    destinationAsset: destinationToken?.symbol ?? 'UNKNOWN',
    amountInRaw: input.amountInRaw,
    amountOutRaw: input.amountOutRaw,
    minimumOutRaw: input.minimumOutRaw,
    contextSlot: input.quoteContextSlot,
    pools: input.routePlan.map((step) => step.ammKey),
    steps: input.routePlan.map((step) => ({
      ...step,
      reviewed: reviewedPoolSet.has(step.ammKey),
    })),
  };

  const amountOut = BigInt(input.amountOutRaw);
  const minimumOut = BigInt(input.minimumOutRaw);
  const minimumOutSlippageBps =
    amountOut > 0n ? Number(((amountOut - minimumOut) * 10_000n) / amountOut) : null;
  const quoteAgeSeconds = (() => {
    const quotedAtMs = Date.parse(input.quotedAt);
    return Number.isFinite(quotedAtMs) ? Math.round((now.getTime() - quotedAtMs) / 1_000) : null;
  })();

  const metrics: SolanaJupiterSwapGuardMetrics = {
    priceImpactPct: input.priceImpactPct,
    slippageBps: input.slippageBps,
    minimumOutSlippageBps,
    routeSteps: input.routePlan.length,
    reviewedPools: route.pools.filter((pool) => reviewedPoolSet.has(pool)),
    unknownPools,
    quoteAgeSeconds,
  };
  const quoteDigest = routeDigest(input);

  let verdict: SolanaJupiterSwapGuardVerdict = 'PASS';
  let status: SolanaJupiterSwapGuardStatus = 'decided';
  const block = (reason: string): void => {
    verdict = 'BLOCK';
    reasons.push(reason);
  };
  const unavailable = (reason: string): void => {
    verdict = 'BLOCK';
    status = 'unavailable';
    reasons.push(reason);
  };

  if (!sourceToken) {
    const coverage = classifyMint(input.inputMint, input.routePlan);
    unavailable(
      coverageReason(
        coverage,
        'INPUT_MINT',
        `${input.inputMint} cannot be assessed (${coverageByMintDetail(coverage, input.inputMint)})`
      )
    );
  }
  if (!destinationToken) {
    const coverage = classifyMint(input.outputMint, input.routePlan);
    unavailable(
      coverageReason(
        coverage,
        'OUTPUT_MINT',
        `${input.outputMint} cannot be assessed (${coverageByMintDetail(coverage, input.outputMint)})`
      )
    );
  }
  if (routeCoverage.reasons.length > 0) {
    for (const reason of routeCoverage.reasons) unavailable(reason);
  }

  if (input.slippageBps > policy.maxSlippageBps) {
    block(
      `SLIPPAGE_ABOVE_POLICY: requested ${input.slippageBps} bps exceeds ${policy.maxSlippageBps} bps`
    );
  }

  if (input.routePlan.length > policy.maxRouteSteps) {
    block(
      `ROUTE_TOO_COMPLEX: ${input.routePlan.length} steps exceeds the reviewed ${policy.maxRouteSteps}`
    );
  }

  if (minimumOut > amountOut) {
    // The quote's own economics contradict each other: this is a completed rule
    // evaluation and therefore a chargeable rejection, not missing coverage.
    block(`MIN_OUT_EXCEEDS_QUOTE_OUTPUT: minimum ${minimumOut} > quoted ${amountOut}`);
  } else if (minimumOutSlippageBps !== null && minimumOutSlippageBps > input.slippageBps) {
    block(
      `MIN_OUT_INCONSISTENT_WITH_SLIPPAGE: implied ${minimumOutSlippageBps} bps exceeds requested ${input.slippageBps} bps`
    );
  }

  if (input.priceImpactPct > policy.maxPriceImpactPct) {
    block(
      `PRICE_IMPACT_ABOVE_POLICY: ${input.priceImpactPct}% exceeds ${policy.maxPriceImpactPct}%`
    );
  } else if (input.priceImpactPct >= policy.cautionPriceImpactPct) {
    if (verdict === 'PASS') verdict = 'CAUTION';
    reasons.push(
      `PRICE_IMPACT_REQUIRES_REVIEW: ${input.priceImpactPct}% is within policy but at or above the ${policy.cautionPriceImpactPct}% review threshold`
    );
  }

  const percentTotal = input.routePlan.reduce((total, step) => total + step.percent, 0);
  if (percentTotal !== 100) {
    unavailable(`ROUTE_PERCENT_DOES_NOT_SUM_TO_100: ${percentTotal}`);
  }

  const first = input.routePlan[0];
  const last = input.routePlan[input.routePlan.length - 1];
  if (first.inputMint !== input.inputMint) {
    unavailable('ROUTE_INPUT_MINT_MISMATCH');
  }
  if (last.outputMint !== input.outputMint) {
    unavailable('ROUTE_OUTPUT_MINT_MISMATCH');
  }
  for (let index = 0; index < input.routePlan.length - 1; index += 1) {
    if (input.routePlan[index].outputMint !== input.routePlan[index + 1].inputMint) {
      unavailable(`ROUTE_STEP_DISCONTINUITY: index ${index}`);
    }
  }
  if (amountOut === 0n || BigInt(input.amountInRaw) === 0n) {
    unavailable('ROUTE_AMOUNT_IS_ZERO');
  }
  if (quoteAgeSeconds === null || quoteAgeSeconds > policy.maxQuoteAgeSeconds) {
    unavailable(
      `QUOTE_STALE_OR_UNVERIFIABLE: age ${quoteAgeSeconds ?? 'unknown'}s exceeds ${policy.maxQuoteAgeSeconds}s`
    );
  } else if (quoteAgeSeconds < -5) {
    unavailable(`QUOTE_TIMESTAMP_IN_FUTURE: ${quoteAgeSeconds}s`);
  }

  // The rule helpers mutate `verdict` through closures, so read it through a
  // function to keep TypeScript from over-narrowing the captured variable.
  const isBlocked = (): boolean => verdict === 'BLOCK';

  let oracleChecks: SolanaJupiterSwapGuardResult['oracleChecks'] = null;
  if (status === 'decided' && !isBlocked() && sourceToken && destinationToken) {
    const checkOracle = dependencies.checkOracle ?? preTradeSafetyCheck;
    const timeoutMs = dependencies.timeoutMs ?? DEFAULT_ORACLE_TIMEOUT_MS;
    try {
      const [sourceResult, destinationResult] = await withTimeout(
        Promise.all([
          checkOracle({
            asset: sourceToken.symbol,
            destinationAsset: destinationToken.symbol,
            chainId: 0,
            action: 'swap',
            tradeAmountUsd: input.tradeAmountUsd,
            schemaVersion: 3,
          }),
          checkOracle({
            asset: destinationToken.symbol,
            destinationAsset: sourceToken.symbol,
            chainId: 0,
            action: 'swap',
            tradeAmountUsd: input.tradeAmountUsd,
            schemaVersion: 3,
          }),
        ]),
        timeoutMs,
        'Solana Jupiter oracle checks'
      );
      oracleChecks = {
        source: summarize(sourceResult),
        destination: summarize(destinationResult),
      };
      const blocking = [sourceResult.verdict, destinationResult.verdict].some(
        (value) => value === 'DANGER' || value === 'BLOCK'
      );
      const caution = [sourceResult.verdict, destinationResult.verdict].some(
        (value) => value === 'CAUTION'
      );
      if (blocking) {
        block('ORACLE_CONSENSUS_BLOCKING: at least one leg is DANGER or BLOCK');
      } else if (caution) {
        if (verdict === 'PASS') verdict = 'CAUTION';
        reasons.push('ORACLE_CONSENSUS_REQUIRES_REVIEW: at least one leg is CAUTION');
      }
    } catch (error) {
      oracleChecks = { source: UNAVAILABLE_ORACLE, destination: UNAVAILABLE_ORACLE };
      unavailable(`ORACLE_EVIDENCE_UNAVAILABLE: ${message(error)}`);
    }
  } else if (status === 'decided' && isBlocked()) {
    reasons.push('ORACLE_CHECKS_SKIPPED_AFTER_RULE_BLOCK');
  }

  if (reasons.length === 0) {
    reasons.push(
      'Jupiter route pools, mints, slippage/min-out, price impact, quote freshness, and both oracle legs passed the reviewed policy.'
    );
  }

  return buildResult({
    input,
    policy,
    evaluatedAt,
    verdict,
    status,
    reasons,
    metrics,
    route,
    oracleChecks,
    quoteDigest,
  });
}
