import type { JsonSchemaProperty, ToolInputSchema } from './McpToolParamsForm';

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: ToolInputSchema;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSchemaProperty(value: unknown, depth = 0): value is JsonSchemaProperty {
  // Tool schemas are displayed recursively; reject unreasonable nesting.
  if (!isRecord(value) || depth > 10) return false;
  if (
    value.type !== undefined &&
    typeof value.type !== 'string' &&
    (!Array.isArray(value.type) || !value.type.every((type) => typeof type === 'string'))
  ) {
    return false;
  }
  if (value.description !== undefined && typeof value.description !== 'string') return false;
  if (
    value.enum !== undefined &&
    (!Array.isArray(value.enum) ||
      !value.enum.every((option) => ['string', 'number', 'boolean'].includes(typeof option)))
  ) {
    return false;
  }
  if (value.items !== undefined && !isSchemaProperty(value.items, depth + 1)) return false;
  if (
    value.properties !== undefined &&
    (!isRecord(value.properties) ||
      !Object.values(value.properties).every((property) => isSchemaProperty(property, depth + 1)))
  ) {
    return false;
  }
  if (
    value.required !== undefined &&
    (!Array.isArray(value.required) || !value.required.every((name) => typeof name === 'string'))
  ) {
    return false;
  }
  for (const name of ['anyOf', 'oneOf'] as const) {
    if (
      value[name] !== undefined &&
      (!Array.isArray(value[name]) ||
        !value[name].every((property) => isSchemaProperty(property, depth + 1)))
    ) {
      return false;
    }
  }
  return true;
}

/** Validate the JSON-RPC boundary before its schema drives form rendering. */
export function parseToolsList(value: unknown): McpTool[] {
  if (!isRecord(value) || !Array.isArray(value.tools)) {
    throw new Error('Invalid MCP tool list response');
  }
  return value.tools.map((entry): McpTool => {
    if (!isRecord(entry) || typeof entry.name !== 'string' || !entry.name.trim()) {
      throw new Error('Invalid MCP tool list response');
    }
    if (entry.description !== undefined && typeof entry.description !== 'string') {
      throw new Error('Invalid MCP tool list response');
    }
    const schema = entry.inputSchema;
    if (
      schema !== undefined &&
      (!isRecord(schema) ||
        (schema.type !== undefined && typeof schema.type !== 'string') ||
        (schema.properties !== undefined &&
          (!isRecord(schema.properties) ||
            !Object.values(schema.properties).every((property) => isSchemaProperty(property)))) ||
        (schema.required !== undefined &&
          (!Array.isArray(schema.required) ||
            !schema.required.every((name) => typeof name === 'string'))))
    ) {
      throw new Error('Invalid MCP tool list response');
    }
    return {
      name: entry.name,
      description: entry.description as string | undefined,
      inputSchema: schema as ToolInputSchema | undefined,
    };
  });
}
