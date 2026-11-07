import { isEntitlementCoveredMcpTool } from '@/lib/billing/productPricing';
import { CHAIN_ID } from '@/lib/constants/tokenAddresses';

import {
  facilitatorBearerTokenForNetwork,
  facilitatorUrlForNetwork,
  getX402PaymentOptions,
  payToForEvmNetwork,
  type X402Config,
  type X402NetworkId,
  X402_BASE_LENDING_GUARD_ROUTE,
  X402_BASE_PERP_GUARD_ROUTE,
  X402_LOOPSCALE_VAULT_DEPOSIT_ROUTE,
  X402_MONAD_LENDING_GUARD_ROUTE,
  X402_MONAD_PERP_GUARD_ROUTE,
  X402_BNB_PERP_GUARD_ROUTE,
  X402_PREDICTION_GUARD_ROUTE,
  X402_SETTLEMENT_EVIDENCE_GRADE_ROUTE,
  X402_ORACLE_CONFIG_SNAPSHOT_ROUTE,
  X402_SOLANA_LENDING_GUARD_ROUTE,
  X402_SOLANA_PERP_GUARD_ROUTE,
  X402_SOLANA_SWAP_GUARD_ROUTE,
  X402_EXECUTION_PREFLIGHT_ROUTE,
  X402_HYPERLIQUID_PERP_GUARD_ROUTE,
  X402_MULTICHAIN_EVM_LENDING_GUARD_ROUTE,
  X402_ORACLE_WATCH_WINDOW_ROUTE,
  X402_POSITION_LIFECYCLE_ROUTE,
  X402_PRE_TRADE_ROUTE,
  X402_SWAP_INTENT_ROUTE,
} from './config';

/**
 * The settlement realm promised by a capability. `configured` deliberately
 * retains the merchant-selected rails for chain-neutral capabilities; a
 * chain-bound capability must instead name its execution chain explicitly.
 */
export type X402PaymentScope =
  | { readonly kind: 'configured'; readonly label: string }
  | { readonly kind: 'evm'; readonly network: X402NetworkId; readonly label: string }
  | { readonly kind: 'solana'; readonly label: string }
  | { readonly kind: 'hypercore'; readonly label: string };

/** Canonical payment scopes used by every x402 capability binding. */
export const X402_PAYMENT_SCOPE = {
  configured: { kind: 'configured', label: 'the merchant-configured x402 payment rail' },
  base: { kind: 'evm', network: `eip155:${CHAIN_ID.BASE}`, label: 'Base mainnet' },
  monad: { kind: 'evm', network: `eip155:${CHAIN_ID.MONAD}`, label: 'Monad mainnet' },
  polygon: { kind: 'evm', network: `eip155:${CHAIN_ID.POLYGON}`, label: 'Polygon PoS' },
  arbitrum: { kind: 'evm', network: `eip155:${CHAIN_ID.ARBITRUM}`, label: 'Arbitrum One' },
  bnb: { kind: 'evm', network: `eip155:${CHAIN_ID.BSC}`, label: 'BNB Smart Chain' },
  hyperevm: { kind: 'evm', network: `eip155:${CHAIN_ID.HYPEREVM}`, label: 'HyperEVM' },
  solana: { kind: 'solana', label: 'Solana' },
  hypercore: { kind: 'hypercore', label: 'Hyperliquid HyperCore' },
} as const satisfies Record<string, X402PaymentScope>;

/**
 * Every REST route whose execution semantics are fixed to one chain. Dynamic
 * multichain routes are bound from their validated chainId at the route edge.
 */
