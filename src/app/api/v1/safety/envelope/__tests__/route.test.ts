/**
 * Unit tests for the pre-trade envelope prototype endpoint.
 *
 * Unwraps createApiHandler so the real gate logic runs: the Insight side is
 * signed by a real test attester key, the Headless Oracle side is served by a
 * mocked fetch returning receipts signed with a locally generated Ed25519 key
 * (the same rule verified against the live endpoint). The suite proves the
 * four behaviors Michael asked for: live conjunction, and the gate going red
 * on an expired receipt, a tampered price receipt, and a tampered
 * market-state receipt — plus fail-closed when either side is unreachable.
 */

import { generateKeyPairSync, sign as ed25519Sign } from 'node:crypto';

import {
  canonicalJson,
  type HeadlessMarketStateReceipt,
  type HeadlessKeyRegistry,
} from '@/lib/envelope/headlessMarketState';

// Unwrap createApiHandler so GET is the raw handler (middleware is orthogonal
// to the gate contract under test). Keep the real ApiResponseBuilder.
jest.mock('@/lib/api/handler', () => {
  const actual = jest.requireActual('@/lib/api/handler');
  return {
    ...actual,
    createApiHandler: (handler: unknown) => handler,
    createOptionsHandler: () => () => new Response(null, { status: 204 }),
    ApiResponseBuilder: actual.ApiResponseBuilder,
  };
});

const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ATTESTER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const HEADLESS_PUB_HEX = publicKey
  .export({ type: 'spki', format: 'der' })
  .subarray(-32)
  .toString('hex');

const HEADLESS_REGISTRY: HeadlessKeyRegistry = {
  keys: [
    {
      key_id: 'key_test_v1',
      algorithm: 'Ed25519',
      format: 'hex',
      public_key: HEADLESS_PUB_HEX,
      status: 'active',
    },
  ],
  issuer: 'headlessoracle.com',
};

/** Fresh, genuinely signed OPEN receipt for XCOI (60s window). */
function buildHeadlessReceipt(): HeadlessMarketStateReceipt {
  const now = Date.now();
  const receipt: HeadlessMarketStateReceipt = {
    receipt_id: `route-test-${now}`,
    issued_at: new Date(now - 5_000).toISOString(),
    expires_at: new Date(now + 55_000).toISOString(),
    issuer: 'headlessoracle.com',
    mic: 'XCOI',
    status: 'OPEN',
    source: 'SCHEDULE',
    halt_detection: 'schedule_only',
    receipt_mode: 'demo',
    schema_version: 'v5.0',
    public_key_id: 'key_test_v1',
    signature: '',
  };
  const { signature: _s, ...payload } = receipt;
  receipt.signature = ed25519Sign(
    null,
    Buffer.from(canonicalJson(payload), 'utf8'),
    privateKey
  ).toString('hex');
  return receipt;
}

/** Serve the Headless side: demo receipt + key registry. `breakNetwork`
 * simulates the venue being unreachable (envelope must fail closed). */
function mockHeadlessFetch(opts: { breakNetwork?: boolean } = {}) {
  const receipt = buildHeadlessReceipt();
  const impl = async (input: RequestInfo | URL) => {
    if (opts.breakNetwork) throw new Error('network unreachable');
    const url = String(input);
    if (url.includes('/v5/demo')) {
      return new Response(JSON.stringify({ ...receipt, receipt }), { status: 200 });
    }
    if (url.includes('oracle-keys.json')) {
      return new Response(JSON.stringify(HEADLESS_REGISTRY), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${url}`);
  };
  global.fetch = impl as typeof fetch;
  return receipt;
}

async function callGet(query = '') {
  const { GET } = await import('../route');
  return GET(new Request(`https://www.oracleinsight.xyz/api/v1/safety/envelope${query}`), {
    requestId: 'test',
  } as never);
}

describe('pre-trade envelope prototype route', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
    process.env.HEADLESS_ORACLE_BASE_URL = 'https://headless.test';
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.oracleinsight.xyz';
  });

  afterEach(() => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    delete process.env.HEADLESS_ORACLE_BASE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    global.fetch = originalFetch;
  });

  it('live: PASSes when both receipts verify — both members fully green', async () => {
    mockHeadlessFetch();
    const response = await callGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.envelope.verdict).toBe('PASS');
    expect(body.data.envelope.failClosed).toBe(true);
    expect(body.data.envelope.reasonCodes).toEqual([]);
    expect(body.data.demoMode).toBe('live');

    const price = body.data.priceIntegrity;
    expect(price.receipt.attester).toBe(TEST_ATTESTER);
    expect(price.receipt.data.verdict).toBe('PASS');
    expect(price.verification.valid).toBe(true);

    const market = body.data.marketState;
    expect(market.verification.valid).toBe(true);
    expect(market.verification.status).toBe('OPEN');
    expect(market.keyRegistry).toContain('oracle-keys.json');
  });

  it('demo=expired: BLOCKs with price_integrity_expired although the signature is genuine', async () => {
    mockHeadlessFetch();
    const response = await callGet('?demo=expired');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.envelope.verdict).toBe('BLOCK');
    expect(body.data.envelope.reasonCodes).toContain('price_integrity_expired');
    // The receipt was really signed — only its validity window lapsed.
    expect(body.data.priceIntegrity.verification.reason).toBe('expired');
    expect(body.data.envelope.members.priceIntegrity.signatureValid).toBe(true);
  });

  it('demo=tampered: BLOCKs with price_integrity_signature_invalid (uid mismatch)', async () => {
    mockHeadlessFetch();
    const response = await callGet('?demo=tampered');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.envelope.verdict).toBe('BLOCK');
    expect(body.data.envelope.reasonCodes).toContain('price_integrity_signature_invalid');
    expect(body.data.priceIntegrity.verification.reason).toContain('uid_mismatch');
    // The forged verdict is visible in the echoed receipt.
    expect(body.data.priceIntegrity.receipt.data.verdict).toBe('PASS-FORGED');
  });

  it('demo=tampered-market: BLOCKs with market_state_signature_invalid', async () => {
    mockHeadlessFetch();
    const response = await callGet('?demo=tampered-market');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.envelope.verdict).toBe('BLOCK');
    expect(body.data.envelope.reasonCodes).toContain('market_state_signature_invalid');
    expect(body.data.marketState.verification.reason).toBe('signature_invalid');
    // The tampered status is visible in the echoed receipt.
    expect(body.data.marketState.receipt.status).toBe('CLOSED');
  });

  it('fails closed with market_state_missing when the venue is unreachable', async () => {
    mockHeadlessFetch({ breakNetwork: true });
    const response = await callGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.envelope.verdict).toBe('BLOCK');
    expect(body.data.envelope.reasonCodes).toContain('market_state_missing');
    expect(body.data.marketState.verification.reason).toContain('fetch_failed');
  });

  it('fails closed with price_integrity_missing when the attester key is unconfigured', async () => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    jest.resetModules();
    mockHeadlessFetch();
    const response = await callGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.envelope.verdict).toBe('BLOCK');
    expect(body.data.envelope.reasonCodes).toContain('price_integrity_missing');
    expect(body.data.priceIntegrity.receipt).toBeNull();
  });

  it('rejects an unknown demo mode with 400', async () => {
    mockHeadlessFetch();
    const response = await callGet('?demo=checkout-bypass');
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('invalid_demo_mode');
  });

  it('rejects a malformed mic with 400', async () => {
    mockHeadlessFetch();
    const response = await callGet('?mic=banana');
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('invalid_mic');
  });
});
