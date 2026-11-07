import { enqueueReputationAnchor } from '@/lib/erc8004/reputationAnchor';

import { type X402Config } from '../config';
import { recordX402Settlement } from '../guard';
import {
  handleMcpIndexerQuote,
  handleMcpPaidToolCall,
  toResponse,
  type McpPaidCallInput,
} from '../mcpBridge';
import { getMcpX402HttpServer } from '../resourceServer';

// Jest's Response polyfill lacks clone() (real Node/undici has it). The bridge
// relies on clone() to inspect the JSON-RPC body without consuming the body.
if (typeof Response.prototype.clone !== 'function') {
  (Response.prototype as unknown as { clone: () => Response }).clone = function (
    this: Response
  ): Response {
    return new Response(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
    });
  };
}

jest.mock('../resourceServer', () => ({
  BASE_AGENT_SWAP_GUARD_MCP_TOOL_NAME: 'prepare_base_agent_swap_guard',
  MCP_INDEXER_QUOTE_TOOL: 'check_trade_safety',
  getMcpX402HttpServer: jest.fn(),
}));

jest.mock('../guard', () => ({
  ...jest.requireActual('../guard'),
  recordX402Settlement: jest.fn(),
  logBazaarExtensionStatus: jest.fn(),
  paymentAuditFields: (requirement: { network: string; asset: string; amount: string }) => ({
    network: requirement.network,
    asset: requirement.asset,
    amountUsdc: String(Number(requirement.amount) / 1_000_000),
  }),
  quoteAuditFields: () => ({ network: null }),
  atomicUnitsToUsdc: (atomic: string) => {
    const units = BigInt(atomic);
    const whole = units / 1_000_000n;
    const fraction = String(units % 1_000_000n)
      .padStart(6, '0')
      .replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : String(whole);
  },
}));

// The anchor persists to Supabase; the bridge only has to enqueue it.
jest.mock('@/lib/erc8004/reputationAnchor', () => ({
  enqueueReputationAnchor: jest.fn(),
}));

// mcpBridge → guard imports next/server for `after()`; run the deferred
// callback immediately so settlement side effects are observable.
jest.mock('next/server', () => ({
  after: (callback: () => unknown) => void callback(),
}));

const fakeServer = {
  processHTTPRequest: jest.fn(),
  processSettlement: jest.fn(),
};

const mockedServerFactory = getMcpX402HttpServer as jest.MockedFunction<
  typeof getMcpX402HttpServer
>;
const mockedRecord = recordX402Settlement as jest.MockedFunction<typeof recordX402Settlement>;

const cfg = {
  enabled: true,
  network: 'eip155:84532',
  payTo: '0xAbC0000000000000000000000000000000000001',
} as unknown as X402Config;

