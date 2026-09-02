import { z } from 'zod';

import { SafeProviderSchema, SafeSymbolSchema, SafeChainSchema } from '@/lib/security/validation';
import { STABLECOINS, type StablecoinSymbol } from '@/lib/stablecoins/config';
import { WRAPPED_ASSETS } from '@/lib/wrapped-assets/config';

const STABLECOIN_SYMBOLS = STABLECOINS.map((c) => c.symbol) as [
  StablecoinSymbol,
  ...StablecoinSymbol[],
];

export const OraclePriceInputSchema = z.object({
  provider: SafeProviderSchema.describe('Oracle provider name, e.g. chainlink, redstone, api3'),
  symbol: SafeSymbolSchema.describe('Asset symbol, e.g. BTC, ETH, BTC/USD'),
  chain: SafeChainSchema.optional().describe('Optional blockchain, e.g. ethereum, arbitrum, base'),
  forceRefresh: z.boolean().optional().describe('Force refresh from upstream instead of cache'),
});

export const ConsensusPriceInputSchema = z.object({
  symbol: SafeSymbolSchema.describe('Asset symbol, e.g. BTC, ETH'),
  chain: SafeChainSchema.optional().describe('Optional blockchain filter'),
  method: z
    .enum(['median', 'trimmed_mean', 'weighted_median', 'iqr_filtered'])
    .optional()
    .describe('Consensus aggregation method'),
});

export const OracleWatchInputSchema = z.object({
  symbol: SafeSymbolSchema.describe('Asset symbol, e.g. BTC, ETH'),
  chain: SafeChainSchema.optional().describe('Optional blockchain filter'),
});

/**
 * History look-back for `oracle_watch_history`. Capped at 30d because the tool
 * is Pro-tier (REST allows 90d on Protocol) and the MCP handler has no plan
 * context to clamp against — bounding the input is the honest alternative to
 * silently truncating it later.
 */
export const OracleWatchHistoryInputSchema = z.object({
  symbol: SafeSymbolSchema.describe('Asset symbol, e.g. BTC, ETH'),
  chain: SafeChainSchema.optional().describe('Optional blockchain filter'),
  days: z
    .number()
    .int()
    .min(1)
    .max(30)
    .optional()
    .default(7)
    .describe('Look-back window in days (1-30, default 7)'),
  interval: z
    .enum(['30min', 'hourly', 'daily'])
    .optional()
    .describe('Aggregation grain: 30min (raw spine), hourly, or daily. Default 30min')
    .default('hourly'),
});

export const RiskSummaryInputSchema = z.object({
  symbol: SafeSymbolSchema.describe('Asset symbol, e.g. BTC, ETH'),
  providers: z
    .array(SafeProviderSchema)
    .min(2, 'At least 2 providers are required')
    .describe('Oracle providers to analyze, e.g. ["chainlink", "redstone", "api3"]'),
  period: z
    .number()
    .int()
    .min(1)
    .max(8760)
    .optional()
    .default(168)
    .describe('Analysis period in hours, default 168 (7 days)'),
});

export const DateQueryInputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
    .optional()
    .describe('Date in YYYY-MM-DD format, defaults to today'),
});

export const StablecoinInputSchema = z.object({
  symbol: z
    .enum(STABLECOIN_SYMBOLS)
    .optional()
    .describe(`Stablecoin symbol. Supported: ${STABLECOIN_SYMBOLS.join(', ')}`),
});

