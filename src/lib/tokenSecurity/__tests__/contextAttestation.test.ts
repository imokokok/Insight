import { privateKeyToAccount } from 'viem/accounts';

import { verifyContextAttestation as verifyPortableContextAttestation } from '../../../../verifier/src/contextAttestation';
import {
  CONTEXT_ATTESTATION_MANIFEST,
  CONTEXT_ATTESTATION_V1_MANIFEST,
  canonicalJsonString,
  contextEntriesDigest,
  normalizeTokenSecurityView,
  rawBodySha256,
  signContextAttestation,
  tokenSecurityViewSha256,
  verifyContextAttestation,
  type ContextAttestation,
  type TokenSecurityView,
} from '../contextAttestation';

// Deterministic hardhat/anvil test key — never a production key.
const TEST_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

const RAW_BODY = JSON.stringify({ code: 1, result: { is_honeypot: '0' } });
const RAW_HASH = rawBodySha256(RAW_BODY);

function makeTokenSecurityView(overrides: Record<string, unknown> = {}): TokenSecurityView {
  const view = normalizeTokenSecurityView({
    schema: 'insight.token-security-view.v1',
    sourcedFrom: 'gopluslabs',
    rawHash: RAW_HASH,
    advisory: true,
    isHoneypot: false,
    buyTaxPct: 0,
    sellTaxPct: 0,
    tokenSymbol: 'USD Coin',
    ...overrides,
  });
  if (!view) throw new Error('Test token-security view is invalid');
  return view;
}

function makeUnsignedEntry() {
  const view = makeTokenSecurityView();
  return {
    kind: 'third_party_token_scan',
    source: 'gopluslabs',
    request: {
      chainId: 8453,
      contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    },
    rawResponseSha256: RAW_HASH,
    normalizedResultSha256: tokenSecurityViewSha256(view),
    retrievedAt: '2026-10-12T15:00:00.000Z',
    toolVersion: 'goplus.token_security.v1',
    authorization: 'public-source.advisory-only.v1',
    latencyMs: 120,
    transactionContext: '0xattestationuid',
  };
}

describe('canonicalJsonString / digests', () => {
  it('sorts object keys recursively so the digest is order-stable', () => {
    const a = canonicalJsonString({ b: 1, a: { d: 2, c: [3, { z: 1, y: 2 }] } });
    const b = canonicalJsonString({ a: { c: [3, { y: 2, z: 1 }], d: 2 }, b: 1 });
    expect(a).toBe(b);
  });

  it('rejects values JSON would silently omit or coerce', () => {
    expect(() => canonicalJsonString({ field: undefined })).toThrow('not JSON serializable');
    expect(() => canonicalJsonString({ field: Number.NaN })).toThrow('Non-finite');
    expect(() => canonicalJsonString(JSON.parse('{"__proto__":{"polluted":true}}'))).toThrow(
      'Unsafe JSON object key'
    );
  });

  it('digests different entry content to different digests', () => {
    const entry = makeUnsignedEntry();
    const tampered = { ...entry, retrievedAt: '2026-10-12T16:00:00.000Z' };
    expect(contextEntriesDigest([entry])).not.toBe(contextEntriesDigest([tampered]));
  });
});

