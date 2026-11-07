/**
 * Single source of truth for `Access-Control-Expose-Headers`.
 *
 * A bare unsigned 402 carries four advisory `x-insight-*` hints. A browser
 * based agent can only read them when the responding surface also lists them
 * in its CORS expose list. Three separate surfaces rebuild that list from
 * different response objects: the generic REST handler, the MCP HTTP
 * transport, and the MPP pre-trade bridge (whose `mergeChallenges()` replaces
 * the header wholesale on a quote). A hardcoded copy in any one of them
 * silently hides the hints, so derive every list from here instead.
 *
 * Keep this module dependency free. The REST handler and the MPP bridge sit
 * on opposite sides of the x402 guard import graph; importing that guard from
 * here would pull server-only payment and Supabase dependencies into every
 * API route.
 */

import { CREDIT_BILLING_HEADER_NAMES } from '@/lib/billing/billingHeaders';

/** Advisory header names emitted by `x402OnboardingHeaders()` on a bare 402. */
export const X402_ONBOARDING_HEADER_NAMES = [
  'x-insight-entry-source-hint',
  'x-insight-quickstart',
  'x-insight-mcp-install',
  'x-insight-no-wallet',
] as const;

export type X402OnboardingHeaderName = (typeof X402_ONBOARDING_HEADER_NAMES)[number];

/** Diagnostic, credit, and payment headers shared by REST and MPP responses. */
const BASE_CORS_EXPOSE_HEADERS = [
  'X-Request-Id',
  'Server-Timing',
  'X-UVD-Purchase',
  'Retry-After',
  'PAYMENT-REQUIRED',
  'PAYMENT-RESPONSE',
  'WWW-Authenticate',
  'Payment-Receipt',
  'Payment-Settlement-Status',
  ...CREDIT_BILLING_HEADER_NAMES,
] as const;

/**
 * Build a comma-separated expose list. Surface-specific names come first;
 * duplicates are removed, so a transport can safely add its own headers
 * without knowing what the shared baseline already contains.
 */
export function corsExposeHeaders(...extraNames: string[]): string {
  return [
    ...new Set([...extraNames, ...BASE_CORS_EXPOSE_HEADERS, ...X402_ONBOARDING_HEADER_NAMES]),
  ].join(', ');
}
