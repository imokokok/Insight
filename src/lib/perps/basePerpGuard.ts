import { z } from 'zod';

import { preTradeSafetyCheck, type PreTradeSafetyResult } from '@/lib/safety/preTrade';

import { BasePerpExactTransactionSchema } from './basePerpAction';
import { SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID } from './basePerpConstants';
import {
  basePerpLiquidityConcern,
  basePerpLiquidityEvidenceNotRequested,
  type BasePerpLiquidityEvidence,
  type FetchBasePerpLiquidityEvidence,
} from './basePerpLiquidityEvidence';

/**
 * A read-only, Base-only perpetual-futures decision gate for Synthetix Perps
 * V3. It deliberately evaluates caller-declared post-action USD values rather
 * than constructing, signing, or sending an order. A caller must bind a
 * successful response to an exact, user-authorized order separately.
 *
 * Scope: underlying and margin oracle integrity plus the declared leverage
 * band. The venue's mark-price aggregation, funding, and liquidation engine
 * are outside this guard's claims.
 */

// Re-exported for compatibility with existing importers.
export { SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID } from './basePerpConstants';

/**
 * Reviewed per-market leverage caps for Synthetix Perps V3 on Base. These are
 * conservative static profile values, not live venue reads: Synthetix market
 * parameters are governance-controlled and can change, so the guard surfaces
 * the static source and always asks the caller to verify live configuration.
 * Markets outside this set fail closed with an error.
 */
const REVIEWED_MARKETS = {
  BTC: { maxLeverage: 25 },
  ETH: { maxLeverage: 25 },
  SOL: { maxLeverage: 20 },
  XRP: { maxLeverage: 20 },
  DOGE: { maxLeverage: 15 },
  PEPE: { maxLeverage: 10 },
} as const satisfies Record<string, { maxLeverage: number }>;

export type BasePerpGuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';

export const BasePerpGuardInputSchema = z.object({
  protocolId: z.literal(SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID),
  action: z.enum(['open_long', 'open_short']),
  assetSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
  /** v1 reviews only the USDC-margin deployment. */
  marginAssetSymbol: z.literal('USDC'),
  /** Caller-declared post-action notional position value, in USD. */
  sizeUsd: z.number().finite().positive().max(1_000_000_000_000),
  /** Caller-declared post-action margin value, in USD. */
  marginValueUsd: z.number().finite().positive().max(1_000_000_000_000),
});
export type BasePerpGuardInput = z.infer<typeof BasePerpGuardInputSchema>;

/** Exact-call mode: one guard assessment bound to one unsigned order call. */
export const BasePerpGuardExactInputSchema = z
  .object({
    guard: BasePerpGuardInputSchema,
    transaction: BasePerpExactTransactionSchema,
  })
  .strict();
export type BasePerpGuardExactInput = z.infer<typeof BasePerpGuardExactInputSchema>;

interface ReviewedMarket {
  maxLeverage: number;
}

export interface BasePerpGuardOracleCheckSummary {
  verdict: PreTradeSafetyResult['verdict'];
  maxDeviationPct: number;
  staleDataRisk: boolean;
  participantCount: number;
  /** A reference to the separately verifiable Oracle Safety attestation, if configured. */
  attestationUid: string | null;
  attester: string | null;
}

export interface BasePerpGuardResult {
  schema: 'insight.base-perp-guard.v1';
  verdict: BasePerpGuardVerdict;
  protocolId: typeof SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID;
  action: BasePerpGuardInput['action'];
  evaluatedAt: string;
  scope: {
    chainId: 8453;
    transactionAuthority: 'none';
    valuation: 'caller_declared_post_action_usd';
  };
  market: {
    assetSymbol: string;
    marginAssetSymbol: string;
    maxLeverage: number;
    parameterSource: 'reviewed-profile';
  };
  projected: {
    sizeUsd: number;
    marginValueUsd: number;
    effectiveLeverage: number;
    liquidationBufferPct: number;
    conservativeMaxSizeUsd: number;
  };
  oracleChecks: {
    underlying: BasePerpGuardOracleCheckSummary;
    margin: BasePerpGuardOracleCheckSummary;
  };
  /**
   * v3 context layer: reviewed Base spot-market evidence for the underlying.
   * It never enters the cross-oracle consensus; only concrete observed
   * concerns escalate an ALLOW to CAUTION.
   */
  liquidity: BasePerpLiquidityEvidence;
  reasons: string[];
  next: {
    execution: 'not_performed';
    priorSeal: string;
  };
}