export const X402_REST_PAYMENT_SCOPE_BY_PATH: Readonly<Record<string, X402PaymentScope>> = {
  [X402_BASE_LENDING_GUARD_ROUTE]: X402_PAYMENT_SCOPE.base,
  [X402_BASE_PERP_GUARD_ROUTE]: X402_PAYMENT_SCOPE.base,
  [X402_MONAD_LENDING_GUARD_ROUTE]: X402_PAYMENT_SCOPE.monad,
  [X402_MONAD_PERP_GUARD_ROUTE]: X402_PAYMENT_SCOPE.monad,
  [X402_SOLANA_LENDING_GUARD_ROUTE]: X402_PAYMENT_SCOPE.solana,
  [X402_SOLANA_PERP_GUARD_ROUTE]: X402_PAYMENT_SCOPE.solana,
  [X402_SOLANA_SWAP_GUARD_ROUTE]: X402_PAYMENT_SCOPE.solana,
  [X402_BNB_PERP_GUARD_ROUTE]: X402_PAYMENT_SCOPE.bnb,
  [X402_PREDICTION_GUARD_ROUTE]: X402_PAYMENT_SCOPE.configured,
  [X402_SETTLEMENT_EVIDENCE_GRADE_ROUTE]: X402_PAYMENT_SCOPE.configured,
  [X402_ORACLE_CONFIG_SNAPSHOT_ROUTE]: X402_PAYMENT_SCOPE.configured,
  [X402_LOOPSCALE_VAULT_DEPOSIT_ROUTE]: X402_PAYMENT_SCOPE.solana,
};

/**
 * Paid REST paths that intentionally have NO fixed entry in
 * {@link X402_REST_PAYMENT_SCOPE_BY_PATH} and fall back to the
 * merchant-configured payment rail (or, for the multichain lending guard, to
 * the request-bound chainId validated at the route edge). Every other paid
 * REST route MUST have a fixed scope entry.
 */
export const X402_CONFIGURED_SCOPE_FALLBACK_PATHS: ReadonlySet<string> = new Set([
  /** Chain-neutral pre-trade gate: assessment only, no on-chain execution authority. */
  X402_PRE_TRADE_ROUTE,
  /** Execution preflight is advisory; the caller's settlement rail is a product choice. */
  X402_EXECUTION_PREFLIGHT_ROUTE,
  /** Multichain lending guard binds its scope from the validated request chainId. */
  X402_MULTICHAIN_EVM_LENDING_GUARD_ROUTE,
  /**
   * Hyperliquid perp guard deliberately bypasses x402ConfigForPaymentScope:
   * its natural scope is hypercore and fixed-scope resolution intentionally
   * returns null for it (see its route handler), so it rides the configured
   * fallback at the manifest surface.
   */
  X402_HYPERLIQUID_PERP_GUARD_ROUTE,
  /** Two-gate swap lifecycle is chain-neutral at the manifest surface. */
  X402_SWAP_INTENT_ROUTE,
  /** Monitored-window purchase is chain-neutral; polls are token-authenticated. */
  X402_ORACLE_WATCH_WINDOW_ROUTE,
  /** Position-lifecycle bundle is chain-neutral; bundled calls are token-authenticated. */
  X402_POSITION_LIFECYCLE_ROUTE,
]);

/**
 * Fail fast when a paid REST route neither declares a fixed payment scope
 * nor is on the explicit configured-rail fallback list. Without this check a
 * new fixed-chain route missing its scope entry silently advertises the
 * merchant rail in the discovery manifest (regression class #405).
 */
export function assertX402RestScopeCoverage(paidRestPaths: readonly string[]): void {
  const undeclared = paidRestPaths.filter(
    (path) =>
      !(path in X402_REST_PAYMENT_SCOPE_BY_PATH) && !X402_CONFIGURED_SCOPE_FALLBACK_PATHS.has(path)
  );
  if (undeclared.length > 0) {
    throw new Error(
      'x402 paid REST routes missing a payment-scope declaration: ' +
        undeclared.join(', ') +
        '. Every paid REST route must either have an X402_REST_PAYMENT_SCOPE_BY_PATH entry ' +
        '(fixed execution chain) or be listed in X402_CONFIGURED_SCOPE_FALLBACK_PATHS ' +
        '(deliberate merchant-rail / request-bound scope); otherwise the discovery manifest ' +
        'silently advertises the wrong payment rail.'
    );
  }
}

/**
 * Tools that are intentionally chain-neutral: their assessment is portable
 * across protocols or chains, so the merchant's configured payment rail is a
 * product choice rather than an execution-chain claim. They are still listed
 * explicitly so adding a new MCP tool cannot silently inherit a payment rail.
 */
