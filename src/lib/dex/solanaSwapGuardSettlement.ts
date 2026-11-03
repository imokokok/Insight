/**
 * Post-execution closure for an exact Solana Swap Guard decision.  The caller
 * presents the signed guard decision plus the on-chain transaction signature;
 * the settlement re-collects execution facts from Solana JSON-RPC, reconciles
 * the observed wallet balance deltas against the reviewed exact amounts and
 * minimum output, and signs a portable Ed25519 settlement receipt.  Reconciliation
 * failures still produce signed evidence — with an explicit non-SETTLED status.
 */

import { getRpcEndpoints } from '@/lib/execution/rpcEndpoints';
import {
  signSolanaEvidence,
  solanaEvidenceSignerPublicKey,
  verifySolanaEvidence,
  type SolanaSignedEvidence,
} from '@/lib/execution/solanaEvidence';
import {
  collectSolanaExecutionFacts,
  type SolanaExecutionCollectionFailure,
  type SolanaExecutionFacts,
} from '@/lib/execution/solanaExecutionCollector';

import {
  verifySolanaSwapGuardDecision,
  type SolanaSwapGuardDecisionVerification,
} from './solanaSwapGuardAttestation';

import type { SolanaSwapGuardDirection, SolanaSwapGuardProfileId } from './solanaOrcaWhirlpool';

export const SOLANA_SWAP_GUARD_SETTLEMENT_SCHEMA =
  'insight.solana-swap-guard-settlement.v1' as const;

export type SolanaSwapGuardSettlementData = {
  decisionHash: string;
  signature: string;
  taker: string;
  profileId: SolanaSwapGuardProfileId;
  direction: SolanaSwapGuardDirection;
  amountInRaw: string;
  minOutRaw: string;
  sourceAmountRaw: string | null;
  destinationAmountRaw: string | null;
  status: 'SETTLED' | 'REVERTED' | 'UNRECONCILED';
  reconciliation: string;
  slot: number;
  executedAt: number;
  issuedAt: number;
  schemaVersion: 1;
};
export type SolanaSwapGuardSettlement = SolanaSignedEvidence<SolanaSwapGuardSettlementData>;

export type SolanaSwapGuardSettlementResult =
  | {
      ok: true;
      settlement: SolanaSwapGuardSettlement | null;
      reason: string;
      facts: SolanaExecutionFacts;
    }
  | { ok: false; code: string; message: string };

export type SolanaSwapGuardSettlementVerification = {
  valid: boolean;
  signatureValid: boolean;
  trusted: boolean;
  reason: string;
  settlement: SolanaSwapGuardSettlementData | null;
  attester: string | null;
  issuedAt: number | null;
};

export interface SolanaSwapGuardSettlementDependencies {
  collectFacts?: typeof collectSolanaExecutionFacts;
  verifyDecision?: (
    value: unknown,
    dependencies?: { trustedPublicKey?: string | null }
  ) => SolanaSwapGuardDecisionVerification;
  now?: () => number;
  trustedPublicKey?: string | null;
}

const CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

/** Close a signed ALLOW decision against on-chain execution facts. */
export async function settleSolanaSwapGuard(
  rawInput: { decision: unknown; signature: string },
  dependencies: SolanaSwapGuardSettlementDependencies = {}
): Promise<SolanaSwapGuardSettlementResult> {
  const signature = rawInput.signature;
  if (typeof signature !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(signature)) {
    return { ok: false, code: 'INVALID_SIGNATURE', message: 'Expected a base58 Solana signature' };
  }
  const verifyDecision = dependencies.verifyDecision ?? verifySolanaSwapGuardDecision;
  const verification = verifyDecision(rawInput.decision);
  if (!verification.valid) {
    return {
      ok: false,
      code: 'DECISION_INVALID',
      message: `The signed swap guard decision did not verify: ${verification.reason}`,
    };
  }
  const decision = rawInput.decision as {
    guard: {
      profileId: SolanaSwapGuardProfileId;
      direction: SolanaSwapGuardDirection;
      market: { exactSwap: { amountInRaw: string; minOutRaw: string } };
    };
    action: { account: string } | null;
  };
  const taker = decision.action?.account;
  if (typeof taker !== 'string' || taker.length === 0) {
    return {
      ok: false,
      code: 'DECISION_INVALID',
      message: 'The signed swap guard decision does not carry a taker account',
    };
  }
  const sourceMint = decision.guard.direction === 'usdc-to-usdt' ? USDC_MINT : USDT_MINT;
  const destinationMint = decision.guard.direction === 'usdc-to-usdt' ? USDT_MINT : USDC_MINT;

  const endpoints = getRpcEndpoints(0);
  if (!endpoints) {
    return {
      ok: false,
      code: 'RPC_UNAVAILABLE',
      message: 'No Solana mainnet RPC endpoint is configured',
    };
  }
  const now = dependencies.now ?? (() => Math.floor(Date.now() / 1000));
  const collect = dependencies.collectFacts ?? collectSolanaExecutionFacts;
  const collection = await collect({
    signature,
    sourceAssetId: `${CAIP2}/spl:${sourceMint}`,
    destinationAssetId: `${CAIP2}/spl:${destinationMint}`,
    taker,
    endpoints,
    now,
  });
  if (!collection.ok) {
    return { ok: false, code: collection.code, message: collection.message };
  }
  const facts = collection.facts;
  const { status, reconciliation } = reconcile(facts, decision.guard);
  const payload: SolanaSwapGuardSettlementData = {
    decisionHash: verification.decisionHash ?? '',
    signature: facts.signature,
    taker: facts.taker,
    profileId: decision.guard.profileId,
    direction: decision.guard.direction,
    amountInRaw: decision.guard.market.exactSwap.amountInRaw,
    minOutRaw: decision.guard.market.exactSwap.minOutRaw,
    sourceAmountRaw: facts.sourceAmountRaw,
    destinationAmountRaw: facts.destinationAmountRaw,
    status,
    reconciliation,
    slot: facts.slot,
    executedAt: facts.executedAt ?? facts.observedAt,
    issuedAt: now(),
    schemaVersion: 1,
  };
  const settlement = signSolanaEvidence(SOLANA_SWAP_GUARD_SETTLEMENT_SCHEMA, payload);
  return {
    ok: true,
    settlement,
    reason: reconciliation,
    facts,
  };
}

