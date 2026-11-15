import { generateJwt } from '@coinbase/cdp-sdk/auth';

/**
 * Per-request Bearer JWT auth for the Coinbase Developer Platform (CDP) x402
 * facilitator (`https://api.cdp.coinbase.com/platform/v2/x402`).
 *
 * CDP requires a JWT scoped to the exact HTTP method + path on every call,
 * signed with a Secret API key (key id UUID + base64 secret). The official
 * `generateJwt` helper auto-detects the key format. Each JWT is short-lived
 * (2 minutes) and must be regenerated per request, so this callback is invoked
 * fresh by `HTTPFacilitatorClient` before every verify/settle/supported call.
 */

import { FACILITATOR_HOSTS } from './facilitators';

const CDP_FACILITATOR_URL = `https://${FACILITATOR_HOSTS.CDP}/platform/v2/x402`;
const CDP_CORRELATION_CONTEXT = 'sdkLanguage=typescript,source=insight';

/** Shape expected by `HTTPFacilitatorClient`'s `createAuthHeaders` option. */
export type FacilitatorAuthHeaders = {
  verify?: Record<string, string>;
  settle?: Record<string, string>;
  supported?: Record<string, string>;
  bazaar?: Record<string, string>;
};

/** CDP Secret API key credentials (from portal.cdp.coinbase.com → API Keys). */
export interface CdpApiKey {
  apiKeyId: string;
  apiKeySecret: string;
}

/**
 * Build the facilitator auth-headers callback for a CDP secret API key.
 * Every invocation returns freshly signed JWTs keyed by request path, as
 * required by the `HTTPFacilitatorClient` contract (a flat headers object
 * would silently drop auth and is rejected by the client).
 */
export function createCdpAuthHeaders(
  key: CdpApiKey,
  facilitatorUrl = CDP_FACILITATOR_URL
): () => Promise<FacilitatorAuthHeaders> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(facilitatorUrl);
  } catch {
    throw new Error(`Invalid CDP facilitator URL: ${facilitatorUrl}`);
  }
  const basePath = parsedUrl.pathname.replace(/\/$/, '');

  const makeHeader = async (method: string, path: string): Promise<Record<string, string>> => {
    const token = await generateJwt({
      apiKeyId: key.apiKeyId,
      apiKeySecret: key.apiKeySecret,
      requestMethod: method,
      requestHost: parsedUrl.host,
      requestPath: path,
      expiresIn: 120,
    });
    return {
      Authorization: `Bearer ${token}`,
      'Correlation-Context': CDP_CORRELATION_CONTEXT,
    };
  };

  return () =>
    Promise.all([
      makeHeader('POST', `${basePath}/verify`),
      makeHeader('POST', `${basePath}/settle`),
      makeHeader('GET', `${basePath}/supported`),
    ]).then(([verify, settle, supported]) => ({ verify, settle, supported }));
}

/**
 * Build static Bearer headers for facilitators that issue a server credential
 * rather than CDP's per-request JWT. The token remains server-only: callers
 * must source it from a non-public environment variable and never include it
 * in a payment requirement or response.
 */
export function createStaticBearerAuthHeaders(
  token: string
): () => Promise<FacilitatorAuthHeaders> {
  const authorization = { Authorization: `Bearer ${token}` };

  return async () => ({
    verify: authorization,
    settle: authorization,
    supported: authorization,
  });
}