const X402_CHAIN_NEUTRAL_MCP_PAYMENT_SCOPE_BY_TOOL = {
  agent_begin_trade: X402_PAYMENT_SCOPE.configured,
  begin_trade_evidence: X402_PAYMENT_SCOPE.configured,
  check_liquidation_risk: X402_PAYMENT_SCOPE.configured,
  check_position_safety: X402_PAYMENT_SCOPE.configured,
  compare_oracle_deviation: X402_PAYMENT_SCOPE.configured,
  execution_preflight: X402_PAYMENT_SCOPE.configured,
  execution_receipt: X402_PAYMENT_SCOPE.configured,
  get_anomalies: X402_PAYMENT_SCOPE.configured,
  get_consensus_price: X402_PAYMENT_SCOPE.configured,
  get_correlation: X402_PAYMENT_SCOPE.configured,
  get_coverage: X402_PAYMENT_SCOPE.configured,
  get_cross_chain_spreads: X402_PAYMENT_SCOPE.configured,
  get_daily_report: X402_PAYMENT_SCOPE.configured,
  get_feed_freshness: X402_PAYMENT_SCOPE.configured,
  get_feed_health: X402_PAYMENT_SCOPE.configured,
  get_feed_uptime: X402_PAYMENT_SCOPE.configured,
  get_feeds: X402_PAYMENT_SCOPE.configured,
  get_incidents: X402_PAYMENT_SCOPE.configured,
  get_latency: X402_PAYMENT_SCOPE.configured,
  get_metrics: X402_PAYMENT_SCOPE.configured,
  get_oracle_health: X402_PAYMENT_SCOPE.configured,
  get_oracle_price: X402_PAYMENT_SCOPE.configured,
  get_price_analytics: X402_PAYMENT_SCOPE.configured,
  get_oracle_prices_batch: X402_PAYMENT_SCOPE.configured,
  get_price_history: X402_PAYMENT_SCOPE.configured,
  get_protocol_oracle_exposure: X402_PAYMENT_SCOPE.configured,
  get_protocol_risk_params: X402_PAYMENT_SCOPE.configured,
  get_protocols: X402_PAYMENT_SCOPE.configured,
  get_provider_reputation: X402_PAYMENT_SCOPE.configured,
  get_reputation_rankings: X402_PAYMENT_SCOPE.configured,
  get_risk_summary: X402_PAYMENT_SCOPE.configured,
  get_settlement_evidence: X402_PAYMENT_SCOPE.configured,
  get_robinhood_rwa_context: X402_PAYMENT_SCOPE.configured,
  get_robinhood_rwa_instrument: X402_PAYMENT_SCOPE.configured,
  get_stablecoin_list: X402_PAYMENT_SCOPE.configured,
  get_stablecoin_peg: X402_PAYMENT_SCOPE.configured,
  get_symbols: X402_PAYMENT_SCOPE.configured,
  get_wrapped_asset_peg: X402_PAYMENT_SCOPE.configured,
  oracle_watch: X402_PAYMENT_SCOPE.configured,
  oracle_watch_history: X402_PAYMENT_SCOPE.configured,
  // Product begin tools are chain-neutral purchases: the monitored subject is
  // optional-chain data scope, not an execution chain, so the merchant's
  // configured rail applies (same reasoning as oracle_watch).
  oracle_watch_window_begin: X402_PAYMENT_SCOPE.configured,
  position_lifecycle_begin: X402_PAYMENT_SCOPE.configured,
  pre_trade_safety_check: X402_PAYMENT_SCOPE.configured,
  recommend_oracle_setup: X402_PAYMENT_SCOPE.configured,
  search_oracle_registry: X402_PAYMENT_SCOPE.configured,
  verify_execution_pair: X402_PAYMENT_SCOPE.configured,
} as const satisfies Record<string, X402PaymentScope>;