describe('signContextAttestation / verifyContextAttestation', () => {
  beforeAll(() => {
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
  });

  afterAll(() => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  });

  it('signs and verifies both the capture and normalized view digest', async () => {
    const signed = await signContextAttestation({
      entries: [makeUnsignedEntry()],
      capturedAt: '2026-10-12T15:00:00.000Z',
      transactionContext: '0xattestationuid',
    });
    expect(signed).not.toBeNull();
    expect(signed?.entries[0].priorSeal.manifest).toBe(CONTEXT_ATTESTATION_MANIFEST);
    expect(signed?.schemaVersion).toBe(2);

    const verification = await verifyContextAttestation(
      signed as ContextAttestation,
      makeTokenSecurityView()
    );
    expect(verification.valid).toBe(true);
    expect(verification.resultLinked).toBe(true);
    expect(verification.code).toBe('ok');
    expect(verification.attester).toBe(
      privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`).address
    );
  });

  it('verifies the app signature independently in the portable package against a trusted key snapshot', async () => {
    const signed = (await signContextAttestation({
      entries: [makeUnsignedEntry()],
      capturedAt: '2026-10-12T15:00:00.000Z',
      transactionContext: '0xattestationuid',
    })) as ContextAttestation;
    const attester = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`).address;

    const result = await verifyPortableContextAttestation(signed, makeTokenSecurityView(), {
      keyRegistry: {
        keys: [
          {
            key_id: 'test-attester',
            public_key: attester,
            validFrom: '2026-01-01T00:00:00.000Z',
            validUntil: null,
            revoked: false,
            role: 'attester',
          },
        ],
      },
    });

    expect(result.valid).toBe(true);
    expect(result.accepted).toBe(true);
    expect(result.resultLinked).toBe(true);
    expect(result.sourceBodyRecomputed).toBe(false);
    expect(result.keyStatus).toBe('valid');
  });

  it('fails closed when the V2 normalized view is missing or changed', async () => {
    const signed = (await signContextAttestation({
      entries: [makeUnsignedEntry()],
      capturedAt: '2026-10-12T15:00:00.000Z',
      transactionContext: '0xattestationuid',
    })) as ContextAttestation;

    expect((await verifyContextAttestation(signed)).code).toBe('result_view_missing');
    const changedView = makeTokenSecurityView({ holderCount: 10 });
    const verification = await verifyContextAttestation(signed, changedView);
    expect(verification.valid).toBe(false);
    expect(verification.resultLinked).toBe(false);
    expect(verification.code).toBe('result_digest_mismatch');
  });

  it('fails verification when any signed field is tampered with', async () => {
    const signed = (await signContextAttestation({
      entries: [makeUnsignedEntry()],
      capturedAt: '2026-10-12T15:00:00.000Z',
      transactionContext: '0xattestationuid',
    })) as ContextAttestation;

    const tampered: ContextAttestation = {
      ...signed,
      entries: [
        {
          ...signed.entries[0],
          rawResponseSha256: rawBodySha256('{"code":1,"result":{}}'),
        },
      ],
    };
    const verification = await verifyContextAttestation(tampered, makeTokenSecurityView());
    expect(verification.valid).toBe(false);
    expect(verification.code).toBe('signature_invalid');
  });

  it('fails verification when the capturedAt envelope field is swapped', async () => {
    const signed = (await signContextAttestation({
      entries: [makeUnsignedEntry()],
      capturedAt: '2026-10-12T15:00:00.000Z',
      transactionContext: '0xattestationuid',
    })) as ContextAttestation;

    const swapped = { ...signed, capturedAt: '2026-10-12T16:00:00.000Z' };
    expect((await verifyContextAttestation(swapped, makeTokenSecurityView())).valid).toBe(false);
  });

  it('continues to verify legacy V1 signatures while marking their view unlinked', async () => {
    const account = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`);
    const legacyEntry = {
      kind: 'third_party_token_scan',
      source: 'gopluslabs',
      request: {
        chainId: 8453,
        contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      },
      rawResponseSha256: RAW_HASH,
      retrievedAt: '2026-10-12T15:00:00.000Z',
      transactionContext: '0xattestationuid',
    };
    const capturedAt = '2026-10-12T15:00:00.000Z';
    const signature = await account.signTypedData({
      domain: { name: 'InsightContextAttestation', version: '1' },
      types: {
        ContextAttestationManifest: [
          { name: 'manifest', type: 'string' },
          { name: 'schemaVersion', type: 'uint256' },
          { name: 'capturedAt', type: 'string' },
          { name: 'entriesDigest', type: 'bytes32' },
          { name: 'transactionContext', type: 'string' },
        ],
      },
      primaryType: 'ContextAttestationManifest',
      message: {
        manifest: CONTEXT_ATTESTATION_V1_MANIFEST,
        schemaVersion: 1n,
        capturedAt,
        entriesDigest: contextEntriesDigest([legacyEntry]),
        transactionContext: legacyEntry.transactionContext,
      },
    });
    const legacy: ContextAttestation = {
      schemaVersion: 1,
      capturedAt,
      entries: [
        {
          ...legacyEntry,
          priorSeal: {
            manifest: CONTEXT_ATTESTATION_V1_MANIFEST,
            signature,
            keyId: account.address,
          },
        },
      ],
    };

    const verification = await verifyContextAttestation(legacy, makeTokenSecurityView());
    expect(verification.valid).toBe(true);
    expect(verification.resultLinked).toBe(false);
    expect(verification.code).toBe('signature_valid_result_unlinked');
  });

  it('returns null (fail-closed) when no attester key is configured', async () => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    // attesterAccount caches per process; a fresh module registry is needed.
    jest.resetModules();
    const { signContextAttestation: freshSign } = await import('../contextAttestation');
    const signed = await freshSign({
      entries: [makeUnsignedEntry()],
      capturedAt: '2026-10-12T15:00:00.000Z',
    });
    expect(signed).toBeNull();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
  });
});
