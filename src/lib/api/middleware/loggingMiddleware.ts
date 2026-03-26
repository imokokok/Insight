import { type NextRequest } from 'next/server';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('logging-middleware');

export interface LoggingMiddlewareOptions {
  logBody?: boolean;
  logQuery?: boolean;
  logHeaders?: boolean;
  sensitiveHeaders?: string[];
}

export interface RequestLog {
  method: string;
  path: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
  timestamp: string;
  requestId: string;
}

export interface ResponseLog {
  statusCode: number;
  duration: number;
  requestId: string;
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function createLoggingMiddleware(options: LoggingMiddlewareOptions = {}) {
  const {
    logBody = false,
    logQuery = true,
    logHeaders = false,
    sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'],
  } = options;

  return async (request: NextRequest): Promise<{ requestId: string }> => {
    const requestId = generateRequestId();
    const _startTime = Date.now();

    const requestLog: RequestLog = {
      method: request.method,
      path: request.nextUrl.pathname,
      timestamp: new Date().toISOString(),
      requestId,
    };

    if (logQuery) {
      const query: Record<string, string> = {};
      request.nextUrl.searchParams.forEach((value, key) => {
        query[key] = value;
      });
      if (Object.keys(query).length > 0) {
        requestLog.query = query;
      }
    }

    if (logHeaders) {
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        if (sensitiveHeaders.includes(key.toLowerCase())) {
          headers[key] = '[REDACTED]';
        } else {
          headers[key] = value;
        }
      });
      requestLog.headers = headers;
    }

    if (logBody && request.body) {
      try {
        const clonedRequest = request.clone();
        const body = await clonedRequest.text();
        if (body) {
          requestLog.body = JSON.parse(body);
        }
      } catch {
        requestLog.body = '[Unable to parse body]';
      }
    }

    logger.info('Incoming request', { request: requestLog });

    return { requestId };
  };
}

export function logResponse(requestId: string, statusCode: number, startTime: number): void {
  const duration = Date.now() - startTime;
  const responseLog: ResponseLog = {
    statusCode,
    duration,
    requestId,
  };

  if (statusCode >= 400) {
    logger.warn('Request completed with error', { response: responseLog });
  } else {
    logger.info('Request completed', { response: responseLog });
  }
}

export const defaultLoggingMiddleware = createLoggingMiddleware();
export const verboseLoggingMiddleware = createLoggingMiddleware({
  logBody: true,
  logQuery: true,
  logHeaders: true,
});
