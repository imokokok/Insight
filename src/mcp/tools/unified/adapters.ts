import { type z } from 'zod';

import { STABLECOINS } from '@/lib/stablecoins/config';
import { WRAPPED_ASSETS } from '@/lib/wrapped-assets/config';

import { callLegacy } from './runtime';
import {
  type CheckTradeSafetyInputSchema,
  type GetMarketQuoteInputSchema,
  type GetOracleHealthInputSchema,
  type GetPriceAnalyticsInputSchema,
  type IssueExecutionReceiptInputSchema,
  type PrepareSwapInputSchema,
  type SearchOracleRegistryInputSchema,
  type VerifyEvidenceInputSchema,
} from './schemas';

import type { McpToolCallContext } from '../types';

type CheckTradeSafetyArgs = z.infer<typeof CheckTradeSafetyInputSchema>;
type PriceAnalyticsArgs = z.infer<typeof GetPriceAnalyticsInputSchema>;
type OracleHealthArgs = z.infer<typeof GetOracleHealthInputSchema>;
type RegistryArgs = z.infer<typeof SearchOracleRegistryInputSchema>;
type MarketQuoteArgs = z.infer<typeof GetMarketQuoteInputSchema>;
type PrepareSwapArgs = z.infer<typeof PrepareSwapInputSchema>;
type VerifyEvidenceArgs = z.infer<typeof VerifyEvidenceInputSchema>;

const MONAD_LENDING_PROTOCOLS = new Set(['aave-v3-monad', 'morpho-blue-monad', 'euler-v2-monad']);
const MULTICHAIN_LENDING_PROTOCOLS = new Set([
  'aave-v3-polygon',
  'aave-v3-arbitrum',
  'aave-v3-bnb',
  'venus-core-bnb',
  'compound-v3-arbitrum',
  'morpho-blue-arbitrum',
  'morpho-blue-polygon',
  'lista-moolah-bnb',
  'euler-v2-base',
  'euler-v2-arbitrum',
  'dolomite-arbitrum',
  'fluid-vault-t1-base',
  'fluid-vault-t1-arbitrum',
]);

function requireValue<T>(value: T | undefined | null, field: string, rule: string): T {
  if (value === undefined || value === null || value === '') {
    throw new Error(`check_trade_safety: "${field}" is required ${rule}.`);
  }
  return value;
}

function isEvmChain(chain: CheckTradeSafetyArgs['chain_id']): chain is number {
  return typeof chain === 'number';
}

function isLendingAction(action: CheckTradeSafetyArgs['action']): boolean {
  return (
    action === 'borrow' || action === 'repay' || action === 'lend' || action === 'vault_deposit'
  );
}

function lendingProtocolFamily(args: CheckTradeSafetyArgs): 'base' | 'monad' | 'multichain' {
  const protocol = args.protocol_id;
  if (protocol && MONAD_LENDING_PROTOCOLS.has(protocol)) return 'monad';
  if (protocol && MULTICHAIN_LENDING_PROTOCOLS.has(protocol)) return 'multichain';
  if (protocol) return 'base';
  if (args.chain_id === 143) return 'monad';
  if (isEvmChain(args.chain_id) && args.chain_id !== 8453) return 'multichain';
  return 'base';
}

function buildLendingGuard(args: CheckTradeSafetyArgs, chainId: number) {
  return {
    protocolId: requireValue(args.protocol_id, 'protocol_id', 'for lending/borrowing actions'),
    action: (args.action === 'borrow' ? 'borrow' : 'supply') as 'borrow' | 'supply',
    chainId,
    collateralSymbol:
      args.collateral_symbol ?? requireValue(args.asset, 'asset', 'for lending actions'),
    loanSymbol: requireValue(args.loan_symbol, 'loan_symbol', 'for lending actions'),
    collateralValueUsd: requireValue(
      args.collateral_value_usd,
      'collateral_value_usd',
      'for lending actions'
    ),
    debtValueUsd: args.debt_value_usd ?? 0,
    marketId: args.market_id,
  };
}

