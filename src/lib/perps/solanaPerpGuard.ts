/**
 * @fileoverview Solana perpetual-futures guard (Drift Protocol v2 evidence).
 *
 * Mirrors the Hyperliquid perp guard: a read-only decision gate that evaluates
 * caller-declared post-action USD values against live venue evidence and
 * cross-oracle consensus, never constructing, signing, or submitting a
 * transaction. A caller must separately bind a successful response to one
 * exact, user-authorized unsigned transaction before execution — the Drift
 * transaction-binding surface lives in `solanaPerpAction.ts` and is exposed
 * through `assessSolanaPerpGuardExact` below.
 *
 * Scope: cross-oracle consensus integrity for the underlying and USDC margin,
 * the declared leverage band against a reviewed static profile (capped by the
 * live on-chain margin ratios), and disclosed Drift venue evidence (mark/oracle
 * divergence, funding, open interest utilisation, market status). Drift's
 * liquidation engine, matching priority, and later AMM changes are outside
 * this guard's claims.
 *
 * Cross-oracle consensus runs on canonical Ethereum-mainnet feeds: BTC, ETH,
 * and USDC carry deep independent coverage there, and consensus prices are
 * chain-agnostic for these majors. Drift's own Pyth Lazer oracle price is
 * compared against that consensus as a separate disclosed cross-venue check.
 *
 * Drift v2 publishes no REST API; the venue layer (`driftPerpMarket.ts`)
 * reads the reviewed markets' Anchor accounts directly through the repository's
 * Solana mainnet RPC configuration.
 */

import { getProgramDerivedAddress, type Address } from '@solana/kit';
import { z } from 'zod';

import { getRpcEndpoints } from '@/lib/execution/rpcEndpoints';
import { simulateSolanaTransaction } from '@/lib/execution/solanaSimulation';
import {
  decodeSolanaBase58,
  serializeUnsignedSolanaLendingTransaction,
  SolanaLendingTransactionSchema,
  type SolanaLendingTransaction,
} from '@/lib/lending/solanaLendingAction';
import {
  fetchDriftPerpMarketEvidence,
  findReviewedDriftPerpMarket,
  DRIFT_V2_MAINNET_PROGRAM_ID,
  SOLANA_MAINNET_CAIP2,
  type DriftPerpMarketEvidence,
} from '@/lib/perps/driftPerpMarket';
import {
  bps,
  escalatePerpGuardVerdict,
  evaluatePerpGuardLeverageBand,
  evaluatePerpGuardLeverageVerdicts,
  evaluatePerpGuardVenueIntegrity,
  isBlockingOracleVerdict,
  roundTo,
  summarizeOracleCheck,
  type PerpGuardOracleCheckSummary,
  type PerpGuardVerdict,
} from '@/lib/perps/perpGuardKernel';
import {
  decodeSolanaPerpExactCall,
  DRIFT_BASE_PRECISION,
  type DriftPerpDecodedAction,
} from '@/lib/perps/solanaPerpAction';
import { enforceReviewedProfile, type ProfileEnforcement } from '@/lib/reviewed/enforcement';
import { preTradeSafetyCheck } from '@/lib/safety/preTrade';

export const SOLANA_PERP_GUARD_DRIFT_V2_PROTOCOL_ID = 'drift-v2-mainnet';
export const SOLANA_PERP_GUARD_SCHEMA_VERSION = 'insight.solana-perp-guard.v1';

/**
 * Reviewed per-market static leverage caps for Drift v2 perps, derived from
 * the on-chain margin ratios at review time (2026-11-04: marginRatioInitial
 * 500 / MARGIN_PRECISION 1e4 = 5% initial margin for all three reviewed
 * majors). Markets outside this set fail closed.
 */
const REVIEWED_MARKETS = {
  SOL: { maxLeverage: 20 },
  BTC: { maxLeverage: 20 },
  ETH: { maxLeverage: 20 },
} as const satisfies Record<string, { maxLeverage: number }>;

/**
 * Reviewed open-interest utilisation bands against the on-chain
 * maxOpenInterest backstop. Near the cap, new size cannot open reliably and
 * liquidation cascades propagate through the AMM.
 */
const OPEN_INTEREST_UTILIZATION_CAUTION_PCT = 85;
const OPEN_INTEREST_UTILIZATION_BLOCK_PCT = 98;

/**
 * Shared kernel verdict ladder. The guard's public verdict type is preserved
 * verbatim; escalation itself lives in the kernel.
 */
export type SolanaPerpGuardVerdict = PerpGuardVerdict;

