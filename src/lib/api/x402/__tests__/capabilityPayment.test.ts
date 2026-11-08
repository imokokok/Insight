import { isEntitlementCoveredMcpTool } from '@/lib/billing/productPricing';
import catalog from '@/mcp/tools/generatedCatalog.json';

import {
  x402ConfigForPaymentScope,
  x402PaymentScopeForEvmChainId,
  x402PaymentScopeForMcpTool,
  X402_MCP_PAYMENT_SCOPE_BY_TOOL,
  X402_PAYMENT_SCOPE,
  X402_REST_PAYMENT_SCOPE_BY_PATH,
} from '../capabilityPayment';
import { getX402PaymentOptions, parseX402Config } from '../config';

const CATALOG_ALL_TOOL_NAMES: string[] = catalog.map((tool) => tool.name);

const EVM_ENV = {
  X402_ENABLED: 'true',
  X402_NETWORK: 'eip155:999',
  X402_EVM_NETWORKS: 'eip155:999',
  X402_PAY_TO: '0xAbC0000000000000000000000000000000000001',
  X402_FACILITATOR_URL: 'https://facilitator.example',
  X402_FACILITATOR_URLS: 'eip155:999=https://hyper.example',
} as NodeJS.ProcessEnv;

function paymentNetworks(scope: (typeof X402_PAYMENT_SCOPE)[keyof typeof X402_PAYMENT_SCOPE]) {
  const cfg = x402ConfigForPaymentScope(parseX402Config(EVM_ENV), scope);
  return cfg ? getX402PaymentOptions(cfg).map((option) => option.network) : [];
}

