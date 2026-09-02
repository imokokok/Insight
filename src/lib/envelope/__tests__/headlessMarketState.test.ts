/**
 * Unit tests for Headless Oracle market-state receipt verification.
 *
 * The canonicalization rule (receipt minus `signature`, keys sorted, JSON)
 * and the Ed25519 verification are exercised against receipts signed with a
 * locally generated key — the same rule that was verified empirically
 * against the live v5.0 demo endpoint (2026-08-21). Tampering any signed
 * field must break verification, and key selection must fail closed on
 * unknown/inactive/wrong-algorithm registry entries.
 */

import { generateKeyPairSync, sign as ed25519Sign } from 'node:crypto';

import {
  canonicalJson,
  headlessSignedPayload,
  selectHeadlessSigningKey,
  verifyHeadlessMarketStateReceipt,
  verifyHeadlessMarketStateAgainstRegistry,
  fetchAndVerifyHeadlessMarketState,
  headlessTwoCopyMismatch,
  type HeadlessMarketStateReceipt,
  type HeadlessKeyRegistry,
} from '@/lib/envelope/headlessMarketState';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const PUBLIC_KEY_HEX = publicKey
  .export({ type: 'spki', format: 'der' })
  .subarray(-32)
  .toString('hex');

function buildReceipt(
  overrides: Partial<HeadlessMarketStateReceipt> = {}
): HeadlessMarketStateReceipt {
  const issued = new Date(Date.now() - 5_000);
  const expires = new Date(Date.now() + 55_000);
  const receipt: HeadlessMarketStateReceipt = {
    receipt_id: 'test-receipt-1',
    issued_at: issued.toISOString(),
    expires_at: expires.toISOString(),
    issuer: 'headlessoracle.com',
    mic: 'XCOI',
    status: 'OPEN',
    source: 'SCHEDULE',
    halt_detection: 'schedule_only',
    receipt_mode: 'demo',
    schema_version: 'v5.0',
    public_key_id: 'key_test_v1',
    signature: '',
    ...overrides,
  };
  // Sign with the empirically confirmed rule: payload minus signature, keys sorted.
  const { signature: _s, ...payload } = receipt;
  receipt.signature = ed25519Sign(
    null,
    Buffer.from(canonicalJson(payload), 'utf8'),
    privateKey
  ).toString('hex');
  return receipt;
}

const REGISTRY: HeadlessKeyRegistry = {
  keys: [
    {
      key_id: 'key_test_v1',
      algorithm: 'Ed25519',
      format: 'hex',
      public_key: PUBLIC_KEY_HEX,
      status: 'active',
    },
  ],
  issuer: 'headlessoracle.com',
};