export const SolanaPerpGuardInputSchema = z.object({
  protocolId: z.literal(SOLANA_PERP_GUARD_DRIFT_V2_PROTOCOL_ID),
  action: z.enum(['open_long', 'open_short']),
  assetSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
  /** Drift v2 perps are USDC-margined; v1 reviews only that deployment. */
  marginAssetSymbol: z.literal('USDC'),
  /** Caller-declared post-action notional position value, in USD. */
  sizeUsd: z.number().finite().positive().max(1_000_000_000_000),
  /** Caller-declared post-action margin value, in USD. */
  marginValueUsd: z.number().finite().positive().max(1_000_000_000_000),
});
export type SolanaPerpGuardInput = z.infer<typeof SolanaPerpGuardInputSchema>;

/** Shared kernel oracle-check summary shape (identical across perp venues). */
export type SolanaPerpGuardOracleCheckSummary = PerpGuardOracleCheckSummary;

export interface SolanaPerpGuardVenueEvidence {
  status: 'observed' | 'unavailable';
  observedAt: string | null;
  sourceFreshnessSeconds: number | null;
  markPrice: number | null;
  oraclePrice: number | null;
  markOracleDeviationBps: number | null;
  /** Order-book depth is not decoded on-chain in this phase. */
  displayedTopDepthNotionalUsd: null;
  fundingRate: number | null;
  openInterestCoin: number | null;
  dayNotionalVolume: null;
  liveMaxLeverage: number | null;
  /** Cross-venue deviation between Insight consensus and the venue oracle price. */
  consensusVenueDeviationPct: number | null;
  /** Drift-specific disclosed evidence (null when unavailable). */
  drift: {
    marketIndex: number | null;
    marketAccountAddress: string | null;
    oracleSource: string | null;
    oracleSourceSupported: boolean | null;
    oracleConfidence: number | null;
    markPriceTwap: number | null;
    last24hAvgFundingRatePerHourPercent: number | null;
    fundingPeriodSeconds: number | null;
    openInterestNotionalUsd: number | null;
    maxOpenInterestBase: number | null;
    openInterestUtilizationPct: number | null;
    netBaseAssetAmount: number | null;
    marginRatioMaintenance: number | null;
    contractTier: string | null;
    marketStatus: string | null;
    pausedOperationsMask: number | null;
    ammLastUpdateSlot: number | null;
    unavailableReason: string | null;
  };
}

export interface SolanaPerpGuardResult {
  schema: typeof SOLANA_PERP_GUARD_SCHEMA_VERSION;
  verdict: SolanaPerpGuardVerdict;
  protocolId: typeof SOLANA_PERP_GUARD_DRIFT_V2_PROTOCOL_ID;
  action: SolanaPerpGuardInput['action'];
  evaluatedAt: string;
  scope: {
    venue: 'drift';
    network: typeof SOLANA_MAINNET_CAIP2;
    transactionAuthority: 'none';
    valuation: 'caller_declared_post_action_usd';
  };
  market: {
    assetSymbol: string;
    marginAssetSymbol: string;
    maxLeverage: number;
    maxLeverageSource:
      | 'reviewed-profile'
      | 'reviewed-profile-capped-by-live-venue'
      | 'reviewed-profile-live-unavailable';
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
    underlying: SolanaPerpGuardOracleCheckSummary;
    margin: SolanaPerpGuardOracleCheckSummary;
  };
  /**
   * Disclosed Drift venue evidence. It never enters the cross-oracle
   * consensus; concrete observed concerns escalate the verdict, and
   * unavailability is disclosed without changing it.
   */
  venue: SolanaPerpGuardVenueEvidence;
  reasons: string[];
  next: {
    execution: 'not_performed';
    priorSeal: string;
  };
  /**
   * Optional advisory from the evidence-graded reviewed-profile enforcement
   * layer. Present on every assessment; informational only, never changes the
   * verdict by itself. See `src/lib/reviewed/enforcement.ts`.
   */
  reviewedProfile?: ProfileEnforcement;
}

export interface SolanaPerpGuardDependencies {
  checkOracle?: typeof preTradeSafetyCheck;
  fetchVenueState?: (
    input: SolanaPerpGuardInput,
    now: Date
  ) => Promise<SolanaPerpGuardVenueEvidence>;
  now?: () => Date;
  /**
   * P0-2 reviewed-profile enforcement mode. Production DEFAULT is 'enforced':
   * a first-hand-disproved / frozen profile is hard-BLOCKed before any ALLOW
   * or signed decision is produced. The ONLY other value,
   * 'bypass-for-offline-review', is STRICTLY for offline re-review and unit
   * tests that exercise the guard's own evaluation logic — it must NEVER be
   * set in production. See `src/lib/reviewed/enforcement.ts` (its `strict`
   * grading switch defaults to false and stays off in production).
   */
  reviewedProfileEnforcement?: { mode: 'enforced' | 'bypass-for-offline-review' };
}

function normalizeSymbol(symbol: string): string {
  // Accept both the base symbol (BTC) and the Drift market name (BTC-PERP).
  return symbol
    .trim()
    .toUpperCase()
    .replace(/-PERP$/, '');
}

