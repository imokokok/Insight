import {
  BASE_USDC_ADDRESS,
  caip19Erc20,
  CHAIN_ID,
  TOKEN_ADDRESS,
} from '@/lib/constants/tokenAddresses';
import {
  PANCAKE_SWAP_V3_BNB_USDC,
  PANCAKE_SWAP_V3_BNB_USDT,
  PANCAKE_SWAP_V3_BNB_WBNB,
} from '@/lib/dex/pancakeSwapV3';
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
    // Asset ids must follow the requested pool direction; the reviewed
    // USDC/USDT pair is a two-way lane.
    const sourceAssetId = prepared.native.exactInput.tokenIn;
    const destinationAssetId = prepared.native.exactInput.tokenOut;
    const assetIdByAddress: Record<string, string> = {
      [TOKEN_ADDRESS.BASE_USDC.toLowerCase()]: caip19Erc20(CHAIN_ID.BASE, BASE_USDC_ADDRESS),
      '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2':
        'eip155:8453/erc20:0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
      [PANCAKE_SWAP_V3_BNB_USDT.toLowerCase()]: caip19Erc20(
        CHAIN_ID.BSC,
        PANCAKE_SWAP_V3_BNB_USDT
      ),
      [PANCAKE_SWAP_V3_BNB_USDC.toLowerCase()]: caip19Erc20(
        CHAIN_ID.BSC,
        PANCAKE_SWAP_V3_BNB_USDC
      ),
      [PANCAKE_SWAP_V3_BNB_WBNB.toLowerCase()]: caip19Erc20(
        CHAIN_ID.BSC,
        PANCAKE_SWAP_V3_BNB_WBNB
      ),
    };
    return formatAsText({
      ...prepared.native,
      postSettlement: {
        submitTransactionHashTo: 'execution_receipt',
        sourceAssetId: assetIdByAddress[sourceAssetId.toLowerCase()] ?? sourceAssetId,
        destinationAssetId:
          assetIdByAddress[destinationAssetId.toLowerCase()] ?? destinationAssetId,
        note: 'Use the signed pre-trade attestations and the settlement-chain transaction hash for generic Insight execution evidence. The receipt observes settlement; it never confers transaction authority.',
      },
    });
  },
};