function jsonRpcResult(result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function input(
  runBusiness: () => Promise<Response>,
  headers: HeadersInit | undefined = undefined,
  toolName = 'get_symbols'
): McpPaidCallInput {
  return {
    request: new Request('http://x/api/mcp', { headers }),
    cfg,
    toolName,
    runBusiness,
  };
}

describe('handleMcpPaidToolCall settlement gating', () => {
  beforeEach(() => {
    mockedServerFactory
      .mockReset()
      .mockResolvedValue(fakeServer as unknown as Awaited<ReturnType<typeof getMcpX402HttpServer>>);
    mockedRecord.mockReset();
    fakeServer.processHTTPRequest.mockReset().mockResolvedValue({
      type: 'payment-verified',
      paymentPayload: { x402Version: 2 },
      paymentRequirements: {
        network: 'eip155:84532',
        asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        amount: '2000',
      },
    });
    fakeServer.processSettlement.mockReset().mockResolvedValue({
      success: true,
      transaction: `0x${'a'.repeat(64)}`,
      payer: `0x${'b'.repeat(40)}`,
      amount: '2000',
      headers: { 'PAYMENT-RESPONSE': 'c2V0dGxlZA==' },
    });
  });

  it('settles and audits a successful tool result', async () => {
    const res = await handleMcpPaidToolCall(
      input(async () => jsonRpcResult({ content: [{ type: 'text', text: 'ok' }] }), {
        'x-insight-entry-source': 'mcp',
      })
    );

    expect(res.status).toBe(200);
    expect(fakeServer.processSettlement).toHaveBeenCalledTimes(1);
    expect(mockedRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'settled',
        verdict: 'mcp:get_symbols',
        acquisitionSource: 'mcp',
      })
    );
    expect(res.headers.get('PAYMENT-RESPONSE')).toBe('c2V0dGxlZA==');
  });

  it('answers 402 no_eligible_chain without building a server when the floor excludes every rail', async () => {
    const flooredCfg = {
      ...cfg,
      enabled: true,
      evmEnabled: true,
      network: 'eip155:8453',
      evmNetworks: ['eip155:8453'],
      amountAtomic: '2000',
      payTo: '0xAbC0000000000000000000000000000000000001',
      facilitatorUrl: 'https://base.example',
      networkMinAmountAtomic: { 'eip155:8453': '20000' },
    } as X402Config;

    const res = await handleMcpPaidToolCall({
      request: new Request('http://x/api/mcp', { method: 'POST' }),
      cfg: flooredCfg,
      toolName: 'get_symbols',
      runBusiness: async () => jsonRpcResult({ content: [{ type: 'text', text: 'ok' }] }),
    });

    expect(res.status).toBe(402);
    expect(mockedServerFactory).not.toHaveBeenCalled();
    const body = (await res.json()) as {
      error: string;
      accepts: unknown[];
      extensions: Record<
        string,
        {
          retryable: boolean;
          excluded: Array<Record<string, unknown>>;
        }
      >;
    };
    expect(body.error).toBe('no_eligible_chain');
    expect(body.accepts).toEqual([]);
    expect(body.extensions['insight.chain-policy'].retryable).toBe(false);
    expect(body.extensions['insight.chain-policy'].excluded).toEqual([
      {
        scope: 'the merchant-configured x402 payment rail',
        reason: 'floor_excluded',
        floorAtomic: '20000',
        priceAtomic: '2000',
      },
    ]);
    expect(res.headers.get('PAYMENT-REQUIRED')).toBeTruthy();
  });

  it('reports floor_excluded for a HyperEVM call below the network floor', async () => {
    const flooredCfg = {
      ...cfg,
      enabled: true,
      evmEnabled: true,
      network: 'eip155:999',
      evmNetworks: ['eip155:999'],
      amountAtomic: '2000',
      payTo: '0xAbC0000000000000000000000000000000000001',
      facilitatorUrl: 'https://hyperevm.example',
      networkMinAmountAtomic: { 'eip155:999': '30000' },
    } as X402Config;

    const res = await handleMcpPaidToolCall({
      request: new Request('http://x/api/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'check_trade_safety',
            arguments: { chain_id: 999, action: 'swap', asset: 'USDC' },
          },
        }),
      }),
      cfg: flooredCfg,
      toolName: 'check_trade_safety',
      runBusiness: async () =>
        jsonRpcResult({ content: [{ type: 'text', text: 'must not execute' }] }),
    });

    expect(res.status).toBe(402);
    const body = (await res.json()) as {
      error: string;
      accepts: unknown[];
      extensions: Record<string, { excluded: Array<Record<string, unknown>> }>;
    };
    expect(body.error).toBe('no_eligible_chain');
    expect(body.accepts).toEqual([]);
    expect(body.extensions['insight.chain-policy'].excluded).toEqual([
      {
        scope: 'HyperEVM',
        reason: 'floor_excluded',
        floorAtomic: '30000',
        priceAtomic: '20000',
      },
    ]);
  });

  it('reports floor_excluded for a Solana call below the Solana floor', async () => {
    const solanaNetwork = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    const flooredCfg = {
      ...cfg,
      enabled: true,
      evmEnabled: true,
      network: 'eip155:8453',
      evmNetworks: ['eip155:8453'],
      amountAtomic: '2000',
      payTo: '0xAbC0000000000000000000000000000000000001',
      facilitatorUrl: 'https://base.example',
      solana: {
        network: solanaNetwork,
        payTo: 'So11111111111111111111111111111111111111112',
        usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amountAtomic: '2000',
        priceUsd: 0.002,
        rpcUrl: null,
      },
      networkMinAmountAtomic: { [solanaNetwork]: '30000' },
    } as X402Config;

    const res = await handleMcpPaidToolCall({
      request: new Request('http://x/api/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'check_trade_safety',
            arguments: { chain_id: 'solana', action: 'swap', asset: 'USDC' },
          },
        }),
      }),
      cfg: flooredCfg,
      toolName: 'check_trade_safety',
      runBusiness: async () =>
        jsonRpcResult({ content: [{ type: 'text', text: 'must not execute' }] }),
    });

    expect(res.status).toBe(402);
    const body = (await res.json()) as {
      error: string;
      accepts: unknown[];
      extensions: Record<string, { excluded: Array<Record<string, unknown>> }>;
    };
    expect(body.error).toBe('no_eligible_chain');
    expect(body.accepts).toEqual([]);
    expect(body.extensions['insight.chain-policy'].excluded).toEqual([
      {
        scope: 'Solana',
        reason: 'floor_excluded',
        floorAtomic: '30000',
        priceAtomic: '20000',
      },
    ]);
  });

  function guardCallRequest(profileId: string): Request {
    return new Request('http://x/api/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'prepare_base_agent_swap_guard',
          arguments: { profileId },
        },
      }),
    });
  }

  it('binds the Base Swap Guard payment quote to Base mainnet only', async () => {
    const baseGuardCfg = {
      ...cfg,
      enabled: true,
      evmEnabled: true,
      evmNetworks: ['eip155:999'],
      payTo: '0xAbC0000000000000000000000000000000000001',
      facilitatorUrl: 'https://base.example',
      facilitatorUrls: { 'eip155:999': 'https://hyper.example' },
    } as X402Config;

    await handleMcpPaidToolCall({
      request: guardCallRequest('base-pancakeswap-v3-usdc-usdt-100'),
      cfg: baseGuardCfg,
      toolName: 'prepare_base_agent_swap_guard',
      runBusiness: async () => jsonRpcResult({ content: [{ type: 'text', text: 'ok' }] }),
    });

    expect(mockedServerFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        network: 'eip155:8453',
        evmNetworks: ['eip155:8453'],
        facilitatorUrl: 'https://base.example',
        solana: null,
      }),
      '20000',
      'prepare_base_agent_swap_guard'
    );
  });

  it('binds the BNB Swap Guard payment quote to BNB Smart Chain', async () => {
    const bnbGuardCfg = {
      ...cfg,
      enabled: true,
      evmEnabled: true,
      evmNetworks: ['eip155:56'],
      payTo: '0xAbC0000000000000000000000000000000000001',
      facilitatorUrl: 'https://bnb.example',
      facilitatorUrls: { 'eip155:56': 'https://bnb.example' },
    } as X402Config;

    await handleMcpPaidToolCall({
      request: guardCallRequest('bnb-pancakeswap-v3-usdt-usdc-100'),
      cfg: bnbGuardCfg,
      toolName: 'prepare_base_agent_swap_guard',
      runBusiness: async () => jsonRpcResult({ content: [{ type: 'text', text: 'ok' }] }),
    });

    expect(mockedServerFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        network: 'eip155:56',
        evmNetworks: ['eip155:56'],
        facilitatorUrl: 'https://bnb.example',
        solana: null,
      }),
      '20000',
      'prepare_base_agent_swap_guard'
    );
  });

  it('binds a multichain lending quote to the chain declared in its MCP arguments', async () => {
    const multichainCfg = {
      ...cfg,
      enabled: true,
      evmEnabled: true,
      evmNetworks: ['eip155:999'],
      payTo: '0xAbC0000000000000000000000000000000000001',
      facilitatorUrl: 'https://merchant.example',
      facilitatorUrls: { 'eip155:999': 'https://hyper.example' },
    } as X402Config;
    const request = new Request('http://x/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'multichain_evm_lending_guard',
          arguments: { chainId: 42161 },
        },
      }),
    });

    await handleMcpPaidToolCall({
      request,
      cfg: multichainCfg,
      toolName: 'multichain_evm_lending_guard',
      runBusiness: async () => jsonRpcResult({ content: [{ type: 'text', text: 'ok' }] }),
    });

    expect(mockedServerFactory).toHaveBeenCalledWith(
      expect.objectContaining({ network: 'eip155:42161', evmNetworks: ['eip155:42161'] }),
      '20000',
      'multichain_evm_lending_guard'
    );
  });

  it('returns 402 no_eligible_chain when a chain-native MCP rail is not configured', async () => {
    const response = await handleMcpPaidToolCall(
      input(
        async () => jsonRpcResult({ content: [{ type: 'text', text: 'must not execute' }] }),
        undefined,
        'solana_lending_guard'
      )
    );

    expect(response.status).toBe(402);
    const body = (await response.json()) as {
      error: string;
      accepts: unknown[];
      extensions: Record<string, { excluded: Array<Record<string, unknown>> }>;
    };
    expect(body.error).toBe('no_eligible_chain');
    expect(body.accepts).toEqual([]);
    expect(body.extensions['insight.chain-policy'].excluded).toEqual([
      { scope: 'Solana', reason: 'payment_scope_not_configured' },
    ]);
    expect(mockedServerFactory).not.toHaveBeenCalled();
    expect(fakeServer.processSettlement).not.toHaveBeenCalled();
  });

  it('reports a built-in BNB floor exclusion as floor_excluded', async () => {
    const bnbCfg = {
      ...cfg,
      enabled: true,
      evmEnabled: true,
      network: 'eip155:56',
      evmNetworks: ['eip155:56'],
      payTo: '0xAbC0000000000000000000000000000000000001',
      facilitatorUrl: 'https://bnb.example',
      facilitatorUrls: { 'eip155:56': 'https://bnb.example' },
    } as X402Config;
    const request = new Request('http://x/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'get_pancakeswap_v3_market',
          arguments: { profileId: 'bnb-reviewed' },
        },
      }),
    });

    const response = await handleMcpPaidToolCall({
      request,
      cfg: bnbCfg,
      toolName: 'get_pancakeswap_v3_market',
      runBusiness: async () =>
        jsonRpcResult({ content: [{ type: 'text', text: 'must not execute' }] }),
    });

    expect(response.status).toBe(402);
    const body = (await response.json()) as {
      error: string;
      accepts: unknown[];
      extensions: Record<string, { excluded: Array<Record<string, unknown>> }>;
    };
    expect(body.error).toBe('no_eligible_chain');
    expect(body.accepts).toEqual([]);
    expect(body.extensions['insight.chain-policy'].excluded).toEqual([
      {
        scope: 'BNB Smart Chain',
        reason: 'floor_excluded',
        floorAtomic: '4861',
        priceAtomic: '2000',
      },
    ]);
  });

  it('returns an explicit unavailable response when the matching facilitator cannot initialize', async () => {
    mockedServerFactory.mockRejectedValueOnce(new Error('facilitator unavailable'));

    const response = await handleMcpPaidToolCall(
      input(async () => jsonRpcResult({ content: [{ type: 'text', text: 'must not execute' }] }))
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: 'X402_PAYMENT_RAIL_UNAVAILABLE',
    });
    expect(fakeServer.processHTTPRequest).not.toHaveBeenCalled();
    expect(fakeServer.processSettlement).not.toHaveBeenCalled();
  });

  it('skips settlement when the tool result carries isError', async () => {
    const res = await handleMcpPaidToolCall(
      input(async () => jsonRpcResult({ isError: true, content: [{ type: 'text', text: 'boom' }] }))
    );

    expect(res.status).toBe(200);
    expect(fakeServer.processSettlement).not.toHaveBeenCalled();
    expect(mockedRecord).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'business_failed', errorReason: 'mcp_tool_error' })
    );
  });

  it('skips settlement on a JSON-RPC level error', async () => {
    const _res = await handleMcpPaidToolCall(
      input(
        async () =>
          new Response(
            JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'x' } }),
            {
              status: 200,
            }
          )
      )
    );

    expect(fakeServer.processSettlement).not.toHaveBeenCalled();
    expect(mockedRecord).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'business_failed', errorReason: 'mcp_tool_error' })
    );
  });

  it('skips settlement when the business response is not 2xx', async () => {
    await handleMcpPaidToolCall(input(async () => new Response('nope', { status: 503 })));

    expect(fakeServer.processSettlement).not.toHaveBeenCalled();
    expect(mockedRecord).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'business_failed', errorReason: 'handler_failed:503' })
    );
  });

  it('treats an unparseable business body as failure (never charge on ambiguity)', async () => {
    await handleMcpPaidToolCall(
      input(async () => new Response('not json at all', { status: 200 }))
    );

    expect(fakeServer.processSettlement).not.toHaveBeenCalled();
  });
});

