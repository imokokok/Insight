import { CORE_MCP_TOOLS } from './coreTools';
import { PRODUCT_MCP_TOOLS } from './productTools';
import { LEGACY_MCP_TOOLS, LEGACY_TOOL_REMOVAL_DATE } from './runtime';

import type { McpToolDefinition } from '../types';

/**
 * The consolidated public surface: 11 core tools + 5 product state-machine
 * tools. Legacy names stay callable until `LEGACY_TOOL_REMOVAL_DATE` but are
 * not listed.
 */
export const UNIFIED_MCP_TOOLS: McpToolDefinition[] = [...CORE_MCP_TOOLS, ...PRODUCT_MCP_TOOLS];

export const UNIFIED_TOOL_BY_NAME: ReadonlyMap<string, McpToolDefinition> = new Map(
  UNIFIED_MCP_TOOLS.map((tool) => [tool.name, tool])
);

export { CORE_MCP_TOOLS, PRODUCT_MCP_TOOLS, LEGACY_MCP_TOOLS, LEGACY_TOOL_REMOVAL_DATE };
