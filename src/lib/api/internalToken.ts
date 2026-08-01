/**
 * @fileoverview Internal API request token
 * @description Generates and verifies HMAC-signed tokens used to identify
 * requests originating from the app's own UI.  The token is stored in an
 * HttpOnly + SameSite=Strict cookie so that:
 *
 *   1. JavaScript cannot read or forge the token (HttpOnly).
 *   2. The browser only sends the cookie for same-site requests (SameSite).
 *   3. External API callers (curl, Postman) never possess the cookie.
 *
 * This replaces the previous X-Internal-Request header check which could
 * be trivially spoofed by adding the header to any HTTP request.
 */

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('internalToken');

const COOKIE_NAME = '__internal';
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET;
  if (secret) {
    return secret;
  }

  // In production, a secret MUST be configured — a hardcoded fallback would
  // allow any attacker who knows the default to forge internal tokens.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('INTERNAL_API_SECRET (or CSRF_SECRET / JWT_SECRET) must be set in production');
  }

  // Dev-only fallback: derive from other available secrets so the mechanism
  // still works locally without extra configuration.
  const fallback = process.env.CSRF_SECRET || process.env.JWT_SECRET;
  if (fallback) {
    return fallback;
  }

  // Last resort for local development only — a predictable key is acceptable
  // when running on localhost with no real users.
  logger.warn(
    'INTERNAL_API_SECRET not set, using development-only fallback. Set INTERNAL_API_SECRET in production.'
  );
  return 'insight-internal-dev-only';
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true if the strings are equal, false otherwise.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to avoid leaking length information via timing.
    let _result = 1;
    for (let i = 0; i < a.length; i++) {
      _result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Create an HMAC-SHA256 signature of the given message using the internal secret.
 */
async function hmacSign(message: string): Promise<string> {
  const secret = getSecret();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  // Base64url without padding
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate a signed token: "hmac:timestamp".
 */
export async function generateInternalToken(): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await hmacSign(String(timestamp));
  return `${signature}:${timestamp}`;
}

/**
 * Verify a signed token.  Returns true if the signature is valid and
 * the timestamp is within TOKEN_TTL_SECONDS of the current time.
 */
export async function verifyInternalToken(token: string): Promise<boolean> {
  const sep = token.lastIndexOf(':');
  if (sep === -1) return false;

  const providedSig = token.slice(0, sep);
  const timestampStr = token.slice(sep + 1);
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) return false;

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > TOKEN_TTL_SECONDS || timestamp - now > 60) {
    // Token is too old or has a future timestamp beyond 60s clock skew
    return false;
  }

  // Recompute signature and compare in constant time to prevent timing attacks.
  const expectedSig = await hmacSign(timestampStr);
  return timingSafeEqual(providedSig, expectedSig);
}

/** The cookie name used to store the internal token. */
export const INTERNAL_COOKIE_NAME = COOKIE_NAME;

/** Cookie options for Set-Cookie header. */
export const INTERNAL_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: TOKEN_TTL_SECONDS,
};
