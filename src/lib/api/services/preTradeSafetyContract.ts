/**
 * @fileoverview Pre-trade safety contract types.
 *
 * Pure type module extracted from `preTradeSafetyService` so that domain
 * callers (guards, journey services, diagnostics) can import the request /
 * protocol-context / evidence shapes without touching the 2k-line orchestrator
 * module. Zero runtime behavior lives here; the service re-exports every name
 * below, so existing import paths keep working unchanged.
 */

import type { DecisionInputCheckRequest } from '@/lib/decisionInputTrust/assessment';

export type TradeAction = 'swap' | 'borrow' | 'lend' | 'liquidate' | 'repay';
export type SafetyVerdict = 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK';

export interface PreTradeSafetyInput {
  asset: string;
  chainId: number;
  action: TradeAction;
  tradeAmountUsd: number;
  targetProviders?: string[];
  /**
   * Optional lending protocol id (e.g. 'aave-v3-ethereum'). When provided, the
   * check adds a protocol-safety dimension: it derives the oracle deviation
   * that would liquidate a max-LTV position on this asset from the protocol's
   * own published risk params, and escalates the verdict when the current
   * cross-oracle deviation consumes a large share of that buffer.
   */
  protocolId?: string;
  /**
   * Attestation schema version to issue. v1 (default) preserves the existing
   * 11-field EIP-712 attestation + the loose (no-quorum-gate) verdict policy.
   * v2 issues the 26-field attestation (CAIP-19 pair binding, requestHash,
   * providerObservationsHash, reasonCodesHash, quorum gate) per the locked v2
   * spec. v3 issues the same evidence plus the independence threshold
   * (`requiredSourceGroupCount`, 27 fields) so the independence gate is
   * self-verifying instead of requiring the issuer's source code.
   *
   * v2 and v3 share the same verdict policy (quorum + independence gates).
   * The verdict itself differs only in that v2/v3 escalate <3 independent
   * providers to BLOCK (INSUFFICIENT_COVERAGE).
   */
  schemaVersion?: 1 | 2 | 3 | 4;
  /**
   * Optional destination asset symbol (the other leg of a swap). v2 binds it as
   * destinationAssetId (CAIP-19) but does NOT evaluate it (evaluationScope =
   * SOURCE_ASSET_ONLY in v2.0). When omitted, destinationAssetId falls back to
   * the source asset id (degenerate self-pair) so the binding is still valid.
   */
  destinationAsset?: string;
  /**
   * Optional token contract address whose third-party security scan should be
   * captured and signed as decision-input evidence (contextAttestation +
   * tokenSecurity advisory view). When omitted, a small built-in symbol→address
   * map (Ethereum mainnet USDC/WBTC/WETH) is used; when neither resolves, both
   * fields are omitted entirely (禁合成: absence means "no evidence", never
   * "safe"). Advisory evidence only — NEVER a verdict input and NEVER part of
   * the signed oracle attestation.
   */
  tokenAddress?: string;
  /**
   * Opt-in diagnostic surface (query `debugTokenSec=1`): attaches
   * `tokenSecurityDebug` to the response with the advisory lane's terminal
   * outcome. Never affects the verdict and adds no external calls.
   */
  debugTokenSecurity?: boolean;
  /**
   * Opt-in operation-input sufficiency check. This is an advisory output
   * separate from the existing oracle verdict and requires caller-supplied
   * decision price, venue quote, and explicit tolerances.
   */
  decisionInput?: DecisionInputCheckRequest;
}

/**
 * Position-free protocol safety context, derived purely from a protocol's own
 * published risk parameters (no user position required).
 *
 * `criticalDeviationPct` is the collateral-price drop that would push a
 * max-LTV position into liquidation. At max LTV the collateral ratio is
 * 1/maxLtv; liquidation triggers when it falls to `liquidationThreshold`, so
 * the bridging deviation is 1 − liquidationThreshold × maxLtv.
 *
 * `bufferConsumedPct` is how much of that buffer the current cross-oracle
 * deviation already eats — the bridge between "is the oracle healthy?" and
 * "is THIS trade safe on THIS protocol?".
 */
export interface ProtocolSafetyContext {
  protocolId: string;
  protocolName: string;
  criticalDeviationPct: number;
  bufferConsumedPct: number;
  liquidationThreshold: number;
  maxLtv: number;
  parameterSource?: 'scheduled_dynamic' | 'static_config';
  parametersFetchedAt?: string | null;
}

export interface ProviderPriceDetail {
  timestamp?: number | null;
  retrievedAt?: number;
  timestampProvenance?: 'provider_age' | 'provider_timestamp' | 'unknown';
  source?: string;
  errorMessage?: string;
  freshnessKnown?: boolean;
  timestampAnomaly?: boolean;
  price: number;
  deviationPct: number | null;
  isOutlier: boolean;
  dataAgeSeconds: number | null;
  /** Consensus-aware stale definition used by the ML training set. */
  mlIsStale?: boolean;
  isStale: boolean;
  confidence: number | null;
  reputationScore: number | null;
  status: 'success' | 'unsupported' | 'error';
  /** False when the provider is an observation-only/shadow feed. */
  countsTowardOracleQuorum: boolean;
}

export interface DepegWarning {
  stablecoin: string;
  deviationPct: number;
  riskLevel: string;
}

export interface ContributingFactor {
  rule: string;
  value: number;
  threshold: number;
  triggeredVerdict: 'CAUTION' | 'DANGER' | 'BLOCK';
  message: string;
}

export interface LendingSafetyAction {
  type: 'freeze_borrow' | 'reduce_position' | 'wait_convergence' | 'add_collateral';
  severity: 'info' | 'caution' | 'danger' | 'block';
  title: string;
  detail: string;
  /** Wait until cross-oracle deviation falls below this % before borrowing. */
  targetDeviationPct?: number;
  /** Target buffer consumption (%) the position should stay under. */
  targetBufferPct?: number;
}

export interface AuditMeta {
  apiKeyId?: string;
  requestId?: string;
  /** Opaque lifecycle correlation. It is operational metadata, never signed evidence. */
  journeyId?: string;
  workflowTag?: string;
  baselineVerdict?: 'allow' | 'alert' | 'block' | 'unknown';
  baselineVersion?: string;
  /** Set only by the policy-bound VERITAS partner route, never from public query input. */
  veritasJointRunPolicyId?: string;
}