/**
 * Fetch the reviewed market's on-chain evidence and map it into the guard's
 * disclosed venue-evidence shape. All decode/observation failures collapse
 * into the explicit `unavailable` status (fail closed, never invented).
 */
export async function fetchSolanaPerpGuardVenueState(
  input: SolanaPerpGuardInput,
  now: Date
): Promise<SolanaPerpGuardVenueEvidence> {
  const observedAt = now.toISOString();
  const unavailable = (reason: string): SolanaPerpGuardVenueEvidence => ({
    status: 'unavailable',
    observedAt: null,
    sourceFreshnessSeconds: null,
    markPrice: null,
    oraclePrice: null,
    markOracleDeviationBps: null,
    displayedTopDepthNotionalUsd: null,
    fundingRate: null,
    openInterestCoin: null,
    dayNotionalVolume: null,
    liveMaxLeverage: null,
    consensusVenueDeviationPct: null,
    drift: {
      marketIndex: null,
      marketAccountAddress: null,
      oracleSource: null,
      oracleSourceSupported: null,
      oracleConfidence: null,
      markPriceTwap: null,
      last24hAvgFundingRatePerHourPercent: null,
      fundingPeriodSeconds: null,
      openInterestNotionalUsd: null,
      maxOpenInterestBase: null,
      openInterestUtilizationPct: null,
      netBaseAssetAmount: null,
      marginRatioMaintenance: null,
      contractTier: null,
      marketStatus: null,
      pausedOperationsMask: null,
      ammLastUpdateSlot: null,
      unavailableReason: reason,
    },
  });

  try {
    const reviewed = findReviewedDriftPerpMarket(input.assetSymbol);
    if (!reviewed) {
      throw new Error(`assetSymbol ${input.assetSymbol} is not a reviewed Drift perp market`);
    }
    const evidence: DriftPerpMarketEvidence = await fetchDriftPerpMarketEvidence(reviewed);
    const markOracleDeviationBps =
      evidence.markPrice !== null && evidence.oraclePrice !== null
        ? Math.abs(bps(evidence.markPrice, evidence.oraclePrice))
        : null;
    const openInterestUtilizationPct =
      evidence.openInterestBase !== null &&
      evidence.maxOpenInterestBase !== null &&
      evidence.maxOpenInterestBase > 0
        ? (Math.max(0, evidence.openInterestBase) / evidence.maxOpenInterestBase) * 100
        : null;
    const consensusVenueDeviationPct: number | null = null;
    return {
      status: 'observed',
      observedAt,
      sourceFreshnessSeconds:
        evidence.markPriceTwapUpdatedAtMs !== null
          ? Math.max(0, Math.round((now.getTime() - evidence.markPriceTwapUpdatedAtMs) / 1000))
          : null,
      markPrice: evidence.markPrice,
      oraclePrice: evidence.oraclePrice,
      markOracleDeviationBps:
        markOracleDeviationBps === null ? null : roundTo(markOracleDeviationBps, 2),
      displayedTopDepthNotionalUsd: null,
      fundingRate: evidence.fundingRatePerHourFraction,
      openInterestCoin: evidence.openInterestBase,
      dayNotionalVolume: null,
      liveMaxLeverage: evidence.maxLeverage,
      consensusVenueDeviationPct,
      drift: {
        marketIndex: evidence.marketIndex,
        marketAccountAddress: evidence.marketAccountAddress,
        oracleSource: evidence.oracleSource,
        oracleSourceSupported: evidence.oracleSourceSupported,
        oracleConfidence: evidence.oracleConfidence,
        markPriceTwap: evidence.markPriceTwap,
        last24hAvgFundingRatePerHourPercent: evidence.last24hAvgFundingRatePerHourPercent,
        fundingPeriodSeconds: evidence.fundingPeriodSeconds,
        openInterestNotionalUsd: evidence.openInterestNotionalUsd,
        maxOpenInterestBase: evidence.maxOpenInterestBase,
        openInterestUtilizationPct:
          openInterestUtilizationPct === null ? null : roundTo(openInterestUtilizationPct, 2),
        netBaseAssetAmount: evidence.netBaseAssetAmount,
        marginRatioMaintenance: evidence.marginRatioMaintenance,
        contractTier: evidence.contractTier,
        marketStatus: evidence.status,
        pausedOperationsMask: evidence.pausedOperationsMask,
        ammLastUpdateSlot: evidence.ammLastUpdateSlot,
        unavailableReason: null,
      },
    };
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : 'Unknown Drift evidence failure');
  }
}

/**
 * Assess a caller-declared Drift perpetual position against live on-chain
 * venue evidence and cross-oracle consensus. Fails closed: missing venue
 * evidence is disclosed, and every price-integrity check treats missing
 * values as maximum divergence.
 */
