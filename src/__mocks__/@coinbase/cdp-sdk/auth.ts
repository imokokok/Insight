/**
 * Jest-only mock for `@coinbase/cdp-sdk/auth`.
 *
 * The real module pulls in `jose` v6 (pure ESM), which jest's jsdom runtime
 * cannot require. JWT correctness is verified end-to-end against the live CDP
 * endpoint by `scripts/x402/cdp-auth-probe.mts`; unit tests only need the
 * wiring (path-keyed headers, fresh token per call), which this fake preserves.
 */
export async function generateJwt(_options: unknown): Promise<string> {
  const nonce = Buffer.from(String(Math.random())).toString('base64url');
  return `eyJhbGciOiJtb2NrIn0.${nonce}.bW9jay1zaWduYXR1cmU`;
}
