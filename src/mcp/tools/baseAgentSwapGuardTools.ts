import {
  prepareBaseAgentSwapGuard,
  BaseAgentSwapGuardInputSchema,
} from '@/lib/dex/baseAgentSwapGuard';

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
    'Prepare and gate one reviewed Base direct-router swap for an AI agent: Aerodrome Slipstream WETH→USDC CL100 or PancakeSwap V3 USDC→USDT 0.01%. It obtains a fresh pinned quote, re-verifies reviewed contract identities, canonical-decodes the exact approval/swap calldata, validates both agent decision prices against independent oracle consensus, and converts the route quote using the independent destination consensus before applying price-impact/TWAP/slippage/freshness policy. ALLOW returns exact unsigned approval and swap calldata plus a decisionHash; CAUTION or BLOCK returns no calls to sign. It does not route, sign, relay, broadcast, authorize, assess smart-account UserOperations, or accept arbitrary aggregator calldata.',
  parameters: BaseAgentSwapGuardInputSchema,
  handler: async (args) => {
    const result = await prepareBaseAgentSwapGuard(args);
    return formatAsText({
      ...result,
      agentInstructions:
        result.verdict === 'ALLOW'
          ? [
              'Present the exact approval and swap calls plus decisionHash to the user before requesting any signature.',
              'Bind decisionHash and the byte-identical calls to the user authorization. Do not replace the router, token, recipient, amount, deadline, or calldata after this decision.',
              'After settlement, use execution_receipt with the Base transaction hash and the original pre-trade attestations when available.',
            ]
          : result.verdict === 'CAUTION'
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
