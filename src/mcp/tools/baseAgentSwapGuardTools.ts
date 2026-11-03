import { z } from 'zod';

import {
  prepareBaseAgentSwapGuard,
  BaseAgentSwapGuardInputSchema,
} from '@/lib/dex/baseAgentSwapGuard';
import { createBaseAgentSwapGuardDecision } from '@/lib/dex/baseAgentSwapGuardAttestation';
import {
  settleBaseAgentSwapGuard,
  verifyBaseAgentSwapGuardSettlement,
} from '@/lib/dex/baseAgentSwapGuardSettlement';

import { formatAsText } from './formatters';

import type { McpToolDefinition } from './types';

const HEX_32 = /^0x[0-9a-fA-F]{64}$/;

export const BaseAgentSwapGuardSettlementInputSchema = z
  .object({
    decision: z.record(z.string(), z.unknown()),
    swapTxHash: z.string().regex(HEX_32),
    approvalTxHash: z.string().regex(HEX_32).optional(),
  })
  .strict();

export type BaseAgentSwapGuardSettlementInput = z.infer<
  typeof BaseAgentSwapGuardSettlementInputSchema
>;

/**
 * The post-settlement half of the guard workflow: pair the signed decision the
 * agent executed under with the transaction that actually settled, reconcile the
 * fill against the guarded quote, and return a signed settlement closure.
 */
export const settleBaseAgentSwapGuardTool: McpToolDefinition<
  typeof BaseAgentSwapGuardSettlementInputSchema
> = {
  name: 'settle_base_agent_swap_guard',
  description:
    'Close the loop on a settled Base Agent Swap Guard swap. Present the signed guard decision the agent executed under plus the swap transaction hash (and the approval transaction hash when held). Insight verifies the decision, requires the on-chain to/value/calldata to match the guarded approval and swap calls byte-for-byte, reconciles the observed ERC-20 input and output amounts against the guarded quote (amountInRaw, quotedAmountOutRaw, amountOutMinimumRaw, realized output-leg slippage vs the agent policy), and returns a signed BaseAgentSwapGuardSettlement bound to the decisionHash with explicit reason codes (SWAP_TX_REVERTED, SOURCE_AMOUNT_MISMATCH, REALIZED_SLIPPAGE_EXCEEDED, DECISION_EXPIRED_AT_CLOSURE, APPROVAL_TX_NOT_PRESENTED, and others). A decision that does not verify, or a transaction whose bytes differ from the guarded calls, is rejected. This is settlement evidence, not transaction authority, a price-correctness claim, or a guarantee of good timing.',
  parameters: BaseAgentSwapGuardSettlementInputSchema,
  handler: async (args) => {
    const result = await settleBaseAgentSwapGuard({
      decision: args.decision,
      swapTxHash: args.swapTxHash as `0x${string}`,
      approvalTxHash: (args.approvalTxHash ?? null) as `0x${string}` | null,
    });

    if (!result.ok) {
      throw new Error(
        `settle_base_agent_swap_guard failed (${result.code}${result.reason ? `: ${result.reason}` : ''}): ${result.message}`
      );
    }

    const s = result.settlement;
    return formatAsText({
      settlement: s,
      verificationHint: `Verify the signed settlement by POSTing { "verifyOnly": true, "settlement": <object> } to ${s.verifyUrl}.`,
      agentInstructions: [
        'Preserve the signed settlement with the guard decision and both transaction hashes; they form one evidence chain.',
        ...(s.reasonCodes.length > 0
          ? [
              `Review the reason codes before treating this settlement as routine: ${s.reasonCodes.join(', ')}.`,
            ]
          : []),
        'The settlement certifies that the executed bytes matched the guarded calls and reports the fill against the guarded quote; it is not a claim the price was correct or that the trade was well-timed.',
      ],
    });
  },
};

/** Public verifier for a previously issued settlement closure. */
export const verifyBaseAgentSwapGuardSettlementTool: McpToolDefinition<
  typeof BaseAgentSwapGuardSettlementInputSchema
