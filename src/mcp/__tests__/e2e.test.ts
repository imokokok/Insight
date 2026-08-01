/**
 * @jest-environment node
 */

import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

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

  it('lists all tools', async () => {
    const tools = await client.listTools();
    expect(tools.tools.length).toBeGreaterThanOrEqual(30);

    const names = tools.tools.map((t) => t.name);
    expect(names).toContain('get_oracle_price');
    expect(names).toContain('get_consensus_price');
    expect(names).toContain('get_risk_summary');
    expect(names).toContain('get_oracle_health');
    expect(names).toContain('check_liquidation_risk');
    expect(names).toContain('compare_oracle_deviation');
    expect(names).toContain('get_stablecoin_peg');
    expect(names).toContain('get_protocol_risk_params');
    expect(names).toContain('get_symbols');
    expect(names).toContain('recommend_oracle_setup');
    expect(names).toContain('get_stablecoin_list');
    expect(names).toContain('get_oracle_prices_batch');
    expect(names).toContain('get_price_history');
    expect(names).toContain('get_cross_chain_spreads');
    expect(names).toContain('get_wrapped_asset_peg');
    expect(names).toContain('get_protocols');
    expect(names).toContain('get_protocol_oracle_exposure');
    expect(names).toContain('get_feed_freshness');
    expect(names).toContain('get_feeds');
    expect(names).toContain('get_feed_health');
    expect(names).toContain('get_feed_uptime');
    expect(names).toContain('get_reputation_rankings');
    expect(names).toContain('get_provider_reputation');
    expect(names).toContain('get_daily_report');
    expect(names).toContain('get_incidents');
    expect(names).toContain('get_latency');
    expect(names).toContain('get_anomalies');
    expect(names).toContain('get_correlation');
    expect(names).toContain('get_coverage');
    expect(names).toContain('get_metrics');
    expect(names).toContain('check_position_safety');

    for (const tool of tools.tools) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('calls get_symbols', async () => {
    const result = await client.callTool({ name: 'get_symbols', arguments: {} });
    const text = extractText(result.content);
    expect(text).toContain('Supported symbols');
    expect(text.length).toBeGreaterThan(0);
  });

  it('calls get_stablecoin_list', async () => {
    const result = await client.callTool({
      name: 'get_stablecoin_list',
      arguments: {},
    });
    const text = extractText(result.content);
    expect(text).toContain('Tracked stablecoins');
    expect(text).toMatch(/USDC|USDT|DAI/);
  });

  it('calls get_oracle_price for BTC/chainlink', async () => {
    const result = await client.callTool({
      name: 'get_oracle_price',
      arguments: { provider: 'chainlink', symbol: 'BTC' },
    });
    const text = extractText(result.content);
    expect(text).toContain('CHAINLINK price for BTC');
    expect(text).toContain('Price:');
  });

  it('calls get_consensus_price for BTC', async () => {
    const result = await client.callTool({
      name: 'get_consensus_price',
      arguments: { symbol: 'BTC' },
    });
    const text = extractText(result.content);
    expect(text).toContain('Consensus price for BTC');
    expect(text).toContain('Method:');
  });

  it('calls get_risk_summary for BTC', async () => {
    const result = await client.callTool({
      name: 'get_risk_summary',
      arguments: {
        symbol: 'BTC',
        providers: ['chainlink', 'pyth', 'api3'],
        period: 24,
      },
    });
    const text = extractText(result.content);
    expect(text).toContain('Risk summary for BTC');
    expect(text).toContain('Overall risk:');
  });

  it('calls get_stablecoin_peg for USDC', async () => {
    const result = await client.callTool({
      name: 'get_stablecoin_peg',
      arguments: { symbol: 'USDC' },
    });
    const text = extractText(result.content);
    expect(text).toContain('Stablecoin peg: USDC');
    expect(text).toContain('Target peg:');
  });

  it('calls recommend_oracle_setup for BTC', async () => {
    const result = await client.callTool({
      name: 'recommend_oracle_setup',
      arguments: { symbol: 'BTC' },
    });
    const text = extractText(result.content);
    expect(text).toContain('Oracle setup recommendations for BTC');
  });

  it('calls get_feeds', async () => {
    const result = await client.callTool({ name: 'get_feeds', arguments: {} });
    const text = extractText(result.content);
    expect(text).toContain('Oracle feeds');
  });

  it('calls get_coverage', async () => {
    const result = await client.callTool({ name: 'get_coverage', arguments: {} });
    const text = extractText(result.content);
    expect(text).toContain('Oracle coverage map');
    expect(text).toContain('Total feeds:');
  });

  it('calls get_metrics', async () => {
    const result = await client.callTool({ name: 'get_metrics', arguments: {} });
    const text = extractText(result.content);
    expect(text).toContain('Oracle ecosystem metrics');
    expect(text).toContain('Active feeds:');
  });

  it('calls get_provider_reputation for chainlink', async () => {
    const result = await client.callTool({
      name: 'get_provider_reputation',
      arguments: { provider: 'chainlink' },
    });
    const text = extractText(result.content);
    expect(text).toContain('Oracle reputation: CHAINLINK');
    expect(text).toContain('Overall score:');
  });

  it('calls every registered tool without error', async () => {
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names.length).toBeGreaterThanOrEqual(30);

    // Grab a real feed UUID for get_feed_health.
    const feedsResult = await client.callTool({ name: 'get_feeds', arguments: { limit: 1 } });
    const feedsText = extractText(feedsResult.content);
    const feedIdMatch = feedsText.match(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i
    );
    const sampleFeedId = feedIdMatch ? feedIdMatch[0] : '00000000-0000-0000-0000-000000000000';

    const calls: Record<string, Record<string, unknown>> = {
      get_oracle_price: { provider: 'chainlink', symbol: 'BTC' },
      get_consensus_price: { symbol: 'BTC' },
      get_risk_summary: { symbol: 'BTC', providers: ['chainlink', 'pyth', 'api3'], period: 24 },
      get_oracle_health: {},
      check_liquidation_risk: {},
      compare_oracle_deviation: { symbol: 'BTC' },
      get_stablecoin_peg: { symbol: 'USDC' },
      get_protocol_risk_params: { protocol: 'aave-v3-ethereum' },
      get_symbols: {},
      recommend_oracle_setup: { symbol: 'BTC' },
      get_stablecoin_list: {},
      get_oracle_prices_batch: { queries: [{ provider: 'chainlink', symbol: 'BTC' }] },
      get_price_history: { provider: 'chainlink', symbol: 'BTC', period: 24 },
      get_cross_chain_spreads: { provider: 'chainlink', symbol: 'BTC' },
      get_wrapped_asset_peg: { symbol: 'WBTC' },
      get_protocols: {},
      get_protocol_oracle_exposure: { protocol: 'aave-v3-ethereum' },
      get_feed_freshness: {},
      get_feeds: {},
      get_feed_health: { feedId: sampleFeedId },
      get_feed_uptime: {},
      get_reputation_rankings: {},
      get_provider_reputation: { provider: 'chainlink' },
      get_daily_report: {},
      get_incidents: {},
      get_latency: {},
      get_anomalies: {},
      get_correlation: { symbol: 'BTC' },
      get_coverage: {},
      get_metrics: {},
      check_position_safety: {
        protocolId: 'aave-v3-ethereum',
        collateralSymbol: 'WBTC',
        collateralAmount: 1,
        borrowSymbol: 'USDC',
        borrowAmount: 10000,
      },
    };

    const failures: string[] = [];

    for (const name of names) {
      const args = calls[name] ?? {};
      try {
        const result = await client.callTool({ name, arguments: args });
        const text = extractText(result.content);
        const isError = result.isError || text.startsWith('Error executing');
        if (isError) {
          failures.push(`${name}: ${text.slice(0, 200)}`);
        }
      } catch (error) {
        failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Some MCP tools failed:\n${failures.join('\n')}`);
    }
  }, 120000);
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
