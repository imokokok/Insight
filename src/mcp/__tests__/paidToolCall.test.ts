/**
 * @jest-environment node
 */

/**
 * Tests for the x402 pay-per-call bridge on the MCP HTTP transport:
 * an unauthenticated single `tools/call` gets a 402 quote priced by the
 * tool's metering class, and after payment verification the JSON-RPC call
 * dispatches with settlement only on a successful tool result.
 *
 * The x402 resource server, the MCP transport and the MCP server factory are
 * all mocked so the tests exercise the dispatch/quote/settle wiring in
 * isolation.
 */

import { priceAtomicForTool } from '@/lib/api/x402/mcpBridge';

import { handleMcpHttpRequest } from '../transports/http';

const authenticateMcpRequestMock = jest.fn();

jest.mock('../auth', () => ({
  authenticateMcpRequest: (...args: unknown[]) => authenticateMcpRequestMock(...(args as [])),
}));

const incrementMock = jest.fn();

jest.mock('@/lib/api/middleware/rateLimitStore', () => ({
  rateLimitStore: { increment: (...args: unknown[]) => incrementMock(...(args as [])) },
}));

const getX402ConfigMock = jest.fn();

// Keep the real module's constants (X402_CREDIT_USD drives the pricing
// bridge); only swap out the env-dependent resolver.
jest.mock('@/lib/api/x402/config', () => ({
  ...jest.requireActual('@/lib/api/x402/config'),
  getX402Config: (...args: unknown[]) => getX402ConfigMock(...(args as [])),
}));

const getMcpX402HttpServerMock = jest.fn();

jest.mock('@/lib/api/x402/resourceServer', () => ({
  getMcpX402HttpServer: (...args: unknown[]) => getMcpX402HttpServerMock(...(args as [])),
}));

const mockInsert = jest.fn(async () => ({ error: null }));
const createServiceRoleClientMock = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: (...args: unknown[]) => createServiceRoleClientMock(...(args as [])),
}));

// mcpBridge → guard imports next/server for `after()`; stub it like
// guard.test.ts so settlement audits run synchronously in tests.
jest.mock('next/server', () => ({
  after: (fn: () => unknown) => void Promise.resolve().then(fn),
}));

// The MCP server factory is mocked: real tool execution would hit Supabase.
const createMcpServerMock = jest.fn();

jest.mock('../server', () => ({
  createMcpServer: (...args: unknown[]) => createMcpServerMock(...(args as [])),
}));

function primeCreateMcpServer(): void {
  createMcpServerMock.mockImplementation(() => ({
    connect: async () => {},
    close: async () => {},
    onclose: null,
    onerror: null,
  }));
}

// The streamable transport is mocked with a canned JSON-RPC response so the
// paid dispatch path (transport.handleRequest inside runBusiness) is
// exercised without a live MCP server.
let cannedRpcResponse: Record<string, unknown>;
let cannedRpcStatus = 200;

const TransportCtor = jest.fn();

jest.mock('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js', () => ({
  // Regular function (not an arrow): the transport is constructed with
  // `new`, and `new arrowFn()` throws "not a constructor".
  WebStandardStreamableHTTPServerTransport: function (...args: unknown[]) {
    return TransportCtor(...(args as []));
  },
}));

function primeTransport(): void {
  TransportCtor.mockImplementation(() => ({
    handleRequest: async (): Promise<Response> =>
      new Response(JSON.stringify(cannedRpcResponse), {
        status: cannedRpcStatus,
        headers: { 'Content-Type': 'application/json' },
      }),
  }));
}

