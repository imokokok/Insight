/**
 * @jest-environment node
 */

import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const UNIFIED_TOOL_NAMES = [
  'get_oracle_price',
  'get_price_analytics',
  'get_oracle_health',
  'search_oracle_registry',
  'get_market_quote',
  'check_trade_safety',
  'begin_trade_evidence',
  'prepare_swap',
  'prepare_perp_order',
  'issue_execution_receipt',
  'verify_evidence',
  'oracle_watch',
  'oracle_watch_window_begin',
  'oracle_watch_window_control',
  'position_lifecycle_begin',
  'position_lifecycle_step',
];

describe('MCP Server end-to-end', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', path.resolve(process.cwd(), 'src/mcp/index.ts')],
      env: { ...process.env, NODE_ENV: 'test' } as Record<string, string>,
    });

    client = new Client({ name: 'e2e-test-client', version: '1.0.0' }, { capabilities: {} });

    await client.connect(transport);
  }, 30000);

  afterAll(async () => {
    await client.close();
  });

  it('lists exactly the 20 consolidated tools', async () => {
    const tools = await client.listTools();
    expect(tools.tools.length).toBe(20);

    const names = tools.tools.map((t) => t.name);
    expect(names).toEqual(UNIFIED_TOOL_NAMES);

    // Legacy names stay callable for 60 days but must not be advertised.
    expect(names).not.toContain('get_symbols');
    expect(names).not.toContain('pre_trade_safety_check');
    expect(names).not.toContain('assess_rwa_evidence');

    for (const tool of tools.tools) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('describes when to use, when not to use, and what each tool returns', async () => {
    const tools = await client.listTools();
    for (const tool of tools.tools) {
      expect(tool.description).toContain('Use ');
      expect(tool.description).toContain('Do not use');
      expect(tool.description).toContain('Returns');
    }
  });

  it('calls get_oracle_price for BTC/chainlink', async () => {
    const result = await client.callTool({
      name: 'get_oracle_price',
      arguments: { provider: 'chainlink', asset: 'BTC' },
    });
    const text = extractText(result.content);
    expect(text).toContain('CHAINLINK price for BTC');
    expect(text).toContain('Price:');
  });

  it('calls get_price_analytics consensus for BTC', async () => {
    const result = await client.callTool({
      name: 'get_price_analytics',
      arguments: { assets: ['BTC'], mode: 'consensus' },
    });
    const text = extractText(result.content);
    expect(text).toContain('Consensus price for BTC');
    expect(text).toContain('Method:');
  });

  it('calls get_price_analytics risk for BTC', async () => {
    const result = await client.callTool({
      name: 'get_price_analytics',
      arguments: {
        assets: ['BTC'],
        metric: 'risk',
        providers: ['chainlink', 'redstone', 'api3'],
        period_hours: 24,
      },
    });
    const text = extractText(result.content);
    expect(text).toContain('Risk summary for BTC');
    expect(text).toContain('Overall risk:');
  });

  it('calls get_oracle_health', async () => {
    const result = await client.callTool({ name: 'get_oracle_health', arguments: {} });
    const text = extractText(result.content);
    expect(text.length).toBeGreaterThan(0);
  });

  it('calls search_oracle_registry for symbols', async () => {
    const result = await client.callTool({
      name: 'search_oracle_registry',
      arguments: { kind: 'symbols' },
    });
    const text = extractText(result.content);
    expect(text).toContain('Supported symbols');
  });

  it('calls search_oracle_registry for stablecoins', async () => {
    const result = await client.callTool({
      name: 'search_oracle_registry',
      arguments: { kind: 'stablecoins' },
    });
    const text = extractText(result.content);
    expect(text).toContain('Tracked stablecoins');
    expect(text).toMatch(/USDC|USDT|DAI/);
  });

  it('calls get_oracle_health for the USDC peg', async () => {
    const result = await client.callTool({
      name: 'get_oracle_health',
      arguments: { scope: 'asset', metric: 'peg', subject: 'USDC' },
    });
    const text = extractText(result.content);
    expect(text).toContain('Stablecoin peg: USDC');
    expect(text).toContain('Target peg:');
  });

  it('calls oracle_watch snapshot', async () => {
    const result = await client.callTool({
      name: 'oracle_watch',
      arguments: { symbol: 'BTC' },
    });
    const text = extractText(result.content);
    expect(text.length).toBeGreaterThan(0);
  });
});

function extractText(content: unknown[]): string {
  return content
    .filter(
      (c): c is { type: 'text'; text: string } =>
        typeof c === 'object' && c !== null && (c as { type?: string }).type === 'text'
    )
    .map((c) => c.text)
    .join('\n');
}
