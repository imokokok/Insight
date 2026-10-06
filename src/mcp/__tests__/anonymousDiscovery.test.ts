/**
 * @jest-environment node
 */

/**
 * Tests for anonymous MCP discovery (unauthenticated initialize/tools/list)
 * in the streamable HTTP transport.
 *
 * The auth and middleware layers are mocked so the tests exercise the
 * transport-layer allowlist in isolation: an unauthenticated request is
 * served only when EVERY JSON-RPC method in the body is a read-only
 * discovery method; anything else (notably tools/call, including mixed
 * batches) must still be rejected with 401.
 */

import { handleMcpHttpRequest } from '../transports/http';

const authenticateMcpRequestMock = jest.fn();

jest.mock('../auth', () => ({
  authenticateMcpRequest: (...args: unknown[]) => authenticateMcpRequestMock(...(args as [])),
}));

const incrementMock = jest.fn();

jest.mock('@/lib/api/middleware/rateLimitStore', () => ({
  rateLimitStore: { increment: (...args: unknown[]) => incrementMock(...(args as [])) },
}));

const PROTOCOL_VERSION = '2025-06-18';

function mcpPost(body: unknown): Request {
  return new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    // The streamable HTTP transport 406s without an Accept header naming a
    // supported response type; real MCP clients always send this.
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

beforeEach(() => {
  // jest.config.js sets resetMocks: true, which wipes factory-set
  // implementations before every test. Re-prime both mocks here.
  authenticateMcpRequestMock.mockImplementation(async () => ({
    success: false,
    error: 'Authentication required. Provide X-API-Key or Authorization: Bearer <token>.',
    statusCode: 401,
  }));
  incrementMock.mockImplementation(async () => ({ count: 1, resetTime: Date.now() + 60_000 }));
});

describe('anonymous MCP discovery', () => {
  it('serves initialize without credentials', async () => {
    const { response, cleanup } = await handleMcpHttpRequest(
      mcpPost({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: 'anon-probe', version: '0.0.0' },
        },
      })
    );

    expect(response.status).toBe(200);
    const body = await readJson(response);
    const result = body.result as { serverInfo?: { name?: string }; protocolVersion?: string };
    expect(result.serverInfo?.name).toBe('insight-oracle-mcp-server');
    expect(response.headers.get('x-ratelimit-limit')).toBe('20');
    await cleanup();
  });

  it('serves tools/list without credentials and exposes the catalog', async () => {
    const { response, cleanup } = await handleMcpHttpRequest(
      mcpPost({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
    );

    expect(response.status).toBe(200);
    const body = await readJson(response);
    const tools = (body.result as { tools?: Array<{ name: string }> }).tools ?? [];
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.map((t) => t.name)).toContain('get_symbols');
    await cleanup();
  });

  it('accepts notifications/initialized without credentials', async () => {
    const { response, cleanup } = await handleMcpHttpRequest(
      mcpPost({ jsonrpc: '2.0', method: 'notifications/initialized' })
    );

    expect(response.status).toBe(202);
    await cleanup();
  });

  it('rejects anonymous tools/call with 401', async () => {
    const { response, cleanup } = await handleMcpHttpRequest(
      mcpPost({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'get_symbols', arguments: {} },
      })
    );

    expect(response.status).toBe(401);
    const body = await readJson(response);
    expect(body.error).toBeDefined();
    expect(incrementMock).not.toHaveBeenCalled();
    await cleanup();
  });

  it('rejects a mixed batch containing tools/call with 401', async () => {
    const { response, cleanup } = await handleMcpHttpRequest(
      mcpPost([
        { jsonrpc: '2.0', id: 4, method: 'tools/list' },
        {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: { name: 'get_symbols', arguments: {} },
        },
      ])
    );

    expect(response.status).toBe(401);
    expect(incrementMock).not.toHaveBeenCalled();
    await cleanup();
  });

  it('rejects anonymous GET (SSE) with 401', async () => {
    const { response, cleanup } = await handleMcpHttpRequest(
      new Request('http://localhost:3000/api/mcp', { method: 'GET' })
    );

    expect(response.status).toBe(401);
    await cleanup();
  });

  it('rate limits anonymous discovery after the configured burst', async () => {
    incrementMock.mockImplementation(async () => ({
      count: 21,
      resetTime: Date.now() + 60_000,
    }));

    const { response, cleanup } = await handleMcpHttpRequest(
      mcpPost({ jsonrpc: '2.0', id: 6, method: 'tools/list' })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBeDefined();
    await cleanup();
  });
});