export const DeviationInputSchema = z.object({
  symbol: SafeSymbolSchema.describe('Asset symbol, e.g. BTC, ETH'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional()
    .describe('Start date in YYYY-MM-DD format'),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional()
    .describe('End date in YYYY-MM-DD format'),
  interval: z.enum(['1h', '6h', '24h']).optional().default('24h').describe('Aggregation interval'),
});

export const ProtocolRiskParamsInputSchema = z.object({
  protocol: z.string().min(1).describe('Protocol name or slug, e.g. aave-v3, compound-v3'),
});

export const SymbolQueryInputSchema = z.object({
  query: z.string().optional().describe('Optional search query to filter symbols'),
});

export const OracleSetupRecommendationInputSchema = z.object({
  symbol: SafeSymbolSchema.describe('Asset symbol to recommend an oracle setup for, e.g. BTC, ETH'),
});

export const BatchPriceInputSchema = z.object({
  queries: z
    .array(
      z.object({
        provider: SafeProviderSchema.describe('Oracle provider name'),
        symbol: SafeSymbolSchema.describe('Asset symbol'),
        chain: SafeChainSchema.optional().describe('Optional blockchain'),
      })
    )
    .min(1, 'At least one query is required')
    .max(20, 'Maximum 20 queries per batch')
    .describe('Array of price queries, e.g. [{"provider":"chainlink","symbol":"BTC"}]'),
  forceRefresh: z.boolean().optional().describe('Force refresh from upstream instead of cache'),
});

export const PriceHistoryInputSchema = z.object({
  provider: SafeProviderSchema.describe('Oracle provider name'),
  symbol: SafeSymbolSchema.describe('Asset symbol'),
  chain: SafeChainSchema.optional().describe('Optional blockchain'),
  period: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .refine(
      (val) => !isNaN(val) && val >= 1 && val <= 8760,
      'Period must be between 1 and 8760 hours'
    )
    .describe('Historical period in hours'),
  forceRefresh: z.boolean().optional().describe('Force refresh from upstream instead of cache'),
});

export const CrossChainSpreadInputSchema = z.object({
  provider: SafeProviderSchema.describe('Oracle provider name'),
  symbol: SafeSymbolSchema.describe('Asset symbol'),
  baseChain: SafeChainSchema.optional().describe('Base chain for spread calculation'),
});

const WRAPPED_ASSET_SYMBOLS = WRAPPED_ASSETS.map((a) => a.symbol) as [string, ...string[]];

export const WrappedAssetInputSchema = z.object({
  symbol: z
    .enum(WRAPPED_ASSET_SYMBOLS)
    .optional()
    .describe(`Wrapped asset symbol. Supported: ${WRAPPED_ASSET_SYMBOLS.join(', ')}`),
});

export const ProtocolsInputSchema = z.object({
  query: z.string().optional().describe('Optional search query to filter protocols'),
});

export const ProtocolOracleExposureInputSchema = z.object({
  protocol: z.string().min(1).describe('Protocol ID or slug, e.g. aave-v3, compound-v3'),
});

export const FeedFreshnessInputSchema = z.object({
  provider: SafeProviderSchema.optional().describe('Filter by oracle provider'),
  symbol: SafeSymbolSchema.optional().describe('Filter by asset symbol'),
  category: z
    .enum(['crypto', 'stablecoin', 'forex', 'commodity', 'wrapped', 'lst'])
    .optional()
    .describe('Filter by feed category'),
});

export const ReputationRankingsInputSchema = z.object({
  days: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 90, 'days must be between 1 and 90')
    .optional()
    .default(7)
    .describe('Trend period in days, default 7'),
});

