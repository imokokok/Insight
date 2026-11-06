/**
 * @jest-environment node
 */

import { executeTool, getToolDefinitions } from '../tools';
import { CORE_MCP_TOOLS, PRODUCT_MCP_TOOLS, UNIFIED_MCP_TOOLS } from '../tools/unified';
import { LEGACY_TOOL_BY_NAME, LEGACY_TOOL_REMOVAL_DATE } from '../tools/unified/runtime';

jest.mock('@/lib/oracles/utils/dynamicFeedResolver', () => ({
  getAllActiveFeedsByProviderWithStatus: async () => ({
    errored: false,
    feeds: new Map([
      [
        'chainlink',
        [
          { provider: 'chainlink', symbol: 'BTC' },
          { provider: 'chainlink', symbol: 'ETH' },
        ],
      ],
    ]),
  }),
}));

function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('\n');
}

describe('consolidated MCP surface', () => {
  it('exposes exactly 11 core + 5 product tools with unique names', () => {
    expect(CORE_MCP_TOOLS).toHaveLength(11);
    expect(PRODUCT_MCP_TOOLS).toHaveLength(5);
    expect(UNIFIED_MCP_TOOLS).toHaveLength(16);

    const names = UNIFIED_MCP_TOOLS.map((tool) => tool.name);
    expect(new Set(names).size).toBe(16);

    const advertised = getToolDefinitions();
    expect(advertised).toHaveLength(16);
    expect(advertised.map((tool) => tool.name)).toEqual(names);
    for (const tool of advertised) {
      expect(tool.inputSchema?.type).toBe('object');
      expect(tool.inputSchema?.properties).toBeDefined();
    }
  });

  it('describes when to use, when not to use and what each tool returns', () => {
    for (const tool of UNIFIED_MCP_TOOLS) {
      expect(tool.description).toContain('Use ');
      expect(tool.description).toContain('Do not use');
      expect(tool.description).toContain('Returns');
    }
  });

  it('rejects invalid arguments on the unified validators', async () => {
    const missingSymbol = await executeTool('get_oracle_price', { provider: 'chainlink' });
    expect(missingSymbol.isError).toBe(true);

    const unknownProvider = await executeTool('get_oracle_price', {
      provider: 'not-a-provider',
      asset: 'BTC',
    });
    expect(unknownProvider.isError).toBe(true);

    const missingChain = await executeTool('check_trade_safety', { action: 'swap' });
    expect(missingChain.isError).toBe(true);

    const missingAmount = await executeTool('prepare_swap', {
      venue: 'base_aerodrome_slipstream',
    });
    expect(missingAmount.isError).toBe(true);

    const unknownAction = await executeTool('check_trade_safety', {
      chain_id: 8453,
      action: 'teleport',
      asset: 'ETH',
      amount_usd: 100,
    });
    expect(unknownAction.isError).toBe(true);

    const badStep = await executeTool('position_lifecycle_step', {
      op: 'teleport',
      lifecycle_id: 'plc_1',
      lifecycle_token: 'plc_token',
    });
    expect(badStep.isError).toBe(true);
  });

  it('explains which field is missing for family-specific branches', async () => {
    const noProtocol = await executeTool('check_trade_safety', {
      chain_id: 8453,
      action: 'check_position',
    });
    expect(noProtocol.isError).toBe(true);
    expect(textOf(noProtocol)).toContain('"protocol_id" is required');

    const noReceipt = await executeTool('issue_execution_receipt', { mode: 'receipt' });
    expect(noReceipt.isError).toBe(true);
    expect(textOf(noReceipt)).toContain('"receipt" is required');

    const noAttestation = await executeTool('verify_evidence', { kind: 'execution_pair' });
    expect(noAttestation.isError).toBe(true);
    expect(textOf(noAttestation)).toContain('"pre_trade_attestation" is required');
  });

  it('routes search_oracle_registry to the legacy implementation', async () => {
    const result = await executeTool('search_oracle_registry', { kind: 'symbols' });
    expect(textOf(result)).toContain('Supported symbols');
    expect(result.isError).toBeFalsy();
  });

  it('keeps every legacy tool callable by its old name', async () => {
    expect(LEGACY_TOOL_BY_NAME.size).toBe(80);
    expect(LEGACY_TOOL_BY_NAME.has('assess_rwa_evidence')).toBe(false);
    for (const name of [
      'get_symbols',
      'pre_trade_safety_check',
      'check_liquidation_risk',
      'oracle_watch_window_poll',
    ]) {
      expect(LEGACY_TOOL_BY_NAME.has(name)).toBe(true);
    }

    const legacyResult = await executeTool('get_symbols', {});
    expect(textOf(legacyResult)).toContain('Supported symbols');
    expect(legacyResult.isError).toBeFalsy();
  });

  it('removed assess_rwa_evidence and rejects unknown names', async () => {
    const removed = await executeTool('assess_rwa_evidence', {});
    expect(removed.isError).toBe(true);
    expect(textOf(removed)).toContain('Unknown tool: assess_rwa_evidence');

    const unknown = await executeTool('not_a_tool', {});
    expect(unknown.isError).toBe(true);
    expect(textOf(unknown)).toContain('Unknown tool: not_a_tool');
  });

  it('records the 60-day legacy removal date', () => {
    expect(LEGACY_TOOL_REMOVAL_DATE).toBe('2027-01-06');
  });
});
