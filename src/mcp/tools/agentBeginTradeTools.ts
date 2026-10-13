/**
 * MCP tool: agent_begin_trade — the pre-trade half of the verifiable execution
 * closed loop.
 *
 * An AI agent calls this with its swap/DeFi intent BEFORE executing anything.
 * Insight runs the oracle safety check (pre_trade_safety_check) and, if the
 * verdict allows trading, returns a machine-readable "execution certification
 * handle": the pre-trade gate's `preTradeUid` + `requestHash`, the CAIP-19
 * asset ids, the certified price (destination per source) and the signed
 * slippage band, plus the oracle-participant / independence counts and the
 * pre-trade signing time.
 *
 * The agent then executes the trade with its OWN wallet — Insight never
 * custodies keys or submits transactions — and calls `execution_receipt` with
 * this handle plus the settlement txHash. Insight collects the on-chain fill
 * and signs a verifiable Execution Receipt paired to the pre-trade via
 * `preTradeUid` + `requestHash`. Together the two tools close the loop:
 *   pre_trade_safety_check (certify)  →  agent executes  →  execution_receipt (prove).
 *
 * If either oracle verdict or either operation-input assessment fails, or no
 * pre-trade attestation could be signed, this tool refuses to issue a handle.
 */

import { type z } from 'zod';

import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import type { PreTradeSafetyResult } from '@/lib/api/services/preTradeSafetyService';
import { resolveCaip19 } from '@/lib/attestations/caip19';
import { verifyDecisionInputAssessment } from '@/lib/decisionInputTrust/attestation';
import {
  recordDecisionInputExecutionGate,
  type DecisionInputExecutionGateAudit,
} from '@/lib/decisionInputTrust/audit';
import {
  getOnchainRouteQuote,
  OnchainRouteQuoteError,
  type OnchainRouteQuote,
} from '@/lib/decisionInputTrust/onchainRouteQuote';

import { AgentBeginTradeInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

const RECEIPT_MAX_SLIPPAGE_BPS = 50;
type AgentBeginTradeArgs = z.infer<typeof AgentBeginTradeInputSchema>;

interface RouteQuoteGateMetrics {
  routeQuoteAgeSeconds: number;
  routeQuoteDeviationBps: number;
  callerRouteQuoteDeviationBps: number;
  routeQuoteMaxDeviationBps: number;
}

type RouteQuoteGateResult =
  | { ok: true; metrics: RouteQuoteGateMetrics }
  | { ok: false; refusal: string };

function describeAssessmentFailure(
  label: string,
  check: PreTradeSafetyResult,
  verification: Awaited<ReturnType<typeof verifyDecisionInputAssessment>>
): string | null {
  const assessment = check.decisionInputAssessment;
  if (!assessment) {
    return `${label} operation-input assessment is missing; no execution handle was issued.`;
  }
  if (assessment.status === 'SUFFICIENT') {
    if (!assessment.attestation) {
      return `${label} operation-input assessment has no integrity attestation; no execution handle was issued.`;
    }
    const preTradeUid = check.attestation?.uid;
    if (!verification.valid) {
      return `${label} operation-input integrity attestation failed verification (${verification.reason}); no execution handle was issued.`;
    }
    if (
      !preTradeUid ||
      verification.linkedPreTradeUid?.toLowerCase() !== preTradeUid.toLowerCase()
    ) {
      return `${label} operation-input integrity attestation is not linked to its pre-trade attestation; no execution handle was issued.`;
    }
    return null;
  }
  const reasons = assessment.reasons.map((reason) => reason.code).join(', ');
  return `${label} operation-input assessment is ${assessment.status}${reasons ? ` (${reasons})` : ''}; no execution handle was issued.`;
}

async function evaluateAndPersistRouteQuoteGate(
  args: AgentBeginTradeArgs,
  sourceCheck: PreTradeSafetyResult,
  destinationCheck: PreTradeSafetyResult,
  trustedRouteQuote: OnchainRouteQuote,
  oracleCrossRate: number,
  sourcePreTradeUid: string,
  destinationPreTradeUid: string
): Promise<RouteQuoteGateResult> {
  const nowMs = Date.now();
  const routeQuoteAgeSeconds = (nowMs - Date.parse(trustedRouteQuote.observedAt)) / 1000;
  const callerRouteQuoteAgeSeconds =
    (nowMs - Date.parse(args.decisionInput.routeQuoteObservedAt)) / 1000;
  const routeQuoteDeviationBps =
    (Math.abs(trustedRouteQuote.price - oracleCrossRate) / oracleCrossRate) * 10_000;
  const callerRouteQuoteDeviationBps =
    (Math.abs(args.decisionInput.routeQuotePrice - trustedRouteQuote.price) /
      trustedRouteQuote.price) *
    10_000;
  const routeQuoteMaxDeviationBps = Math.min(
    RECEIPT_MAX_SLIPPAGE_BPS,
    args.decisionInput.source.maxReferenceDeviationBps,
    args.decisionInput.destination.maxReferenceDeviationBps,
    args.decisionInput.source.maxSlippageBps,
    args.decisionInput.destination.maxSlippageBps
  );
  const routeQuoteMaxAgeSeconds = Math.min(
    args.decisionInput.source.maxQuoteAgeSeconds,
    args.decisionInput.destination.maxQuoteAgeSeconds
  );
  const routeQuoteFresh =
    Number.isFinite(routeQuoteAgeSeconds) &&
    routeQuoteAgeSeconds >= 0 &&
    routeQuoteAgeSeconds <= routeQuoteMaxAgeSeconds &&
    Number.isFinite(callerRouteQuoteAgeSeconds) &&
    callerRouteQuoteAgeSeconds >= 0 &&
    callerRouteQuoteAgeSeconds <= routeQuoteMaxAgeSeconds;
  const trustedRouteWithinPolicy =
    Number.isFinite(routeQuoteDeviationBps) && routeQuoteDeviationBps <= routeQuoteMaxDeviationBps;
  const callerRouteWithinPolicy =
    Number.isFinite(callerRouteQuoteDeviationBps) &&
    callerRouteQuoteDeviationBps <= routeQuoteMaxDeviationBps;
  const routeQuoteWithinPolicy = trustedRouteWithinPolicy && callerRouteWithinPolicy;
  const sourceInputStatus = sourceCheck.decisionInputAssessment?.status ?? null;
  const destinationInputStatus = destinationCheck.decisionInputAssessment?.status ?? null;
  const [sourceAssessmentVerification, destinationAssessmentVerification] = await Promise.all([
    verifyDecisionInputAssessment(sourceCheck.decisionInputAssessment),
    verifyDecisionInputAssessment(destinationCheck.decisionInputAssessment),
  ]);
  const sourceAssessmentLinked =
    Boolean(sourceCheck.attestation?.uid) &&
    sourceAssessmentVerification.linkedPreTradeUid?.toLowerCase() ===
      sourceCheck.attestation?.uid.toLowerCase();
  const destinationAssessmentLinked =
    Boolean(destinationCheck.attestation?.uid) &&
    destinationAssessmentVerification.linkedPreTradeUid?.toLowerCase() ===
      destinationCheck.attestation?.uid.toLowerCase();
  const inputAssessmentPasses =
    sourceInputStatus === 'SUFFICIENT' &&
    destinationInputStatus === 'SUFFICIENT' &&
    sourceAssessmentVerification.valid &&
    destinationAssessmentVerification.valid &&
    sourceAssessmentLinked &&
    destinationAssessmentLinked;
  const gateStatus: DecisionInputExecutionGateAudit['status'] =
    sourceInputStatus === 'BLOCK' ||
    destinationInputStatus === 'BLOCK' ||
    (routeQuoteFresh && !routeQuoteWithinPolicy)
      ? 'BLOCK'
      : !inputAssessmentPasses || !routeQuoteFresh
        ? 'INSUFFICIENT_EVIDENCE'
        : 'SUFFICIENT';
  const gateAudit: DecisionInputExecutionGateAudit = {
    schemaVersion: 1,
    status: gateStatus,
    evaluatedAt: new Date().toISOString(),
    sourceAssessmentStatus: sourceInputStatus,
    destinationAssessmentStatus: destinationInputStatus,
    routeQuote: {
      price: trustedRouteQuote.price,
      observedAt: trustedRouteQuote.observedAt,
      ageSeconds: Number.isFinite(routeQuoteAgeSeconds) ? routeQuoteAgeSeconds : null,
      oracleCrossRate,
      deviationBps: Number.isFinite(routeQuoteDeviationBps) ? routeQuoteDeviationBps : null,
      callerReportedPrice: args.decisionInput.routeQuotePrice,
      callerReportedAt: args.decisionInput.routeQuoteObservedAt,
      callerDeviationBps: Number.isFinite(callerRouteQuoteDeviationBps)
        ? callerRouteQuoteDeviationBps
        : null,
      maxDeviationBps: routeQuoteMaxDeviationBps,
      source: trustedRouteQuote.evidence.provider,
      blockNumber: trustedRouteQuote.evidence.blockNumber,
      blockHash: trustedRouteQuote.evidence.blockHash,
    },
  };
  try {
    await recordDecisionInputExecutionGate(sourcePreTradeUid, destinationPreTradeUid, gateAudit);
  } catch {
    return {
      ok: false,
      refusal: [
        '**Execution certification REFUSED — operation-input audit could not be persisted.**',
        'No execution handle was issued because both pre-trade UIDs must durably record the combined input gate before the agent executes.',
      ].join('\n'),
    };
  }

  const sourceAssessmentFailure = describeAssessmentFailure(
    'Source',
    sourceCheck,
    sourceAssessmentVerification
  );
  if (sourceAssessmentFailure) {
    return {
      ok: false,
      refusal: [
        '**Execution certification REFUSED — operation-input evidence is insufficient.**',
        sourceAssessmentFailure,
        'Do NOT execute this trade. Refresh the input data or use an asset and chain with supported reference coverage.',
      ].join('\n'),
    };
  }
  const destinationAssessmentFailure = describeAssessmentFailure(
    'Destination',
    destinationCheck,
    destinationAssessmentVerification
  );
  if (destinationAssessmentFailure) {
    return {
      ok: false,
      refusal: [
        '**Execution certification REFUSED — operation-input evidence is insufficient.**',
        destinationAssessmentFailure,
        'Do NOT execute this trade. Refresh the input data or use an asset and chain with supported reference coverage.',
      ].join('\n'),
    };
  }
  if (!routeQuoteFresh) {
    return {
      ok: false,
      refusal: [
        '**Execution certification REFUSED — route quote is stale or has an invalid timestamp.**',
        `The route quote age must be between 0 and ${routeQuoteMaxAgeSeconds} seconds. No execution handle was issued.`,
      ].join('\n'),
    };
  }
  if (!routeQuoteWithinPolicy) {
    const title = trustedRouteWithinPolicy
      ? '**Execution certification REFUSED — caller route quote diverges from the on-chain quote.**'
      : '**Execution certification REFUSED — on-chain route quote diverges from the oracle cross-rate.**';
    const detail = trustedRouteWithinPolicy
      ? `The caller-reported route quote differs from the on-chain quote by ${callerRouteQuoteDeviationBps.toFixed(1)} bps; the limit is ${routeQuoteMaxDeviationBps} bps.`
      : `The on-chain route quote differs from the oracle cross-rate by ${routeQuoteDeviationBps.toFixed(1)} bps; the limit is ${routeQuoteMaxDeviationBps} bps.`;
    return { ok: false, refusal: [title, `${detail} No execution handle was issued.`].join('\n') };
  }
  return {
    ok: true,
    metrics: {
      routeQuoteAgeSeconds,
      routeQuoteDeviationBps,
      callerRouteQuoteDeviationBps,
      routeQuoteMaxDeviationBps,
    },
  };
}

export const agentBeginTradeTool: McpToolDefinition<typeof AgentBeginTradeInputSchema> = {
  name: 'agent_begin_trade',
  description: [
    'Obtain oracle assessment evidence for a swap/DeFi intent BEFORE trading.',
    'Insight runs the oracle safety check and, if the verdict is PASS/CAUTION, returns a',
    'machine-readable "execution certification handle": preTradeUid, requestHash, CAIP-19',
    'asset ids, the certified price (destination per source) and maxSlippageBps, plus',
    'a required operation-input check for both asset legs and a fresh Uniswap V3 on-chain',
    'route quote cross-checked by two Ethereum RPCs. If either input assessment is not',
    'SUFFICIENT, either route quote is stale or outside policy,',
    'or either oracle gate blocks, no execution handle is issued. The assessments are',
    'independently EIP-712 signed and linked to the receipt through both pre-trade UIDs.',
    'participant/source-group counts and the pre-trade signing time. Execute the trade with',
    'YOUR wallet, then call execution_receipt with this handle + txHash to obtain the signed,',
    'verifiable Execution Receipt. If the verdict is DANGER or BLOCK this tool refuses (do not',
    'trade). This is oracle assessment evidence, not principal authorization — pair it',
    'with execution_receipt.',
  ].join(' '),
  parameters: AgentBeginTradeInputSchema,
  handler: async (args) => {
    const routeQuoteMaxAgeSeconds = Math.min(
      args.decisionInput.source.maxQuoteAgeSeconds,
      args.decisionInput.destination.maxQuoteAgeSeconds
    );
    let trustedRouteQuote: OnchainRouteQuote;
    try {
      trustedRouteQuote = await getOnchainRouteQuote({
        asset: args.asset,
        destinationAsset: args.destinationAsset,
        chainId: args.chainId,
        tradeAmountUsd: args.tradeAmountUsd,
        maxAgeSeconds: routeQuoteMaxAgeSeconds,
      });
    } catch (error) {
      const message =
        error instanceof OnchainRouteQuoteError
          ? error.message
          : 'Independent route quote verification failed.';
      return [
        '**Execution certification REFUSED — no independently verified route quote.**',
        `${message} No execution handle was issued.`,
      ].join('\n');
    }
    const operationRouteQuote = {
      price: trustedRouteQuote.price,
      observedAt: trustedRouteQuote.observedAt,
      callerReported: {
        price: args.decisionInput.routeQuotePrice,
        observedAt: args.decisionInput.routeQuoteObservedAt,
      },
      onchainEvidence: trustedRouteQuote.evidence,
    } as const;

    const sourceCheck = await preTradeSafetyCheck({
      asset: args.asset,
      chainId: args.chainId,
      action: args.action,
      tradeAmountUsd: args.tradeAmountUsd,
      targetProviders: args.targetProviders,
      protocolId: args.protocolId,
      schemaVersion: 3,
      destinationAsset: args.destinationAsset,
      decisionInput: {
        ...args.decisionInput.source,
        operationRouteQuote,
      },
    });

    if (sourceCheck.verdict === 'DANGER' || sourceCheck.verdict === 'BLOCK') {
      return [
        `**Execution certification REFUSED — oracle risk too high (verdict: ${sourceCheck.verdict}).**`,
        'Do NOT execute this trade. No pre-trade handle was issued, so no execution_receipt can be bound.',
        sourceCheck.verdict === 'BLOCK'
          ? 'Guidance: CRITICAL oracle risk detected — oracle data appears manipulated or unavailable.'
          : 'Guidance: Significant oracle risk detected — wait for conditions to stabilize or reduce size.',
      ].join('\n');
    }

    const attestation = sourceCheck.attestation;
    const data = attestation?.data as
      | { requestHash?: string; checkedAt?: string | number }
      | undefined;
    if (!attestation || !data || typeof data.requestHash !== 'string') {
      return [
        '**Execution certification REFUSED — no pre-trade attestation was signed.**',
        'Insight attester key is not configured (or signing failed), so there is no',
        'preTradeUid/requestHash to bind an Execution Receipt to. Configure the attester key,',
        'or call pre_trade_safety_check directly for an advisory (unverifiable) check.',
      ].join('\n');
    }

    // Destination-leg consensus price, to express the certified quote as
    // destination-per-source (the convention the execution receipt shares with
    // the on-chain executedPrice). We also keep the destination attestation
    // original: the agent must hand BOTH pre-trade originals back to
    // execution_receipt for a VERIFIED binding, and agent_begin_trade is the
    // only moment that holds both at once.
    let destinationConsensus: number;
    let destinationVerdict: PreTradeSafetyResult['verdict'];
    let destinationCheck: PreTradeSafetyResult | null = null;
    let destinationAttestation = undefined as typeof sourceCheck.attestation | undefined;
    try {
      const destCheck = await preTradeSafetyCheck({
        asset: args.destinationAsset,
        chainId: args.chainId,
        action: args.action,
        tradeAmountUsd: args.tradeAmountUsd,
        targetProviders: args.targetProviders,
        protocolId: args.protocolId,
        schemaVersion: 3,
        destinationAsset: args.asset,
        decisionInput: {
          ...args.decisionInput.destination,
          operationRouteQuote,
        },
      });
      destinationCheck = destCheck;
      destinationConsensus = destCheck.consensusPrice;
      destinationVerdict = destCheck.verdict;
      destinationAttestation = destCheck.attestation;
    } catch {
      return `agent_begin_trade failed: could not resolve a consensus price for destination asset "${args.destinationAsset}".`;
    }

    if (!destinationAttestation) {
      return 'agent_begin_trade failed: destination pre-trade attestation was not signed (attester key misconfigured?).';
    }

    if (destinationVerdict === 'DANGER' || destinationVerdict === 'BLOCK') {
      return [
        `**Execution certification REFUSED — destination oracle risk too high (verdict: ${destinationVerdict}).**`,
        'Do NOT execute this trade. Both swap legs must pass the pre-trade gate before a certification handle can be issued.',
      ].join('\n');
    }
    if (!destinationCheck) {
      return 'agent_begin_trade failed: destination pre-trade result is unavailable.';
    }
    const destCheck = destinationCheck;

    const sourceConsensus = sourceCheck.consensusPrice;
    if (!(sourceConsensus > 0) || !Number.isFinite(sourceConsensus)) {
      return `agent_begin_trade failed: source asset "${args.asset}" has no usable consensus price.`;
    }
    if (!(destinationConsensus > 0) || !Number.isFinite(destinationConsensus)) {
      return `agent_begin_trade failed: destination asset "${args.destinationAsset}" has no usable consensus price.`;
    }
    // Destination-per-source (e.g. WETH/USDC) so it matches the on-chain
    // executedPrice convention and the execution receipt's slippage math. With
    // USD consensus prices this is sourceUSD / destUSD.
    const quotedPrice = sourceConsensus / destinationConsensus;
    if (!(quotedPrice > 0) || !Number.isFinite(quotedPrice)) {
      return 'agent_begin_trade failed: the oracle cross-rate is outside the supported numeric range.';
    }

    const routeQuoteGate = await evaluateAndPersistRouteQuoteGate(
      args,
      sourceCheck,
      destCheck,
      trustedRouteQuote,
      quotedPrice,
      attestation.uid,
      destinationAttestation.uid
    );
    if (!routeQuoteGate.ok) return routeQuoteGate.refusal;
    const {
      routeQuoteAgeSeconds,
      routeQuoteDeviationBps,
      callerRouteQuoteDeviationBps,
      routeQuoteMaxDeviationBps,
    } = routeQuoteGate.metrics;

    let sourceAssetId: string;
    let destinationAssetId: string;
    try {
      const src = resolveCaip19(args.asset, args.chainId);
      const dst = resolveCaip19(args.destinationAsset, args.chainId);
      if (!src || !dst) {
        throw new Error(
          `asset could not be resolved to a CAIP-19 id (${args.asset} / ${args.destinationAsset})`
        );
      }
      sourceAssetId = src.id;
      destinationAssetId = dst.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return `agent_begin_trade failed: could not resolve CAIP-19 ids — ${message}`;
    }

    const preTradeSignedAt = Number(data.checkedAt ?? 0);
    const sourceGroupCount = args.sourceGroupCount ?? sourceCheck.participantCount;

    const handle = {
      preTradeUid: attestation.uid,
      destinationPreTradeUid: destinationAttestation.uid,
      requestHash: data.requestHash,
      sourceAssetId,
      destinationAssetId,
      subjectChainId: args.chainId,
      settlementChainId: args.chainId,
      participantCount: sourceCheck.participantCount,
      sourceGroupCount,
      preTradeSignedAt,
      quotedPrice,
      maxSlippageBps: 50,
      action: args.action.toUpperCase(),
      verdict: sourceCheck.verdict,
      destinationVerdict,
      decisionInput: {
        source: sourceCheck.decisionInputAssessment,
        destination: destCheck.decisionInputAssessment,
        routeQuote: {
          price: trustedRouteQuote.price,
          observedAt: trustedRouteQuote.observedAt,
          ageSeconds: routeQuoteAgeSeconds,
          oracleCrossRate: quotedPrice,
          deviationBps: routeQuoteDeviationBps,
          maxDeviationBps: routeQuoteMaxDeviationBps,
          callerReported: {
            price: args.decisionInput.routeQuotePrice,
            observedAt: args.decisionInput.routeQuoteObservedAt,
            deviationBps: callerRouteQuoteDeviationBps,
          },
          source: trustedRouteQuote.evidence,
        },
      },
      preTradeVerifyUrl: attestation.verifyUrl,
      // The two signed pre-trade originals. Passing these to execution_receipt
      // upgrades the Execution Receipt to a VERIFIED binding: every bound field
      // is then read from the verified payloads instead of from this handle, so
      // a malicious agent cannot widen its own quote or provider counts. Omit
      // them and the receipt falls back to SELF_REPORTED (never FAITHFUL).
      preTradeAttestations: {
        source: attestation,
        destination: destinationAttestation,
      },
    };

    const lines = [
      '**Execution certification handle (feed this + txHash into `execution_receipt`):**',
      '```json',
      JSON.stringify(handle, null, 2),
      '```',
      '',
      `Oracle verdict at certification: ${sourceCheck.verdict}. Certified price (destination per source): ${quotedPrice}.`,
      `Operation-input assessments: source ${sourceCheck.decisionInputAssessment?.status}, destination ${destCheck.decisionInputAssessment?.status}. On-chain route deviation: ${routeQuoteDeviationBps.toFixed(1)} bps; caller quote vs on-chain: ${callerRouteQuoteDeviationBps.toFixed(1)} bps (limit ${routeQuoteMaxDeviationBps} bps).`,
      `Execution receipt tolerance band: ±${args.maxSlippageBps} bps. Oracle participant providers: ${sourceCheck.participantCount}.`,
      '',
      'Next step: execute the trade with YOUR wallet, then call `execution_receipt` with the',
      'handle above plus the settlement txHash. Crucially, pass `preTradeAttestations` back too —',
      'it is the pair of signed pre-trade originals. Without them the receipt is SELF_REPORTED',
      'and can never read FAITHFUL; with them it is VERIFIED (every bound field re-derived from',
      'the verified payloads). Insight will collect the on-chain fill and sign a verifiable',
      'Execution Receipt paired to this pre-trade gate.',
    ];
    return lines.join('\n');
  },
};
