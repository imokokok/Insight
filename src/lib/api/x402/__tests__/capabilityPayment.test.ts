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
      if (scope.kind === 'configured') continue;
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

  it('derives dynamic multichain lending scopes from the declared chain only', () => {
    expect(x402PaymentScopeForEvmChainId(8453)).toEqual(X402_PAYMENT_SCOPE.base);
    expect(x402PaymentScopeForEvmChainId(42161)).toEqual(X402_PAYMENT_SCOPE.arbitrum);
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
  });

  it('requires every paid MCP capability to declare its payment semantics', () => {
    const dynamicTools = new Set([
      'multichain_evm_lending_guard',
      'multichain_evm_lending_guard_exact_call',
    ]);
    const catalogNames = catalog.map((tool) => tool.name).sort();
    const boundNames = Object.keys(X402_MCP_PAYMENT_SCOPE_BY_TOOL)
      .concat([...dynamicTools])
      .sort();

    expect(boundNames).toEqual(catalogNames);
  });

  it('leaves genuinely chain-neutral tools on the merchant-configured rail', () => {
    expect(x402PaymentScopeForMcpTool('pre_trade_safety_check', { chainId: 143 })).toEqual(
      X402_PAYMENT_SCOPE.configured
    );
  });
});
