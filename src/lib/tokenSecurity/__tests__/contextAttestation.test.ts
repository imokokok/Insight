import { privateKeyToAccount } from 'viem/accounts';

import {
  CONTEXT_ATTESTATION_MANIFEST,
  canonicalJsonString,
  contextEntriesDigest,
  rawBodySha256,
  signContextAttestation,
  verifyContextAttestation,
  type ContextAttestation,
} from '../contextAttestation';

// Deterministic hardhat/anvil test key — never a production key.
const TEST_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

const RAW_BODY = JSON.stringify({ code: 1, result: { is_honeypot: '0' } });

function makeUnsignedEntry() {
  return {
    kind: 'third_party_token_scan',
    source: 'gopluslabs',
    request: {
      chainId: 8453,
      contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    },
    rawResponseSha256: rawBodySha256(RAW_BODY),
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

  it('signs and offline-verifies a single-entry attestation (roundtrip)', async () => {
    const signed = await signContextAttestation({
      entries: [makeUnsignedEntry()],
      capturedAt: '2026-10-12T15:00:00.000Z',
      transactionContext: '0xattestationuid',
    });
    expect(signed).not.toBeNull();
    expect(signed?.entries[0].priorSeal.manifest).toBe(CONTEXT_ATTESTATION_MANIFEST);

    const verification = await verifyContextAttestation(signed as ContextAttestation);
    expect(verification.valid).toBe(true);
    expect(verification.attester).toBe(
      privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`).address
    );
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
    const verification = await verifyContextAttestation(tampered);
    expect(verification.valid).toBe(false);
    expect(verification.reason).toBe('signature mismatch');
  });

  it('fails verification when the capturedAt envelope field is swapped', async () => {
    const signed = (await signContextAttestation({
      entries: [makeUnsignedEntry()],
      capturedAt: '2026-10-12T15:00:00.000Z',
      transactionContext: '0xattestationuid',
    })) as ContextAttestation;

    const swapped = { ...signed, capturedAt: '2026-10-12T16:00:00.000Z' };
    expect((await verifyContextAttestation(swapped)).valid).toBe(false);
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