export async function assessSolanaPerpGuard(
  rawInput: SolanaPerpGuardInput,
  dependencies: SolanaPerpGuardDependencies = {}
): Promise<SolanaPerpGuardResult> {
  const input = SolanaPerpGuardInputSchema.parse(rawInput);
  const checkOracle = dependencies.checkOracle ?? preTradeSafetyCheck;
  const fetchVenueState = dependencies.fetchVenueState ?? fetchSolanaPerpGuardVenueState;
  const now = dependencies.now?.() ?? new Date();
  const evaluatedAt = now.toISOString();

  const profile =
    REVIEWED_MARKETS[normalizeSymbol(input.assetSymbol) as keyof typeof REVIEWED_MARKETS];
  if (!profile) {
    throw new Error('Declared market is not in the reviewed Solana perp guard market set');
  }

  // P0-2 evidence-graded reviewed-profile enforcement. Called right after
  // input validation and BEFORE any ALLOW / signed decision can be produced.
  // Production defaults to 'enforced' (hard BLOCK for a first-hand-disproved
  // profile such as drift-v2-mainnet); 'bypass-for-offline-review' exists only
  // for offline re-review / unit tests and is never valid in production.
  // `strict` grading stays off (default false) until heartbeat infrastructure
  // is available — see src/lib/reviewed/enforcement.ts.
  const enforcement = enforceReviewedProfile(SOLANA_PERP_GUARD_DRIFT_V2_PROTOCOL_ID);
  const applyEnforcement =
    (dependencies.reviewedProfileEnforcement?.mode ?? 'enforced') === 'enforced';

  const [underlyingResult, marginResult, venueState] = await Promise.all([
    checkOracle({
      asset: input.assetSymbol,
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: input.sizeUsd,
    }),
    checkOracle({
      asset: input.marginAssetSymbol,
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: input.marginValueUsd,
    }),
    fetchVenueState(input, now).catch(() => null),
  ]);

  const venue: SolanaPerpGuardVenueEvidence =
    venueState ?? fetchSolanaPerpGuardVenueStateSyncUnavailable(evaluatedAt);

  // The on-chain margin ratio can be changed by Drift governance at any time;
  // the guard binds to the lower of the reviewed profile and the freshly
  // observed venue value, and discloses when the live value is missing.
  const band = evaluatePerpGuardLeverageBand(
    input.sizeUsd,
    input.marginValueUsd,
    profile.maxLeverage,
    venue.liveMaxLeverage
  );
  const {
    effectiveLeverage,
    maxLeverage,
    cappedByLive,
    liquidationBufferPct,
    conservativeMaxSizeUsd,
  } = band;

  const reasons: string[] = [];
  // P0-2: a first-hand-disproved / frozen reviewed profile starts as BLOCK and
  // can never be downgraded — every CAUTION branch below guards on
  // `verdict !== 'BLOCK'`. All other profiles are advisory-only (the evaluation
  // logic decides the verdict, with `reviewedProfile` attached below).
  let verdict: SolanaPerpGuardVerdict =
    applyEnforcement && enforcement.enforced ? 'BLOCK' : 'ALLOW';
  if (verdict === 'BLOCK') {
    reasons.push(`Reviewed-profile enforcement ${enforcement.reasonCode}: ${enforcement.advisory}`);
  }

  if (
    isBlockingOracleVerdict(underlyingResult.verdict) ||
    isBlockingOracleVerdict(marginResult.verdict)
  ) {
    verdict = 'BLOCK';
    reasons.push('At least one underlying or margin oracle assessment is DANGER or BLOCK.');
  }
  // Mechanical leverage-band verdicts (kernel-owned wording, monotonic merge).
  const leverageVerdicts = evaluatePerpGuardLeverageVerdicts(effectiveLeverage, maxLeverage);
  verdict = escalatePerpGuardVerdict(verdict, leverageVerdicts.verdict);
  reasons.push(...leverageVerdicts.reasons);
  if (underlyingResult.verdict === 'CAUTION' || marginResult.verdict === 'CAUTION') {
    verdict = escalatePerpGuardVerdict(verdict, 'CAUTION');
    reasons.push('At least one oracle assessment requires review before execution.');
  }

  // Disclosed venue-integrity layer. Concrete observed concerns escalate an
  // ALLOW; unavailability is disclosed and never changes the verdict.
  if (venue.status === 'unavailable') {
    reasons.push(
      'Drift venue evidence was unavailable; the verdict rests on oracle consensus and the declared leverage band only.'
    );
  } else {
    // Cross-venue deviation is computed here so it can both disclose and escalate.
    const consensusPrice = underlyingResult.consensusPrice;
    const consensusVenueDeviationPct =
      venue.oraclePrice !== null && consensusPrice > 0
        ? roundTo(Math.abs(((venue.oraclePrice - consensusPrice) / consensusPrice) * 100), 4)
        : null;
    venue.consensusVenueDeviationPct = consensusVenueDeviationPct;

    const venueIntegrity = evaluatePerpGuardVenueIntegrity({
      venueLabel: 'Drift',
      indexPriceLabel: 'oracle price',
      divergenceLabel: 'mark/oracle',
      // Drift's on-chain operating-state literal is 'active' (not 'TRADING');
      // the kernel mirrors the venue's reviewed literal verbatim.
      expectedStatus: 'active',
      markIndexDeviationBps: venue.markOracleDeviationBps,
      consensusVenueDeviationPct,
      marketStatus: venue.drift.marketStatus,
    });
    verdict = escalatePerpGuardVerdict(verdict, venueIntegrity.verdict);
    reasons.push(...venueIntegrity.reasons);

    if (venue.drift.openInterestUtilizationPct !== null) {
      if (venue.drift.openInterestUtilizationPct >= OPEN_INTEREST_UTILIZATION_BLOCK_PCT) {
        verdict = 'BLOCK';
        reasons.push(
          `Open interest consumes ${venue.drift.openInterestUtilizationPct.toFixed(2)}% of the on-chain maxOpenInterest backstop, at or above the reviewed ${OPEN_INTEREST_UTILIZATION_BLOCK_PCT}% backstop.`
        );
      } else if (venue.drift.openInterestUtilizationPct >= OPEN_INTEREST_UTILIZATION_CAUTION_PCT) {
        if (verdict !== 'BLOCK') verdict = 'CAUTION';
        reasons.push(
          `Open interest consumes ${venue.drift.openInterestUtilizationPct.toFixed(2)}% of the on-chain maxOpenInterest backstop, above the reviewed ${OPEN_INTEREST_UTILIZATION_CAUTION_PCT}% advisory band.`
        );
      }
    }
    if (cappedByLive) {
      reasons.push(
        `Live on-chain max leverage ${venue.liveMaxLeverage}x is lower than the static reviewed profile cap ${profile.maxLeverage}x; the guard binds to the live value.`
      );
    }
  }

  reasons.push(
    'Leverage bands come from a static reviewed profile capped by the freshly observed on-chain margin ratios; Drift market parameters can change. Verify live venue configuration before execution.'
  );
  if (verdict === 'ALLOW') {
    reasons.push(
      'Oracle checks passed and declared post-action leverage remains below the conservative guard band.'
    );
  }

  return {
    schema: SOLANA_PERP_GUARD_SCHEMA_VERSION,
    verdict,
    protocolId: SOLANA_PERP_GUARD_DRIFT_V2_PROTOCOL_ID,
    action: input.action,
    evaluatedAt,
    scope: {
      venue: 'drift',
      network: SOLANA_MAINNET_CAIP2,
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
    },
    market: {
      assetSymbol: input.assetSymbol,
      marginAssetSymbol: input.marginAssetSymbol,
      maxLeverage,
      maxLeverageSource: band.maxLeverageSource,
      parameterSource: 'reviewed-profile',
    },
    projected: {
      sizeUsd: input.sizeUsd,
      marginValueUsd: input.marginValueUsd,
      effectiveLeverage: roundTo(effectiveLeverage, 4),
      liquidationBufferPct: roundTo(liquidationBufferPct, 4),
      conservativeMaxSizeUsd,
    },
    oracleChecks: {
      underlying: summarizeOracleCheck(underlyingResult),
      margin: summarizeOracleCheck(marginResult),
    },
    venue,
    reasons,
    next: {
      execution: 'not_performed',
      priorSeal:
        'Bind this decision to one exact, user-authorized unsigned Drift transaction before execution; the binding surface is not part of this assessment.',
    },
    reviewedProfile: enforcement,
  };
}