export const IncidentsInputSchema = z.object({
  provider: SafeProviderSchema.optional().describe('Filter by oracle provider'),
  minSeverity: z
    .enum(['low', 'medium', 'high', 'critical'])
    .optional()
    .describe('Minimum severity'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional()
    .describe('Start date in YYYY-MM-DD format, defaults to 7 days ago'),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional()
    .describe('End date in YYYY-MM-DD format, defaults to today'),
  limit: z.number().int().min(1).max(200).optional().default(50).describe('Maximum results'),
  offset: z.number().int().min(0).optional().default(0).describe('Pagination offset'),
});

export const FeedsInputSchema = z.object({
  provider: SafeProviderSchema.optional().describe('Filter by oracle provider'),
  symbol: SafeSymbolSchema.optional().describe('Filter by asset symbol'),
  category: z
    .enum(['crypto', 'stablecoin', 'forex', 'commodity', 'wrapped', 'lst'])
    .optional()
    .describe('Filter by feed category'),
  chainId: z.coerce.number().int().optional().describe('Filter by chain ID'),
  isActive: z.coerce.boolean().optional().default(true).describe('Filter by active status'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .default(100)
    .describe('Maximum results'),
  offset: z.coerce.number().int().min(0).optional().default(0).describe('Pagination offset'),
});

export const FeedHealthInputSchema = z.object({
  feedId: z.string().uuid('Feed ID must be a valid UUID').describe('Oracle feed UUID'),
});

export const LatencyInputSchema = z.object({
  provider: SafeProviderSchema.optional().describe('Filter by oracle provider'),
  symbol: SafeSymbolSchema.optional().describe('Filter by asset symbol'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional()
    .describe('Start date in YYYY-MM-DD format, defaults to 7 days ago'),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional()
    .describe('End date in YYYY-MM-DD format, defaults to today'),
});

export const AnomaliesInputSchema = z.object({
  days: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 30, 'days must be between 1 and 30')
    .optional()
    .default(7)
    .describe('Lookback period in days, default 7'),
});

export const CorrelationInputSchema = z.object({
  symbol: SafeSymbolSchema.describe('Asset symbol, e.g. BTC, ETH'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional()
    .describe('Start date in YYYY-MM-DD format, defaults to 7 days ago'),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .optional()
    .describe('End date in YYYY-MM-DD format, defaults to today'),
});

export const CoverageInputSchema = z.object({});

const AssetEntrySchema = z.object({
  symbol: z.string().min(1),
  amount: z.number().positive(),
});

export const PositionSafetyInputSchema = z
  .object({
    protocolId: z.string().min(1, 'Protocol ID is required').describe('Protocol ID or slug'),
    collaterals: z
      .array(AssetEntrySchema)
      .min(1, 'At least one collateral is required')
      .optional()
      .describe('Multi-asset collateral positions'),
    borrows: z
      .array(AssetEntrySchema)
      .min(1, 'At least one borrow is required')
      .optional()
      .describe('Multi-asset borrow positions'),
    collateralSymbol: z.string().min(1).optional().describe('Single-asset collateral symbol'),
    collateralAmount: z.number().positive().optional().describe('Single-asset collateral amount'),
    borrowSymbol: z.string().min(1).optional().describe('Single-asset borrow symbol'),
    borrowAmount: z.number().positive().optional().describe('Single-asset borrow amount'),
  })
  .refine(
    (data) => {
      const hasMultiAsset =
        data.collaterals && data.collaterals.length > 0 && data.borrows && data.borrows.length > 0;
      const hasSingleAsset =
        data.collateralSymbol && data.collateralAmount && data.borrowSymbol && data.borrowAmount;
      return hasMultiAsset || hasSingleAsset;
    },
    { message: 'Provide either collaterals/borrows arrays or single collateral/borrow fields' }
  );

export const PreTradeSafetyInputSchema = z.object({
  asset: SafeSymbolSchema.describe('Asset symbol being traded, e.g. BTC, ETH, USDC'),
  chainId: z
    .number()
    .int()
    .describe(
      'Chain ID where the trade executes, e.g. 1=Ethereum, 42161=Arbitrum, 8453=Base. Use 0 for chain-agnostic.'
    ),
  action: z
    .enum(['swap', 'borrow', 'lend', 'liquidate', 'repay'])
    .describe('Type of DeFi operation being considered'),
  tradeAmountUsd: z.number().positive().describe('Trade size in USD'),
  targetProviders: z
    .array(SafeProviderSchema)
    .optional()
    .describe('Optional: restrict the check to specific oracle providers'),
  protocolId: z
    .string()
    .optional()
    .describe(
      'Optional lending protocol id (e.g. aave-v3-ethereum). When set, the verdict also reflects how much of the protocol max-LTV safety buffer the current oracle deviation consumes (lending actions only).'
    ),
});

/**
 * Inputs for the `agent_begin_trade` tool — the pre-trade half of the verifiable
 * execution loop. An agent hands its swap/DeFi intent; Insight runs the oracle
 * safety check and, if the verdict allows trading, returns a machine-readable
 * "execution certification handle" (preTradeUid + requestHash + certified price
 * and slippage band) the agent feeds into `execution_receipt` after it executes
 * the trade with its own wallet. `destinationAsset` and `maxSlippageBps` are
 * required because the handle must pin the exact pair and tolerance the receipt
 * will be judged against.
 */
export const AgentBeginTradeInputSchema = z.object({
  asset: SafeSymbolSchema.describe('Source asset symbol being sold, e.g. ETH, BTC, USDC'),
  destinationAsset: SafeSymbolSchema.describe(
    'Destination asset symbol being bought, e.g. USDC, ETH'
  ),
  chainId: z
    .number()
    .int()
    .describe('Chain ID where the trade executes, e.g. 1=Ethereum, 42161=Arbitrum, 8453=Base'),
  action: z
    .enum(['swap', 'borrow', 'lend', 'liquidate', 'repay'])
    .describe('Type of DeFi operation being considered'),
  tradeAmountUsd: z.number().positive().describe('Trade size in USD'),
  maxSlippageBps: z
    .number()
    .int()
    .min(0)
    .describe(
      'Agent execution tolerance; echoed into the execution receipt as the signed slippage bound'
    ),
  targetProviders: z
    .array(SafeProviderSchema)
    .optional()
    .describe('Optional: restrict the check to specific oracle providers'),
  protocolId: z.string().optional().describe('Optional lending protocol id (lending actions only)'),
  sourceGroupCount: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      'Distinct non-derived operator groups the agent gated on; defaults to participantCount'
    ),
});

export const MetricsInputSchema = z.object({});

export const ProviderReputationInputSchema = z.object({
  provider: SafeProviderSchema.describe('Oracle provider name'),
  trend: z.boolean().optional().describe('Include historical trend data'),
  days: z.number().int().min(1).max(365).optional().default(30).describe('Trend period in days'),
});

/**
 * Inputs for the `execution_receipt` tool. The agent hands back the pre-trade
 * fields it was certified against (it already holds its own pre-trade receipt)
 * plus the settlement txHash. The cryptographic pairing lives in the signed
 * receipt (`preTradeUid` + `requestHash`); nothing here is a database join.
 * `quotedPrice` and the on-chain `executedPrice` MUST share the caller's price
 * convention (the service does not assume which way the oracle price was quoted).
 */
export const ExecutionReceiptInputSchema = z.object({
  preTradeUid: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, 'preTradeUid must be a 0x-prefixed 32-byte hex')
    .describe('UID of the paired pre-trade attestation'),
  requestHash: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, 'requestHash must be a 0x-prefixed 32-byte hex')
    .describe('Canonical request commitment from the pre-trade attestation'),
  sourceAssetId: z.string().min(1).describe('CAIP-19 id of the asset sold'),
  destinationAssetId: z.string().min(1).describe('CAIP-19 id of the asset bought'),
  subjectChainId: z.number().int().describe('Chain id the pre-trade was scoped to'),
  settlementChainId: z.number().int().describe('Chain id the transaction settled on'),
  participantCount: z.number().int().min(0).describe('Oracle providers the agent gated on'),
  sourceGroupCount: z
    .number()
    .int()
    .min(0)
    .describe('Distinct non-derived operator groups the agent gated on'),
  preTradeSignedAt: z.number().int().describe('Unix seconds the pre-trade was signed'),
  quotedPrice: z
    .number()
    .describe('Target price, same convention as executedPrice (e.g. dest per source)'),
  maxSlippageBps: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Signed slippage bound; defaults to 50'),
  action: z.string().optional().describe('Action label, e.g. SWAP'),
  quotedAmountUsd: z.number().optional().describe('Informational notional the agent intended'),
  executedAmountUsd: z.number().optional().describe('Informational notional actually filled'),
  actualFeeUsd: z.number().optional().describe('Informational fee paid'),
  mevRiskScore: z.number().optional().describe('Advisory 0..1 MEV-exposure estimate'),
  txHash: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, 'txHash must be a 0x-prefixed 32-byte hex')
    .describe('Settlement transaction hash'),
  taker: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional()
    .describe('Address whose balances define the trade; defaults to tx sender'),
  destinationPreTradeUid: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .optional()
    .describe(
      'v3: uid of the destination pre-trade gate the quote was built from. Ignored when preTradeAttestations are supplied.'
    ),
  quoteVenueIndependent: z
    .boolean()
    .optional()
    .describe(
      'v3: whether quotedPrice is independent of the venue executed on. Defaults to false — independence must be claimed, never implied.'
    ),
  quoteBasis: z
    .enum(['PREV_BLOCK_CLOSE', 'PRE_SWAP_IN_BLOCK', 'ORACLE_CONSENSUS', 'UNSPECIFIED'])
    .optional()
    .describe('v3: which price state quotedPrice was taken against'),
  quoteBlockNumber: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('v3: block the quoted price was read from (0 when not applicable)'),
  priceStateAgeAtExecSeconds: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('v3: age of the price state the quote came from, seconds'),
  claimRole: z
    .enum(['FIRST_PARTY_EXECUTION', 'THIRD_PARTY_OBSERVATION'])
    .optional()
    .describe(
      'v3: whose execution this receipt describes. Defaults to THIRD_PARTY_OBSERVATION — an observer of public settlements must claim the first-person role to get it.'
    ),
  /** The signed pre-trade originals returned by `agent_begin_trade`. Passing
   *  BOTH upgrades the receipt to a VERIFIED binding: every bound field is then
   *  re-derived from the verified payloads instead of trusted from this request,
   *  and the receipt becomes eligible for a FAITHFUL verdict. Omit and the
   *  receipt falls back to SELF_REPORTED (never FAITHFUL). */
  preTradeAttestations: z
    .object({
      source: z.record(z.string(), z.unknown()),
      destination: z.record(z.string(), z.unknown()),
    })
    .optional()
    .describe('Signed pre-trade attestations for the source and destination assets'),
});

