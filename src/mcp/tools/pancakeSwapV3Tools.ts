import type {
  PreparePancakeSwapV3ExactInputRequest,
  PreparedPancakeSwapV3ExactInput,
} from '@/lib/dex/pancakeSwapV3Swap';
import { executionAdapterRegistry } from '@/lib/execution/adapters';

import { formatAsText } from './formatters';
import { PancakeSwapV3SwapPreparationInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

/**
 * Bounded PancakeSwap V3 transaction preparation.  The returned calls remain
 * unsigned: the caller's wallet is the only signing and broadcasting authority.
 */
export const preparePancakeSwapV3SwapTool: McpToolDefinition<
  typeof PancakeSwapV3SwapPreparationInputSchema
> = {
  name: 'prepare_pancakeswap_v3_swap',
  description:
    'Prepare a user-signable exact-input swap against one allowlisted Base PancakeSwap V3 pool. Insight obtains a pinned quote and re-verifies the Factory, QuoterV2, Pool, and Router runtime identities before returning unsigned approval and swap calldata. It never receives a key, signs, relays, or broadcasts a transaction.',
  parameters: PancakeSwapV3SwapPreparationInputSchema,
  handler: async (args) => {
    const prepared = await executionAdapterRegistry.preflight<
      PreparePancakeSwapV3ExactInputRequest,
      PreparedPancakeSwapV3ExactInput
    >('insight.evm.pancakeswap-v3-exact-input.v1', args);
    return formatAsText({
      ...prepared.native,
      postSettlement: {
        submitTransactionHashTo: 'execution_receipt',
        sourceAssetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        destinationAssetId: 'eip155:8453/erc20:0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
        note: 'Use the signed pre-trade attestations and Base transaction hash for generic Insight execution evidence. The receipt observes settlement; it never confers transaction authority.',
      },
    });
  },
};
