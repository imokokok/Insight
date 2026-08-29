import { z } from 'zod';

import { STABLECOINS } from '@/lib/stablecoins/config';
import { WRAPPED_ASSETS } from '@/lib/wrapped-assets/config';
import { BLOCKCHAIN_VALUES, ORACLE_PROVIDER_VALUES } from '@/types/oracle/enums';

const providerEnum = z.enum(ORACLE_PROVIDER_VALUES as [string, ...string[]]);
const chainEnum = z.enum(BLOCKCHAIN_VALUES as [string, ...string[]]);
const stablecoinEnum = z.enum(STABLECOINS.map((c) => c.symbol) as [string, ...string[]]);
const wrappedAssetEnum = z.enum(WRAPPED_ASSETS.map((a) => a.symbol) as [string, ...string[]]);

/**
 * Plain JSON-Schema-compatible schemas for MCP tool definitions.
 * These mirror the runtime validation schemas but avoid transforms/pipes
 * so that zod v4's toJSONSchema() can represent them.
 */
export const OraclePriceJsonSchema = z.object({
  provider: providerEnum.describe('Oracle provider name, e.g. chainlink, redstone, api3'),
  symbol: z.string().describe('Asset symbol, e.g. BTC, ETH, BTC/USD'),
  chain: chainEnum.optional().describe('Optional blockchain, e.g. ethereum, arbitrum, base'),
  forceRefresh: z.boolean().optional().describe('Force refresh from upstream instead of cache'),
});

export const ConsensusPriceJsonSchema = z.object({
  symbol: z.string().describe('Asset symbol, e.g. BTC, ETH'),
  chain: chainEnum.optional().describe('Optional blockchain filter'),
  method: z
    .enum(['median', 'trimmed_mean', 'weighted_median', 'iqr_filtered'])
    .optional()
    .describe('Consensus aggregation method'),
});

export const OracleWatchJsonSchema = z.object({
  symbol: z.string().describe('Asset symbol, e.g. BTC, ETH'),
  chain: chainEnum.optional().describe('Optional blockchain filter'),
});

/** `oracle_watch_history`. Defaults are documented rather than applied here so
 *  zod v4's toJSONSchema() stays happy (no `.default()` in the wire schema). */
export const OracleWatchHistoryJsonSchema = z.object({
  symbol: z.string().describe('Asset symbol, e.g. BTC, ETH'),
  chain: chainEnum.optional().describe('Optional blockchain filter'),
  days: z
    .number()
    .int()
    .min(1)
    .max(30)
    .optional()
    .describe('Look-back window in days (1-30, default 7)'),
  interval: z
    .enum(['30min', 'hourly', 'daily'])
    .optional()
    .describe('Aggregation grain: 30min (raw spine), hourly, or daily. Default hourly'),
});

export const RiskSummaryJsonSchema = z.object({
  symbol: z.string().describe('Asset symbol, e.g. BTC, ETH'),
  providers: z
    .array(providerEnum)
    .min(2)
    .describe('Oracle providers to analyze, e.g. ["chainlink", "redstone", "api3"]'),
  period: z
    .number()
    .int()
    .min(1)
    .max(8760)
    .optional()
    .describe('Analysis period in hours, default 168 (7 days)'),
});

export const DateQueryJsonSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('Date in YYYY-MM-DD format, defaults to today'),
});

export const StablecoinJsonSchema = z.object({
  symbol: stablecoinEnum
    .optional()
    .describe(`Stablecoin symbol. Supported: ${STABLECOINS.map((c) => c.symbol).join(', ')}`),
});