/** Input for `verify_execution_pair`: the two receipts an agent produced for one
 *  action — the pre-trade oracle-safety attestation it gated on, and the
 *  Execution Receipt proving how it filled. Both are opaque signed objects, so
 *  the shape is enforced loosely and the crypto layer re-derives each hash. */
export const VerifyExecutionPairInputSchema = z.object({
  preTradeAttestation: z
    .object({
      uid: z.string(),
      schemaVersion: z.number(),
      attester: z.string(),
      data: z.record(z.string(), z.any()),
      signature: z.string(),
      type: z.string().optional(),
      eip712: z.record(z.string(), z.any()).optional(),
    })
    .passthrough()
    .describe('The pre-trade oracle-safety attestation the agent gated on.'),
  executionReceipt: z
    .object({
      uid: z.string(),
      schemaVersion: z.number(),
      attester: z.string(),
      signature: z.string(),
      data: z.record(z.string(), z.any()),
    })
    .passthrough()
    .describe('The Execution Receipt to check against the pre-trade attestation.'),
  destinationPreTradeAttestation: z
    .object({
      uid: z.string(),
      schemaVersion: z.number(),
      attester: z.string(),
      data: z.record(z.string(), z.any()),
      signature: z.string(),
      type: z.string().optional(),
      eip712: z.record(z.string(), z.any()).optional(),
    })
    .passthrough()
    .optional()
    .describe(
      'v3 only: the SECOND pre-trade gate (destination leg) when the Execution Receipt commits to one via data.destinationPreTradeUid. Required for v3 receipts signed with a two-gate VERIFIED binding; omitting it fails the destination-gate binding check.'
    ),
});
