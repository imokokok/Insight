import type { HyperliquidPerpExecutionEvidence } from '@/lib/dex/hyperliquidPerpExecution';
import type {
  HyperliquidPerpOrderPreflight,
  HyperliquidPerpOrderPreflightRequest,
} from '@/lib/dex/hyperliquidPerpOrder';
import { executionAdapterRegistry } from '@/lib/execution/adapters';

import { formatAsText } from './formatters';
import {
  HyperliquidPerpExecutionVerificationInputSchema,
  HyperliquidPerpOrderPreflightInputSchema,
} from './schemas';

import type { McpToolDefinition } from './types';

/** Prepares an order but stops before nonce allocation, signing, and submission. */
export const prepareHyperliquidPerpOrderTool: McpToolDefinition<
  typeof HyperliquidPerpOrderPreflightInputSchema
> = {
  name: 'prepare_hyperliquid_perp_order',
  description:
    'Prepare a reviewed BTC, ETH, or HYPE Hyperliquid perpetual IOC order for LOCAL user/agent-wallet signing. Validates live asset metadata, lot/tick rules, caller notional cap, mark-oracle divergence, and displayed-L2 fill/impact bounds. Returns an unsigned, short-expiry exchange envelope only when every gate passes. Insight never creates a nonce, receives a key, signs, or submits an order.',
  parameters: HyperliquidPerpOrderPreflightInputSchema,
  handler: async (args) => {
    const prepared = await executionAdapterRegistry.preflight<
      HyperliquidPerpOrderPreflightRequest,
      HyperliquidPerpOrderPreflight
    >('insight.venue.hyperliquid-perp-ioc.v1', args);
    return formatAsText(prepared.native);
  },
};

/** Reads bounded public order and fill evidence after user-side submission. */
export const verifyHyperliquidPerpExecutionTool: McpToolDefinition<
  typeof HyperliquidPerpExecutionVerificationInputSchema
> = {
  name: 'verify_hyperliquid_perp_execution',
  description:
    'Read and verify the public Hyperliquid status and bounded fill history for one user-signed reviewed BTC, ETH, or HYPE perp order. Compares the returned order and fills to the expected client-order-id intent. This is an observed Info-API record, not an Insight signature, a wallet authorization, or a trade submission.',
  parameters: HyperliquidPerpExecutionVerificationInputSchema,
  handler: async (args) => {
    const { user, orderId, ...expected } = args;
    const observation = await executionAdapterRegistry.observe<HyperliquidPerpExecutionEvidence>(
      'insight.venue.hyperliquid-perp-ioc.v1',
      { kind: 'venue-order', venue: 'hyperliquid', account: user, clientOrderId: orderId },
      expected
    );
    return formatAsText(observation.native);
  },
};
