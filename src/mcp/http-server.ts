import { createServer, type IncomingMessage } from 'node:http';

import { getMaxRequestBytes } from '@/lib/api/requestLimits';
import { createLogger } from '@/lib/utils/logger';

import { handleMcpHttpRequest } from './transports/http';

const logger = createLogger('mcp-http-server');

const PORT = process.env.MCP_HTTP_PORT ? parseInt(process.env.MCP_HTTP_PORT, 10) : 3001;
const HOST = process.env.MCP_HTTP_HOST ?? '127.0.0.1';
const MAX_BODY_BYTES = getMaxRequestBytes();

class PayloadTooLargeError extends Error {}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (url.pathname !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const body = req.method === 'POST' ? await readBody(req) : undefined;

    const request = new Request(url.toString(), {
      method: req.method,
      headers: Object.entries(req.headers).map(([key, value]) => [key, String(value ?? '')]) as [
        string,
        string,
      ][],
      body,
    });

    const { response, cleanup } = await handleMcpHttpRequest(request);

    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    const responseBody = await response.text();
    res.end(responseBody);

    // cleanup() closes the MCP session. If it throws, the response above has
    // already been sent — calling res.writeHead(500) would raise
    // ERR_HTTP_HEADERS_SENT and crash the process. Log only.
    await cleanup().catch((error) => {
      logger.error(
        'MCP cleanup failed after response sent',
        error instanceof Error ? error : undefined
      );
    });
  } catch (error) {
    logger.error('HTTP server error', error instanceof Error ? error : undefined);
    // Guard against the headers having already been sent (e.g. if the throw
    // happened after res.end() above) — writing again would crash Node.
    if (!res.headersSent) {
      const tooLarge = error instanceof PayloadTooLargeError;
      res.writeHead(tooLarge ? 413 : 500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: tooLarge
            ? `Request body exceeds ${MAX_BODY_BYTES} bytes`
            : 'Internal server error',
        })
      );
    }
  }
});

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        req.pause();
        reject(new PayloadTooLargeError());
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

server.listen(PORT, HOST, () => {
  logger.info(`Insight MCP HTTP server listening on http://${HOST}:${PORT}/mcp`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing MCP HTTP server');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing MCP HTTP server');
  server.close(() => process.exit(0));
});
