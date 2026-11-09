/**
 * @jest-environment node
 */

import { handleMcpHttpRequest } from '@/mcp/transports/http';

import { HEAD, POST } from '../route';

jest.mock('@/lib/api/handler', () => ({
  createOptionsHandler: () => () => new Response(null, { status: 204 }),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ error: jest.fn() }),
}));

jest.mock('@/mcp/transports/http', () => ({ handleMcpHttpRequest: jest.fn() }));

const mockedTransport = handleMcpHttpRequest as jest.MockedFunction<typeof handleMcpHttpRequest>;

describe('MCP route HEAD ingress', () => {
  const originalMaxRequestSize = process.env.MAX_REQUEST_SIZE;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalMaxRequestSize === undefined) delete process.env.MAX_REQUEST_SIZE;
    else process.env.MAX_REQUEST_SIZE = originalMaxRequestSize;
  });

  it('rejects HEAD without dispatching it through the MCP transport', () => {
    const response = HEAD();

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, POST, DELETE');
  });

  it('rejects an oversized streamed POST before loading the MCP transport', async () => {
    process.env.MAX_REQUEST_SIZE = '10';
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('12345678901'));
        controller.close();
      },
    });
    const request = new Request('https://example.test/api/mcp', {
      method: 'POST',
      body,
      // Node's Request requires duplex when the body is a ReadableStream.
      duplex: 'half',
    } as RequestInit);

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(mockedTransport).not.toHaveBeenCalled();
  });
});