function buildPerpGuard(args: CheckTradeSafetyArgs) {
  return {
    protocolId: args.protocol_id,
    action: args.side ?? 'open_long',
    assetSymbol: requireValue(args.asset, 'asset', 'for perp actions'),
    marginAssetSymbol: 'USDC',
    sizeUsd: requireValue(args.amount_usd, 'amount_usd', 'for perp actions'),
    marginValueUsd: requireValue(args.margin_value_usd, 'margin_value_usd', 'for perp actions'),
  };
}

function routePositionInspection(
  args: CheckTradeSafetyArgs,
  context?: McpToolCallContext
): Promise<string> | null {
  if (args.action === 'check_position') {
    const position = args.position;
    return callLegacy(
      'check_position_safety',
      {
        protocolId:
          position?.protocol_id ??
          requireValue(args.protocol_id, 'protocol_id', 'for action=check_position'),
        collaterals: position?.collaterals ?? args.collaterals,
        borrows: position?.borrows ?? args.borrows,
        collateralSymbol: position?.collateral_symbol ?? args.collateral_symbol,
        collateralAmount: position?.collateral_amount ?? args.collateral_amount,
        borrowSymbol: position?.borrow_symbol ?? args.borrow_symbol,
        borrowAmount: position?.borrow_amount ?? args.borrow_amount,
      },
      context
    );
  }
  if (args.action === 'check_liquidation') {
    return callLegacy('check_liquidation_risk', { date: args.date }, context);
  }
  return null;
}

function routeSolanaCheck(
  args: CheckTradeSafetyArgs,
  context?: McpToolCallContext
): Promise<string> | null {
  const guard = args.guard;
  if (args.action === 'open_perp' || args.action === 'close_perp') {
    return callLegacy(
      'solana_perp_guard',
      guard ?? {
        ...buildPerpGuard(args),
        protocolId: args.protocol_id ?? 'drift-v2',
      },
      context
    );
  }
  if (args.action === 'swap') {
    return callLegacy(
      'solana_swap_guard',
      {
        guard: requireValue(guard, 'guard', 'for Solana swaps'),
        transaction: requireValue(args.transaction, 'transaction', 'for Solana swaps'),
      },
      context
    );
  }
  if (isLendingAction(args.action)) {
    const built = buildLendingGuard(args, 0);
    const solanaGuard = {
      protocolId: built.protocolId,
      action: built.action,
      collateralSymbol: built.collateralSymbol,
      loanSymbol: built.loanSymbol,
      collateralValueUsd: built.collateralValueUsd,
      debtValueUsd: built.debtValueUsd,
    };
    return callLegacy(
      'solana_lending_guard',
      {
        guard: guard ?? solanaGuard,
        transaction: requireValue(
          args.transaction,
          'transaction',
          'for Solana lending (exact-call only)'
        ),
      },
      context
    );
  }
  return null;
}

/**
 * Unified pre-trade gate. Family-specific guards are reached with their native
 * shape, so the verdict logic, attestations and refusal messages are unchanged.
 */
