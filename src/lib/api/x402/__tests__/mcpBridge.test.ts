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

const cfg = { network: 'eip155:84532' } as unknown as X402Config;

function jsonRpcResult(result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function input(runBusiness: () => Promise<Response>): McpPaidCallInput {
  return { request: new Request('http://x/api/mcp'), cfg, toolName: 'get_symbols', runBusiness };
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
      input(async () => jsonRpcResult({ content: [{ type: 'text', text: 'ok' }] }))
    );

    expect(res.status).toBe(200);
    expect(fakeServer.processSettlement).toHaveBeenCalledTimes(1);
    expect(mockedRecord).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'settled', verdict: 'mcp:get_symbols' })
    );
    expect(res.headers.get('PAYMENT-RESPONSE')).toBe('c2V0dGxlZA==');
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
