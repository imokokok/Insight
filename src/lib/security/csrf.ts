import { type NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('csrf-protection');

const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_TOKEN_COOKIE = 'csrf-token';

export interface CSRFOptions {
  cookieName?: string;
  headerName?: string;
  tokenLength?: number;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  excludedPaths?: string[];
  excludedMethods?: string[];
}

const DEFAULT_OPTIONS: CSRFOptions = {
  cookieName: CSRF_TOKEN_COOKIE,
  headerName: CSRF_TOKEN_HEADER,
  tokenLength: 32,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  excludedPaths: ['/api/auth/callback', '/api/webhook'],
  excludedMethods: ['GET', 'HEAD', 'OPTIONS'],
};

function generateToken(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function generateCSRFToken(options: CSRFOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return generateToken(opts.tokenLength!);
}

export function setCSRFCookie(
  response: NextResponse,
  token: string,
  options: CSRFOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  response.cookies.set(opts.cookieName!, token, {
    httpOnly: true,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: '/',
    maxAge: 60 * 60 * 24,
  });
}

export function getCSRFTokenFromCookie(
  request: NextRequest,
  options: CSRFOptions = {}
): string | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return request.cookies.get(opts.cookieName!)?.value || null;
}

export function getCSRFTokenFromHeader(
  request: NextRequest,
  options: CSRFOptions = {}
): string | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return request.headers.get(opts.headerName!) || null;
}

export function isPathExcluded(path: string, excludedPaths: string[]): boolean {
  return excludedPaths.some((excludedPath) => {
    if (excludedPath.endsWith('*')) {
      return path.startsWith(excludedPath.slice(0, -1));
    }
    return path === excludedPath || path.startsWith(excludedPath + '/');
  });
}

export function validateCSRFToken(
  request: NextRequest,
  options: CSRFOptions = {}
): { valid: boolean; error?: string; newToken?: string } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const path = request.nextUrl.pathname;
  const method = request.method;

  if (opts.excludedMethods?.includes(method)) {
    return { valid: true };
  }

  if (isPathExcluded(path, opts.excludedPaths || [])) {
    return { valid: true };
  }

  const cookieToken = getCSRFTokenFromCookie(request, opts);
  const headerToken = getCSRFTokenFromHeader(request, opts);

  if (!cookieToken) {
    logger.warn('CSRF token missing from cookie', { path, method });
    return {
      valid: false,
      error: 'CSRF token missing',
      newToken: generateCSRFToken(opts),
    };
  }

  if (!headerToken) {
    logger.warn('CSRF token missing from header', { path, method });
    return {
      valid: false,
      error: 'CSRF token missing from request header',
    };
  }

  if (cookieToken !== headerToken) {
    logger.warn('CSRF token mismatch', { path, method });
    return {
      valid: false,
      error: 'Invalid CSRF token',
      newToken: generateCSRFToken(opts),
    };
  }

  return { valid: true };
}

export function createCSRFMiddleware(options: CSRFOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const validation = validateCSRFToken(request, opts);

    if (!validation.valid) {
      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: 'CSRF_ERROR',
            message: validation.error || 'CSRF validation failed',
          },
          timestamp: Date.now(),
        },
        { status: 403 }
      );

      if (validation.newToken) {
        setCSRFCookie(response, validation.newToken, opts);
        response.headers.set(opts.headerName!, validation.newToken);
      }

      return response;
    }

    return null;
  };
}

export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: CSRFOptions = {}
) {
  const csrfMiddleware = createCSRFMiddleware(options);

  return async (request: NextRequest): Promise<NextResponse> => {
    const csrfResponse = await csrfMiddleware(request);
    if (csrfResponse) {
      return csrfResponse;
    }

    const response = await handler(request);

    const newToken = generateCSRFToken(options);
    setCSRFCookie(response, newToken, options);
    response.headers.set(options.headerName || CSRF_TOKEN_HEADER, newToken);

    return response;
  };
}

export function createCSRFTokenResponse(options: CSRFOptions = {}): NextResponse {
  const token = generateCSRFToken(options);
  const response = NextResponse.json({
    success: true,
    data: { token },
    timestamp: Date.now(),
  });

  setCSRFCookie(response, token, options);
  response.headers.set(options.headerName || CSRF_TOKEN_HEADER, token);

  return response;
}

export { CSRF_TOKEN_HEADER, CSRF_TOKEN_COOKIE };