export async function routeCheckTradeSafety(
  args: CheckTradeSafetyArgs,
  context?: McpToolCallContext
): Promise<string> {
  const inspection = routePositionInspection(args, context);
  if (inspection) return inspection;

  const chain = args.chain_id;
  const guard = args.guard;
  const exactTransaction = args.transaction;
  const exactOrder = args.order;

  if (chain === 'hyperliquid' && (args.action === 'open_perp' || args.action === 'close_perp')) {
    const perpGuard = guard ?? {
      ...buildPerpGuard(args),
      protocolId: args.protocol_id ?? 'hyperliquid-perps',
    };
    return exactOrder
      ? callLegacy(
          'hyperliquid_perp_guard_exact_call',
          { guard: perpGuard, order: exactOrder },
          context
        )
      : callLegacy('hyperliquid_perp_guard', perpGuard, context);
  }

  if (chain === 'solana') {
    const solanaResult = routeSolanaCheck(args, context);
    if (solanaResult) return solanaResult;
  }

  if (isEvmChain(chain) && (args.action === 'open_perp' || args.action === 'close_perp')) {
    const perpGuard = guard ?? {
      ...buildPerpGuard(args),
      protocolId: args.protocol_id ?? 'synthetix-perps-v3-base',
    };
    return exactTransaction
      ? callLegacy(
          'base_perp_guard_exact_call',
          { guard: perpGuard, transaction: exactTransaction },
          context
        )
      : callLegacy('base_perp_guard', perpGuard, context);
  }

  if (isEvmChain(chain) && isLendingAction(args.action)) {
    const family = lendingProtocolFamily(args);
    const lendingGuard = guard ?? buildLendingGuard(args, chain);
    if (family === 'monad') {
      return exactTransaction
        ? callLegacy(
            'monad_lending_guard_exact_call',
            { guard: lendingGuard, transaction: exactTransaction },
            context
          )
        : callLegacy('monad_lending_guard', lendingGuard, context);
    }
    if (family === 'multichain') {
      return exactTransaction
        ? callLegacy(
            'multichain_evm_lending_guard_exact_call',
            { guard: lendingGuard, transaction: exactTransaction },
            context
          )
        : callLegacy('multichain_evm_lending_guard', lendingGuard, context);
    }
    return exactTransaction
      ? callLegacy(
          'base_lending_guard_exact_call',
          { guard: lendingGuard, transaction: exactTransaction },
          context
        )
      : callLegacy('base_lending_guard', lendingGuard, context);
  }

  // Generic oracle gate for everything without a reviewed family guard.
  const legacyAction =
    args.action === 'swap'
      ? 'swap'
      : args.action === 'borrow'
        ? 'borrow'
        : args.action === 'lend' || args.action === 'vault_deposit'
          ? 'lend'
          : 'repay';
  const genericArgs = {
    asset: requireValue(args.asset, 'asset', 'for this action'),
    chainId: isEvmChain(chain) ? chain : 0,
    action: legacyAction,
    tradeAmountUsd: requireValue(args.amount_usd, 'amount_usd', 'for this action'),
    targetProviders: args.providers,
    protocolId: args.protocol_id,
    tokenAddress: args.token_address,
    decisionInput: args.decision_input,
    reputationOptIn: args.reputation_opt_in,
    reputationAgentId: args.reputation_agent_id,
  };
  if (args.mode === 'preflight' || args.destination_asset) {
    return callLegacy(
      'execution_preflight',
      { ...genericArgs, destinationAsset: args.destination_asset },
      context
    );
  }
  return callLegacy('pre_trade_safety_check', genericArgs, context);
}

export async function routePriceAnalytics(
  args: PriceAnalyticsArgs,
  context?: McpToolCallContext
): Promise<string> {
  const symbol = args.assets[0];

  if (args.metric === 'spreads') {
    return callLegacy(
      'get_cross_chain_spreads',
      { provider: args.provider ?? 'chainlink', symbol, baseChain: args.base_chain },
      context
    );
  }
  if (args.metric === 'deviation') {
    return callLegacy(
      'compare_oracle_deviation',
      { symbol, from: args.from, to: args.to, interval: args.interval },
      context
    );
  }
  if (args.metric === 'correlation') {
    return callLegacy('get_correlation', { symbol, from: args.from, to: args.to }, context);
  }
  if (args.metric === 'risk') {
    return callLegacy(
      'get_risk_summary',
      {
        symbol,
        providers: args.providers ?? requireProviders(),
        period: args.period_hours ?? 168,
      },
      context
    );
  }
  if (args.mode === 'batch') {
    const provider = args.provider ?? 'chainlink';
    return callLegacy(
      'get_oracle_prices_batch',
      {
        queries: args.assets.map((asset) => ({ provider, symbol: asset, chain: args.chain })),
        forceRefresh: args.force_refresh,
      },
      context
    );
  }
  if (args.mode === 'history') {
    return callLegacy(
      'get_price_history',
      {
        provider: args.provider ?? requireProvider(),
        symbol,
        chain: args.chain,
        period: args.period_hours ?? 24 * 7,
        forceRefresh: args.force_refresh,
      },
      context
    );
  }
  return callLegacy(
    'get_consensus_price',
    { symbol, chain: args.chain, method: args.method },
    context
  );
}

