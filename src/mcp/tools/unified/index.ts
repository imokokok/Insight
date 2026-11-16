import { MCP_TOOL_ALIASES } from './aliases';
import { CORE_MCP_TOOLS } from './coreTools';
import { LEGACY_PRODUCT_MCP_TOOLS, PRODUCT_MCP_TOOLS } from './productTools';
import { LEGACY_MCP_TOOLS, LEGACY_TOOL_REMOVAL_DATE } from './runtime';

import type { McpToolDefinition } from '../types';

/**
 * The advertised surface is the 4 canonical product tools. The 16 deprecated
 * alias names stay resolvable at the JSON-RPC boundary (a caller that hardcodes
 * an old name is canonicalized onto its product tool until
 * `LEGACY_TOOL_REMOVAL_DATE`) but are no longer listed in `tools/list`:
 * discovery surfaces (Glama, catalogs generated from `getToolDefinitions`)
 * score a bloated tool list down, and an unadvertised alias that still works
 * is strictly more compatible than an advertised one.
 */
export const ALIAS_MCP_TOOLS: McpToolDefinition[] = [
  ...CORE_MCP_TOOLS,
  ...LEGACY_PRODUCT_MCP_TOOLS,
].map((tool) => {
  const alias = MCP_TOOL_ALIASES[tool.name];
  if (!alias) {
    throw new Error(`Unified tool "${tool.name}" is missing an entry in MCP_TOOL_ALIASES.`);
  }
  return {
    ...tool,
    description: `${tool.description} Deprecated alias: prefer ${alias.tool} with op "${alias.preferredOp}". Removed on ${LEGACY_TOOL_REMOVAL_DATE}.`,
    deprecated: {
      sunset: LEGACY_TOOL_REMOVAL_DATE,
      replacedBy: alias.tool,
      preferredOp: alias.preferredOp,
    },
  };
});

/** Advertised surface: canonical product tools only. */
export const UNIFIED_MCP_TOOLS: McpToolDefinition[] = [...PRODUCT_MCP_TOOLS];

/** Everything a `tools/call` may name: product tools plus the hidden aliases. */
export const UNIFIED_RESOLVABLE_TOOLS: McpToolDefinition[] = [
  ...PRODUCT_MCP_TOOLS,
  ...ALIAS_MCP_TOOLS,
];

export const UNIFIED_TOOL_BY_NAME: ReadonlyMap<string, McpToolDefinition> = new Map(
  UNIFIED_RESOLVABLE_TOOLS.map((tool) => [tool.name, tool])
);

export {
  CORE_MCP_TOOLS,
  LEGACY_PRODUCT_MCP_TOOLS,
  PRODUCT_MCP_TOOLS,
  LEGACY_MCP_TOOLS,
  LEGACY_TOOL_REMOVAL_DATE,
};