describe('product-priced tools (monitored window / position lifecycle)', () => {
  beforeEach(() => {
    mockedServerFactory
      .mockReset()
      .mockResolvedValue(fakeServer as unknown as Awaited<ReturnType<typeof getMcpX402HttpServer>>);
    mockedRecord.mockReset();
    fakeServer.processHTTPRequest.mockReset().mockResolvedValue({
      type: 'payment-verified',
      paymentPayload: { x402Version: 2 },
      paymentRequirements: {
        network: 'eip155:8453',
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '500000',
      },
    });
    fakeServer.processSettlement.mockReset().mockResolvedValue({
      success: true,
      transaction: `0x${'a'.repeat(64)}`,
      payer: `0x${'b'.repeat(40)}`,
      amount: '500000',
      headers: {},
    });
  });

  it('quotes a begin tool at the plan list price, not a per-call class price', async () => {
    const { priceAtomicForTool } = await import('../mcpBridge');
    // $0.50 window / $0.55 lifecycle, in USDC atomic units.
    expect(priceAtomicForTool('oracle_watch_window_begin')).toBe('500000');
    expect(priceAtomicForTool('position_lifecycle_begin')).toBe('550000');
  });

  it('dispatches an in-window tool without any x402 lifecycle', async () => {
    const res = await handleMcpPaidToolCall(
      input(
        async () => jsonRpcResult({ content: [{ type: 'text', text: 'signal' }] }),
        undefined,
        'oracle_watch_window_poll'
      )
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      result: { content: [{ type: 'text', text: 'signal' }] },
    });
    // No quote, no verify, no settle: the window token is the entitlement.
    expect(mockedServerFactory).not.toHaveBeenCalled();
    expect(fakeServer.processHTTPRequest).not.toHaveBeenCalled();
    expect(fakeServer.processSettlement).not.toHaveBeenCalled();
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it('dispatches lifecycle bundled tools without payment as well', async () => {
    const res = await handleMcpPaidToolCall(
      input(
        async () => jsonRpcResult({ content: [{ type: 'text', text: 'guard' }] }),
        undefined,
        'position_lifecycle_guard'
      )
    );

    expect(res.status).toBe(200);
    expect(mockedServerFactory).not.toHaveBeenCalled();
    expect(fakeServer.processSettlement).not.toHaveBeenCalled();
  });
});

describe('toResponse 402 body compat', () => {
  it('mirrors a header-encoded challenge into the body while keeping the header', async () => {
    const challenge = {
      x402Version: 2,
      error: 'Payment required',
      accepts: [{ scheme: 'exact', network: 'eip155:8453', amount: '2000' }],
    };
    const res = toResponse({
      status: 402,
      headers: {
        'PAYMENT-REQUIRED': Buffer.from(JSON.stringify(challenge)).toString('base64'),
      },
      body: {},
    });
    expect(res.status).toBe(402);
    expect(res.headers.get('PAYMENT-REQUIRED')).toBeTruthy();
    await expect(res.json()).resolves.toEqual(challenge);
  });

  it('passes through non-402 instructions unchanged', async () => {
    const res = toResponse({ status: 200, headers: {}, body: { ok: true } });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});

describe('unsigned MCP 402 onboarding hints', () => {
  const INSTALL = 'npx -y --package=oracle-insight-mcp insight-mcp';

  beforeEach(() => {
    mockedServerFactory
      .mockReset()
      .mockResolvedValue(fakeServer as unknown as Awaited<ReturnType<typeof getMcpX402HttpServer>>);
    mockedRecord.mockReset();
    fakeServer.processHTTPRequest.mockReset().mockResolvedValue({
      type: 'payment-error',
      response: {
        status: 402,
        headers: { 'PAYMENT-REQUIRED': 'cXVvdGU=' },
        body: { x402Version: 2, error: 'Payment required' },
      },
    });
    fakeServer.processSettlement.mockReset();
  });

  it('advertises the launcher and the wallet-free path on a GET indexer quote', async () => {
    const res = await handleMcpIndexerQuote(new Request('http://x/api/mcp'), cfg);

    expect(res.status).toBe(402);
    expect(res.headers.get('PAYMENT-REQUIRED')).toBe('cXVvdGU=');
    expect(res.headers.get('x-insight-mcp-install')).toBe(INSTALL);
    expect(res.headers.get('x-insight-no-wallet')).toContain('X-API-Key');
    expect(res.headers.get('x-insight-quickstart')).toBe('https://www.oracleinsight.xyz/docs/x402');
    expect(res.headers.get('x-insight-entry-source-hint')).toContain('x-insight-entry-source');
    expect(res.headers.get('X-Request-Id')).toMatch(/^req_/);
  });

  it('advertises the launcher on an unsigned POST tools/call quote', async () => {
    const res = await handleMcpPaidToolCall(
      input(async () => jsonRpcResult({ content: [] }), { 'content-type': 'application/json' })
    );

    expect(res.status).toBe(402);
    expect(res.headers.get('x-insight-mcp-install')).toBe(INSTALL);
  });

  it('keeps a signed-but-rejected 402 free of onboarding hints', async () => {
    const res = await handleMcpPaidToolCall(
      input(async () => jsonRpcResult({ content: [] }), {
        'content-type': 'application/json',
        'payment-signature': 'signed',
      })
    );

    expect(res.status).toBe(402);
    expect(res.headers.has('x-insight-mcp-install')).toBe(false);
    expect(mockedRecord).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'payment_rejected' })
    );
  });
});