function requireProviders(): never {
  throw new Error('get_price_analytics: "providers" (at least 2) is required for metric=risk.');
}

function requireProvider(): never {
  throw new Error('get_price_analytics: "provider" is required for mode=history.');
}

export async function routeOracleHealth(
  args: OracleHealthArgs,
  context?: McpToolCallContext
): Promise<string> {
  const subject = args.subject;

  if (args.metric === 'latency') {
    return callLegacy(
      'get_latency',
      { provider: args.provider, symbol: subject, from: args.from, to: args.to },
      context
    );
  }
  if (args.metric === 'anomalies') {
    return callLegacy('get_anomalies', { days: args.days ?? 7 }, context);
  }
  if (args.metric === 'coverage') {
    return callLegacy('get_coverage', {}, context);
  }
  if (args.metric === 'counts') {
    return callLegacy('get_metrics', {}, context);
  }
  if (args.metric === 'exposure') {
    return callLegacy(
      'get_protocol_oracle_exposure',
      { protocol: requireValue(subject, 'subject', 'for metric=exposure') },
      context
    );
  }
  if (args.metric === 'report') {
    return callLegacy('get_daily_report', { date: args.date }, context);
  }
  if (args.metric === 'peg') {
    const isStablecoin = STABLECOINS.some((coin) => coin.symbol === subject);
    const isWrapped = WRAPPED_ASSETS.some((asset) => asset.symbol === subject);
    if (isWrapped && !isStablecoin) {
      return callLegacy('get_wrapped_asset_peg', { symbol: subject }, context);
    }
    return callLegacy('get_stablecoin_peg', { symbol: subject }, context);
  }

  switch (args.scope) {
    case 'feeds':
      return callLegacy(
        'get_feeds',
        {
          provider: args.provider,
          symbol: subject,
          category: args.category,
          chainId: args.chain_id,
          isActive: args.is_active,
          limit: args.limit,
          offset: args.offset,
        },
        context
      );
    case 'feed':
      if (args.metric === 'uptime') {
        return callLegacy(
          'get_feed_uptime',
          { provider: args.provider, symbol: subject, from: args.from, to: args.to },
          context
        );
      }
      if (!subject) {
        return callLegacy(
          'get_feed_freshness',
          {
            provider: args.provider,
            category: args.category,
          },
          context
        );
      }
      return callLegacy('get_feed_health', { feedId: subject }, context);
    case 'providers':
      return callLegacy('get_reputation_rankings', { days: args.days ?? 7 }, context);
    case 'provider':
      return callLegacy(
        'get_provider_reputation',
        {
          provider: requireValue(subject, 'subject', 'for scope=provider'),
          trend: Boolean(args.days),
          days: args.days ?? 30,
        },
        context
      );
    case 'protocol':
      return callLegacy(
        'get_protocol_oracle_exposure',
        { protocol: requireValue(subject, 'subject', 'for scope=protocol') },
        context
      );
    case 'incidents':
      return callLegacy(
        'get_incidents',
        {
          provider: args.provider ?? subject,
          minSeverity: args.min_severity,
          from: args.from,
          to: args.to,
          limit: args.limit,
        },
        context
      );
    default:
      return callLegacy('get_oracle_health', { date: args.date }, context);
  }
}

