import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { createLogger } from '@/lib/utils/logger';

import packageJson from '../../package.json';

import { consumeMcpQuota, precheckMcpToolQuota, recordMcpToolUsage } from './middleware';
import { executeTool, getToolDefinitions } from './tools';

import type { McpAuthContext } from './auth';

const logger = createLogger('mcp-server');

export function createMcpServer(auth?: McpAuthContext): Server {
  const tools = getToolDefinitions();

  const server = new Server(
    {
      name: 'insight-oracle-mcp-server',
      version: packageJson.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: tools as Tool[] };
  });

  server.setRequestHandler(
    CallToolRequestSchema,
    async (
      request
    ): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();
      logger.info(`MCP tool called: ${name}`, { args });

      // Credit gate: reject before executing if the key can't afford THIS
      // tool (the HTTP-boundary precheck only tests the cheapest class).
      if (auth) {
        const creditCheck = await precheckMcpToolQuota(auth, name);
        if (!creditCheck.allowed) {
          recordMcpToolUsage(auth, name, 402, Date.now() - startTime);
          return {
            content: [{ type: 'text', text: `Insufficient credits: ${creditCheck.reason}` }],
            isError: true,
          };
        }
      }

      const result = await executeTool(name, args);

      if (auth) {
        // Only consume credits when the tool actually returned data.
        // Protocol overhead (initialize/tools/list/ping) and execution
        // failures are NOT metered — mirroring the REST API which only
        // charges successful data requests.
        if (!result.isError) {
          consumeMcpQuota(auth, name);
        }
        recordMcpToolUsage(auth, name, result.isError ? 500 : 200, Date.now() - startTime);
      }

      // Cast required due to minor zod v4 / MCP SDK type compatibility gap at compile time
      return result as { content: Array<{ type: 'text'; text: string }>; isError?: boolean };
    }
  );

  return server;
}

export async function runStdioServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  logger.info('Starting Insight MCP server on stdio transport');
  await server.connect(transport);
}
