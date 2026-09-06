import { type NextRequest, NextResponse } from 'next/server';

import { ApiResponseBuilder } from '@/lib/api/response';

export const DEFAULT_MAX_REQUEST_BYTES = 1024 * 1024;

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

  return NextResponse.json(
    ApiResponseBuilder.error('PAYLOAD_TOO_LARGE', `Request body exceeds ${maxBytes} bytes`, {
      retryable: false,
      details: { maxBytes },
    }),
    { status: 413 }
  );
}