function reconcile(
  facts: SolanaExecutionFacts,
  guard: {
    direction: SolanaSwapGuardDirection;
    market: { exactSwap: { amountInRaw: string; minOutRaw: string } };
  }
): { status: 'SETTLED' | 'REVERTED' | 'UNRECONCILED'; reconciliation: string } {
  if (facts.status === 'REVERTED') {
    return { status: 'REVERTED', reconciliation: 'EXECUTION_REVERTED' };
  }
  if (facts.sourceAmountRaw !== guard.market.exactSwap.amountInRaw) {
    return { status: 'UNRECONCILED', reconciliation: 'SOURCE_AMOUNT_MISMATCH' };
  }
  if (facts.destinationAmountRaw === null) {
    return {
      status: 'UNRECONCILED',
      reconciliation: facts.unavailableReason ?? 'DESTINATION_DELTA_UNAVAILABLE',
    };
  }
  if (BigInt(facts.destinationAmountRaw) < BigInt(guard.market.exactSwap.minOutRaw)) {
    return { status: 'UNRECONCILED', reconciliation: 'MIN_OUT_VIOLATED' };
  }
  return { status: 'SETTLED', reconciliation: 'AMOUNTS_AND_MIN_OUT_RECONCILED' };
}

/** Verify a signed settlement receipt against the pinned Ed25519 attester. */
export function verifySolanaSwapGuardSettlement(
  value: unknown,
  dependencies: { trustedPublicKey?: string | null } = {}
): SolanaSwapGuardSettlementVerification {
  const trustedPublicKey = dependencies.trustedPublicKey ?? solanaEvidenceSignerPublicKey();
  const attester =
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { signer?: { publicKey?: unknown } }).signer?.publicKey === 'string'
      ? ((value as { signer: { publicKey: string } }).signer.publicKey as string)
      : null;
  const data =
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { payload?: unknown }).payload === 'object' &&
    (value as { payload: Record<string, unknown> }).payload !== null
      ? ((value as { payload: Record<string, unknown> })
          .payload as Partial<SolanaSwapGuardSettlementData>)
      : null;
  const issuedAt = typeof data?.issuedAt === 'number' ? data.issuedAt : null;
  const trusted = trustedPublicKey !== null && attester === trustedPublicKey;
  const signatureValid = trusted && verifySolanaEvidence(value, trustedPublicKey);
  if (!trusted || !signatureValid) {
    return {
      valid: false,
      signatureValid,
      trusted,
      reason: trusted ? 'INVALID_SIGNATURE' : 'UNTRUSTED_ATTESTER',
      settlement: null,
      attester,
      issuedAt,
    };
  }
  if (
    !data ||
    typeof data.decisionHash !== 'string' ||
    typeof data.signature !== 'string' ||
    typeof data.status !== 'string'
  ) {
    return {
      valid: false,
      signatureValid: true,
      trusted: true,
      reason: 'MALFORMED_PAYLOAD',
      settlement: null,
      attester,
      issuedAt,
    };
  }
  return {
    valid: true,
    signatureValid: true,
    trusted: true,
    reason: 'OK',
    settlement: data as SolanaSwapGuardSettlementData,
    attester,
    issuedAt,
  };
}
export type SolanaSwapGuardSettlementFailure = SolanaExecutionCollectionFailure;
