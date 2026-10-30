import type {
  PrepareAerodromeSlipstreamExactInputRequest,
  PreparedAerodromeSlipstreamExactInput,
} from '@/lib/dex/aerodromeSlipstreamSwap';
import { executionAdapterRegistry } from '@/lib/execution/adapters';

import { formatAsText } from './formatters';
import { AerodromeSlipstreamSwapPreparationInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

/**
 * Produces bounded calldata for a user-controlled Base signer. This is a
 * preparation surface only: Insight must never receive a wallet key or submit
 * the returned approval/swap transaction.
 */
export const prepareAerodromeSlipstreamSwapTool: McpToolDefinition<
  typeof AerodromeSlipstreamSwapPreparationInputSchema
> = {
  name: 'prepare_aerodrome_slipstream_swap',
  description:
    'Prepare a user-signable exact-input swap against one allowlisted Base Aerodrome Slipstream pool. The tool takes a reviewed profile id, exact input amount, recipient, short deadline, and slippage bound; then obtains a pinned quote and re-verifies the Factory, QuoterV2, Pool, and Router identities. It returns unsigned approval and swap calldata only. Insight never receives a key, signs, relays, or broadcasts a transaction.',
  parameters: AerodromeSlipstreamSwapPreparationInputSchema,
  handler: async (args) => {
    const prepared = await executionAdapterRegistry.preflight<
      PrepareAerodromeSlipstreamExactInputRequest,
      PreparedAerodromeSlipstreamExactInput
    >('insight.evm.aerodrome-slipstream-exact-input.v1', args);
    return formatAsText({
      ...prepared.native,
      postSettlement: {
        submitTransactionHashTo: 'execution_receipt',
        sourceAssetId: 'eip155:8453/erc20:0x4200000000000000000000000000000000000006',
        destinationAssetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        note: 'Use the signed pre-trade attestations and the Base transaction hash to obtain a generic Insight Execution Receipt. The receipt observes ERC-20 settlement; it does not confer transaction authority.',
      },
    });
  },
};