describe('ERC-8004 reputation opt-in extraction', () => {
  const anchored = enqueueReputationAnchor as jest.MockedFunction<typeof enqueueReputationAnchor>;
  const baseCfg = {
    ...cfg,
    enabled: true,
    evmEnabled: true,
    network: 'eip155:8453',
    evmNetworks: ['eip155:8453'],
    payTo: '0xAbC0000000000000000000000000000000000001',
    facilitatorUrl: 'https://base.example',
  } as unknown as X402Config;

  beforeEach(() => {
    mockedServerFactory
      .mockReset()
      .mockResolvedValue(fakeServer as unknown as Awaited<ReturnType<typeof getMcpX402HttpServer>>);
    fakeServer.processHTTPRequest.mockReset().mockResolvedValue({
      type: 'payment-verified',
      paymentPayload: { x402Version: 2 },
      paymentRequirements: {
        network: 'eip155:8453',
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '20000',
      },
    });
    fakeServer.processSettlement.mockReset().mockResolvedValue({
      success: true,
      transaction: `0x${'a'.repeat(64)}`,
      payer: `0x${'b'.repeat(40)}`,
      amount: '20000',
      headers: {},
    });
  });

  function toolCallRequest(toolName: string, args: Record<string, unknown>): Request {
    return new Request('http://x/api/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      }),
    });
  }

  async function run(toolName: string, args: Record<string, unknown>): Promise<Response> {
    return handleMcpPaidToolCall({
      request: toolCallRequest(toolName, args),
      cfg: baseCfg,
      toolName,
      runBusiness: async () => jsonRpcResult({ content: [{ type: 'text', text: 'ok' }] }),
    });
  }

  it('anchors when the unified tool sends snake_case arguments', async () => {
    await run('check_trade_safety', {
      chain_id: 8453,
      action: 'swap',
      asset: 'USDC',
      reputation_opt_in: true,
      reputation_agent_id: 7,
    });

    expect(anchored).toHaveBeenCalledWith(expect.objectContaining({ agentId: 7 }));
  });

  it('anchors when the legacy alias sends camelCase arguments', async () => {
    await run('pre_trade_safety_check', {
      chainId: 8453,
      action: 'swap',
      asset: 'USDC',
      tradeAmountUsd: 100,
      reputationOptIn: true,
      reputationAgentId: 9,
    });

    expect(anchored).toHaveBeenCalledWith(expect.objectContaining({ agentId: 9 }));
  });

  it('prefers the unified snake_case pair when both spellings are present', async () => {
    await run('check_trade_safety', {
      chain_id: 8453,
      action: 'swap',
      asset: 'USDC',
      reputation_opt_in: true,
      reputation_agent_id: 7,
      reputationOptIn: true,
      reputationAgentId: 99,
    });

    expect(anchored).toHaveBeenCalledTimes(1);
    expect(anchored).toHaveBeenCalledWith(expect.objectContaining({ agentId: 7 }));
  });

  it('does not anchor when the opt-in is absent, false, or the agentId is invalid', async () => {
    await run('check_trade_safety', { chain_id: 8453, action: 'swap', asset: 'USDC' });
    await run('check_trade_safety', {
      chain_id: 8453,
      action: 'swap',
      asset: 'USDC',
      reputation_opt_in: false,
      reputation_agent_id: 7,
    });
    await run('check_trade_safety', {
      chain_id: 8453,
      action: 'swap',
      asset: 'USDC',
      reputation_opt_in: true,
      reputation_agent_id: 0,
    });

    expect(anchored).not.toHaveBeenCalled();
  });
});