export const DeviationJsonSchema = z.object({
  symbol: z.string().describe('Asset symbol, e.g. BTC, ETH'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('Start date in YYYY-MM-DD format'),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('End date in YYYY-MM-DD format'),
  interval: z.enum(['1h', '6h', '24h']).optional().describe('Aggregation interval'),
});

export const ProtocolRiskParamsJsonSchema = z.object({
  protocol: z.string().min(1).describe('Protocol name or slug, e.g. aave-v3, compound-v3'),
});

export const SymbolQueryJsonSchema = z.object({
  query: z.string().optional().describe('Optional search query to filter symbols'),
});

export const OracleSetupRecommendationJsonSchema = z.object({
  symbol: z.string().describe('Asset symbol to recommend an oracle setup for, e.g. BTC, ETH'),
});

export const BatchPriceJsonSchema = z.object({
  queries: z
    .array(
      z.object({
        provider: providerEnum.describe('Oracle provider name'),
        symbol: z.string().describe('Asset symbol'),
        chain: chainEnum.optional().describe('Optional blockchain'),
      })
    )
    .min(1)
    .max(20)
    .describe('Array of price queries'),
  forceRefresh: z.boolean().optional().describe('Force refresh from upstream instead of cache'),
});

export const PriceHistoryJsonSchema = z.object({
  provider: providerEnum.describe('Oracle provider name'),
  symbol: z.string().describe('Asset symbol'),
  chain: chainEnum.optional().describe('Optional blockchain'),
  period: z.number().int().min(1).max(8760).describe('Historical period in hours'),
  forceRefresh: z.boolean().optional().describe('Force refresh from upstream instead of cache'),
});

export const CrossChainSpreadJsonSchema = z.object({
  provider: providerEnum.describe('Oracle provider name'),
  symbol: z.string().describe('Asset symbol'),
  baseChain: chainEnum.optional().describe('Base chain for spread calculation'),
});

export const WrappedAssetJsonSchema = z.object({
  symbol: wrappedAssetEnum
    .optional()
    .describe(`Wrapped asset symbol. Supported: ${WRAPPED_ASSETS.map((a) => a.symbol).join(', ')}`),
});

export const ProtocolsJsonSchema = z.object({
  query: z.string().optional().describe('Optional search query to filter protocols'),
});

export const ProtocolOracleExposureJsonSchema = z.object({
  protocol: z.string().min(1).describe('Protocol ID or slug, e.g. aave-v3, compound-v3'),
});

export const FeedFreshnessJsonSchema = z.object({
  provider: providerEnum.optional().describe('Filter by oracle provider'),
  symbol: z.string().optional().describe('Filter by asset symbol'),
  category: z
    .enum(['crypto', 'stablecoin', 'forex', 'commodity', 'wrapped', 'lst'])
    .optional()
    .describe('Filter by feed category'),
});

export const ReputationRankingsJsonSchema = z.object({
  days: z.number().int().min(1).max(90).optional().describe('Trend period in days'),
});

export const IncidentsJsonSchema = z.object({
  provider: providerEnum.optional().describe('Filter by oracle provider'),
  minSeverity: z
    .enum(['low', 'medium', 'high', 'critical'])
    .optional()
    .describe('Minimum severity'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('Start date in YYYY-MM-DD format'),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('End date in YYYY-MM-DD format'),
  limit: z.number().int().min(1).max(200).optional().describe('Maximum results'),
  offset: z.number().int().min(0).optional().describe('Pagination offset'),
});

export const FeedsJsonSchema = z.object({
  provider: providerEnum.optional().describe('Filter by oracle provider'),
  symbol: z.string().optional().describe('Filter by asset symbol'),
  category: z
    .enum(['crypto', 'stablecoin', 'forex', 'commodity', 'wrapped', 'lst'])
    .optional()
    .describe('Filter by feed category'),
  chainId: z.number().int().optional().describe('Filter by chain ID'),
  isActive: z.boolean().optional().describe('Filter by active status'),
  limit: z.number().int().min(1).max(500).optional().describe('Maximum results'),
  offset: z.number().int().min(0).optional().describe('Pagination offset'),
});

export const FeedHealthJsonSchema = z.object({
  feedId: z.string().uuid().describe('Oracle feed UUID'),
});

export const LatencyJsonSchema = z.object({
  provider: providerEnum.optional().describe('Filter by oracle provider'),
  symbol: z.string().optional().describe('Filter by asset symbol'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('Start date in YYYY-MM-DD format'),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('End date in YYYY-MM-DD format'),
});

export const AnomaliesJsonSchema = z.object({
  days: z.number().int().min(1).max(30).optional().describe('Lookback period in days'),
});

export const CorrelationJsonSchema = z.object({
  symbol: z.string().describe('Asset symbol, e.g. BTC, ETH'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('Start date in YYYY-MM-DD format'),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('End date in YYYY-MM-DD format'),
});

export const CoverageJsonSchema = z.object({});

const AssetEntryJsonSchema = z.object({
  symbol: z.string().min(1).describe('Asset symbol'),
  amount: z.number().positive().describe('Asset amount'),
});

export const PositionSafetyJsonSchema = z.object({
  protocolId: z.string().min(1).describe('Protocol ID or slug'),
  collaterals: z
    .array(AssetEntryJsonSchema)
    .optional()
    .describe('Multi-asset collateral positions'),
  borrows: z.array(AssetEntryJsonSchema).optional().describe('Multi-asset borrow positions'),
  collateralSymbol: z.string().optional().describe('Single-asset collateral symbol'),
  collateralAmount: z.number().positive().optional().describe('Single-asset collateral amount'),
  borrowSymbol: z.string().optional().describe('Single-asset borrow symbol'),
  borrowAmount: z.number().positive().optional().describe('Single-asset borrow amount'),
});

export const PreTradeSafetyJsonSchema = z.object({
  asset: z.string().describe('Asset symbol being traded, e.g. BTC, ETH, USDC'),
  chainId: z
    .number()
    .int()
    .describe(
      'Chain ID where the trade executes, e.g. 1=Ethereum, 42161=Arbitrum, 8453=Base. Use 0 for chain-agnostic.'
    ),
  action: z.enum(['swap', 'borrow', 'lend', 'liquidate', 'repay']),
  tradeAmountUsd: z.number().positive().describe('Trade size in USD'),
  targetProviders: z
    .array(providerEnum)
    .optional()
    .describe('Optional: restrict the check to specific oracle providers'),
});

export const MetricsJsonSchema = z.object({});

export const ProviderReputationJsonSchema = z.object({
  provider: providerEnum.describe('Oracle provider name'),
  trend: z.boolean().optional().describe('Include historical trend data'),
  days: z.number().int().min(1).max(365).optional().describe('Trend period in days'),
});
