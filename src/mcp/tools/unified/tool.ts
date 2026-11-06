import { z } from 'zod';

import type { McpToolDefinition } from '../types';

/**
 * Bind a definition to its concrete schema so `handler` arguments are typed
 * while the exported array stays a plain `McpToolDefinition[]`.
 */
export function defineTool<T extends z.ZodTypeAny>(tool: McpToolDefinition<T>): McpToolDefinition {
  return tool;
}

/** Build the advertised JSON schema from the runtime validator. */
export function jsonSchema(schema: z.ZodTypeAny): {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
} {
  return z.toJSONSchema(schema, { io: 'input' }) as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}
