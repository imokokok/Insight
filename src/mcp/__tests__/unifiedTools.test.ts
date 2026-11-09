/**
 * @jest-environment node
 */

import {
  executeTool,
  getToolDefinitions,
  resolveDispatchedTool,
  resolveToolSource,
} from '../tools';
import {
  ALIAS_MCP_TOOLS,
  CORE_MCP_TOOLS,
  LEGACY_MCP_TOOLS,
  LEGACY_PRODUCT_MCP_TOOLS,
  PRODUCT_MCP_TOOLS,
  UNIFIED_MCP_TOOLS,
} from '../tools/unified';
import { ALIAS_TOOL_NAMES } from '../tools/unified/aliases';
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

/** Names both registries implement — the only place dispatch can diverge. */
const OVERLAP_TOOL_NAMES = new Set(
  UNIFIED_MCP_TOOLS.map((tool) => tool.name).filter((name) => LEGACY_TOOL_BY_NAME.has(name))
);

describe('consolidated MCP surface', () => {
  it('exposes exactly 4 product tools plus 16 deprecated aliases', () => {
    expect(CORE_MCP_TOOLS).toHaveLength(11);
    expect(LEGACY_PRODUCT_MCP_TOOLS).toHaveLength(5);
    expect(ALIAS_MCP_TOOLS).toHaveLength(16);
    expect(PRODUCT_MCP_TOOLS).toHaveLength(4);
    expect(UNIFIED_MCP_TOOLS).toHaveLength(20);

    const names = UNIFIED_MCP_TOOLS.map((tool) => tool.name);
    expect(new Set(names).size).toBe(20);

    const advertised = getToolDefinitions();
    expect(advertised).toHaveLength(20);
    expect(advertised.map((tool) => tool.name)).toEqual(names);
    // Canonical products lead; the 16 deprecated names follow.
    expect(names.slice(0, 4)).toEqual([
      'trade_guard',
      'trade_proof',
      'oracle_watch_window',
      'position_lifecycle',
    ]);
    expect(names.slice(4)).toEqual(
      expect.arrayContaining([
        'get_oracle_price',
        'check_trade_safety',
        'begin_trade_evidence',
        'position_lifecycle_step',
      ])
    );
    for (const tool of advertised) {
      expect(tool.inputSchema?.type).toBe('object');
      expect(tool.inputSchema?.properties).toBeDefined();
    }
  });

  it('keeps aliases out of the legacy registry so neither gets an expiry date', () => {
    // The registry size follows the branch baseline (main: 80, this branch:
    // 81 after bnb_perp_guard), so pin the structural invariant rather than a
    // branch-local number. After merging, the merged result is authoritative.
    expect(LEGACY_TOOL_BY_NAME.size).toBe(new Set(LEGACY_MCP_TOOLS.map((tool) => tool.name)).size);
    const aliasOnly = [...ALIAS_TOOL_NAMES].filter((name) => !LEGACY_TOOL_BY_NAME.has(name));
    const overlap = [...ALIAS_TOOL_NAMES].filter((name) => LEGACY_TOOL_BY_NAME.has(name));
    expect(aliasOnly).toHaveLength(11);
    expect(overlap).toHaveLength(5);
    const union = new Set([...LEGACY_TOOL_BY_NAME.keys(), ...ALIAS_TOOL_NAMES]);
    expect(union.size).toBe(LEGACY_TOOL_BY_NAME.size + aliasOnly.length);
  });

  it('describes when to use, when not to use and what each tool returns', () => {
    for (const tool of UNIFIED_MCP_TOOLS) {
      expect(tool.description).toContain('Use ');
      expect(tool.description).toContain('Do not use');
      expect(tool.description).toContain('Returns');
    }
  });

  it('names the deprecated tools each product absorbs', () => {
    const absorbed: Record<string, string[]> = {
      trade_guard: [
        'get_oracle_price',
        'get_price_analytics',
        'get_oracle_health',
        'search_oracle_registry',
        'get_market_quote',
        'check_trade_safety',
        'prepare_swap',
        'prepare_perp_order',
      ],
      trade_proof: ['begin_trade_evidence', 'issue_execution_receipt', 'verify_evidence'],
      oracle_watch_window: [
        'oracle_watch',
        'oracle_watch_window_begin',
        'oracle_watch_window_control',
      ],
      position_lifecycle: ['position_lifecycle_begin', 'position_lifecycle_step'],
    };
    for (const tool of PRODUCT_MCP_TOOLS) {
      const legacyNames = absorbed[tool.name];
      expect(legacyNames).toBeDefined();
      for (const legacy of legacyNames) {
        expect(tool.description).toContain(legacy);
      }
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
    expect(LEGACY_TOOL_BY_NAME.size).toBe(83);
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

describe('profile-aware dispatch', () => {
  const originalProfile = process.env.MCP_TOOL_PROFILE;

  afterEach(() => {
    if (originalProfile === undefined) delete process.env.MCP_TOOL_PROFILE;
    else process.env.MCP_TOOL_PROFILE = originalProfile;
  });

  it('resolves each name to the registry the profile says serves it', () => {
    delete process.env.MCP_TOOL_PROFILE;
    for (const name of [
      'trade_guard',
      'trade_proof',
      'get_oracle_price',
      'get_oracle_health',
      'prepare_swap',
      'position_lifecycle_step',
    ]) {
      expect(resolveToolSource(name)).toBe('unified');
    }

    process.env.MCP_TOOL_PROFILE = 'legacy';
    // Legacy rollback must actually reach the legacy implementation.
    for (const name of [
      'get_oracle_price',
      'get_oracle_health',
      'oracle_watch',
      'oracle_watch_window_begin',
      'position_lifecycle_begin',
      'get_symbols',
    ]) {
      expect(resolveToolSource(name)).toBe('legacy');
    }
    // Aliases with no legacy implementation stay unified and canonicalize onto
    // the product tool; canonical product names are always unified.
    for (const name of [
      'prepare_swap',
      'oracle_watch_window_control',
      'position_lifecycle_step',
      'trade_guard',
    ]) {
      expect(resolveToolSource(name)).toBe('unified');
    }
  });

  it('validates tools/list minimal inputs with the dispatched schema in both profiles', () => {
    const failures: Array<{ profile: string; tool: string; issues: unknown }> = [];
    for (const profile of [undefined, 'legacy'] as const) {
      if (profile === undefined) delete process.env.MCP_TOOL_PROFILE;
      else process.env.MCP_TOOL_PROFILE = profile;

      for (const advertised of getToolDefinitions()) {
        const source = resolveToolSource(advertised.name);
        // Legacy-only names are advertised and served by the same registry, so
        // they cannot diverge. Coverage here is the unified-served names plus
        // the names both registries implement, where dispatch picks the schema.
        if (source !== 'unified' && !OVERLAP_TOOL_NAMES.has(advertised.name)) continue;
        // Build every required field from the advertised JSON schema, then let
        // the fixture supply domain-constrained values the JSON schema cannot
        // express (e.g. provider allow-lists).
        const minimal = {
          ...minimalArgsFromSchema(advertised.inputSchema),
          ...(MINIMAL_INPUT_OVERRIDES[advertised.name] ?? {}),
        };
        // Resolve first: a deprecated alias canonicalizes onto its product tool
        // and gains the op selector before validation.
        const dispatched = resolveDispatchedTool(advertised.name, minimal);
        if (!dispatched) {
          failures.push({
            profile: profile ?? 'core',
            tool: advertised.name,
            issues: 'not dispatched',
          });
          continue;
        }

        const parsed = dispatched.definition.parameters.safeParse(dispatched.args);
        if (!parsed.success) {
          failures.push({
            profile: profile ?? 'core',
            tool: advertised.name,
            issues: parsed.error.issues,
          });
        }
      }
    }
    expect(failures.length === 0 ? 'ok' : JSON.stringify(failures)).toBe('ok');
  });
});

type JsonSchemaNode = {
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  anyOf?: JsonSchemaNode[];
  oneOf?: JsonSchemaNode[];
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  items?: JsonSchemaNode | JsonSchemaNode[];
  minItems?: number;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  pattern?: string;
  format?: string;
  additionalProperties?: unknown;
};

/**
 * Values the advertised JSON schema cannot constrain but the validator does
 * (allow-listed providers, venue enums that render as plain strings).
 */
const MINIMAL_INPUT_OVERRIDES: Record<string, Record<string, unknown>> = {
  get_oracle_price: { provider: 'chainlink' },
  // prepare_perp_order requires either an EVM sender or a Solana wallet; the
  // JSON schema cannot express the base58 constraint.
  prepare_perp_order: { wallet: '11111111111111111111111111111111' },
};

const VALUE_CANDIDATES = [
  'ETH',
  'BTC',
  'USDC',
  '1',
  '0x' + '1'.repeat(40),
  '0x' + '1'.repeat(64),
  'eip155:8453/erc20:0x' + '1'.repeat(40),
  '2026-11-08',
  '2026-11-08T00:00:00.000Z',
  'vvv',
  'test',
];

function pickString(schema: JsonSchemaNode): string {
  const minLength = schema.minLength ?? 1;
  const maxLength = schema.maxLength ?? Number.POSITIVE_INFINITY;
  const pattern = schema.pattern ? new RegExp(schema.pattern) : null;
  for (const candidate of VALUE_CANDIDATES) {
    if (candidate.length < minLength || candidate.length > maxLength) continue;
    if (pattern && !pattern.test(candidate)) continue;
    return candidate;
  }
  const filler = 'a'.repeat(Math.min(Math.max(minLength, 1), 64));
  return filler;
}

function minimalValue(schema: JsonSchemaNode | undefined): unknown {
  if (!schema) return 'x';
  if (schema.const !== undefined) return schema.const;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];
  const branches = schema.anyOf ?? schema.oneOf;
  if (branches && branches.length > 0) {
    for (const branch of branches) {
      if (branch.type === 'object' || branch.properties) continue;
      const value = minimalValue(branch);
      if (value !== undefined) return value;
    }
    return minimalValue(branches[branches.length - 1]);
  }
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  switch (type) {
    case 'object': {
      const out: Record<string, unknown> = {};
      for (const key of schema.required ?? []) {
        out[key] = minimalValue(schema.properties?.[key]);
      }
      return out;
    }
    case 'array': {
      const count = schema.minItems ?? 0;
      const item = Array.isArray(schema.items) ? schema.items[0] : schema.items;
      return Array.from({ length: count }, () => minimalValue(item ?? { type: 'string' }));
    }
    case 'integer':
    case 'number':
      return (
        schema.minimum ?? (schema.exclusiveMinimum !== undefined ? schema.exclusiveMinimum + 1 : 1)
      );
    case 'boolean':
      return true;
    case 'string':
      return pickString(schema);
    default:
      return {};
  }
}

function minimalArgsFromSchema(schema: unknown): Record<string, unknown> {
  return minimalValue(schema as JsonSchemaNode) as Record<string, unknown>;
}