describe('canonicalJson', () => {
  it('sorts object keys recursively, independent of insertion order', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it('preserves arrays as ordered', () => {
    expect(canonicalJson({ a: [3, 1, 2] })).toBe('{"a":[3,1,2]}');
  });
});

describe('headlessSignedPayload', () => {
  it('strips the signature field from the signed payload', () => {
    const payload = JSON.parse(headlessSignedPayload(buildReceipt()));
    expect(payload).not.toHaveProperty('signature');
    expect(payload.mic).toBe('XCOI');
    expect(payload.status).toBe('OPEN');
  });
});

describe('verifyHeadlessMarketStateReceipt', () => {
  it('accepts a genuinely signed, unexpired receipt', () => {
    const result = verifyHeadlessMarketStateReceipt(buildReceipt(), PUBLIC_KEY_HEX);
    expect(result.signatureValid).toBe(true);
    expect(result.expired).toBe(false);
  });

  it('rejects a receipt whose status was tampered after signing', () => {
    const receipt = buildReceipt({ status: 'OPEN' });
    receipt.status = 'CLOSED';
    const result = verifyHeadlessMarketStateReceipt(receipt, PUBLIC_KEY_HEX);
    expect(result.signatureValid).toBe(false);
  });

  it('rejects a receipt whose mic was tampered after signing', () => {
    const receipt = buildReceipt();
    receipt.mic = 'XNYS';
    expect(verifyHeadlessMarketStateReceipt(receipt, PUBLIC_KEY_HEX).signatureValid).toBe(false);
  });

  it('flags an expired receipt while the signature stays genuine', () => {
    const receipt = buildReceipt({
      issued_at: new Date(Date.now() - 120_000).toISOString(),
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    const result = verifyHeadlessMarketStateReceipt(receipt, PUBLIC_KEY_HEX);
    expect(result.signatureValid).toBe(true);
    expect(result.expired).toBe(true);
  });

  it('fails closed on malformed signature hex instead of throwing', () => {
    const receipt = buildReceipt();
    receipt.signature = 'not-hex';
    expect(verifyHeadlessMarketStateReceipt(receipt, PUBLIC_KEY_HEX).signatureValid).toBe(false);
  });
});

describe('selectHeadlessSigningKey', () => {
  it('selects the active Ed25519 hex key matching the receipt key_id', () => {
    expect(selectHeadlessSigningKey(REGISTRY, 'key_test_v1')?.public_key).toBe(PUBLIC_KEY_HEX);
  });

  it('returns null for an unknown key_id (rotated away or forged)', () => {
    expect(selectHeadlessSigningKey(REGISTRY, 'key_2026_v9')).toBeNull();
  });

  it('returns null for an inactive key', () => {
    const revoked: HeadlessKeyRegistry = {
      keys: [{ ...REGISTRY.keys[0], status: 'revoked' }],
    };
    expect(selectHeadlessSigningKey(revoked, 'key_test_v1')).toBeNull();
  });

  it('returns null for a non-Ed25519 key', () => {
    const wrongAlgo: HeadlessKeyRegistry = {
      keys: [{ ...REGISTRY.keys[0], algorithm: 'ES256' }],
    };
    expect(selectHeadlessSigningKey(wrongAlgo, 'key_test_v1')).toBeNull();
  });
});

describe('verifyHeadlessMarketStateAgainstRegistry', () => {
  it('validates a live receipt end to end', () => {
    const result = verifyHeadlessMarketStateAgainstRegistry(buildReceipt(), REGISTRY);
    expect(result.valid).toBe(true);
    expect(result.mic).toBe('XCOI');
    expect(result.status).toBe('OPEN');
    expect(result.keyId).toBe('key_test_v1');
  });

  it('reports signing_key_unavailable when the key is not in the registry', () => {
    const receipt = buildReceipt({ public_key_id: 'key_unknown' });
    const result = verifyHeadlessMarketStateAgainstRegistry(receipt, REGISTRY);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('signing_key_unavailable');
  });
});

describe('headlessTwoCopyMismatch', () => {
  const receipt = buildReceipt();

  it('returns null for the flattened shape (no nested receipt copy)', () => {
    expect(headlessTwoCopyMismatch({ ...receipt })).toBeNull();
  });

  it('returns null when every top-level copy equals the signed receipt object', () => {
    expect(headlessTwoCopyMismatch({ ...receipt, receipt })).toBeNull();
  });

  it('flags a top-level-only status tamper (CC-14a shape), naming both values', () => {
    const mismatch = headlessTwoCopyMismatch({ ...receipt, status: 'CLOSED', receipt });
    expect(mismatch).toMatch(/two_copy_mismatch/);
    expect(mismatch).toContain("field 'status'");
    expect(mismatch).toContain('top-level="CLOSED"');
    expect(mismatch).toContain('receipt="OPEN"');
  });

  it('flags a top-level-only signature tamper as well', () => {
    const mismatch = headlessTwoCopyMismatch({ ...receipt, signature: '00'.repeat(64), receipt });
    expect(mismatch).toContain("field 'signature'");
  });
});

describe('fetchAndVerifyHeadlessMarketState', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.HEADLESS_ORACLE_BASE_URL;
  });

  it('fetches receipt + registry and verifies locally', async () => {
    process.env.HEADLESS_ORACLE_BASE_URL = 'https://headless.test';
    const receipt = buildReceipt();
    global.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v5/demo')) {
        return new Response(JSON.stringify({ ...receipt, receipt }), { status: 200 });
      }
      if (url.includes('oracle-keys.json')) {
        return new Response(JSON.stringify(REGISTRY), { status: 200 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    const side = await fetchAndVerifyHeadlessMarketState('XCOI');
    expect(side.envelope).not.toBeNull();
    expect(side.result.valid).toBe(true);
    expect(side.result.status).toBe('OPEN');
  });

  it('returns a structured fail-closed result when the endpoint is unreachable', async () => {
    process.env.HEADLESS_ORACLE_BASE_URL = 'https://headless.test';
    global.fetch = (async () => {
      throw new Error('network unreachable');
    }) as typeof fetch;

    const side = await fetchAndVerifyHeadlessMarketState('XCOI');
    expect(side.envelope).toBeNull();
    expect(side.result.valid).toBe(false);
    expect(side.result.reason).toContain('fetch_failed');
  });

  it('fails closed on a top-level-only tamper before touching crypto (kit CC-14a)', async () => {
    process.env.HEADLESS_ORACLE_BASE_URL = 'https://headless.test';
    const receipt = buildReceipt();
    global.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v5/demo')) {
        // Top-level convenience copy flipped; the signed receipt object is untouched.
        return new Response(JSON.stringify({ ...receipt, status: 'CLOSED', receipt }), {
          status: 200,
        });
      }
      if (url.includes('oracle-keys.json')) {
        return new Response(JSON.stringify(REGISTRY), { status: 200 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    const side = await fetchAndVerifyHeadlessMarketState('XCOI');
    expect(side.envelope).not.toBeNull();
    expect(side.result.valid).toBe(false);
    expect(side.result.signatureValid).toBe(false);
    expect(side.result.reason).toMatch(/two_copy_mismatch: field 'status'/);
  });
});
