/**
 * Live probe for the CDP x402 facilitator auth chain.
 *
 * Signs a path-scoped Bearer JWT with a CDP Secret API key and calls
 * GET /platform/v2/x402/supported. Confirms credentials, key format
 * auto-detection, and that the facilitator advertises the "bazaar" extension
 * for the configured network.
 *
 * Usage (credentials from env, never hardcoded):
 *   CDP_API_KEY_ID=... CDP_API_KEY_SECRET=... node scripts/x402/cdp-auth-probe.mjs
 *
 * Network note: api.cdp.coinbase.com may be DNS-poisoned on some networks;
 * route through a working proxy, e.g.
 *   HTTPS_PROXY=http://127.0.0.1:7890 node scripts/x402/cdp-auth-probe.mjs
 */
import { generateJwt } from '@coinbase/cdp-sdk/auth';

const apiKeyId = process.env.CDP_API_KEY_ID;
const apiKeySecret = process.env.CDP_API_KEY_SECRET;
if (!apiKeyId || !apiKeySecret) {
  console.error('Set CDP_API_KEY_ID and CDP_API_KEY_SECRET in the environment.');
  process.exit(1);
}
const proxyUrl = process.env.HTTPS_PROXY ?? process.env.https_proxy ?? process.env.HTTP_PROXY;

const token = await generateJwt({
  apiKeyId,
  apiKeySecret,
  requestMethod: 'GET',
  requestHost: 'api.cdp.coinbase.com',
  requestPath: '/platform/v2/x402/supported',
  expiresIn: 120,
});
console.log('JWT_OK length=' + token.length);

let dispatcher;
if (proxyUrl) {
  const { ProxyAgent } = await import('undici');
  dispatcher = new ProxyAgent(proxyUrl);
}
const res = await fetch('https://api.cdp.coinbase.com/platform/v2/x402/supported', {
  headers: { Authorization: `Bearer ${token}` },
  ...(dispatcher ? { dispatcher } : {}),
});
console.log('HTTP', res.status);
const body = await res.text();
console.log(body.slice(0, 800));
