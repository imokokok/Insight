import {
  prepareBaseAgentSwapGuard,
  BaseAgentSwapGuardInputSchema,
} from '@/lib/dex/baseAgentSwapGuard';
import { createBaseAgentSwapGuardDecision } from '@/lib/dex/baseAgentSwapGuardAttestation';

import { formatAsText } from './formatters';

import type { McpToolDefinition } from './types';

/**
 * One agent-facing boundary for the initial Base direct-swap profiles.  The
 * guard deliberately returns no executable calls for CAUTION or BLOCK, so a
 * caller cannot accidentally treat risk evidence as permission to trade.
 */
export const prepareBaseAgentSwapGuardTool: McpToolDefinition<
  typeof BaseAgentSwapGuardInputSchema
> = {
  name: 'prepare_base_agent_swap_guard',
  description:
    'Prepare and gate one reviewed Base direct-router swap for an AI agent: Aerodrome Slipstream WETH→USDC CL100, Aerodrome Slipstream USDC→USDT CL1 (both directions), or PancakeSwap V3 USDC→USDT 0.01%. It obtains a fresh pinned quote, re-verifies reviewed contract identities, canonical-decodes the exact approval/swap calldata, validates both agent decision prices against independent oracle consensus, and converts the route quote using the independent destination consensus before applying price-impact/TWAP/slippage/freshness policy. ALLOW returns exact unsigned approval and swap calldata plus a decisionHash, and adds a short-lived signed decision when Insight has a published attester; CAUTION or BLOCK returns no calls to sign. After settlement, pair the signed decision with the swap transaction hash via settle_base_agent_swap_guard to obtain a signed settlement closure. It does not route, sign, relay, broadcast, authorize, assess smart-account UserOperations, or accept arbitrary aggregator calldata.',
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