> = {
  name: 'verify_base_agent_swap_guard_settlement',
  description:
    'Independently verify a signed BaseAgentSwapGuardSettlement: structural shape, the reason-code hash, the EIP-712 uid, the attester signature, and attester trust. Pass the settlement artifact wrapped as { decision: { settlement: <settlement> } }. Returns valid/invalid with a machine-readable reason, plus the signed decisionHash, swapTxHash, and attester so a third party can detect two valid closures binding one decisionHash to different swap transactions — a contradiction no honest settlement produces. This checks the signature only; it does not re-read the chain.',
  parameters: BaseAgentSwapGuardSettlementInputSchema,
  handler: async (args) => {
    // The signed settlement is carried under `settlement` inside the envelope.
    const settlement =
      (args.decision as { settlement?: unknown } | null)?.settlement ?? args.decision;
    const verification = await verifyBaseAgentSwapGuardSettlement(settlement);
    return formatAsText({
      verification,
      note: 'valid=true means the settlement signature and integrity check out; it does not re-read the chain.',
    });
  },
};

/**
 * One agent-facing boundary for the initial reviewed direct-swap profiles on
 * Base and BNB.  The guard deliberately returns no executable calls for
 * CAUTION or BLOCK, so a caller cannot accidentally treat risk evidence as
 * permission to trade.
 */
export const prepareBaseAgentSwapGuardTool: McpToolDefinition<
  typeof BaseAgentSwapGuardInputSchema
> = {
  name: 'prepare_base_agent_swap_guard',
  description:
    'Prepare and gate one reviewed direct-router swap for an AI agent on Base or BNB Smart Chain: Aerodrome Slipstream WETH→USDC CL100 and USDC→USDT CL1 (both directions) on Base, PancakeSwap V3 USDC→USDT 0.01% on Base, or PancakeSwap V3 USDT→USDC 0.01% on BNB (both directions). It obtains a fresh pinned quote, re-verifies reviewed contract identities, canonical-decodes the exact approval/swap calldata, validates both agent decision prices against independent oracle consensus, and converts the route quote using the independent destination consensus before applying price-impact/TWAP/slippage/freshness policy. ALLOW returns exact unsigned approval and swap calldata plus a decisionHash, and adds a short-lived signed decision when Insight has a published attester; CAUTION or BLOCK returns no calls to sign. After settlement, pair the signed decision with the swap transaction hash via settle_base_agent_swap_guard to obtain a signed settlement closure. It does not route, sign, relay, broadcast, authorize, assess smart-account UserOperations, or accept arbitrary aggregator calldata.',
  parameters: BaseAgentSwapGuardInputSchema,
  handler: async (args) => {
    const guard = await prepareBaseAgentSwapGuard(args);
    const decision = await createBaseAgentSwapGuardDecision(guard);
    return formatAsText({
      // Preserve the original guard response as the top-level MCP contract;
      // portable consumers take the nested signed decision to PriorSeal.
      ...guard,
      decision,
      agentInstructions:
        guard.verdict === 'ALLOW' && decision.attestation !== null
          ? [
              'Present the signed Insight decision and both exact calls to the user before requesting any signature.',
              'Create two PriorSeal exact-call authorizations: approval first, then the byte-identical swap with the next nonce. Do not batch the calls or replace the token, router, recipient, amount, deadline, or calldata.',
              'Observe a successful approval before submitting the separately authorized swap, then preserve both execution receipts with the signed decision.',
            ]
          : guard.verdict === 'ALLOW'
            ? [
                'Do not request a signature: this ALLOW has no trusted Insight attestation and cannot form a portable PriorSeal authorization binding.',
                'Configure and publish the Insight production attester, then obtain a fresh assessment; do not reuse this unsigned result.',
              ]
            : guard.verdict === 'CAUTION'
              ? [
                  'Do not request a signature or submit this proposal automatically.',
                  'Explain the caution, then obtain a newly assessed proposal if the user chooses a different policy or trade.',
                ]
              : [
                  'Do not request a signature, submit the calls, or bypass the result with a different route.',
                  'Create a separate assessment only after the underlying market, policy, or price inputs have materially changed.',
                ],
    });
  },
};
