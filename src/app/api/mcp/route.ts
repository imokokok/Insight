import { createOptionsHandler } from '@/lib/api/handler';
import { handleMcpHttpRequest } from '@/mcp/transports/http';

export const dynamic = 'force-dynamic';

// CORS preflight for cross-origin browser-based MCP clients. Mirrors the v1
// REST routes; the actual CORS headers on GET/POST/DELETE responses are added
// inside handleMcpHttpRequest.
export const OPTIONS = createOptionsHandler();

export async function GET(request: Request) {
  const { response, cleanup } = await handleMcpHttpRequest(request);
  cleanup().catch(() => {});
  return response;
}

export async function POST(request: Request) {
  const { response, cleanup } = await handleMcpHttpRequest(request);
  cleanup().catch(() => {});
  return response;
}

export async function DELETE(request: Request) {
  const { response, cleanup } = await handleMcpHttpRequest(request);
  cleanup().catch(() => {});
  return response;
}
