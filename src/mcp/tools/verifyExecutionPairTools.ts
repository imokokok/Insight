/**
 * MCP tool: verify_execution_pair — the "closed loop" proof for a principal.
 *
 * An agent produces two receipts for one action: the pre-trade oracle-safety
 * attestation it gated on, and the Execution Receipt proving how it filled. Each
 * is independently verifiable, but a principal also needs to know these two
 * describe the SAME authorized action and that the certify → execute → prove
 * loop actually closed. This tool answers exactly that by reusing the existing
 * verifiers and asserting the cryptographic binding (preTradeUid + requestHash).
 *
 * Pair it with `agent_begin_trade` (issue the gate) and `execution_receipt`
 * (prove the fill): together they are the verifiable execution trust layer.
 */

import { verifyExecutionPair } from '@/lib/execution/verifyExecutionPair';

import { VerifyExecutionPairInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

export const verifyExecutionPairTool: McpToolDefinition<typeof VerifyExecutionPairInputSchema> = {
  name: 'verify_execution_pair',
  description:
    'Verify that a pre-trade oracle-safety attestation and an Execution Receipt describe the SAME authorized action and that the certify → execute → prove loop closed. Returns pairedValid, the closed-loop status (CLOSED_FAITHFUL / CLOSED_DEVIATED / CLOSED_NOT_EXECUTED / CLOSED_UNDETERMINED, PRICE_-prefixed on v3 receipts whose signed verdict is priceExecutionStatus, or PAIR_INVALID), and the binding assertions (preTradeUid, requestHash, destination gate + preTradeUidsHash on v3, chain, asset). On a v3 receipt that commits to a destination gate, pass destinationPreTradeAttestation or the pair cannot close. This is the third-party proof a principal needs to trust an autonomous agent — pair it with agent_begin_trade and execution_receipt.',
  parameters: VerifyExecutionPairInputSchema,
  handler: async (args) => {
    const result = await verifyExecutionPair(
      args.preTradeAttestation as never,
      args.executionReceipt as never,
      args.destinationPreTradeAttestation as never
    );

    const lines = [
      '**Execution pair verification (closed-loop proof):**',
      `- Paired valid: ${result.pairedValid}`,
      `- Closed-loop status: ${result.closedLoopStatus}`,
      `- Reason: ${result.reason}`,
      `- Binding: preTradeUid=${result.binding.preTradeUidMatch}, requestHash=${result.binding.requestHashMatch}, destinationGate=${result.binding.destinationPreTradeUidMatch}, uidsHash=${result.binding.preTradeUidsHashMatch}, chain=${result.binding.chainMatch}, asset=${result.binding.assetMatch}`,
      `- Pre-trade: valid=${result.preTrade.valid}, expired=${result.preTrade.expired}, schema=v${result.preTrade.schemaVersion}`,
      `- Execution: valid=${result.execution.valid}, status=${result.execution.executionStatus}`,
      '',
      'Note: a FAITHFUL closed-loop status means the agent filled within the certified band AND the receipt is cryptographically bound to a valid pre-trade gate. This proves fidelity to the CERTIFIED PRICE (the v3 PRICE_ prefix states that scope in the name); it does not assert the price was "correct", the trade well-timed, or the size within any cap (verification != endorsement).',
    ];

    return lines.join('\n');
  },
};
