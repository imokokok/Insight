/**
 * @jest-environment node
 */

import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('MCP Client integration', () => {
  it('should connect and list tools', async () => {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', path.resolve(process.cwd(), 'src/mcp/index.ts')],
      env: { ...process.env, NODE_ENV: 'test' } as Record<string, string>,
    });

    const client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);

    const tools = await client.listTools();

    expect(tools.tools.length).toBeGreaterThan(0);
    expect(tools.tools.some((t) => t.name === 'get_oracle_price')).toBe(true);
    expect(tools.tools.some((t) => t.name === 'get_consensus_price')).toBe(true);

    await client.close();
  }, 30000);
});
