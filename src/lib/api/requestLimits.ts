import { type NextRequest, NextResponse } from 'next/server';

import { ApiResponseBuilder } from '@/lib/api/response';

export const DEFAULT_MAX_REQUEST_BYTES = 1024 * 1024;

/** Raised when streamed request bytes exceed the configured API limit. */
export class RequestBodyTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super(`Request body exceeds ${maxBytes} bytes`);
    this.name = 'RequestBodyTooLargeError';
  }
}

export function requestBodyTooLargeResponse(
  maxBytes = getMaxRequestBytes(),
  requestId?: string
): NextResponse {
  return NextResponse.json(
    ApiResponseBuilder.error('PAYLOAD_TOO_LARGE', `Request body exceeds ${maxBytes} bytes`, {
      retryable: false,
      requestId,
      details: { maxBytes },
    }),
    { status: 413 }
  );
}

export function getMaxRequestBytes(): number {
  const configured = Number(process.env.MAX_REQUEST_SIZE);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : DEFAULT_MAX_REQUEST_BYTES;
}

/** Reject a declared request body that exceeds the configured API limit. */
export function rejectOversizedRequest(
  request: Pick<NextRequest, 'headers'>,
  maxBytes = getMaxRequestBytes()
): NextResponse | null {
  const rawLength = request.headers.get('content-length');
  if (!rawLength) return null;

  const contentLength = Number(rawLength);
  if (!Number.isFinite(contentLength) || contentLength < 0) {
    return NextResponse.json(
      ApiResponseBuilder.error('BAD_REQUEST', 'Invalid Content-Length header'),
      { status: 400 }
    );
  }

  if (contentLength <= maxBytes) return null;

  return requestBodyTooLargeResponse(maxBytes);
}

/**
 * Read a request stream while enforcing a cumulative byte limit.
 *
 * `Content-Length` is advisory: HTTP/2 and chunked requests can omit it, so
 * every untrusted streamed body must pass through this reader before parsing.
 */
export async function readLimitedRequestBody(
  request: Pick<Request, 'body'>,
  maxBytes = getMaxRequestBytes()
): Promise<Uint8Array> {
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError(maxBytes);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

/** Parse JSON only after streaming its complete body through the byte limit. */
export async function parseLimitedJson(
  request: Pick<Request, 'body'> & Partial<Pick<Request, 'json'>>,
  maxBytes = getMaxRequestBytes()
): Promise<unknown> {
  // Next.js requests always expose a readable body. The fallback preserves
  // compatibility with lightweight route-test request doubles that only
  // implement `json()` and cannot carry a stream.
  if (!request.body && request.json) return request.json();
  const body = await readLimitedRequestBody(request, maxBytes);
  return JSON.parse(new TextDecoder().decode(body)) as unknown;
}

/**
 * Enforce the byte limit for a standard handler without consuming the request
 * body required later by its validator or endpoint implementation.
 */
export async function rejectStreamedOversizedRequest(
  request: Request,
  maxBytes = getMaxRequestBytes()
): Promise<NextResponse | null> {
  // Avoid cloning bodyless GET/HEAD requests (and retain compatibility with
  // minimal request doubles used by route tests).
  if (!request.body) return null;
  try {
    await readLimitedRequestBody(request.clone(), maxBytes);
    return null;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return requestBodyTooLargeResponse(maxBytes);
    }
    throw error;
  }
}