export async function routeSearchRegistry(
  args: RegistryArgs,
  context?: McpToolCallContext
): Promise<string> {
  const query = args.query;

  switch (args.kind) {
    case 'feeds':
      return callLegacy(
        'get_feeds',
        {
          symbol: query,
          category: args.category,
          chainId: args.chain_id,
          isActive: args.is_active,
          limit: args.limit,
          offset: args.offset,
        },
        context
      );
    case 'protocols':
      return callLegacy('get_protocols', { query }, context);
    case 'stablecoins':
      return callLegacy('get_stablecoin_list', { query }, context);
    case 'protocol_params':
      return callLegacy(
        'get_protocol_risk_params',
        { protocol: requireValue(query, 'query', 'for kind=protocol_params') },
        context
      );
    case 'rwa_instrument':
      return callLegacy(
        'get_robinhood_rwa_instrument',
        {
          symbol: requireValue(query, 'query', 'for kind=rwa_instrument'),
          verifyOnchain: args.verify_onchain,
        },
        context
      );
    case 'rwa_context':
      return callLegacy(
        'get_robinhood_rwa_context',
        {
          symbol: requireValue(query, 'query', 'for kind=rwa_context'),
          verifyOnchain: args.verify_onchain,
        },
        context
      );
    case 'settlement_evidence':
      return callLegacy('get_settlement_evidence', { slug: query, limit: args.limit }, context);
    case 'setup_recommendation':
      return callLegacy(
        'recommend_oracle_setup',
        { symbol: requireValue(query, 'query', 'for kind=setup_recommendation') },
        context
      );
    default:
      return callLegacy('get_symbols', { query }, context);
  }
}

export async function routeMarketQuote(
  args: MarketQuoteArgs,
  context?: McpToolCallContext
): Promise<string> {
  switch (args.venue) {
    case 'base_aerodrome':
      return callLegacy('get_aerodrome_slipstream_market', {}, context);
    case 'base_pancakeswap_v3':
      return callLegacy('get_pancake_swap_v3_market', {}, context);
    case 'base_quickswap_v2':
      return callLegacy('get_quickswap_v2_market', {}, context);
    case 'base_venue_identity':
      return callLegacy('get_base_dex_venue_integrations', { venues: args.venues }, context);
    case 'monad_uniswap_v3':
      return callLegacy('get_monad_dex_market', {}, context);
    case 'monad_hanji':
      return callLegacy('get_hanji_monad_market', {}, context);
    case 'solana_jupiter':
      return callLegacy('get_solana_dex_route', {}, context);
    case 'hyperliquid_perp':
      return callLegacy('get_hyperliquid_perp_market', { market: args.market }, context);
    default:
      return callLegacy('get_base_dex_market', {}, context);
  }
}

export async function routePrepareSwap(
  args: PrepareSwapArgs,
  context?: McpToolCallContext
): Promise<string> {
  const common = {
    profileId: args.profile_id,
    direction: args.direction,
    amountIn: args.amount_in,
    recipient: args.recipient,
    deadlineUnixSeconds: args.deadline_unix_seconds,
    maxSlippageBps: args.max_slippage_bps,
    sourceDecisionPriceUsd: args.source_decision_price_usd,
    destinationDecisionPriceUsd: args.destination_decision_price_usd,
    policy: args.policy,
  };

  switch (args.venue) {
    case 'base_agent_swap':
      return callLegacy(
        'prepare_base_agent_swap_guard',
        {
          ...common,
          profileId: requireValue(args.profile_id, 'profile_id', 'for venue=base_agent_swap'),
          recipient: requireValue(args.recipient, 'recipient', 'for venue=base_agent_swap'),
          deadlineUnixSeconds: requireValue(
            args.deadline_unix_seconds,
            'deadline_unix_seconds',
            'for venue=base_agent_swap'
          ),
          sourceDecisionPriceUsd: requireValue(
            args.source_decision_price_usd,
            'source_decision_price_usd',
            'for venue=base_agent_swap'
          ),
          destinationDecisionPriceUsd: requireValue(
            args.destination_decision_price_usd,
            'destination_decision_price_usd',
            'for venue=base_agent_swap'
          ),
          policy: requireValue(args.policy, 'policy', 'for venue=base_agent_swap'),
        },
        context
      );
    case 'solana_loopscale_vault':
      return callLegacy(
        'loopscale_vault_deposit',
        {
          wallet: requireValue(args.wallet, 'wallet', 'for venue=solana_loopscale_vault'),
          vault: requireValue(args.vault, 'vault', 'for venue=solana_loopscale_vault'),
          assetMint: requireValue(
            args.asset_mint,
            'asset_mint',
            'for venue=solana_loopscale_vault'
          ),
          collateralSymbol: requireValue(
            args.collateral_symbol,
            'collateral_symbol',
            'for venue=solana_loopscale_vault'
          ),
          loanSymbol: requireValue(
            args.loan_symbol,
            'loan_symbol',
            'for venue=solana_loopscale_vault'
          ),
          collateralValueUsd: requireValue(
            args.collateral_value_usd,
            'collateral_value_usd',
            'for venue=solana_loopscale_vault'
          ),
          principalAmount: requireValue(
            args.principal_amount,
            'principal_amount',
            'for venue=solana_loopscale_vault'
          ),
          minLpAmount: args.min_lp_amount,
        },
        context
      );
    case 'base_pancakeswap_v3':
      return callLegacy(
        'prepare_pancakeswap_v3_swap',
        {
          ...common,
          recipient: requireValue(args.recipient, 'recipient', 'for this venue'),
          deadlineUnixSeconds: requireValue(
            args.deadline_unix_seconds,
            'deadline_unix_seconds',
            'for this venue'
          ),
          maxSlippageBps: requireValue(args.max_slippage_bps, 'max_slippage_bps', 'for this venue'),
        },
        context
      );
    default:
      return callLegacy(
        'prepare_aerodrome_slipstream_swap',
        {
          ...common,
          recipient: requireValue(args.recipient, 'recipient', 'for this venue'),
          deadlineUnixSeconds: requireValue(
            args.deadline_unix_seconds,
            'deadline_unix_seconds',
            'for this venue'
          ),
          maxSlippageBps: requireValue(args.max_slippage_bps, 'max_slippage_bps', 'for this venue'),
        },
        context
      );
  }
}