function fetchSolanaPerpGuardVenueStateSyncUnavailable(
  observedAt: string
): SolanaPerpGuardVenueEvidence {
  return {
    status: 'unavailable',
    observedAt: null,
    sourceFreshnessSeconds: null,
    markPrice: null,
    oraclePrice: null,
    markOracleDeviationBps: null,
    displayedTopDepthNotionalUsd: null,
    fundingRate: null,
    openInterestCoin: null,
    dayNotionalVolume: null,
    liveMaxLeverage: null,
    consensusVenueDeviationPct: null,
    drift: {
      marketIndex: null,
      marketAccountAddress: null,
      oracleSource: null,
      oracleSourceSupported: null,
      oracleConfidence: null,
      markPriceTwap: null,
      last24hAvgFundingRatePerHourPercent: null,
      fundingPeriodSeconds: null,
      openInterestNotionalUsd: null,
      maxOpenInterestBase: null,
      openInterestUtilizationPct: null,
      netBaseAssetAmount: null,
      marginRatioMaintenance: null,
      contractTier: null,
      marketStatus: null,
      pausedOperationsMask: null,
      ammLastUpdateSlot: null,
      unavailableReason: `Drift venue evidence could not be fetched (evaluated at ${observedAt}).`,
    },
  };
}

/**
 * Maximum relative distance between the caller-declared post-action notional
 * assessed by the guard and the notional implied by the bound transaction
 * (base amount × venue oracle price). Market orders carry no explicit limit
 * price, so this is wider than the Hyperliquid IOC binding tolerance (0.1);
 * beyond it the binding fails closed and the caller must re-assess.
 */
