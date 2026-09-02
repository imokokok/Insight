/**
 * MCP tool: issue an Execution Receipt for a settled agent transaction.
 *
 * This is the agent-facing surface for the product's core promise — "the agent
 * filled at the price Insight certified, and any downstream machine can verify
 * it". An agent that gated on a pre_trade_safety_check hands back the pre-trade
 * fields plus the settlement txHash; Insight collects the on-chain facts, signs
 * a receipt paired to the pre-trade via `preTradeUid` + `requestHash`, and
 * returns it.
 *
 * Pair it with `pre_trade_safety_check` (the decision moment) and `oracle_watch`
 * (the long-running trust signal): together they answer "was the price
 * trustworthy?", "did it stay trustworthy?", and "did the agent actually fill
 * faithfully?" — the three questions a principal needs to trust an autonomous
 * agent.
 */

import { recordExecutionReceiptAsync } from '@/lib/execution/executionReceiptAudit';
import { issueExecutionReceipt } from '@/lib/execution/executionReceiptService';

import { ExecutionReceiptInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

export const executionReceiptTool: McpToolDefinition<typeof ExecutionReceiptInputSchema> = {
  name: 'execution_receipt',
  description:
    'Issue a signed, independently verifiable Execution Receipt proving an agent filled a transaction at the price its pre-trade check certified. Provide the pre-trade fields (preTradeUid, requestHash, asset ids, chain, oracle gate counts) plus the settlement txHash. Insight collects the on-chain fill, signs a receipt paired to the pre-trade via preTradeUid + requestHash, and returns a FAITHFUL / DEVIATED / NOT_EXECUTED / UNDETERMINED verdict. This is the "did it actually execute as promised" half of the trust layer — pair it with pre_trade_safety_check and oracle_watch.',
  parameters: ExecutionReceiptInputSchema,
  handler: async (args) => {
    const result = await issueExecutionReceipt({
      preTradeUid: args.preTradeUid as `0x${string}`,
      requestHash: args.requestHash as `0x${string}`,
      sourceAssetId: args.sourceAssetId,
      destinationAssetId: args.destinationAssetId,
      subjectChainId: args.subjectChainId,
      settlementChainId: args.settlementChainId,
      participantCount: args.participantCount,
      sourceGroupCount: args.sourceGroupCount,
      preTradeSignedAt: args.preTradeSignedAt,
      quotedPrice: args.quotedPrice,
      maxSlippageBps: args.maxSlippageBps,
      action: args.action,
      quotedAmountUsd: args.quotedAmountUsd,
      executedAmountUsd: args.executedAmountUsd,
      actualFeeUsd: args.actualFeeUsd,
      mevRiskScore: args.mevRiskScore,
      quoteVenueIndependent: args.quoteVenueIndependent,
      quoteBasis: args.quoteBasis,
      quoteBlockNumber: args.quoteBlockNumber,
      priceStateAgeAtExecSeconds: args.priceStateAgeAtExecSeconds,
      claimRole: args.claimRole,
      destinationPreTradeUid: (args.destinationPreTradeUid ?? null) as `0x${string}` | null,
      txHash: args.txHash as `0x${string}`,
      taker: args.taker as `0x${string}` | undefined,
      preTradeAttestations: args.preTradeAttestations
        ? {
            source: args.preTradeAttestations.source as never,
            destination: args.preTradeAttestations.destination as never,
          }
        : null,
    });

    if (!result.ok) {
      return `execution_receipt failed (${result.code}): ${result.message}`;
    }

    // MCP is the surface agents actually gate on, so without the audit row we
    // have no evidence the feature is being used — and no way to answer "which
    // receipt did this agent gate on" after the fact.
    recordExecutionReceiptAsync(result.receipt, {
      source: 'mcp',
      subjectChainId: args.subjectChainId,
      settlementChainId: args.settlementChainId,
    });

    const d = result.receipt.data;
    const verdict = d.priceExecutionStatus ?? d.executionStatus;
    const attestationAge = d.attestationAgeAtExecSeconds ?? d.oracleDataAgeAtExecSeconds;
    const lines = [
      '**Execution Receipt (verifiable proof of faithful fill):**',
      `- Execution status: ${verdict}`,
      `- Fill status: ${d.fillStatus}`,
      `- Claim role: ${d.claimRole ?? 'THIRD_PARTY_OBSERVATION'} (subject: ${d.subject ?? d.taker ?? 'unattributed'})`,
      `- Pre-trade UID: ${d.preTradeUid}`,
      ...(d.destinationPreTradeUid
        ? [
            `- Destination-gate UID: ${d.destinationPreTradeUid}`,
            `- preTradeUidsHash: ${d.preTradeUidsHash}`,
          ]
        : []),
      `- Quoted price: ${d.quotedPrice / 1e8}${d.quoteBasis ? ` (basis: ${d.quoteBasis}${d.quoteBlockNumber ? ` @ block ${d.quoteBlockNumber}` : ''}, venue-independent: ${String(d.quoteVenueIndependent)})` : ''}`,
      `- Executed price: ${d.executedPrice / 1e8}`,
      `- Price delta: ${d.priceDeltaBps} bps (bound ${d.maxSlippageBps} bps, satisfied: ${d.slippageSatisfied})`,
      `- Oracle basis at execution: ${d.participantCount} providers / ${d.sourceGroupCount} independent groups, attestation ${attestationAge}s old${d.priceStateAgeAtExecSeconds != null ? ` (price state ${d.priceStateAgeAtExecSeconds}s old)` : ''}`,
      `- Notional fields measured: ${d.measuredFieldsHash ?? 'n/a (v2)'}`,
      `- Settlement: tx ${d.txHash} on chain ${d.settlementChainId}, block ${d.blockNumber}`,
      `- Attester: ${result.receipt.attester} (${result.receipt.attesterLabel})`,
      `- UID: ${result.receipt.uid}`,
      `- Valid for: ${result.receipt.validForSeconds}s`,
      `- Verify at: POST ${result.receipt.verifyUrl} with body { "attestation": <object> }`,
      '- Signature: ' + result.receipt.signature.slice(0, 42) + '…',
      '',
      `Note: ${verdict} is Insight's verdict on whether the fill matched the certified PRICE within the signed bound (the v3 field name priceExecutionStatus states that scope; it is not a claim the price was correct, the size conformed to any cap, or the trade was well-timed — verification != endorsement).`,
    ];

    return lines.join('\n');
  },
};