/**
 * Every MCP tool whose reviewed venue/protocol is intrinsically bound to one
 * chain, plus every explicitly-declared chain-neutral MCP tool. Keeping this
 * exhaustive registry next to config derivation makes a missing binding fail
 * closed instead of relying on a global default.
 */
export const X402_MCP_PAYMENT_SCOPE_BY_TOOL: Readonly<Record<string, X402PaymentScope>> = {
  ...X402_CHAIN_NEUTRAL_MCP_PAYMENT_SCOPE_BY_TOOL,
  get_base_dex_market: X402_PAYMENT_SCOPE.base,
  get_base_dex_venue_integrations: X402_PAYMENT_SCOPE.base,
  get_aerodrome_slipstream_market: X402_PAYMENT_SCOPE.base,
  prepare_aerodrome_slipstream_swap: X402_PAYMENT_SCOPE.base,
  // get_pancakeswap_v3_market / prepare_pancakeswap_v3_swap and the three
  // base-agent-swap-guard tools are resolved dynamically from the requested
  // profile or guarded chain (see the dynamic helpers), so they are
  // intentionally absent from this static registry.
  get_quickswap_v2_market: X402_PAYMENT_SCOPE.base,
  base_lending_guard: X402_PAYMENT_SCOPE.base,
  base_lending_guard_exact_call: X402_PAYMENT_SCOPE.base,
  base_perp_guard: X402_PAYMENT_SCOPE.base,
  base_perp_guard_exact_call: X402_PAYMENT_SCOPE.base,
  get_monad_dex_market: X402_PAYMENT_SCOPE.monad,
  get_hanji_monad_market: X402_PAYMENT_SCOPE.monad,
  monad_lending_guard: X402_PAYMENT_SCOPE.monad,
  monad_lending_guard_exact_call: X402_PAYMENT_SCOPE.monad,
  get_solana_dex_route: X402_PAYMENT_SCOPE.solana,
  solana_lending_guard: X402_PAYMENT_SCOPE.solana,
  solana_perp_guard: X402_PAYMENT_SCOPE.solana,
  solana_swap_guard: X402_PAYMENT_SCOPE.solana,
  settle_solana_swap_guard: X402_PAYMENT_SCOPE.solana,
  verify_solana_swap_guard_settlement: X402_PAYMENT_SCOPE.solana,
  loopscale_vault_deposit: X402_PAYMENT_SCOPE.solana,
  // HyperCore tools ride the dedicated Core-USDC verify/settle lifecycle in
  // the MCP bridge; there is no EVM substitute.
  get_hyperliquid_perp_market: X402_PAYMENT_SCOPE.hypercore,
  prepare_hyperliquid_perp_order: X402_PAYMENT_SCOPE.hypercore,
  prepare_perp_order: X402_PAYMENT_SCOPE.hypercore,
  verify_hyperliquid_perp_execution: X402_PAYMENT_SCOPE.hypercore,
  // The Hyperliquid perp guard is venue-bound evidence about Hyperliquid, so
  // it names the same realm; keyless MCP payment runs the HyperCore lifecycle
  // in the MCP bridge.
  hyperliquid_perp_guard: X402_PAYMENT_SCOPE.hypercore,
  hyperliquid_perp_guard_exact_call: X402_PAYMENT_SCOPE.hypercore,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Convert a reviewed EVM execution chain into its x402 payment scope. */
export function x402PaymentScopeForEvmChainId(chainId: unknown): X402PaymentScope | null {
  if (!Number.isSafeInteger(chainId) || typeof chainId !== 'number') return null;
  const scope = Object.values(X402_PAYMENT_SCOPE).find(
    (candidate) => candidate.kind === 'evm' && candidate.network === `eip155:${chainId}`
  );
  return scope ?? null;
}

function multichainGuardChainId(argumentsValue: unknown): unknown {
  if (!isRecord(argumentsValue)) return null;
  const guard = isRecord(argumentsValue.guard) ? argumentsValue.guard : argumentsValue;
  return guard.chainId;
}

/**
 * PancakeSwap V3 market/prepare tools now serve reviewed profiles on Base and
 * BNB. Their payment realm follows the requested profile id; the optional id
 * defaults to the reviewed Base lane, and an unknown prefix fails closed.
 */
function pancakeSwapV3McpPaymentScope(argumentsValue: unknown): X402PaymentScope | null {
  if (!isRecord(argumentsValue)) return null;
  const profileId = typeof argumentsValue.profileId === 'string' ? argumentsValue.profileId : null;
  if (profileId === null) return X402_PAYMENT_SCOPE.base;
  if (profileId.startsWith('bnb-')) return X402_PAYMENT_SCOPE.bnb;
  if (profileId.startsWith('base-')) return X402_PAYMENT_SCOPE.base;
  if (profileId.startsWith('monad-')) return X402_PAYMENT_SCOPE.monad;
  return null;
}

/**
 * The three base-agent-swap-guard MCP tools now serve reviewed profiles on
 * more than one chain (Base 8453, BNB 56, Monad 143). Their payment realm is
 * derived from the guarded execution chain carried in the arguments, never a
 * global default: an unparseable request resolves to null and fails closed.
 */
function baseAgentSwapGuardMcpPaymentScope(
  toolName: string,
  argumentsValue: unknown
): X402PaymentScope | null {
  if (!isRecord(argumentsValue)) return null;

  if (toolName === 'prepare_base_agent_swap_guard') {
    // profileId is optional and defaults to the reviewed Base lane. Only a
    // recognized BNB/Monad prefix selects that realm; an unrecognized prefix
    // fails closed rather than silently authorizing on Base.
    const profileId =
      typeof argumentsValue.profileId === 'string' ? argumentsValue.profileId : null;
    if (profileId === null) return X402_PAYMENT_SCOPE.base;
    if (profileId.startsWith('bnb-')) return X402_PAYMENT_SCOPE.bnb;
    if (profileId.startsWith('base-')) return X402_PAYMENT_SCOPE.base;
    if (profileId.startsWith('monad-')) return X402_PAYMENT_SCOPE.monad;
    return null;
  }

  // settle/verify carry the signed decision (or settlement) whose guard scope
  // names the reviewed execution chain.
  const chainId = (() => {
    const decision = isRecord(argumentsValue.decision) ? argumentsValue.decision : null;
    if (decision) {
      const guard = isRecord(decision.guard) ? decision.guard : null;
      const scope = guard && isRecord(guard.scope) ? guard.scope : null;
      if (scope && typeof scope.chainId === 'number') return scope.chainId;
      // verify passes the settlement envelope instead of the decision.
      const settlement = isRecord(decision.settlement) ? decision.settlement : null;
      if (settlement && typeof settlement.chainId === 'number') return settlement.chainId;
    }
    return null;
  })();

  if (chainId === 56) return X402_PAYMENT_SCOPE.bnb;
  if (chainId === 8453) return X402_PAYMENT_SCOPE.base;
  if (chainId === 143) return X402_PAYMENT_SCOPE.monad;
  return null;
}

/**
 * Map a reviewed venue (plus an optional profile id) onto its payment realm.
 * Venue families are explicit so an unknown venue fails closed.
 */
function venueMcpPaymentScope(venue: unknown, profileIdValue: unknown): X402PaymentScope | null {
  if (venue === 'solana_jupiter' || venue === 'solana_loopscale_vault') {
    return X402_PAYMENT_SCOPE.solana;
  }
  if (venue === 'hyperliquid_perp') return X402_PAYMENT_SCOPE.hypercore;
  if (typeof venue !== 'string' || (!venue.startsWith('base_') && !venue.startsWith('monad_'))) {
    return null;
  }
  const profileId = typeof profileIdValue === 'string' ? profileIdValue : null;
  if (profileId !== null) {
    if (profileId.startsWith('bnb-')) return X402_PAYMENT_SCOPE.bnb;
    if (profileId.startsWith('base-')) return X402_PAYMENT_SCOPE.base;
    if (profileId.startsWith('monad-')) return X402_PAYMENT_SCOPE.monad;
    return null;
  }
  if (venue.startsWith('monad_')) return X402_PAYMENT_SCOPE.monad;
  return X402_PAYMENT_SCOPE.base;
}

/** Read the execution chain carried by a signed guard decision/settlement. */
function signedEvidenceChainId(value: unknown): number | null {
  if (!isRecord(value)) return null;
  const guard = isRecord(value.guard) ? value.guard : null;
  const scope = guard && isRecord(guard.scope) ? guard.scope : null;
  if (scope && typeof scope.chainId === 'number') return scope.chainId;
  const settlement = isRecord(value.settlement) ? value.settlement : null;
  if (settlement && typeof settlement.chainId === 'number') return settlement.chainId;
  if (typeof value.chainId === 'number') return value.chainId;
  return null;
}

function evmScopeFromChainId(chainId: number | null): X402PaymentScope | null {
  if (chainId === 56) return X402_PAYMENT_SCOPE.bnb;
  if (chainId === 8453) return X402_PAYMENT_SCOPE.base;
  if (chainId === 143) return X402_PAYMENT_SCOPE.monad;
  return x402PaymentScopeForEvmChainId(chainId);
}

/**
 * Resolve the required payment realm before a paid MCP call is quoted or
 * verified. A malformed/unsupported multichain request returns null rather
 * than inheriting the global rail and producing a deceptive quote.
 */
export function x402PaymentScopeForMcpTool(
  toolName: string,
  argumentsValue: unknown
): X402PaymentScope | null {
  if (
    toolName === 'multichain_evm_lending_guard' ||
    toolName === 'multichain_evm_lending_guard_exact_call'
  ) {
    return x402PaymentScopeForEvmChainId(multichainGuardChainId(argumentsValue));
  }

  if (toolName === 'get_pancakeswap_v3_market' || toolName === 'prepare_pancakeswap_v3_swap') {
    return pancakeSwapV3McpPaymentScope(argumentsValue);
  }

  if (
    toolName === 'prepare_base_agent_swap_guard' ||
    toolName === 'settle_base_agent_swap_guard' ||
    toolName === 'verify_base_agent_swap_guard_settlement'
  ) {
    return baseAgentSwapGuardMcpPaymentScope(toolName, argumentsValue);
  }

  if (!isRecord(argumentsValue)) {
    return X402_MCP_PAYMENT_SCOPE_BY_TOOL[toolName] ?? null;
  }

  if (toolName === 'check_trade_safety') {
    const chain = argumentsValue.chain_id;
    if (chain === 'solana') return X402_PAYMENT_SCOPE.solana;
    if (chain === 'hyperliquid') return X402_PAYMENT_SCOPE.hypercore;
    return x402PaymentScopeForEvmChainId(chain);
  }

  if (toolName === 'prepare_swap' || toolName === 'get_market_quote') {
    return venueMcpPaymentScope(argumentsValue.venue, argumentsValue.profile_id);
  }

  if (toolName === 'issue_execution_receipt') {
    if (argumentsValue.mode === 'settle_solana_swap') return X402_PAYMENT_SCOPE.solana;
    if (argumentsValue.mode === 'settle_base_agent_swap') {
      return evmScopeFromChainId(signedEvidenceChainId(argumentsValue.decision));
    }
    return X402_PAYMENT_SCOPE.configured;
  }

  if (toolName === 'verify_evidence') {
    if (argumentsValue.kind === 'solana_swap') return X402_PAYMENT_SCOPE.solana;
    if (argumentsValue.kind === 'hyperliquid_perp') return X402_PAYMENT_SCOPE.hypercore;
    if (argumentsValue.kind === 'base_agent_swap') {
      return evmScopeFromChainId(signedEvidenceChainId(argumentsValue.settlement));
    }
    return X402_PAYMENT_SCOPE.configured;
  }

  return X402_MCP_PAYMENT_SCOPE_BY_TOOL[toolName] ?? null;
}

/** MCP tools whose payment scope is derived from their arguments per call. */
const X402_DYNAMIC_MCP_PAYMENT_SCOPE_TOOLS = new Set([
  'prepare_base_agent_swap_guard',
  'settle_base_agent_swap_guard',
  'verify_base_agent_swap_guard_settlement',
  'get_pancakeswap_v3_market',
  'prepare_pancakeswap_v3_swap',
  'check_trade_safety',
  'prepare_swap',
  'get_market_quote',
  'issue_execution_receipt',
  'verify_evidence',
]);

/**
 * Called when the MCP catalog is assembled. A new paid tool cannot ship until
 * its payment semantics are deliberately registered as fixed-chain, dynamic,
 * or chain-neutral.
 */
export function assertX402PaymentScopeDeclaredForMcpTool(toolName: string): void {
  if (
    toolName in X402_MCP_PAYMENT_SCOPE_BY_TOOL ||
    X402_DYNAMIC_MCP_PAYMENT_SCOPE_TOOLS.has(toolName) ||
    toolName === 'multichain_evm_lending_guard' ||
    toolName === 'multichain_evm_lending_guard_exact_call' ||
    // In-window product tools (poll/close/guard/receipt/close-summary) are
    // covered by the prior purchase and authenticate with its one-time token
    // in their arguments — no per-call payment realm applies to them.
    isEntitlementCoveredMcpTool(toolName)
  ) {
    return;
  }
  throw new Error(
    `MCP tool "${toolName}" is missing an x402 payment-scope declaration. ` +
      'Register it as a fixed-chain, dynamic, or chain-neutral capability.'
  );
}

function evmEnabled(cfg: X402Config): boolean {
  return (
    cfg.evmEnabled ??
    (cfg.enabled && (cfg.payTo !== '' || Object.keys(cfg.evmPayTos ?? {}).length > 0))
  );
}

/**
 * Build an isolated x402 configuration that advertises exactly one native
 * payment realm. No scoped capability can accidentally inherit additional
 * EVM, Solana, or HyperCore options from the merchant-wide configuration.
 *
 * `null` is intentional: it means Insight has no matching rail configured
 * for this capability, so the caller must fail closed instead of quoting a
 * payment on a different chain.
 */
export function x402ConfigForPaymentScope(
  cfg: X402Config,
  scope: X402PaymentScope
): X402Config | null {
  if (!cfg.enabled) return null;
  if (scope.kind === 'configured') return cfg;

  if (scope.kind === 'hypercore') {
    // HyperCore is a dedicated Core-USDC lifecycle (quote → verify → settle).
    // Keep an isolated config so no EVM/Solana option can leak into the quote;
    // `null` means the HyperCore rail is not configured and the caller fails
    // closed.
    if (!cfg.hypercore) return null;
    return {
      ...cfg,
      evmEnabled: false,
      evmNetworks: [],
      payTo: '',
      evmPayTos: {},
      solana: null,
    };
  }

  if (scope.kind === 'solana') {
    if (!cfg.solana) return null;
    return {
      ...cfg,
      evmEnabled: false,
      evmNetworks: [],
      payTo: '',
      evmPayTos: {},
      hypercore: null,
    };
  }

  if (!evmEnabled(cfg)) return null;
  const payTo = payToForEvmNetwork(cfg, scope.network);
  if (payTo === '') return null;

  const facilitatorUrl = facilitatorUrlForNetwork(cfg, scope.network);
  const facilitatorBearerToken = facilitatorBearerTokenForNetwork(cfg, scope.network);
  return {
    ...cfg,
    evmEnabled: true,
    network: scope.network,
    evmNetworks: [scope.network],
    payTo,
    evmPayTos: { [scope.network]: payTo },
    facilitatorUrl,
    facilitatorUrls: { [scope.network]: facilitatorUrl },
    facilitatorBearerToken,
    facilitatorBearerTokens: facilitatorBearerToken
      ? { [scope.network]: facilitatorBearerToken }
      : {},
    solana: null,
    hypercore: null,
  };
}

/** Return the one actual payment option a scoped capability is allowed to quote. */
export function x402PaymentOptionsForScope(cfg: X402Config, scope: X402PaymentScope) {
  const scoped = x402ConfigForPaymentScope(cfg, scope);
  return scoped ? getX402PaymentOptions(scoped) : [];
}