export const SOLANA_PERP_BINDING_NOTIONAL_TOLERANCE = 0.15;

export const SolanaPerpGuardExactInputSchema = z
  .object({
    guard: SolanaPerpGuardInputSchema,
    transaction: SolanaLendingTransactionSchema,
  })
  .strict();
export type SolanaPerpGuardExactInput = z.infer<typeof SolanaPerpGuardExactInputSchema>;

export type SolanaPerpGuardAccountCheck = {
  address: string;
  role: 'program' | 'state' | 'user' | 'perp-market';
  owner: string | null;
  executable: boolean | null;
};

export type SolanaPerpGuardSimulation = {
  network: string;
  messageHash: string;
  simulationSlot: number | null;
  simulatedAt: string | null;
  status: string;
  unitsConsumed: number | null;
  feeLamports: string | null;
};

export interface SolanaPerpGuardExactResult extends SolanaPerpGuardResult {
  chainRef: typeof SOLANA_MAINNET_CAIP2;
  exactAction: DriftPerpDecodedAction | null;
  protocolChecks: {
    status: 'VERIFIED' | 'UNAVAILABLE' | 'INVALID';
    accounts: SolanaPerpGuardAccountCheck[];
  };
  simulation: SolanaPerpGuardSimulation | null;
}

export interface SolanaPerpGuardExactDependencies extends SolanaPerpGuardDependencies {
  verifyProtocolAccounts?: (
    transaction: SolanaLendingTransaction,
    decoded: DriftPerpDecodedAction
  ) => Promise<SolanaPerpGuardAccountCheck[]>;
  simulate?: (transaction: SolanaLendingTransaction) => Promise<SolanaPerpGuardSimulation>;
}

/**
 * Assess a caller-declared Drift perp position and bind the decision to one
 * exact unsigned `place_perp_order` transaction: canonical market-order shape,
 * reviewed market index, matching direction, notional within the reviewed
 * tolerance of the declared size, program-owned accounts, and a live protocol
 * simulation of the exact message. Fails closed on any mismatch.
 */