export interface BasePerpGuardDependencies {
  checkOracle?: typeof preTradeSafetyCheck;
  /** v3 opt-in: observe reviewed Base spot-market evidence for the underlying. */
  fetchLiquidityEvidence?: FetchBasePerpLiquidityEvidence;
  now?: () => Date;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function summarize(result: PreTradeSafetyResult): BasePerpGuardOracleCheckSummary {
  return {
    verdict: result.verdict,
    maxDeviationPct: result.maxDeviationPct,
    staleDataRisk: result.staleDataRisk,
    participantCount: result.participantCount,
    attestationUid: result.attestation?.uid ?? null,
    attester: result.attestation?.attester ?? null,
  };
}

function isBlockingOracleVerdict(verdict: PreTradeSafetyResult['verdict']): boolean {
  return verdict === 'DANGER' || verdict === 'BLOCK';
}

export async function assessBasePerpGuard(
  rawInput: BasePerpGuardInput,
  dependencies: BasePerpGuardDependencies = {}
): Promise<BasePerpGuardResult> {
  const input = BasePerpGuardInputSchema.parse(rawInput);
  const checkOracle = dependencies.checkOracle ?? preTradeSafetyCheck;
  const evaluatedAt = (dependencies.now ?? (() => new Date()))().toISOString();

  const profile: ReviewedMarket | undefined =
    REVIEWED_MARKETS[normalizeSymbol(input.assetSymbol) as keyof typeof REVIEWED_MARKETS];
  if (!profile) {
    throw new Error('Declared market is not in the reviewed Synthetix Perps V3 Base market set');
  }

  const [underlyingResult, marginResult, liquidity] = await Promise.all([
    checkOracle({
      asset: input.assetSymbol,
      chainId: 8453,
      action: 'swap',
      tradeAmountUsd: input.sizeUsd,
    }),
    checkOracle({
      asset: input.marginAssetSymbol,
      chainId: 8453,
      action: 'swap',
      tradeAmountUsd: input.marginValueUsd,
    }),
    (
      dependencies.fetchLiquidityEvidence ??
      (async () => basePerpLiquidityEvidenceNotRequested(input.assetSymbol))
    )(input),
  ]);

  const effectiveLeverage = input.sizeUsd / input.marginValueUsd;
  const liquidationBufferPct = Math.max(0, (1 - effectiveLeverage / profile.maxLeverage) * 100);
  // 90% of the reviewed market cap leaves a mechanical buffer. This is
  // advisory; it is not a claim that the position is safe under every move.
  const conservativeMaxSizeUsd = input.marginValueUsd * profile.maxLeverage * 0.9;
  const reasons: string[] = [];
  let verdict: BasePerpGuardVerdict = 'ALLOW';

  if (
    isBlockingOracleVerdict(underlyingResult.verdict) ||
    isBlockingOracleVerdict(marginResult.verdict)
  ) {
    verdict = 'BLOCK';
    reasons.push('At least one underlying or margin oracle assessment is DANGER or BLOCK.');
  }
  if (effectiveLeverage >= profile.maxLeverage) {
    verdict = 'BLOCK';
    reasons.push(
      'Declared post-action leverage is at or above the reviewed market cap, leaving no reviewed buffer.'
    );
  } else if (effectiveLeverage >= profile.maxLeverage * 0.9) {
    if (verdict !== 'BLOCK') verdict = 'CAUTION';
    reasons.push('Declared post-action leverage consumes at least 90% of the reviewed market cap.');
  }
  if (underlyingResult.verdict === 'CAUTION' || marginResult.verdict === 'CAUTION') {
    if (verdict !== 'BLOCK') verdict = 'CAUTION';
    reasons.push('At least one oracle assessment requires review before execution.');
  }
  // v3 context layer: disclosed liquidity evidence. Only concrete observed
  // concerns escalate an ALLOW; unavailability never changes the verdict.
  const liquidityConcern = basePerpLiquidityConcern(liquidity);
  if (liquidityConcern) {
    reasons.push(liquidityConcern);
    if (liquidity.status === 'observed' && verdict === 'ALLOW') verdict = 'CAUTION';
  }
  reasons.push(
    'Leverage bands come from a static reviewed profile; live Synthetix market parameters are governance-controlled and can change. Verify live venue configuration before execution.'
  );
  if (verdict === 'ALLOW') {
    reasons.push(
      'Oracle checks passed and declared post-action leverage remains below the conservative guard band.'
    );
  }

  return {
    schema: 'insight.base-perp-guard.v1',
    verdict,
    protocolId: SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID,
    action: input.action,
    evaluatedAt,
    scope: {
      chainId: 8453,
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
    },
    market: {
      assetSymbol: input.assetSymbol,
      marginAssetSymbol: input.marginAssetSymbol,
      maxLeverage: profile.maxLeverage,
      parameterSource: 'reviewed-profile',
    },
    projected: {
      sizeUsd: input.sizeUsd,
      marginValueUsd: input.marginValueUsd,
      effectiveLeverage,
      liquidationBufferPct,
      conservativeMaxSizeUsd,
    },
    oracleChecks: { underlying: summarize(underlyingResult), margin: summarize(marginResult) },
    liquidity,
    reasons,
    next: {
      execution: 'not_performed',
      priorSeal: 'Bind this decision to an exact, user-authorized order before execution.',
    },
  };
}
