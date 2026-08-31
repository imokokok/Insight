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
 * If the oracle verdict is DANGER or BLOCK, or no pre-trade attestation could
 * be signed, this tool refuses to issue a handle — there is nothing to bind an
 * Execution Receipt to, so the agent must not trade.
 */

import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import { resolveCaip19 } from '@/lib/attestations/caip19';

import { AgentBeginTradeInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

export const agentBeginTradeTool: McpToolDefinition<typeof AgentBeginTradeInputSchema> = {
  name: 'agent_begin_trade',
  description: [
    'Begin a verifiable execution. Call this with a swap/DeFi intent BEFORE trading.',
    'Insight runs the oracle safety check and, if the verdict is PASS/CAUTION, returns a',
    'machine-readable "execution certification handle": preTradeUid, requestHash, CAIP-19',
    'asset ids, the certified price (destination per source) and maxSlippageBps, plus',
    'participant/source-group counts and the pre-trade signing time. Execute the trade with',
    'YOUR wallet, then call execution_receipt with this handle + txHash to obtain the signed,',
    'verifiable Execution Receipt. If the verdict is DANGER or BLOCK this tool refuses (do not',
    "trade). This is the pre-trade half of Insight's verifiable execution trust layer — pair it",
    'with execution_receipt.',
  ].join(' '),
  parameters: AgentBeginTradeInputSchema,
  handler: async (args) => {
    const sourceCheck = await preTradeSafetyCheck({
      asset: args.asset,
      chainId: args.chainId,
      action: args.action,
      tradeAmountUsd: args.tradeAmountUsd,
      targetProviders: args.targetProviders,
      protocolId: args.protocolId,
      schemaVersion: 3,
      destinationAsset: args.destinationAsset,
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
    let destinationAttestation = undefined as typeof sourceCheck.attestation | undefined;
    try {
      const destCheck = await preTradeSafetyCheck({
        asset: args.destinationAsset,
        chainId: args.chainId,
        action: 'swap',
        tradeAmountUsd: args.tradeAmountUsd,
        targetProviders: args.targetProviders,
        protocolId: args.protocolId,
        schemaVersion: 3,
      });
      destinationConsensus = destCheck.consensusPrice;
      destinationAttestation = destCheck.attestation;
    } catch {
      return `agent_begin_trade failed: could not resolve a consensus price for destination asset "${args.destinationAsset}".`;
    }

    if (!destinationAttestation) {
      return 'agent_begin_trade failed: destination pre-trade attestation was not signed (attester key misconfigured?).';
    }

    const sourceConsensus = sourceCheck.consensusPrice;
    if (!(sourceConsensus > 0)) {
      return `agent_begin_trade failed: source asset "${args.asset}" has no usable consensus price.`;
    }
    // Destination-per-source (e.g. WETH/USDC) so it matches the on-chain
    // executedPrice convention and the execution receipt's slippage math. With
    // USD consensus prices this is sourceUSD / destUSD.
    const quotedPrice = sourceConsensus / destinationConsensus;

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
      requestHash: data.requestHash,
      sourceAssetId,
      destinationAssetId,
      subjectChainId: args.chainId,
      settlementChainId: args.chainId,
      participantCount: sourceCheck.participantCount,
      sourceGroupCount,
      preTradeSignedAt,
      quotedPrice,
      maxSlippageBps: args.maxSlippageBps,
      action: args.action.toUpperCase(),
      verdict: sourceCheck.verdict,
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
      `Tolerance band: ±${args.maxSlippageBps} bps. Oracle participant providers: ${sourceCheck.participantCount}.`,
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
