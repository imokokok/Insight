import { z } from 'zod';

import { DecisionInputQuoteTimestampSchema } from '@/lib/decisionInputTrust/validation';
import { REVIEWED_AERODROME_SLIPSTREAM_PROFILE_IDS } from '@/lib/dex/aerodromeSlipstream';
import { BASE_DEX_VENUE_IDS } from '@/lib/dex/baseDexVenues';
import { REVIEWED_PANCAKE_SWAP_V3_PROFILE_IDS } from '@/lib/dex/pancakeSwapV3';
import { REVIEWED_QUICKSWAP_V2_PROFILE_IDS } from '@/lib/dex/quickSwapV2';
import { STABLECOINS } from '@/lib/stablecoins/config';
import { WRAPPED_ASSETS } from '@/lib/wrapped-assets/config';
import { BLOCKCHAIN_VALUES, ORACLE_PROVIDER_VALUES } from '@/types/oracle/enums';

const providerEnum = z.enum(ORACLE_PROVIDER_VALUES as [string, ...string[]]);
const chainEnum = z.enum(BLOCKCHAIN_VALUES as [string, ...string[]]);
const stablecoinEnum = z.enum(STABLECOINS.map((c) => c.symbol) as [string, ...string[]]);
const wrappedAssetEnum = z.enum(WRAPPED_ASSETS.map((a) => a.symbol) as [string, ...string[]]);
const decisionInputQuoteProvenanceJsonSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceId: z.string().regex(/^[A-Za-z0-9_.:-]{1,160}$/),
    rightsScope: z.enum([
      'synthetic',
      'onchain',
      'customer-authorized',
      'vendor-licensed',
      'research-quarantined',
    ]),
    captureMethod: z.enum(['client-held', 'onchain-read']),
    asset: z.string().regex(/^[A-Za-z0-9_.:-]{1,80}$/),
    chainId: z.number().int().nonnegative(),
    quotePriceUsd: z.number().finite().positive(),
    observedAt: DecisionInputQuoteTimestampSchema,
    requestHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    responseHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  })
  .strict();

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
    .max(90)
    .optional()
    .describe('Look-back window in days (1-90, default 7)'),
  interval: z
    .enum(['30min', 'hourly', 'daily'])
    .optional()
    .describe(
      'Aggregation grain: 30min, hourly, or daily. Default hourly; 8-30d raw requests roll up hourly and windows over 30d roll up daily'
    ),
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

/** Wire schema for the one reviewed WMON/USDC Monad DEX market. */
export const MonadDexMarketJsonSchema = z.object({});

/** Wire schema for the reviewed Hanji Monad CLOB market. */
export const HanjiMonadMarketJsonSchema = z.object({});

/** Wire schema for the one reviewed WETH/USDC Base DEX market. */
export const BaseDexMarketJsonSchema = z.object({});

/** Wire schema for the Base DEX deployment identity catalog. */
export const BaseDexVenueIntegrationJsonSchema = z.object({
  venues: z
    .array(z.enum(BASE_DEX_VENUE_IDS))
    .min(1)
    .max(BASE_DEX_VENUE_IDS.length)
    .optional()
    .describe('Optional reviewed Base venues to inspect; defaults to every reviewed venue'),
});

/** Wire schema for a named allowlisted Aerodrome Slipstream Base market. */
export const AerodromeSlipstreamMarketJsonSchema = z.object({
  profileId: z
    .enum(REVIEWED_AERODROME_SLIPSTREAM_PROFILE_IDS)
    .optional()
    .describe('Reviewed Aerodrome Slipstream pool id; defaults to Base WETH/USDC CL100'),
});

/** Wire schema for a named allowlisted PancakeSwap V3 Base market. */
export const PancakeSwapV3MarketJsonSchema = z.object({
  profileId: z
    .enum(REVIEWED_PANCAKE_SWAP_V3_PROFILE_IDS)
    .optional()
    .describe('Reviewed PancakeSwap V3 pool id; defaults to Base USDC/USDT 0.01%'),
});