describe('x402 capability payment bindings', () => {
  it.each([
    [X402_PAYMENT_SCOPE.base, ['eip155:8453']],
    [X402_PAYMENT_SCOPE.monad, ['eip155:143']],
    [X402_PAYMENT_SCOPE.polygon, ['eip155:137']],
    [X402_PAYMENT_SCOPE.arbitrum, ['eip155:42161']],
    [X402_PAYMENT_SCOPE.bnb, ['eip155:56']],
    [X402_PAYMENT_SCOPE.hyperevm, ['eip155:999']],
  ] as const)(
    'isolates %s.label from a globally HyperEVM-configured merchant',
    (scope, networks) => {
      expect(paymentNetworks(scope)).toEqual(networks);
    }
  );

  it('uses the native Solana rail alone and fails closed when it is not configured', () => {
    const withoutSolana = x402ConfigForPaymentScope(
      parseX402Config(EVM_ENV),
      X402_PAYMENT_SCOPE.solana
    );
    expect(withoutSolana).toBeNull();

    const withSolana = x402ConfigForPaymentScope(
      parseX402Config({
        ...EVM_ENV,
        X402_SOLANA_ENABLED: 'true',
        X402_SOLANA_NETWORK: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        X402_SOLANA_PAY_TO: 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX',
      }),
      X402_PAYMENT_SCOPE.solana
    );
    expect(withSolana && getX402PaymentOptions(withSolana).map((option) => option.network)).toEqual(
      ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp']
    );
  });

  it('binds every registered fixed-chain route and MCP tool to exactly its declared realm', () => {
    const cfg = parseX402Config({
      ...EVM_ENV,
      X402_SOLANA_ENABLED: 'true',
      X402_SOLANA_NETWORK: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      X402_SOLANA_PAY_TO: 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX',
    });
    const bindings = [
      ...Object.entries(X402_REST_PAYMENT_SCOPE_BY_PATH),
      ...Object.entries(X402_MCP_PAYMENT_SCOPE_BY_TOOL),
    ];

    for (const [capability, scope] of bindings) {
      if (scope.kind === 'configured' || scope.kind === 'multichain') continue;
      const scoped = x402ConfigForPaymentScope(cfg, scope);
      if (scope.kind === 'hypercore') {
        expect(scoped).toBeNull();
        continue;
      }
      expect(scoped).not.toBeNull();
      const options = getX402PaymentOptions(scoped!);
      expect(options).toHaveLength(1);
      if (scope.kind === 'evm') expect(options[0]?.network).toBe(scope.network);
      if (scope.kind === 'solana') expect(options[0]?.network).toMatch(/^solana:/);
      expect(capability).toBeTruthy();
    }
  });

  it('quotes Base and BNB for chain-neutral unified tools, never below the BNB floor', () => {
    // Production configures Base/BNB with the global X402_PAY_TO fallback and
    // no per-network X402_EVM_PAY_TOS entries; the multichain scope must still
    // advertise both rails.
    const cfg = parseX402Config({
      ...EVM_ENV,
      X402_SOLANA_ENABLED: 'true',
      X402_SOLANA_NETWORK: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      X402_SOLANA_PAY_TO: 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX',
    });

    for (const tool of [
      'get_oracle_price',
      'get_price_analytics',
      'get_oracle_health',
      'search_oracle_registry',
      'begin_trade_evidence',
      'oracle_watch',
      'oracle_watch_window_begin',
      'position_lifecycle_begin',
    ]) {
      expect(x402PaymentScopeForMcpTool(tool, {})).toEqual(X402_PAYMENT_SCOPE.multichain);
    }

    const scoped = x402ConfigForPaymentScope(cfg, X402_PAYMENT_SCOPE.multichain);
    expect(scoped).not.toBeNull();
    const networksAt = (amountAtomic: string) =>
      getX402PaymentOptions(scoped!, amountAtomic).map((option) => option.network);

    // C1/C2 stay below the BNB floor (4861), so BNB is omitted, not discounted.
    expect(networksAt('2000')).toEqual([
      'eip155:999',
      'eip155:8453',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    ]);
    expect(networksAt('4000')).toEqual([
      'eip155:999',
      'eip155:8453',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    ]);
    // C3/C4 and the 24h products ($0.50 / $0.55 = 500000 / 550000 atomic)
    // clear the floor and quote BNB as well.
    for (const amountAtomic of ['20000', '40000', '500000', '550000']) {
      expect(networksAt(amountAtomic)).toContain('eip155:56');
      expect(networksAt(amountAtomic)).toContain('eip155:8453');
    }
  });

  it('derives dynamic multichain lending scopes from the declared chain only', () => {
    expect(x402PaymentScopeForEvmChainId(8453)).toEqual(X402_PAYMENT_SCOPE.base);
    expect(x402PaymentScopeForEvmChainId(42161)).toEqual(X402_PAYMENT_SCOPE.arbitrum);
    expect(x402PaymentScopeForEvmChainId(999)).toEqual(X402_PAYMENT_SCOPE.hyperevm);
    expect(x402PaymentScopeForEvmChainId(999_999)).toBeNull();
    expect(x402PaymentScopeForMcpTool('multichain_evm_lending_guard', { chainId: 137 })).toEqual(
      X402_PAYMENT_SCOPE.polygon
    );
    expect(
      x402PaymentScopeForMcpTool('multichain_evm_lending_guard_exact_call', {
        guard: { chainId: 56 },
      })
    ).toEqual(X402_PAYMENT_SCOPE.bnb);
    expect(x402PaymentScopeForMcpTool('multichain_evm_lending_guard', {})).toBeNull();
    expect(x402PaymentScopeForMcpTool('check_trade_safety', { chain_id: 999 })).toEqual(
      X402_PAYMENT_SCOPE.hyperevm
    );
  });

  it('settles BNB quote and BNB perp guard capabilities in the BNB realm', () => {
    expect(x402PaymentScopeForMcpTool('get_market_quote', { venue: 'bnb_pancakeswap_v3' })).toEqual(
      X402_PAYMENT_SCOPE.bnb
    );
    expect(x402PaymentScopeForMcpTool('prepare_swap', { venue: 'bnb_pancakeswap_v3' })).toEqual(
      X402_PAYMENT_SCOPE.bnb
    );
    expect(
      x402PaymentScopeForMcpTool('get_market_quote', {
        venue: 'bnb_pancakeswap_v3',
        profile_id: 'bnb-pancakeswap-v3-usdt-wbnb-100',
      })
    ).toEqual(X402_PAYMENT_SCOPE.bnb);
    expect(
      x402PaymentScopeForMcpTool('get_market_quote', {
        venue: 'bnb_pancakeswap_v3',
        profile_id: 'unknown-pool',
      })
    ).toBeNull();
    expect(x402PaymentScopeForMcpTool('bnb_perp_guard', {})).toEqual(X402_PAYMENT_SCOPE.bnb);
  });

  it('resolves prepare_perp_order settlement from the venue chain, never below the BNB floor', () => {
    expect(
      x402PaymentScopeForMcpTool('prepare_perp_order', { venue: 'synthetix-perps-v3-base' })
    ).toEqual(X402_PAYMENT_SCOPE.base);
    expect(
      x402PaymentScopeForMcpTool('prepare_perp_order', { venue: 'aster-perps-bnb-mainnet' })
    ).toEqual(X402_PAYMENT_SCOPE.bnb);
    expect(x402PaymentScopeForMcpTool('prepare_perp_order', { venue: 'solana_drift' })).toEqual(
      X402_PAYMENT_SCOPE.solana
    );
    expect(x402PaymentScopeForMcpTool('prepare_perp_order', { venue: 'hyperliquid' })).toEqual(
      X402_PAYMENT_SCOPE.hypercore
    );
    // Unknown or missing venues must not inherit the HyperCore default.
    expect(x402PaymentScopeForMcpTool('prepare_perp_order', { venue: 'unknown' })).toBeNull();
    expect(x402PaymentScopeForMcpTool('prepare_perp_order', {})).toBeNull();

    // $0.02 (20,000 atomic) is above the 4,861 BNB micro floor and must quote;
    // a sub-floor amount is still dropped rather than discounted.
    const bnbCfg = parseX402Config({ ...EVM_ENV, X402_EVM_NETWORKS: 'eip155:56' });
    const scoped = x402ConfigForPaymentScope(bnbCfg, X402_PAYMENT_SCOPE.bnb);
    expect(scoped).not.toBeNull();
    expect(getX402PaymentOptions(scoped!, '20000').map((option) => option.network)).toEqual([
      'eip155:56',
    ]);
    expect(getX402PaymentOptions(scoped!, '4000')).toEqual([]);
  });

  it('binds the Solana swap guard lifecycle to the native Solana rail', () => {
    expect(X402_REST_PAYMENT_SCOPE_BY_PATH['/api/v1/safety/solana-swap-guard']).toEqual(
      X402_PAYMENT_SCOPE.solana
    );
    for (const tool of [
      'solana_swap_guard',
      'settle_solana_swap_guard',
      'verify_solana_swap_guard_settlement',
    ]) {
      expect(x402PaymentScopeForMcpTool(tool, {})).toEqual(X402_PAYMENT_SCOPE.solana);
    }
  });

  it('requires every paid MCP capability to declare its payment semantics', () => {
    const dynamicTools = new Set([
      'multichain_evm_lending_guard',
      'multichain_evm_lending_guard_exact_call',
      'prepare_base_agent_swap_guard',
      'settle_base_agent_swap_guard',
      'verify_base_agent_swap_guard_settlement',
      'get_pancakeswap_v3_market',
      'prepare_pancakeswap_v3_swap',
      'prepare_perp_order',
      'trade_guard',
      'trade_proof',
      'check_trade_safety',
      'prepare_swap',
      'get_market_quote',
      'issue_execution_receipt',
      'verify_evidence',
    ]);
    // In-window product tools are covered by the purchase that returned their
    // one-time token — they are deliberately absent from every payment-scope
    // registry (no per-call payment realm applies to them).
    const entitlementCoveredTools = CATALOG_ALL_TOOL_NAMES.filter((name) =>
      isEntitlementCoveredMcpTool(name)
    );
    const catalogNames = catalog
      .map((tool) => tool.name)
      .filter((name) => !entitlementCoveredTools.includes(name))
      .sort();
    // Only the exposed catalog needs a per-call realm. Legacy names remain
    // callable for 60 days and already carry their original declarations.
    const boundNames = [...Object.keys(X402_MCP_PAYMENT_SCOPE_BY_TOOL), ...dynamicTools]
      .filter((name) => catalogNames.includes(name))
      .sort();

    expect(boundNames).toEqual(catalogNames);
    expect(entitlementCoveredTools).toEqual([
      'oracle_watch_window_control',
      'position_lifecycle_step',
    ]);
  });

  it('derives guard prepare scopes from the profileId prefix and fails closed on unknown ones', () => {
    // Missing profileId defaults to the reviewed Base lane.
    expect(x402PaymentScopeForMcpTool('prepare_base_agent_swap_guard', {})).toEqual(
      X402_PAYMENT_SCOPE.base
    );
    expect(x402PaymentScopeForMcpTool('prepare_base_agent_swap_guard', { profileId: 123 })).toEqual(
      X402_PAYMENT_SCOPE.base
    );
    expect(
      x402PaymentScopeForMcpTool('prepare_base_agent_swap_guard', {
        profileId: 'bnb-pancakeswap-v3-usdt-usdc-100',
      })
    ).toEqual(X402_PAYMENT_SCOPE.bnb);
    expect(
      x402PaymentScopeForMcpTool('prepare_base_agent_swap_guard', {
        profileId: 'base-pancakeswap-v3-usdc-usdt-100',
      })
    ).toEqual(X402_PAYMENT_SCOPE.base);
    // An unrecognized prefix must not silently authorize a Base payment.
    expect(
      x402PaymentScopeForMcpTool('prepare_base_agent_swap_guard', {
        profileId: 'not-a-reviewed-profile',
      })
    ).toBeNull();
  });

  it('leaves genuinely chain-neutral tools on the merchant-configured rail', () => {
    expect(x402PaymentScopeForMcpTool('pre_trade_safety_check', { chainId: 143 })).toEqual(
      X402_PAYMENT_SCOPE.configured
    );
  });
});
