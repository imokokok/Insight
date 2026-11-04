import type { NextRequest } from 'next/server';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('mcp-route');

export const dynamic = 'force-dynamic';

// CORS preflight for cross-origin browser-based MCP clients. Mirrors the v1
// REST routes; the actual CORS headers on GET/POST/DELETE responses are added
// inside handleMcpHttpRequest.
export async function OPTIONS(request: NextRequest): Promise<Response> {
  // OPTIONS is rare compared with the invalid HEAD probes observed at this
  // endpoint. Keep the shared handler out of the HEAD module path as well.
  const { createOptionsHandler } = await import('@/lib/api/handler');
  return createOptionsHandler()(request);
}

// Run MCP response cleanup in the background. Log (don't swallow) teardown
// failures so a broken cleanup is visible instead of silently lost.
function runCleanup(cleanup: () => Promise<void>): void {
  cleanup().catch((err) =>
    logger.error('MCP request cleanup failed', err instanceof Error ? err : new Error(String(err)))
  );
}

async function handleRequest(request: Request): Promise<Response> {
  // Keep the heavy MCP/x402 transport out of invalid HEAD probes. Next.js
  // loads this route module to answer HEAD, so importing the transport only
  // for supported methods avoids its SDK, payment and database dependency
  // graph on a request that must always return 405.
  const { handleMcpHttpRequest } = await import('@/mcp/transports/http');
  const { response, cleanup } = await handleMcpHttpRequest(request);
  runCleanup(cleanup);
  return response;
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}

export async function DELETE(request: Request) {
  return handleRequest(request);
}

// HEAD is not a valid MCP streamable-HTTP method. Answer it without loading
// the MCP transport; directory probes still receive an explicit, standards-
// shaped method rejection while avoiding a function's heavy runtime work.
export function HEAD(): Response {
  return new Response(null, { status: 405, headers: { Allow: 'GET, POST, DELETE' } });
}