/** Wire schema for a named allowlisted QuickSwap V2 Base pair. */
export const QuickSwapV2MarketJsonSchema = z.object({
  profileId: z
    .enum(REVIEWED_QUICKSWAP_V2_PROFILE_IDS)
    .optional()
    .describe('Reviewed QuickSwap V2 pair id; defaults to Base USDC/USDT'),
});

/** Wire schema for the Base-only pre-signing lending gate. */
export const BaseLendingGuardJsonSchema = z
  .object({
    protocolId: z.enum(['aave-v3-base', 'morpho-blue-base', 'compound-v3-base', 'moonwell-base']),
    action: z.enum(['supply', 'borrow']),
    collateralSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    loanSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    collateralValueUsd: z.number().positive().max(1_000_000_000_000),
    debtValueUsd: z.number().min(0).max(1_000_000_000_000),
    marketId: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.protocolId === 'morpho-blue-base' && !value.marketId) {
      context.addIssue({
        code: 'custom',
        path: ['marketId'],
        message: 'marketId is required for Morpho Blue',
      });
    }
  });

/** Wire schema for exact-call Base Lending Guard decision evidence. */
export const BaseLendingGuardExactJsonSchema = z
  .object({
    guard: BaseLendingGuardJsonSchema,
    transaction: z
      .object({
        chainId: z.literal(8453),
        from: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        data: z.string().regex(/^0x(?:[a-fA-F0-9]{2})+$/),
        nonce: z.union([z.string().regex(/^0$|^[1-9][0-9]*$/), z.number().int().nonnegative()]),
        value: z
          .union([z.string().regex(/^0$|^[1-9][0-9]*$/), z.number().int().nonnegative()])
          .optional(),
      })
      .strict(),
  })
  .strict();

/** Wire schema for the reviewed Base, Polygon, Arbitrum and BNB lending gate. */
export const MultichainEvmLendingGuardJsonSchema = z
  .object({
    chainId: z.union([z.literal(8453), z.literal(137), z.literal(42161), z.literal(56)]),
    protocolId: z.enum([
      'aave-v3-polygon',
      'aave-v3-arbitrum',
      'aave-v3-bnb',
      'venus-core-bnb',
      'compound-v3-arbitrum',
      'morpho-blue-polygon',
      'morpho-blue-arbitrum',
      'lista-moolah-bnb',
      'euler-v2-base',
      'euler-v2-arbitrum',
      'dolomite-arbitrum',
      'fluid-vault-t1-base',
      'fluid-vault-t1-arbitrum',
    ]),
    action: z.enum(['supply', 'borrow']),
    collateralSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    loanSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    collateralValueUsd: z.number().finite().positive().max(1_000_000_000_000),
    debtValueUsd: z.number().finite().nonnegative().max(1_000_000_000_000),
    marketId: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .optional(),
    marketAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .optional(),
    collateralVaultAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .optional(),
    collateralMarketId: z
      .string()
      .regex(/^(?:0|[1-9][0-9]*)$/)
      .optional(),
    loanMarketId: z
      .string()
      .regex(/^(?:0|[1-9][0-9]*)$/)
      .optional(),
    accountNumber: z
      .string()
      .regex(/^(?:0|[1-9][0-9]*)$/)
      .optional(),
  })
  .superRefine((value, context) => {
    const isolated = ['morpho-blue-polygon', 'morpho-blue-arbitrum', 'lista-moolah-bnb'].includes(
      value.protocolId
    );
    const euler = ['euler-v2-base', 'euler-v2-arbitrum'].includes(value.protocolId);
    const fluid = ['fluid-vault-t1-base', 'fluid-vault-t1-arbitrum'].includes(value.protocolId);
    if (isolated && !value.marketId) {
      context.addIssue({ code: 'custom', path: ['marketId'], message: 'marketId is required' });
    }
    if (euler && !value.marketAddress) {
      context.addIssue({
        code: 'custom',
        path: ['marketAddress'],
        message: 'marketAddress is required for Euler v2',
      });
    }
    if (euler && value.action === 'borrow' && !value.collateralVaultAddress) {
      context.addIssue({
        code: 'custom',
        path: ['collateralVaultAddress'],
        message: 'collateralVaultAddress is required for an Euler v2 borrow batch',
      });
    }
    if (fluid && !value.marketAddress) {
      context.addIssue({
        code: 'custom',
        path: ['marketAddress'],
        message: 'marketAddress is required for Fluid T1',
      });
    }
    if (fluid && value.action !== 'supply') {
      context.addIssue({
        code: 'custom',
        path: ['action'],
        message: 'Fluid T1 only supports collateral-only supply',
      });
    }
    if (
      value.protocolId === 'dolomite-arbitrum' &&
      (!value.collateralMarketId || !value.loanMarketId || value.accountNumber === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['collateralMarketId'],
        message: 'Dolomite requires collateralMarketId, loanMarketId, and accountNumber',
      });
    }
  });

