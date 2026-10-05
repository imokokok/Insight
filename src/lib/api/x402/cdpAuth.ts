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

const CDP_API_HOST = 'api.cdp.coinbase.com';
const CDP_X402_BASE_PATH = '/platform/v2/x402';

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
export function createCdpAuthHeaders(key: CdpApiKey): () => Promise<FacilitatorAuthHeaders> {
  const makeHeader = async (method: string, path: string): Promise<Record<string, string>> => {
    const token = await generateJwt({
      apiKeyId: key.apiKeyId,
      apiKeySecret: key.apiKeySecret,
      requestMethod: method,
      requestHost: CDP_API_HOST,
      requestPath: path,
      expiresIn: 120,
    });
    return { Authorization: `Bearer ${token}` };
  };

  return () =>
    Promise.all([
      makeHeader('POST', `${CDP_X402_BASE_PATH}/verify`),
      makeHeader('POST', `${CDP_X402_BASE_PATH}/settle`),
      makeHeader('GET', `${CDP_X402_BASE_PATH}/supported`),
    ]).then(([verify, settle, supported]) => ({ verify, settle, supported }));
}
