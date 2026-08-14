import { createOptionsHandler } from '@/lib/api/handler';
import { createLogger } from '@/lib/utils/logger';
import { handleMcpHttpRequest } from '@/mcp/transports/http';

const logger = createLogger('mcp-route');

export const dynamic = 'force-dynamic';

// CORS preflight for cross-origin browser-based MCP clients. Mirrors the v1
// REST routes; the actual CORS headers on GET/POST/DELETE responses are added
// inside handleMcpHttpRequest.
export const OPTIONS = createOptionsHandler();

// Run MCP response cleanup in the background. Log (don't swallow) teardown
// failures so a broken cleanup is visible instead of silently lost.
function runCleanup(cleanup: () => Promise<void>): void {
  cleanup().catch((err) =>
    logger.error('MCP request cleanup failed', err instanceof Error ? err : new Error(String(err)))
  );
}

export async function GET(request: Request) {
  const { response, cleanup } = await handleMcpHttpRequest(request);
  runCleanup(cleanup);
  return response;
}

export async function POST(request: Request) {
  const { response, cleanup } = await handleMcpHttpRequest(request);
  runCleanup(cleanup);
  return response;
}

export async function DELETE(request: Request) {
  const { response, cleanup } = await handleMcpHttpRequest(request);
  runCleanup(cleanup);
  return response;
}