export const MultichainEvmLendingGuardExactJsonSchema = z
  .object({
    guard: MultichainEvmLendingGuardJsonSchema,
    transaction: z
      .object({
        chainId: z.union([z.literal(8453), z.literal(137), z.literal(42161), z.literal(56)]),
        from: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        data: z.string().regex(/^0x(?:[a-fA-F0-9]{2})+$/),
        nonce: z.union([z.string().regex(/^0$|^[1-9][0-9]*$/), z.number().int().nonnegative()]),
        value: z
          .union([z.string().regex(/^0$|^[1-9][0-9]*$/), z.number().int().nonnegative()])
          .optional(),
      })
      .strict(),
  })
  .strict();

/** Wire schema for the one reviewed SOL/USDC Solana route market. */
export const SolanaDexRouteJsonSchema = z.object({});

/** Wire schema for the reviewed Hyperliquid perpetual-market set. */
export const HyperliquidPerpMarketJsonSchema = z.object({
  market: z
    .enum(['BTC', 'ETH', 'HYPE'])
    .optional()
    .describe('Reviewed Hyperliquid perpetual market: BTC, ETH, or HYPE. Defaults to BTC.'),
});

/** Wire schema for the Monad pre-signing lending gate. */
export const MonadLendingGuardJsonSchema = z
  .object({
    protocolId: z.enum(['aave-v3-monad', 'morpho-blue-monad']),
    action: z.enum(['supply', 'borrow']),
    collateralSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    loanSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    collateralValueUsd: z.number().finite().positive(),
    debtValueUsd: z.number().finite().nonnegative(),
    marketId: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.protocolId === 'morpho-blue-monad' && !value.marketId) {
      context.addIssue({
        code: 'custom',
        path: ['marketId'],
        message: 'marketId is required for Morpho Blue',
      });
    }
  });

export const MonadLendingGuardExactJsonSchema = z
  .object({
    guard: MonadLendingGuardJsonSchema,
    transaction: z
      .object({
        chainId: z.literal(143),
        from: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        data: z.string().regex(/^0x(?:[a-fA-F0-9]{2})+$/),
        nonce: z.union([z.string().regex(/^0$|^[1-9][0-9]*$/), z.number().int().nonnegative()]),
        value: z
          .union([z.string().regex(/^0$|^[1-9][0-9]*$/), z.number().int().nonnegative()])
          .optional(),
      })
      .strict(),
  })
  .strict();