export async function assessSolanaPerpGuardExact(
  rawGuard: SolanaPerpGuardInput,
  rawTransaction: SolanaLendingTransaction,
  dependencies: SolanaPerpGuardExactDependencies = {}
): Promise<SolanaPerpGuardExactResult> {
  const input = {
    guard: SolanaPerpGuardInputSchema.parse(rawGuard),
    transaction: SolanaLendingTransactionSchema.parse(rawTransaction),
  };
  // P0-2 independent fail-closed layer at the exact-binding entry, applied
  // after input validation and before any exact decision could be signed.
  // Production default 'enforced'; 'bypass-for-offline-review' is STRICTLY for
  // offline re-review / unit tests. The `strict` grading switch in
  // src/lib/reviewed/enforcement.ts defaults to false (off in production).
  const enforcement = enforceReviewedProfile(SOLANA_PERP_GUARD_DRIFT_V2_PROTOCOL_ID);
  const applyEnforcement =
    (dependencies.reviewedProfileEnforcement?.mode ?? 'enforced') === 'enforced';
  const guard = await assessSolanaPerpGuard(input.guard, dependencies);
  const reasons = [...guard.reasons];
  let verdict: SolanaPerpGuardVerdict = guard.verdict;
  // Defence in depth: never let the binding layer emit a non-BLOCK verdict for
  // a first-hand-disproved profile even if the upstream guard result were
  // replaced / mocked. The guard already carries the PROFILE_* reason, so only
  // push an additional one when this layer actually has to escalate.
  if (applyEnforcement && enforcement.enforced && verdict !== 'BLOCK') {
    verdict = 'BLOCK';
    reasons.push(
      `Reviewed-profile enforcement (exact-binding layer) ${enforcement.reasonCode}: ${enforcement.advisory}`
    );
  }

  let decoded: DriftPerpDecodedAction | null = null;
  let accountChecks: SolanaPerpGuardAccountCheck[] = [];
  let protocolStatus: SolanaPerpGuardExactResult['protocolChecks']['status'] = 'INVALID';
  let simulation: SolanaPerpGuardSimulation | null = null;

  try {
    decoded = decodeSolanaPerpExactCall(input.transaction);
  } catch (error) {
    verdict = 'BLOCK';
    reasons.push(
      `The transaction is outside the reviewed Drift market-order profile: ${errorMessage(error)}`
    );
  }

  if (decoded) {
    try {
      const reviewed = findReviewedDriftPerpMarket(input.guard.assetSymbol);
      if (!reviewed || reviewed.marketIndex !== decoded.marketIndex) {
        throw new Error(
          `Transaction market index ${decoded.marketIndex} does not match the assessed market ${input.guard.assetSymbol}`
        );
      }
      if (decoded.action !== input.guard.action) {
        throw new Error(
          `Transaction direction ${decoded.action} does not match the assessed ${input.guard.action} action`
        );
      }
      if (decoded.account !== input.transaction.feePayer) {
        throw new Error('Drift order authority must be the fee payer');
      }
      const referencePrice = guard.venue.oraclePrice;
      if (referencePrice === null || referencePrice <= 0) {
        throw new Error(
          'No venue oracle price is available to cross-check the order notional (fail closed)'
        );
      }
      const baseAmount = Number(BigInt(decoded.baseAssetAmount)) / Number(DRIFT_BASE_PRECISION);
      const impliedSizeUsd = baseAmount * referencePrice;
      if (
        !Number.isFinite(impliedSizeUsd) ||
        impliedSizeUsd <= 0 ||
        Math.abs(impliedSizeUsd - input.guard.sizeUsd) / input.guard.sizeUsd >
          SOLANA_PERP_BINDING_NOTIONAL_TOLERANCE
      ) {
        throw new Error(
          'Transaction implied notional departs from the assessed declared size beyond the reviewed tolerance; re-assess at the actual size'
        );
      }
    } catch (error) {
      verdict = 'BLOCK';
      reasons.push(
        `The exact Drift transaction does not match the assessed decision: ${errorMessage(error)}`
      );
    }

    try {
      accountChecks = await (dependencies.verifyProtocolAccounts ?? verifyLiveDriftAccounts)(
        input.transaction,
        decoded
      );
      protocolStatus = 'VERIFIED';
    } catch (error) {
      protocolStatus = 'UNAVAILABLE';
      verdict = 'BLOCK';
      reasons.push(`Reviewed Drift accounts could not be verified live: ${errorMessage(error)}`);
    }

    try {
      simulation = await (dependencies.simulate ?? simulateLiveDriftTransaction)(input.transaction);
      if (simulation.status !== 'SIMULATED')
        throw new Error('Solana RPC reported a failed protocol simulation');
      if (simulation.messageHash !== decoded.messageHash)
        throw new Error('Solana RPC simulation is not for the exact reviewed message');
    } catch (error) {
      verdict = 'BLOCK';
      reasons.push(
        `The exact unsigned transaction did not pass live protocol simulation: ${errorMessage(error)}`
      );
    }
  }

  if (!decoded || protocolStatus !== 'VERIFIED' || !simulation) verdict = 'BLOCK';
  reasons.push(
    'The binding is not a user authorization; PriorSeal (or another authorization system) must bind an ALLOW decision to this exact Solana message before execution.'
  );

  return {
    ...guard,
    verdict,
    reasons,
    chainRef: SOLANA_MAINNET_CAIP2,
    exactAction: decoded,
    protocolChecks: { status: protocolStatus, accounts: accountChecks },
    simulation,
  };
}

async function simulateLiveDriftTransaction(
  transaction: SolanaLendingTransaction
): Promise<SolanaPerpGuardSimulation> {
  const endpoints = getRpcEndpoints(0);
  if (!endpoints) throw new Error('No Solana mainnet RPC endpoint is configured');
  const result = await simulateSolanaTransaction({
    transactionBase64: serializeUnsignedSolanaLendingTransaction(transaction),
    endpoints,
  });
  if (!result.ok) throw new Error(result.message);
  const { payload } = result;
  return {
    network: payload.network,
    messageHash: payload.messageHash,
    simulationSlot: payload.simulationSlot,
    simulatedAt: new Date(payload.simulatedAt * 1_000).toISOString(),
    status: payload.status,
    unitsConsumed: payload.unitsConsumed,
    feeLamports: payload.feeLamports,
  };
}

/**
 * Live verification that the reviewed Drift program is still executable and
 * that the instruction binds the derived state, user, and perp-market PDAs.
 * PDA derivations are local and deterministic; the program check reads mainnet.
 */
