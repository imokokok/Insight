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

export const MetricsInputSchema = z.object({});

export const ProviderReputationInputSchema = z.object({
  provider: SafeProviderSchema.describe('Oracle provider name'),
  trend: z.boolean().optional().describe('Include historical trend data'),
  days: z.number().int().min(1).max(365).optional().default(30).describe('Trend period in days'),
});