function mcpPost(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function toolsCallBody(name = 'get_symbols') {
  return {
    jsonrpc: '2.0',
    id: 9,
    method: 'tools/call',
    params: { name, arguments: {} },
  };
}

const CFG = {
  enabled: true,
  network: 'eip155:84532' as const,
  payTo: '0xAbC0000000000000000000000000000000000001',
  amountAtomic: '20000',
  priceUsd: 0.02,
  facilitatorUrl: 'https://x402.org/facilitator',
  facilitatorTimeoutMs: 15_000,
  maxTimeoutSeconds: 60,
  facilitatorCdpAuth: null,
};

const OK_RPC = { jsonrpc: '2.0', id: 9, result: { content: [{ type: 'text', text: 'ok' }] } };

const processHTTPRequest = jest.fn();
const processSettlement = jest.fn();

beforeEach(() => {
  // jest.config.js sets resetMocks: true, which wipes factory-set
  // implementations before every test — re-prime everything here.
  primeCreateMcpServer();
  primeTransport();
  authenticateMcpRequestMock.mockImplementation(async () => ({
    success: false,
    error: 'Authentication required. Provide X-API-Key or Authorization: Bearer <token>.',
    statusCode: 401,
  }));
  incrementMock.mockImplementation(async () => ({ count: 1, resetTime: Date.now() + 60_000 }));
  getX402ConfigMock.mockImplementation(() => ({ ...CFG }));
  processHTTPRequest.mockReset();
  processSettlement.mockReset();
  getMcpX402HttpServerMock.mockImplementation(async () => ({
    processHTTPRequest,
    processSettlement,
  }));
  createServiceRoleClientMock.mockImplementation(() => ({
    from: () => ({ insert: mockInsert }),
  }));
  mockInsert.mockImplementation(async () => ({ error: null }));
  cannedRpcResponse = OK_RPC;
  cannedRpcStatus = 200;
});

describe('x402 paid MCP tools/call', () => {
  it('returns a 402 quote priced by the tool metering class without dispatching', async () => {
    processHTTPRequest.mockResolvedValue({
      type: 'payment-error',
      response: {
        status: 402,
        headers: { 'PAYMENT-REQUIRED': 'base64quote' },
        body: { accepts: [{ scheme: 'exact', amount: '2000' }] },
      },
    });

    const { response, cleanup } = await handleMcpHttpRequest(mcpPost(toolsCallBody()));
    await cleanup();

    expect(response.status).toBe(402);
    expect(response.headers.get('PAYMENT-REQUIRED')).toBe('base64quote');
    // C1 tool (get_symbols): 0.5cr × $0.004 = $0.002 = 2000 atomic.
    expect(processHTTPRequest).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/mcp', method: 'POST' })
    );
  });

  it('settles after a successful tool result and attaches the receipt header', async () => {
    processHTTPRequest.mockResolvedValue({
      type: 'payment-verified',
      cancellationDispatcher: {},
      paymentPayload: { x402Version: 2 },
      paymentRequirements: { scheme: 'exact', amount: '2000' },
    });
    processSettlement.mockResolvedValue({
      success: true,
      transaction: `0x${'a'.repeat(64)}`,
      payer: `0x${'b'.repeat(40)}`,
      amount: undefined, // CDP v2 settle omits amount; bridge falls back to the quote.
      network: 'eip155:84532',
      headers: { 'PAYMENT-RESPONSE': 'receipt' },
      requirements: {},
    });
    mockInsert.mockClear();

    const { response, cleanup } = await handleMcpHttpRequest(
      mcpPost(toolsCallBody(), { 'payment-signature': 'b64payload' })
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    await cleanup();

    expect(response.status).toBe(200);
    expect(response.headers.get('PAYMENT-RESPONSE')).toBe('receipt');
    expect(processSettlement).toHaveBeenCalledTimes(1);
    const body = await response.json();
    expect((body as { result?: unknown }).result).toBeDefined();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'settled',
        tx_hash: `0x${'a'.repeat(64)}`,
        payer: `0x${'b'.repeat(40)}`,
        amount_usdc: '0.002',
        verdict: 'mcp:get_symbols',
      })
    );
  });

  it('skips settlement when the tool result is a JSON-RPC error result', async () => {
    processHTTPRequest.mockResolvedValue({
      type: 'payment-verified',
      cancellationDispatcher: {},
      paymentPayload: { x402Version: 2 },
      paymentRequirements: { scheme: 'exact', amount: '2000' },
    });
    cannedRpcResponse = {
      jsonrpc: '2.0',
      id: 9,
      result: { content: [{ type: 'text', text: 'Insufficient credits' }], isError: true },
    };

    const { response, cleanup } = await handleMcpHttpRequest(
      mcpPost(toolsCallBody(), { 'payment-signature': 'b64payload' })
    );
    await cleanup();

    expect(response.status).toBe(200);
    expect(processSettlement).not.toHaveBeenCalled();
    expect(response.headers.get('PAYMENT-RESPONSE')).toBeNull();
  });

  it('skips settlement when the dispatch response is non-2xx', async () => {
    processHTTPRequest.mockResolvedValue({
      type: 'payment-verified',
      cancellationDispatcher: {},
      paymentPayload: { x402Version: 2 },
      paymentRequirements: { scheme: 'exact', amount: '2000' },
    });
    cannedRpcStatus = 500;

    const { response, cleanup } = await handleMcpHttpRequest(
      mcpPost(toolsCallBody(), { 'payment-signature': 'b64payload' })
    );
    await cleanup();

    expect(response.status).toBe(500);
    expect(processSettlement).not.toHaveBeenCalled();
  });

  it('falls through to 401 when the x402 tier is disarmed', async () => {
    getX402ConfigMock.mockImplementation(() => ({ ...CFG, enabled: false }));

    const { response, cleanup } = await handleMcpHttpRequest(mcpPost(toolsCallBody()));
    await cleanup();

    expect(response.status).toBe(401);
    expect(processHTTPRequest).not.toHaveBeenCalled();
  });

  it('falls through to 401 for a batch containing tools/call', async () => {
    const { response, cleanup } = await handleMcpHttpRequest(
      mcpPost([{ jsonrpc: '2.0', id: 10, method: 'tools/list' }, toolsCallBody()])
    );
    await cleanup();

    expect(response.status).toBe(401);
    expect(processHTTPRequest).not.toHaveBeenCalled();
  });

  it('rate limits the paid tier per IP after the configured burst', async () => {
    incrementMock.mockImplementation(async () => ({
      count: 61,
      resetTime: Date.now() + 60_000,
    }));

    const { response, cleanup } = await handleMcpHttpRequest(mcpPost(toolsCallBody()));
    await cleanup();

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBeDefined();
  });

  it('prices C1, C3 and C4 tools at the credit-class bridge rate', () => {
    // C3 (5cr) → $0.02 = 20000; C4 (10cr) → $0.04 = 40000; C1 (0.5cr) → 2000.
    expect(priceAtomicForTool('pre_trade_safety_check')).toBe('20000');
    expect(priceAtomicForTool('get_symbols')).toBe('2000');
    expect(priceAtomicForTool('verify_execution_pair')).toBe('40000');
  });
});