export async function routeIssueExecutionReceipt(
  args: z.infer<typeof IssueExecutionReceiptInputSchema>,
  context?: McpToolCallContext
): Promise<string> {
  if (args.mode === 'receipt') {
    return callLegacy(
      'execution_receipt',
      requireValue(args.receipt, 'receipt', 'for mode=receipt'),
      context
    );
  }
  if (args.mode === 'settle_base_agent_swap') {
    return callLegacy(
      'settle_base_agent_swap_guard',
      {
        decision: requireValue(args.decision, 'decision', 'for settle modes'),
        swapTxHash: requireValue(args.swap_tx_hash, 'swap_tx_hash', 'for settle modes'),
      },
      context
    );
  }
  return callLegacy(
    'settle_solana_swap_guard',
    {
      decision: requireValue(args.decision, 'decision', 'for settle modes'),
      signature: requireValue(args.signature, 'signature', 'for settle modes'),
    },
    context
  );
}

export async function routeVerifyEvidence(
  args: VerifyEvidenceArgs,
  context?: McpToolCallContext
): Promise<string> {
  switch (args.kind) {
    case 'base_agent_swap':
      return callLegacy(
        'verify_base_agent_swap_guard_settlement',
        { decision: requireValue(args.settlement, 'settlement', 'for kind=base_agent_swap') },
        context
      );
    case 'solana_swap':
      return callLegacy(
        'verify_solana_swap_guard_settlement',
        { settlement: requireValue(args.settlement, 'settlement', 'for kind=solana_swap') },
        context
      );
    case 'hyperliquid_perp':
      return callLegacy(
        'verify_hyperliquid_perp_execution',
        {
          user: requireValue(args.user, 'user', 'for kind=hyperliquid_perp'),
          orderId: requireValue(args.order_id, 'order_id', 'for kind=hyperliquid_perp'),
          submittedAt: requireValue(args.submitted_at, 'submitted_at', 'for kind=hyperliquid_perp'),
          expectedOrder: requireValue(
            args.expected_order,
            'expected_order',
            'for kind=hyperliquid_perp'
          ),
        },
        context
      );
    default:
      return callLegacy(
        'verify_execution_pair',
        {
          preTradeAttestation: requireValue(
            args.pre_trade_attestation,
            'pre_trade_attestation',
            'for kind=execution_pair'
          ),
          executionReceipt: requireValue(
            args.execution_receipt,
            'execution_receipt',
            'for kind=execution_pair'
          ),
          destinationPreTradeAttestation: args.destination_pre_trade_attestation,
        },
        context
      );
  }
}
