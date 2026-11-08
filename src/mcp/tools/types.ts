import type { z } from 'zod';

/** Caller context threaded from the transport into product tools. */
export interface McpToolCallContext {
  /** Present when the caller authenticated with an API key (credits rail). */
  apiKeyId?: string | null;
}

/** Product price declared in the MCP catalog / server card. */
export interface McpToolPricing {
  /** Product price in credits (the per-call ceiling when the product is op-priced). */
  credits: number;
  /** Product price in USD, matching `credits × $0.001`. */
  usd: string;
  /** Lowest per-call price when the product dispatches across metering classes. */
  minCredits?: number;
  minUsd?: string;
}

/** Sunset metadata for a deprecated alias. Aliases never declare a price. */
export interface McpToolDeprecation {
  sunset: string;
  replacedBy: string;
  preferredOp: string;
}

export interface McpToolDefinition<Args extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  parameters: Args;
  /** Present on the four canonical product tools only. */
  pricing?: McpToolPricing;
  /** Present on the sixteen deprecated alias names only. */
  deprecated?: McpToolDeprecation;
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
