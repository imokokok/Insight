import { type NextRequest, NextResponse } from 'next/server';

import { ApiResponseBuilder, createOptionsHandler } from '@/lib/api/handler';
import {
  closeOracleWatchWindow,
  OracleWatchWindowError,
  pollOracleWatchWindow,
} from '@/lib/api/services/oracleWatchWindowService';
import { CACHE_PRESETS } from '@/lib/api/utils';

/**
 * In-window operations, authenticated by the one-time window token returned at
 * purchase (`Authorization: Bearer oww_<hex>`). These calls are deliberately
 * NOT part of the v1 API-key middleware stack: the window itself is the
 * pre-paid entitlement, so polls are free until the plan's poll cap, and a
 * keyless x402 buyer has no API key to present. Unknown id and wrong token
 * answer identically (401) so windowIds are not enumerable.
 */

export const OPTIONS = createOptionsHandler();

function bearerToken(request: NextRequest): string {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? '';
}

function errorResponse(error: OracleWatchWindowError, requestId?: string): NextResponse {
  const status =
    error.code === 'INVALID_TOKEN'
      ? 401
      : error.code === 'NOT_FOUND'
        ? 404
        : error.code === 'WINDOW_CLOSED' || error.code === 'WINDOW_EXPIRED'
          ? 410
          : 429; // POLL_CAP_REACHED / POLL_TOO_SOON

  const messages: Record<OracleWatchWindowError['code'], string> = {
    NOT_FOUND: 'Monitored window not found.',
    INVALID_TOKEN: 'Invalid or missing window token.',
    WINDOW_CLOSED: 'This monitored window is already closed.',
    WINDOW_EXPIRED: 'This monitored window has expired.',
    POLL_CAP_REACHED: 'This monitored window has exhausted its poll budget.',
    POLL_TOO_SOON: 'Polling too soon for this monitored window.',
  };

  const response = NextResponse.json(
    ApiResponseBuilder.error(error.code, messages[error.code], {
      requestId,
      details: { code: error.code, retryable: status === 429 },
    }),
    { status, headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
  );
  if (error.code === 'POLL_TOO_SOON' && error.retryAfterSeconds) {
    response.headers.set('Retry-After', String(error.retryAfterSeconds));
  }
  return response;
}

/** Poll the current halt/proceed signal inside an open window (free). */
export const GET = async (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const requestId = request.headers.get('x-request-id') ?? undefined;
  const { windowId } = await routeContext.params;
  try {
    const result = await pollOracleWatchWindow(windowId, bearerToken(request));
    return NextResponse.json(
      ApiResponseBuilder.success(result, {
        requestId,
        meta: {
          verdict: result.signal.verdict,
          recommendation: result.signal.recommendation,
          attested: result.attestation !== null,
          pollsUsed: result.window.pollCount,
          pollCap: result.window.pollCap,
        },
      }),
      { headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
    );
  } catch (error) {
    if (error instanceof OracleWatchWindowError) return errorResponse(error, requestId);
    throw error;
  }
};

/**
 * Close the window early (idempotent) and return the summary of every signal
 * issued inside it. Also works on an expired window — the summary is the
 * record of what the window covered.
 */
export const POST = async (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const requestId = request.headers.get('x-request-id') ?? undefined;
  const { windowId } = await routeContext.params;
  try {
    const summary = await closeOracleWatchWindow(windowId, bearerToken(request));
    return NextResponse.json(
      ApiResponseBuilder.success(summary, {
        requestId,
        meta: { windowId: summary.windowId, haltCount: summary.haltCount },
      }),
      { headers: { 'Cache-Control': CACHE_PRESETS.noStore } }
    );
  } catch (error) {
    if (error instanceof OracleWatchWindowError) return errorResponse(error, requestId);
    throw error;
  }
};
