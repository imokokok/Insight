import { createServer } from 'node:http';

interface RateLimitInput {
  p_key: string;
  p_window_ms: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const port = 54321;
const entries = new Map<string, RateLimitEntry>();

function isRateLimitInput(value: unknown): value is RateLimitInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.p_key === 'string' &&
    input.p_key.length > 0 &&
    Number.isInteger(input.p_window_ms) &&
    Number(input.p_window_ms) > 0
  );
}

const server = createServer((request, response) => {
  response.setHeader('content-type', 'application/json');
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200).end(JSON.stringify({ status: 'ok' }));
    return;
  }
  if (request.method !== 'POST' || request.url !== '/rest/v1/rpc/increment_rate_limit') {
    response.writeHead(404).end(JSON.stringify({ message: 'mock route not found' }));
    return;
  }

  const chunks: Buffer[] = [];
  let bytes = 0;
  request.on('data', (chunk: Buffer) => {
    bytes += chunk.length;
    if (bytes <= 4096) chunks.push(chunk);
    else request.destroy();
  });
  request.on('end', () => {
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    } catch {
      response.writeHead(400).end(JSON.stringify({ message: 'invalid JSON' }));
      return;
    }
    if (!isRateLimitInput(body)) {
      response.writeHead(400).end(JSON.stringify({ message: 'invalid RPC arguments' }));
      return;
    }

    const now = Date.now();
    let entry = entries.get(body.p_key);
    if (!entry || entry.resetTime <= now) {
      entry = { count: 0, resetTime: now + body.p_window_ms };
      entries.set(body.p_key, entry);
    }
    entry.count += 1;
    response
      .writeHead(200)
      .end(JSON.stringify([{ count: entry.count, reset_time: entry.resetTime }]));
  });
});

server.listen(port, '127.0.0.1');
