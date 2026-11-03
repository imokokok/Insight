import { type X402Config } from '../config';
import { recordX402Settlement } from '../guard';
import { handleMcpPaidToolCall, toResponse, type McpPaidCallInput } from '../mcpBridge';
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
      undefined
    );
  });

  it('fails closed when a chain-native MCP rail is not configured', async () => {
    const response = await handleMcpPaidToolCall(
      input(
        async () => jsonRpcResult({ content: [{ type: 'text', text: 'must not execute' }] }),
        undefined,
        'solana_lending_guard'
      )
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: 'X402_PAYMENT_RAIL_UNAVAILABLE',
    });
    expect(mockedServerFactory).not.toHaveBeenCalled();
    expect(fakeServer.processSettlement).not.toHaveBeenCalled();
  });

  it('returns an explicit unavailable response when the matching facilitator cannot initialize', async () => {
    mockedServerFactory.mockRejectedValueOnce(new Error('facilitator unavailable'));

    const response = await handleMcpPaidToolCall(
      input(
        async () => jsonRpcResult({ content: [{ type: 'text', text: 'must not execute' }] }),
        undefined,
        'prepare_base_agent_swap_guard'
      )
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
