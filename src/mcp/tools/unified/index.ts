import { MCP_TOOL_ALIASES } from './aliases';
import { CORE_MCP_TOOLS } from './coreTools';
import { LEGACY_PRODUCT_MCP_TOOLS, PRODUCT_MCP_TOOLS } from './productTools';
import { LEGACY_MCP_TOOLS, LEGACY_TOOL_REMOVAL_DATE } from './runtime';

import type { McpToolDefinition } from '../types';

/**
 * The advertised surface is 4 canonical product tools followed by the 16
 * deprecated alias names they absorb. Aliases live here rather than in the
 * legacy registry: that registry expires on `LEGACY_TOOL_REMOVAL_DATE`, while
 * these names are convenience spellings that expire on the same date.
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

export const UNIFIED_MCP_TOOLS: McpToolDefinition[] = [...PRODUCT_MCP_TOOLS, ...ALIAS_MCP_TOOLS];

export const UNIFIED_TOOL_BY_NAME: ReadonlyMap<string, McpToolDefinition> = new Map(
  UNIFIED_MCP_TOOLS.map((tool) => [tool.name, tool])
);

export {
  CORE_MCP_TOOLS,
  LEGACY_PRODUCT_MCP_TOOLS,
  PRODUCT_MCP_TOOLS,
  LEGACY_MCP_TOOLS,
  LEGACY_TOOL_REMOVAL_DATE,
};
