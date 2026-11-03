import { createOptionsHandler } from '@/lib/api/handler';
import { createLogger } from '@/lib/utils/logger';
import { handleMcpHttpRequest } from '@/mcp/transports/http';

const logger = createLogger('mcp-mpp-route');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const OPTIONS = createOptionsHandler();

function runCleanup(cleanup: () => Promise<void>): void {
  cleanup().catch((error) =>
    logger.error(
      'MPP MCP request cleanup failed',
      error instanceof Error ? error : new Error(String(error))
    )
  );
}

async function handle(request: Request): Promise<Response> {
  const { response, cleanup } = await handleMcpHttpRequest(request, { paymentRail: 'mpp' });
  runCleanup(cleanup);
  return response;
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
