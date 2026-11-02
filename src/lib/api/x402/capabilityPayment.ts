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
  X402_SOLANA_LENDING_GUARD_ROUTE,
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
  base: { kind: 'evm', network: 'eip155:8453', label: 'Base mainnet' },
  monad: { kind: 'evm', network: 'eip155:143', label: 'Monad mainnet' },
  polygon: { kind: 'evm', network: 'eip155:137', label: 'Polygon PoS' },
  arbitrum: { kind: 'evm', network: 'eip155:42161', label: 'Arbitrum One' },
  bnb: { kind: 'evm', network: 'eip155:56', label: 'BNB Smart Chain' },
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
  [X402_SOLANA_LENDING_GUARD_ROUTE]: X402_PAYMENT_SCOPE.solana,
  [X402_LOOPSCALE_VAULT_DEPOSIT_ROUTE]: X402_PAYMENT_SCOPE.solana,
};

/**
 * Tools that are intentionally chain-neutral: their assessment is portable
 * across protocols or chains, so the merchant's configured payment rail is a
 * product choice rather than an execution-chain claim. They are still listed
 * explicitly so adding a new MCP tool cannot silently inherit a payment rail.
 */
const X402_CHAIN_NEUTRAL_MCP_PAYMENT_SCOPE_BY_TOOL = {
  agent_begin_trade: X402_PAYMENT_SCOPE.configured,
  assess_rwa_evidence: X402_PAYMENT_SCOPE.configured,
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
  get_oracle_prices_batch: X402_PAYMENT_SCOPE.configured,
  get_price_history: X402_PAYMENT_SCOPE.configured,
  get_protocol_oracle_exposure: X402_PAYMENT_SCOPE.configured,
  get_protocol_risk_params: X402_PAYMENT_SCOPE.configured,
  get_protocols: X402_PAYMENT_SCOPE.configured,
  get_provider_reputation: X402_PAYMENT_SCOPE.configured,
  get_reputation_rankings: X402_PAYMENT_SCOPE.configured,
  get_risk_summary: X402_PAYMENT_SCOPE.configured,
  get_robinhood_rwa_context: X402_PAYMENT_SCOPE.configured,
  get_robinhood_rwa_instrument: X402_PAYMENT_SCOPE.configured,
  get_stablecoin_list: X402_PAYMENT_SCOPE.configured,
  get_stablecoin_peg: X402_PAYMENT_SCOPE.configured,
  get_symbols: X402_PAYMENT_SCOPE.configured,
  get_wrapped_asset_peg: X402_PAYMENT_SCOPE.configured,
  oracle_watch: X402_PAYMENT_SCOPE.configured,
  oracle_watch_history: X402_PAYMENT_SCOPE.configured,
  pre_trade_safety_check: X402_PAYMENT_SCOPE.configured,
  recommend_oracle_setup: X402_PAYMENT_SCOPE.configured,
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
  get_pancakeswap_v3_market: X402_PAYMENT_SCOPE.base,
  prepare_pancakeswap_v3_swap: X402_PAYMENT_SCOPE.base,
  get_quickswap_v2_market: X402_PAYMENT_SCOPE.base,
  prepare_base_agent_swap_guard: X402_PAYMENT_SCOPE.base,
  settle_base_agent_swap_guard: X402_PAYMENT_SCOPE.base,
  verify_base_agent_swap_guard_settlement: X402_PAYMENT_SCOPE.base,
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
  loopscale_vault_deposit: X402_PAYMENT_SCOPE.solana,
  // MCP does not yet implement the HyperCore verify/settle lifecycle. Keep
  // these tools from falling back to an unrelated EVM quote until it does.
  get_hyperliquid_perp_market: X402_PAYMENT_SCOPE.hypercore,
  prepare_hyperliquid_perp_order: X402_PAYMENT_SCOPE.hypercore,
  verify_hyperliquid_perp_execution: X402_PAYMENT_SCOPE.hypercore,
  // The Hyperliquid perp guard is venue-bound evidence about Hyperliquid, so
  // it names the same realm; the paid tier is served by the REST route, and
  // MCP-side keyless payment stays fail closed until HyperCore lands.
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

  return X402_MCP_PAYMENT_SCOPE_BY_TOOL[toolName] ?? null;
}

/**
 * Called when the MCP catalog is assembled. A new paid tool cannot ship until
 * its payment semantics are deliberately registered as fixed-chain, dynamic,
 * or chain-neutral.
 */
export function assertX402PaymentScopeDeclaredForMcpTool(toolName: string): void {
  if (
    toolName in X402_MCP_PAYMENT_SCOPE_BY_TOOL ||
    toolName === 'multichain_evm_lending_guard' ||
    toolName === 'multichain_evm_lending_guard_exact_call'
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
    // HyperCore is supported by the REST guard's dedicated lifecycle, but not
    // by the MCP x402 bridge. Do not represent a HyperCore capability with an
    // EVM substitute while that protocol work is incomplete.
    return null;
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
