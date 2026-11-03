import type { z } from 'zod';

/** Caller context threaded from the transport into product tools. */
export interface McpToolCallContext {
  /** Present when the caller authenticated with an API key (credits rail). */
  apiKeyId?: string | null;
}

export interface McpToolDefinition<Args extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  parameters: Args;
  /**
   * Optional JSON Schema override for the MCP tool definition.
   * Use this when the runtime `parameters` schema contains transforms/pipes
   * that cannot be represented in JSON Schema (zod v4 limitation).
   */
  inputSchema?: { type: 'object'; properties?: Record<string, unknown>; required?: string[] };
  handler: (args: z.infer<Args>, context?: McpToolCallContext) => Promise<string> | string;
}

export interface McpToolCallResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}