/** Wire schema for a user-signed, IOC-only reviewed Hyperliquid perp order. */
export const HyperliquidPerpOrderPreflightJsonSchema = z
  .object({
    market: z.enum(['BTC', 'ETH', 'HYPE']),
    side: z.enum(['buy', 'sell']),
    size: z
      .string()
      .regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/)
      .max(80),
    limitPrice: z
      .string()
      .regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/)
      .max(80),
    reduceOnly: z.boolean(),
    clientOrderId: z.string().regex(/^0x[0-9a-fA-F]{32}$/),
    maxNotionalUsd: z.number().finite().min(1).max(1_000_000_000),
    maxPriceImpactBps: z.number().finite().min(0).max(10_000),
    maxMarkOracleDeviationBps: z.number().finite().min(0).max(10_000),
    requireFullFill: z.boolean().optional(),
    expiresAfterSeconds: z.number().int().min(5).max(120).optional(),
    builderFee: z
      .object({
        builder: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
        feeTenthsOfBasisPoint: z.number().int().min(1).max(100),
        maximumFeeTenthsOfBasisPoint: z.number().int().min(1).max(100).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

/** Wire schema for a bounded, read-only Hyperliquid order/fill observation. */
export const HyperliquidPerpExecutionVerificationJsonSchema = z
  .object({
    user: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    orderId: z.string().regex(/^(?:[1-9][0-9]{0,19}|0x[0-9a-fA-F]{32})$/),
    submittedAt: z.string().datetime({ offset: true }),
    expectedOrder: z
      .object({
        market: z.enum(['BTC', 'ETH', 'HYPE']),
        side: z.enum(['buy', 'sell']),
        size: z
          .string()
          .regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/)
          .max(80),
        limitPrice: z
          .string()
          .regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/)
          .max(80),
        reduceOnly: z.boolean(),
        clientOrderId: z.string().regex(/^0x[0-9a-fA-F]{32}$/),
        builderFee: z
          .object({
            builder: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
            feeTenthsOfBasisPoint: z.number().int().min(1).max(100),
            maximumFeeTenthsOfBasisPoint: z.number().int().min(1).max(100).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
  })
  .strict();

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
  tradeAmountUsd: z.number().finite().positive().describe('Trade size in USD'),
  targetProviders: z
    .array(providerEnum)
    .optional()
    .describe('Optional: restrict the check to specific oracle providers'),
});

/** Wire schema for the chain-neutral `execution_preflight` decision tool. */
export const ExecutionPreflightJsonSchema = PreTradeSafetyJsonSchema.extend({
  destinationAsset: z
    .string()
    .optional()
    .describe('Optional destination asset for the intended route'),
  protocolId: z.string().optional().describe('Optional protocol identifier for lending actions'),
  tokenAddress: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional()
    .describe('Optional 20-byte EVM token address for advisory token-security evidence'),
  decisionInput: z
    .object({
      decisionPriceUsd: z.number().finite().positive(),
      quotePriceUsd: z.number().finite().positive(),
      quoteObservedAt: DecisionInputQuoteTimestampSchema,
      maxReferenceDeviationBps: z.number().int().min(0).max(10_000),
      maxSlippageBps: z.number().int().min(0).max(10_000),
      maxQuoteAgeSeconds: z.number().int().min(1).max(300),
      quoteProvenance: decisionInputQuoteProvenanceJsonSchema.optional(),
      requireQuoteProvenance: z.boolean().optional(),
      reviewedUniswapV3: z
        .object({
          amountIn: z
            .string()
            .regex(/^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/)
            .max(128)
            .describe('Exact source-token amount for the reviewed concentrated-liquidity quote'),
          maxQuoteDeviationBps: z.number().int().min(0).max(10_000),
          maxTwapDeviationBps: z.number().int().min(0).max(10_000),
        })
        .strict()
        .optional()
        .describe(
          'Optional strict reviewed-pool lane. Admits Monad MON/WMON→USDC and Base ETH/WETH→USDC through Uniswap V3, plus Base USDC→USDT through PancakeSwap V3; only the reviewed forward directions are admitted and all other routes fail closed.'
        ),
      reviewedAerodromeSlipstream: z
        .object({
          amountIn: z
            .string()
            .regex(/^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/)
            .max(128)
            .describe(
              'Exact WETH amount for the reviewed Base Aerodrome Slipstream WETH/USDC CL100 quote'
            ),
          maxQuoteDeviationBps: z.number().int().min(0).max(10_000),
          maxTwapDeviationBps: z.number().int().min(0).max(10_000),
        })
        .strict()
        .optional()
        .describe(
          'Optional strict reviewed-pool lane. Only WETH/USDC on Base through the reviewed Aerodrome Slipstream CL100 pool is admitted; unsupported routes fail closed.'
        ),
    })
    .optional()
    .describe(
      'Optional fresh venue quote and explicit limits. This evidence is required for an ALLOW result; without it a healthy oracle result remains CAUTION.'
    ),
});

/** Wire schema for a user-signable transaction against one reviewed Base pool. */
export const AerodromeSlipstreamSwapPreparationJsonSchema = z.object({
  profileId: z
    .enum(REVIEWED_AERODROME_SLIPSTREAM_PROFILE_IDS)
    .optional()
    .describe('Reviewed Aerodrome Slipstream pool id; defaults to Base WETH/USDC CL100'),
  amountIn: z
    .string()
    .regex(/^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/)
    .max(128)
    .describe('Exact WETH input amount; the tool never handles native ETH'),
  recipient: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .describe('USDC recipient encoded into the unsigned router transaction'),
  deadlineUnixSeconds: z
    .number()
    .int()
    .positive()
    .describe('User-selected Unix deadline, no more than 30 minutes ahead'),
  maxSlippageBps: z
    .number()
    .int()
    .min(0)
    .max(9999)
    .describe('Maximum shortfall versus the pinned quote, encoded as amountOutMinimum'),
});

/** Wire schema for a user-signable PancakeSwap V3 Base transaction. */
export const PancakeSwapV3SwapPreparationJsonSchema = z.object({
  profileId: z
    .enum(REVIEWED_PANCAKE_SWAP_V3_PROFILE_IDS)
    .optional()
    .describe('Reviewed PancakeSwap V3 pool id; defaults to Base USDC/USDT 0.01%'),
  amountIn: z
    .string()
    .regex(/^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/)
    .max(128)
    .describe('Exact USDC input amount; the tool never handles native ETH or reverse direction'),
  recipient: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .describe('USDT recipient'),
  deadlineUnixSeconds: z.number().int().positive().describe('User-selected short Unix deadline'),
  maxSlippageBps: z.number().int().min(0).max(9999).describe('Maximum quote shortfall in bps'),
});

/** Wire schema for `agent_begin_trade`. No `.default()` so zod v4 toJSONSchema()
 *  stays happy; the tool pins schemaVersion 3 internally and applies the
 *  sourceGroupCount default from participantCount. */
export const AgentBeginTradeJsonSchema = z.object({
  asset: z.string().describe('Source asset symbol being sold, e.g. ETH, USDC'),
  destinationAsset: z.string().describe('Destination asset symbol being bought, e.g. USDC, ETH'),
  chainId: z
    .number()
    .int()
    .describe('Chain ID where the trade executes, e.g. 1=Ethereum, 42161=Arbitrum, 8453=Base'),
  action: z.enum(['swap', 'borrow', 'lend', 'liquidate', 'repay']),
  tradeAmountUsd: z.number().finite().positive().describe('Trade size in USD'),
  maxSlippageBps: z
    .literal(50)
    .describe('Current pre-committed execution tolerance; custom values are rejected'),
  targetProviders: z
    .array(providerEnum)
    .optional()
    .describe('Optional: restrict the check to specific oracle providers'),
  protocolId: z.string().optional().describe('Optional lending protocol id (lending actions only)'),
  sourceGroupCount: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Distinct non-derived operator groups; defaults to participantCount'),
  decisionInput: z
    .object({
      source: z.object({
        decisionPriceUsd: z.number().finite().positive(),
        quotePriceUsd: z.number().finite().positive(),
        quoteObservedAt: DecisionInputQuoteTimestampSchema,
        maxReferenceDeviationBps: z.number().int().min(0).max(10_000),
        maxSlippageBps: z.number().int().min(0).max(50),
        maxQuoteAgeSeconds: z.number().int().min(1).max(300),
        quoteProvenance: decisionInputQuoteProvenanceJsonSchema,
      }),
      destination: z.object({
        decisionPriceUsd: z.number().finite().positive(),
        quotePriceUsd: z.number().finite().positive(),
        quoteObservedAt: DecisionInputQuoteTimestampSchema,
        maxReferenceDeviationBps: z.number().int().min(0).max(10_000),
        maxSlippageBps: z.number().int().min(0).max(50),
        maxQuoteAgeSeconds: z.number().int().min(1).max(300),
        quoteProvenance: decisionInputQuoteProvenanceJsonSchema,
      }),
      routeQuotePrice: z
        .number()
        .finite()
        .positive()
        .describe(
          "Caller-reported destination-per-source route quote, compared with Insight's on-chain quote"
        ),
      routeQuoteObservedAt: DecisionInputQuoteTimestampSchema.describe(
        'Timezone-qualified caller quote timestamp; checked for freshness as an additional condition'
      ),
    })
    .describe(
      'Required operation-input gate for both assets and the caller-reported route quote. Insight also obtains an exact-notional Uniswap V3 quote on Ethereum mainnet, sized from a fresh Chainlink price and cross-checked by two RPCs at one block. No execution handle is issued unless both signed assessments pass and the on-chain quote, caller quote, and oracle cross-rate satisfy the 50 bps-capped policy. Supported pairs are ETH/WETH, USDC, and WBTC on Ethereum; other routes fail closed.'
    ),
});

export const MetricsJsonSchema = z.object({});

export const ProviderReputationJsonSchema = z.object({
  provider: providerEnum.describe('Oracle provider name'),
  trend: z.boolean().optional().describe('Include historical trend data'),
  days: z.number().int().min(1).max(365).optional().describe('Trend period in days'),
});

/** Wire schema for the `execution_receipt` tool. No `.default()` here so zod
 *  v4's toJSONSchema() stays happy; the service applies the 50bps default. */
export const ExecutionReceiptJsonSchema = z.object({
  preTradeUid: z.string().describe('UID of the paired pre-trade attestation'),
  requestHash: z.string().describe('Canonical request commitment from the pre-trade attestation'),
  sourceAssetId: z.string().describe('CAIP-19 id of the asset sold'),
  destinationAssetId: z.string().describe('CAIP-19 id of the asset bought'),
  subjectChainId: z.number().int().describe('Chain id the pre-trade was scoped to'),
  settlementChainId: z.number().int().describe('Chain id the transaction settled on'),
  participantCount: z.number().int().describe('Oracle providers the agent gated on'),
  sourceGroupCount: z
    .number()
    .int()
    .describe('Distinct non-derived operator groups the agent gated on'),
  preTradeSignedAt: z.number().int().describe('Unix seconds the pre-trade was signed'),
  quotedPrice: z
    .number()
    .describe('Target price, same convention as executedPrice (e.g. dest per source)'),
  maxSlippageBps: z
    .literal(50)
    .optional()
    .describe('Pre-committed platform bound; currently fixed at 50 bps'),
  action: z.string().optional().describe('Action label, e.g. SWAP'),
  quotedAmountUsd: z.number().optional().describe('Informational notional the agent intended'),
  executedAmountUsd: z.number().optional().describe('Informational notional actually filled'),
  actualFeeUsd: z.number().optional().describe('Informational fee paid'),
  mevRiskScore: z.number().optional().describe('Advisory 0..1 MEV-exposure estimate'),
  txHash: z.string().describe('Settlement transaction hash'),
  taker: z
    .string()
    .optional()
    .describe('Address whose balances define the trade; defaults to tx sender'),
});

export const VerifyExecutionPairJsonSchema = z.object({
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
});
