/**
 * @jest-environment node
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const HTTP_URL = process.env.MCP_HTTP_TEST_URL ?? 'http://127.0.0.1:3001/mcp';

describe.skip('MCP HTTP transport end-to-end', () => {
  let client: Client;
  let transport: StreamableHTTPClientTransport;

  beforeAll(async () => {
    transport = new StreamableHTTPClientTransport(new URL(HTTP_URL));

    client = new Client({ name: 'http-e2e-test-client', version: '1.0.0' }, { capabilities: {} });

    await client.connect(transport);
  }, 30000);

  afterAll(async () => {
    await client.close();
  });

  it('lists tools over HTTP', async () => {
    const tools = await client.listTools();
    expect(tools.tools.length).toBeGreaterThanOrEqual(11);
    expect(tools.tools.map((t) => t.name)).toContain('get_oracle_price');
  });

  it('calls get_symbols over HTTP', async () => {
    const result = await client.callTool({ name: 'get_symbols', arguments: {} });
    const text = (result.content as Array<{ type: 'text'; text: string }>)
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');
    expect(text).toContain('Supported symbols');
  });
});
