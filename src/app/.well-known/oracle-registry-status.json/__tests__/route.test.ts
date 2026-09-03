/**
 * Unit tests for the public registry status artifact.
 *
 * The artifact self-fetches the registry to hash the exact bytes it binds, so
 * global.fetch is stubbed with a fixed body. Cases:
 *   1. happy path: 200, state V3_ACTIVE, successor sha256 == sha256 of the
 *      stubbed registry bytes, and the EIP-712 signature recovers to the
 *      configured ATTESTER over the artifact's own domain/primaryType;
 *   2. fail-closed 503 when no attester key is configured;
 *   3. fail-closed 503 when the registry self-fetch fails (no binding to
 *      bytes we cannot name).
 */

const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ATTESTER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

const REGISTRY_BODY = JSON.stringify({
  issuer: 'https://test.local',
  public_keys: [
    {
      key_id: 'insight-oracle-safety-v2-202609',
      public_key: TEST_ATTESTER,
      role: 'attester',
      validFrom: '2026-08-26T17:35:36.000Z',
      validUntil: null,
      revoked: false,
    },
    {
      key_id: 'insight-oracle-safety-sample',
      public_key: '0x0000000000000000000000000000000000000001',
      role: 'sample',
      validFrom: '2026-09-03',
      validUntil: null,
      revoked: false,
    },
  ],
  revoked_keys: [],
});

describe('oracle-registry-status.json route', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_APP_URL = 'https://test.local';
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
    global.fetch = jest.fn().mockResolvedValue(
      new Response(REGISTRY_BODY, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    global.fetch = originalFetch;
  });

  it('serves a signed V3_ACTIVE artifact binding the exact registry bytes', async () => {
    const { GET } = await import('../route');
    const { createHash } = await import('crypto');
    const { verifyTypedData, hashTypedData } = await import('viem');

    const response = await GET(new Request('https://test.local') as never);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.schema).toBe('oracleinsight.oracle-registry-status.v1');
    expect(body.state).toBe('V3_ACTIVE');
    expect(body.requestRef).toBe('zap1-oracle-insight-registry-status-20260902');

    // Predecessor binding is the fixed 2026-08-31 snapshot the requester admitted.
    expect(body.registryBinding.predecessor.rawSha256).toBe(
      '0x42be76e202a6db2058b5778677bc08145b3acdd8bd94e4909c652ee0643cc6a4'
    );

    // Successor binding must equal the sha256 of the bytes actually served.
    const expected = `0x${createHash('sha256').update(REGISTRY_BODY, 'utf8').digest('hex')}`;
    expect(body.registryBinding.successor.rawSha256).toBe(expected);

    // The nine bound fields are present and non-empty.
    const signed = body.signature.eip712.message;
    for (const field of [
      'state',
      'requestRef',
      'issuer',
      'predecessorRegistrySha256',
      'successorRegistrySha256',
      'assertedAt',
      'activationUtc',
      'activeSchema',
      'v2SigningContinues',
      'retiredForSigningSemantics',
      'requiredSourceGroupCountSemantics',
      'signerAndRevocationContinuity',
      'divergenceRollbackBehavior',
    ]) {
      expect(signed[field]).toBeDefined();
    }
    expect(signed.v2SigningContinues).toBe(false);

    // The signature verifies over the artifact's own domain/primaryType, and
    // the domain is NOT any receipt family (no cross-surface replay).
    expect(body.signature.eip712.domain.name).toBe('Insight Oracle Registry Status');
    expect(body.signature.eip712.primaryType).toBe('OracleRegistryStatus');
    expect(body.signature.attester).toBe(TEST_ATTESTER);
    expect(body.signature.uid).toBe(
      hashTypedData({
        domain: body.signature.eip712.domain,
        types: body.signature.eip712.types,
        primaryType: body.signature.eip712.primaryType,
        message: signed,
      })
    );
    await expect(
      verifyTypedData({
        domain: body.signature.eip712.domain,
        types: body.signature.eip712.types,
        primaryType: body.signature.eip712.primaryType,
        message: signed,
        address: TEST_ATTESTER,
        signature: body.signature.signature,
      })
    ).resolves.toBe(true);
  });

  it('fails closed (503) when no attester key is configured', async () => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    jest.resetModules();

    const { GET } = await import('../route');
    const response = await GET(new Request('https://test.local') as never);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe('registry_status_unavailable');
  });

  it('fails closed (503) when the registry self-fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('not found', { status: 404 }));

    const { GET } = await import('../route');
    const response = await GET(new Request('https://test.local') as never);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe('registry_status_unavailable');
  });
});