async function verifyLiveDriftAccounts(
  transaction: SolanaLendingTransaction,
  decoded: DriftPerpDecodedAction
): Promise<SolanaPerpGuardAccountCheck[]> {
  const transaction_ = SolanaLendingTransactionSchema.parse(transaction);
  const keys = [
    ...transaction_.accountKeys,
    ...transaction_.loadedAddresses.writable,
    ...transaction_.loadedAddresses.readonly,
  ];
  const instruction = transaction_.instructions[0];
  if (!instruction) throw new Error('Transaction carries no instruction');
  const instructionKeys = instruction.accountIndexes.map((index) => keys[index]);

  const [statePda] = await deriveDriftPda(['drift_state']);
  const [marketPda] = await deriveDriftPda([
    'perp_market',
    new Uint8Array([decoded.marketIndex & 0xff, (decoded.marketIndex >> 8) & 0xff]),
  ]);

  const checks: Array<{
    address: string;
    role: SolanaPerpGuardAccountCheck['role'];
    present: boolean;
    expectedOwner: string | null;
    executable?: boolean | null;
  }> = [
    {
      address: DRIFT_V2_MAINNET_PROGRAM_ID,
      role: 'program',
      present: instructionKeys.includes(DRIFT_V2_MAINNET_PROGRAM_ID),
      expectedOwner: null,
      executable: await mainnetProgramExecutable(),
    },
    {
      address: statePda,
      role: 'state',
      present: instructionKeys.includes(statePda),
      expectedOwner: DRIFT_V2_MAINNET_PROGRAM_ID,
    },
    {
      address: marketPda,
      role: 'perp-market',
      present: instructionKeys.includes(marketPda),
      expectedOwner: DRIFT_V2_MAINNET_PROGRAM_ID,
    },
  ];
  // The user PDA for user index 0: derived from ['user', authority, u16 LE 0].
  const userPda0 = await deriveUserPda(decoded.account, 0);
  checks.push({
    address: userPda0,
    role: 'user',
    present: instructionKeys.includes(userPda0),
    expectedOwner: DRIFT_V2_MAINNET_PROGRAM_ID,
  });

  for (const check of checks) {
    if (!check.present) {
      throw new Error(
        `Reviewed Drift ${check.role} account ${check.address} is not bound by the exact instruction`
      );
    }
    if (check.role === 'program') {
      if (check.executable !== true) {
        throw new Error('Reviewed Drift program account is no longer executable');
      }
      continue;
    }
    const owner = await mainnetAccountOwner(check.address);
    if (owner !== check.expectedOwner) {
      throw new Error(`Reviewed Drift ${check.role} is not owned by the Drift program`);
    }
  }
  return checks.map((check) => ({
    address: check.address,
    role: check.role,
    owner: check.role === 'program' ? DRIFT_V2_MAINNET_PROGRAM_ID : (check.expectedOwner as string),
    executable: check.executable ?? null,
  }));
}

async function deriveDriftPda(
  seeds: Array<Uint8Array | string>
): Promise<readonly [Address<string>, number]> {
  return getProgramDerivedAddress({
    programAddress: DRIFT_V2_MAINNET_PROGRAM_ID as Address,
    seeds: seeds.map((seed) => (typeof seed === 'string' ? new TextEncoder().encode(seed) : seed)),
  });
}

async function deriveUserPda(authority: string, userIndex: number): Promise<Address> {
  const authorityBytes = decodeSolanaBase58(authority);
  const indexBytes = new Uint8Array([userIndex & 0xff, (userIndex >> 8) & 0xff]);
  const [address] = await deriveDriftPda(['user', authorityBytes, indexBytes]);
  return address;
}

async function mainnetProgramExecutable(): Promise<boolean | null> {
  const endpoints = getRpcEndpoints(0);
  if (!endpoints) throw new Error('No Solana mainnet RPC endpoint is configured');
  const account = await mainnetAccountInfo(DRIFT_V2_MAINNET_PROGRAM_ID, endpoints);
  return typeof account.executable === 'boolean' ? account.executable : null;
}

async function mainnetAccountOwner(address: string): Promise<string | null> {
  const endpoints = getRpcEndpoints(0);
  if (!endpoints) throw new Error('No Solana mainnet RPC endpoint is configured');
  const account = await mainnetAccountInfo(address, endpoints);
  return typeof account.owner === 'string' ? account.owner : null;
}

async function mainnetAccountInfo(
  address: string,
  endpoints: string[]
): Promise<Record<string, unknown>> {
  let last: unknown;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `insight-solana-perp-guard-account-${address.slice(0, 8)}`,
          method: 'getAccountInfo',
          params: [
            address,
            { encoding: 'base64', commitment: 'confirmed', dataSlice: { offset: 0, length: 0 } },
          ],
        }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`RPC getAccountInfo returned HTTP ${response.status}`);
      const body: unknown = await response.json();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('result' in body) ||
        typeof (body as Record<string, unknown>).result !== 'object'
      ) {
        throw new Error('RPC returned no account information');
      }
      const result = (body as { result: Record<string, unknown> }).result;
      if (!('value' in result)) throw new Error('RPC returned no account information');
      return (result.value ?? {}) as Record<string, unknown>;
    } catch (error) {
      last = error;
    }
  }
  throw new Error(last instanceof Error ? last.message : 'All Solana RPC account reads failed');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
