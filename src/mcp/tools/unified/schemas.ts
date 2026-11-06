import { z } from 'zod';

import { SafeChainSchema, SafeProviderSchema, SafeSymbolSchema } from '@/lib/security/validation';

const EVM_OR_VENUE_CHAIN = z.union([
  z.number().int().min(0).max(4_294_967_295),
  z.literal('solana'),
  z.literal('hyperliquid'),
]);

const Snapshot = z.record(z.string(), z.unknown());

/** 1. Oracle price at one provider. */
export const GetOraclePriceInputSchema = z.object({
  provider: SafeProviderSchema.describe('Oracle provider, e.g. chainlink, redstone, api3'),
  asset: SafeSymbolSchema.describe('Asset symbol, e.g. BTC, ETH'),
  chain: SafeChainSchema.optional().describe('Optional blockchain filter, e.g. base'),
  force_refresh: z.boolean().optional().describe('Bypass cache and re-read upstream'),
});

/** 2. Cross-oracle analytics over one or more assets. */
export const GetPriceAnalyticsInputSchema = z.object({
  assets: z
    .array(SafeSymbolSchema)
    .min(1)
    .max(10)
    .describe('Assets to analyse; consensus/risk/history use the first asset'),
  mode: z
    .enum(['consensus', 'batch', 'history'])
    .optional()
    .default('consensus')
    .describe('consensus = cross-provider price, batch = multi-asset, history = time series'),
  metric: z
    .enum(['spreads', 'deviation', 'correlation', 'risk'])
    .optional()
    .describe('Deep-analysis metric; overrides mode'),
  providers: z
    .array(SafeProviderSchema)
    .min(2)
    .optional()
    .describe('Required for metric=risk; otherwise uses the provider default'),
  provider: SafeProviderSchema.optional().describe('Provider for history/spreads'),
  method: z
    .enum(['median', 'trimmed_mean', 'weighted_median', 'iqr_filtered'])
    .optional()
    .describe('Consensus aggregation method'),
  chain: SafeChainSchema.optional().describe('Optional chain filter'),
  base_chain: SafeChainSchema.optional().describe('Base chain for metric=spreads'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('Start date YYYY-MM-DD'),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('End date YYYY-MM-DD'),
  interval: z.enum(['1h', '6h', '24h']).optional().describe('Deviation interval, default 24h'),
  period_hours: z.number().int().min(1).max(8760).optional().describe('Risk/history hours'),
  force_refresh: z.boolean().optional(),
});

/** 3. Oracle ecosystem / feed / provider health. */
export const GetOracleHealthInputSchema = z.object({
  scope: z
    .enum(['ecosystem', 'feeds', 'feed', 'providers', 'provider', 'protocol', 'asset', 'incidents'])
    .optional()
    .default('ecosystem')
    .describe('Which health surface to read'),
  subject: z
    .string()
    .min(1)
    .optional()
    .describe('Feed UUID, provider, protocol, or asset symbol depending on scope'),
  metric: z
    .enum([
      'health',
      'uptime',
      'exposure',
      'peg',
      'latency',
      'anomalies',
      'coverage',
      'counts',
      'report',
    ])
    .optional()
    .describe('Optional metric selector; defaults to the scope default'),
  period: z.number().int().min(1).max(8760).optional().describe('Period in hours or days'),
  days: z.number().int().min(1).max(365).optional().describe('Lookback days for rankings/trends'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('Report date YYYY-MM-DD'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('Start date YYYY-MM-DD'),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('End date YYYY-MM-DD'),
  category: z
    .enum(['crypto', 'stablecoin', 'forex', 'commodity', 'wrapped', 'lst'])
    .optional()
    .describe('Feed category filter'),
  is_active: z.boolean().optional().describe('Feed active-state filter, default true'),
  min_severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  provider: SafeProviderSchema.optional().describe('Provider filter'),
  chain_id: z.number().int().optional().describe('Chain filter'),
  limit: z.number().int().min(1).max(500).optional().describe('Maximum rows'),
  offset: z.number().int().min(0).optional().describe('Pagination offset'),
});

/** 4. Registry and evidence discovery. */
export const SearchOracleRegistryInputSchema = z.object({
  kind: z
    .enum([
      'symbols',
      'feeds',
      'protocols',
      'stablecoins',
      'protocol_params',
      'rwa_instrument',
      'rwa_context',
      'settlement_evidence',
      'setup_recommendation',
    ])
    .describe('Registry/evidence family to search'),
  query: z.string().min(1).optional().describe('Search or lookup term (symbol, protocol, slug)'),
  chain_id: z.number().int().optional().describe('Chain filter for feeds'),
  category: z
    .enum(['crypto', 'stablecoin', 'forex', 'commodity', 'wrapped', 'lst'])
    .optional()
    .describe('Feed category filter'),
  is_active: z.boolean().optional().describe('Feed active-state filter, default true'),
  limit: z.number().int().min(1).max(200).optional().describe('Maximum rows'),
  offset: z.number().int().min(0).optional().describe('Pagination offset'),
  verify_onchain: z.boolean().optional().describe('For RWA lookups, cross-check on chain'),
});

/** 5. Venue market quote. */
export const GetMarketQuoteInputSchema = z.object({
  venue: z
    .enum([
      'base_uniswap_v3',
      'base_aerodrome',
      'base_pancakeswap_v3',
      'base_quickswap_v2',
      'base_venue_identity',
      'monad_uniswap_v3',
      'monad_hanji',
      'solana_jupiter',
      'hyperliquid_perp',
    ])
    .describe('Reviewed venue to quote'),
  profile_id: z.string().min(1).optional().describe('Reviewed pool/profile id'),
  market: z.enum(['BTC', 'ETH', 'HYPE']).optional().describe('Hyperliquid perp market'),
  venues: z.array(z.string()).min(1).optional().describe('Base venue ids to inspect'),
});

/** 6. Pre-trade safety gate (all chains/protocol families). */
export const CheckTradeSafetyInputSchema = z.object({
  chain_id: EVM_OR_VENUE_CHAIN.describe(
    'Execution chain: numeric EVM id, "solana", or "hyperliquid"'
  ),
  action: z
    .enum([
      'swap',
      'borrow',
      'repay',
      'lend',
      'open_perp',
      'close_perp',
      'check_position',
      'check_liquidation',
      'vault_deposit',
    ])
    .describe('Trade action being considered'),
  asset: SafeSymbolSchema.optional().describe('Asset traded or collateral symbol'),
  amount_usd: z.number().finite().positive().optional().describe('Trade size in USD'),
  destination_asset: SafeSymbolSchema.optional().describe('Destination asset for swaps'),
  mode: z
    .enum(['pre_trade', 'preflight'])
    .optional()
    .default('pre_trade')
    .describe('Generic oracle gate mode when no family-specific guard applies'),
  protocol_id: z.string().min(1).optional().describe('Lending/protocol id'),
  market_id: z.string().min(1).optional().describe('Isolated lending market id when required'),
  market: z.enum(['BTC', 'ETH', 'HYPE']).optional().describe('Perp market'),
  profile_id: z.string().min(1).optional().describe('Reviewed pool/profile id'),
  side: z.enum(['open_long', 'open_short']).optional().describe('Perp side'),
  margin_asset: SafeSymbolSchema.optional(),
  margin_value_usd: z.number().finite().positive().optional(),
  loan_symbol: SafeSymbolSchema.optional(),
  collateral_value_usd: z.number().finite().positive().optional(),
  debt_value_usd: z.number().finite().min(0).optional(),
  collateral_symbol: SafeSymbolSchema.optional(),
  collateral_amount: z.number().finite().positive().optional(),
  borrow_symbol: SafeSymbolSchema.optional(),
  borrow_amount: z.number().finite().positive().optional(),
  collaterals: z
    .array(z.object({ symbol: z.string().min(1), amount: z.number().positive() }))
    .optional(),
  borrows: z
    .array(z.object({ symbol: z.string().min(1), amount: z.number().positive() }))
    .optional(),
  position: z
    .object({
      protocol_id: z.string().min(1).optional(),
      collaterals: z
        .array(z.object({ symbol: z.string().min(1), amount: z.number().positive() }))
        .optional(),
      borrows: z
        .array(z.object({ symbol: z.string().min(1), amount: z.number().positive() }))
        .optional(),
      collateral_symbol: SafeSymbolSchema.optional(),
      collateral_amount: z.number().finite().positive().optional(),
      borrow_symbol: SafeSymbolSchema.optional(),
      borrow_amount: z.number().finite().positive().optional(),
    })
    .optional()
    .describe('Position payload for action=check_position'),
  providers: z.array(SafeProviderSchema).optional().describe('Oracle providers to gate on'),
  token_address: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional(),
  decision_input: Snapshot.optional().describe(
    'Caller decision/quote evidence (old camelCase shape)'
  ),
  guard: Snapshot.optional().describe('Exact-call guard input for family-specific exact tools'),
  transaction: z.unknown().optional().describe('Exact unsigned transaction for exact-call guards'),
  order: z.unknown().optional().describe('Exact Hyperliquid order envelope'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('Date for liquidation stress'),
  reputation_opt_in: z.boolean().optional(),
  reputation_agent_id: z.number().int().positive().optional(),
});

/** 7. Begin the verifiable execution loop. */
export const BeginTradeEvidenceInputSchema = z.object({
  asset: SafeSymbolSchema.describe('Source asset sold'),
  destination_asset: SafeSymbolSchema.describe('Destination asset bought'),
  chain_id: z.number().int().describe('Execution chain id'),
  action: z.enum(['swap', 'borrow', 'lend', 'liquidate', 'repay']),
  amount_usd: z.number().finite().positive(),
  max_slippage_bps: z.literal(50).describe('Pre-committed tolerance; fixed at 50'),
  protocol_id: z.string().optional(),
  providers: z.array(SafeProviderSchema).optional(),
  source_group_count: z.number().int().min(0).optional(),
  decision_input: Snapshot.describe(
    'Required quote evidence: {source, destination, routeQuotePrice, routeQuoteObservedAt} (old camelCase shape)'
  ),
});

/** 8. Prepare an unsigned swap. */
export const PrepareSwapInputSchema = z.object({
  venue: z
    .enum([
      'base_aerodrome_slipstream',
      'base_pancakeswap_v3',
      'base_agent_swap',
      'solana_loopscale_vault',
    ])
    .describe('Reviewed execution venue'),
  direction: z.enum(['token0-to-token1', 'token1-to-token0']).optional(),
  amount_in: z.string().min(1).describe('Exact input amount as a decimal string'),
  recipient: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional(),
  deadline_unix_seconds: z.number().int().positive().optional(),
  max_slippage_bps: z.number().int().min(0).max(9999).optional(),
  profile_id: z.string().min(1).optional(),
  source_decision_price_usd: z.number().finite().positive().optional(),
  destination_decision_price_usd: z.number().finite().positive().optional(),
  policy: Snapshot.optional(),
  wallet: z.string().min(1).optional(),
  vault: z.string().min(1).optional(),
  asset_mint: z.string().min(1).optional(),
  collateral_symbol: z.string().min(1).optional(),
  loan_symbol: z.string().min(1).optional(),
  collateral_value_usd: z.number().finite().positive().optional(),
  principal_amount: z.string().min(1).optional(),
  min_lp_amount: z.string().min(1).optional(),
});

/** 9. Prepare an unsigned perp order. */
export const PreparePerpOrderInputSchema = z.object({
  venue: z.literal('hyperliquid').describe('Only reviewed perp venue'),
  market: z.enum(['BTC', 'ETH', 'HYPE']),
  side: z.enum(['buy', 'sell']),
  size: z.string().min(1).describe('Exact base size decimal string'),
  limit_price: z.string().min(1).describe('Exact IOC limit price decimal string'),
  reduce_only: z.boolean(),
  client_order_id: z.string().regex(/^0x[0-9a-fA-F]{32}$/),
  max_notional_usd: z.number().finite().min(1).max(1_000_000_000),
  max_price_impact_bps: z.number().finite().min(0).max(10_000),
  max_mark_oracle_deviation_bps: z.number().finite().min(0).max(10_000),
  require_full_fill: z.boolean().optional(),
  expires_after_seconds: z.number().int().min(5).max(120).optional(),
  builder_fee: Snapshot.optional(),
});

/** 10. Issue a receipt or settle an executed trade. */
export const IssueExecutionReceiptInputSchema = z.object({
  mode: z.enum(['receipt', 'settle_base_agent_swap', 'settle_solana_swap']),
  receipt: Snapshot.optional().describe('Required for mode=receipt; old execution_receipt fields'),
  decision: Snapshot.optional().describe('Required for settle modes; the signed guard decision'),
  swap_tx_hash: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .optional(),
  signature: z.string().min(1).optional().describe('Solana transaction signature'),
});

/** 11. Verify signed evidence. */
export const VerifyEvidenceInputSchema = z.object({
  kind: z.enum(['execution_pair', 'base_agent_swap', 'solana_swap', 'hyperliquid_perp']),
  pre_trade_attestation: Snapshot.optional(),
  execution_receipt: Snapshot.optional(),
  destination_pre_trade_attestation: Snapshot.optional(),
  settlement: Snapshot.optional(),
  user: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional(),
  order_id: z.string().min(1).optional(),
  submitted_at: z.string().min(1).optional(),
  expected_order: Snapshot.optional(),
});

/** 12. Oracle Watch snapshot/history. */
export const OracleWatchInputSchema = z.object({
  op: z.enum(['snapshot', 'history']).optional().default('snapshot'),
  symbol: SafeSymbolSchema.describe('Asset symbol to watch'),
  chain: SafeChainSchema.optional(),
  days: z.number().int().min(1).max(90).optional(),
  interval: z.enum(['30min', 'hourly', 'daily']).optional(),
});

/** 13. Buy an Oracle Watch window. */
export const OracleWatchWindowBeginInputSchema = z.object({
  symbol: SafeSymbolSchema.describe('Asset to monitor for the window'),
  chain: SafeChainSchema.optional(),
});

/** 14. Poll/close an Oracle Watch window. */
export const OracleWatchWindowControlInputSchema = z.object({
  op: z.enum(['poll', 'close']).describe('poll issues a signal; close returns the summary'),
  window_id: z.string().min(1),
  window_token: z.string().min(1).describe('One-time oww_ token from the purchase'),
});

/** 15. Buy a Position Lifecycle bundle. */
export const PositionLifecycleBeginInputSchema = z.object({
  symbol: SafeSymbolSchema.describe('Position subject for the lifecycle'),
  chain: SafeChainSchema.optional(),
});

/** 16. Run one bundled lifecycle step. */
export const PositionLifecycleStepInputSchema = z.object({
  op: z.enum(['guard', 'receipt', 'close']),
  lifecycle_id: z.string().min(1),
  lifecycle_token: z.string().min(1).describe('One-time plc_ token from the purchase'),
  family: z
    .enum([
      'base_perp',
      'hyperliquid_perp',
      'base_lending',
      'monad_lending',
      'multichain_evm_lending',
      'solana_lending',
    ])
    .optional(),
  params: Snapshot.optional().describe('Native family guard input (old shape)'),
  transaction: z.unknown().optional(),
  receipt: Snapshot.optional().describe('Bundled execution receipt (old shape)'),
});
