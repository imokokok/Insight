/**
 * Unit tests for the fetchable signed sample receipt endpoint.
 *
 * The route wraps its handler in createApiHandler (auth/rate-limit/quota/CORS).
 * We unwrap that mock so the real signing logic runs: set the test SAMPLE
 * signer key, call GET, and assert the returned attestation is a genuine,
 * verifiable OracleSafetyCheck v2 signed by the SAMPLE signer. A second case
 * proves graceful-disable (503) when the sample key is absent, matching the
 * contract Michael asked for — and since H8 the PRODUCTION key never signs a
 * sample (the third case pins that: production key alone is still 503).
 */

// Unwrap createApiHandler so GET is the raw handler (middleware is orthogonal
// to the signing contract under test). Keep the real ApiResponseBuilder.
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

describe('sample receipt route', () => {
  beforeEach(() => {
    jest.resetModules();
    // H8: samples are signed by the DEDICATED sample signer.
    process.env.ATTESTATION_SAMPLE_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
  });

  afterEach(() => {
    delete process.env.ATTESTATION_SAMPLE_SIGNER_PRIVATE_KEY;
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  });

  it('returns a freshly signed, verifiable OracleSafetyCheck v2', async () => {
    const { GET } = await import('../route');
    const { verifyAttestationV2 } = await import('@/lib/attestations/oracleSafetyAttestationV2');

    const response = await GET(new Request('https://www.oracleinsight.xyz'), {
      requestId: 'test',
    } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    const att = body.data.attestation;
    expect(att.schemaVersion).toBe(2);
    expect(att.attester).toBe(TEST_ATTESTER);
    expect(att.data.verdict).toBe('PASS');
    // Seven distinct non-derived providers → independence gate clears.
    expect(att.data.participantCount).toBe(7);
    expect(att.data.independenceStatus).toBe('ASSESSED');
    expect(att.data.coverageStatus).toBe('SUFFICIENT');

    // The returned receipt must verify against Insight's v2 verifier.
    const result = await verifyAttestationV2(att);
    expect(result.valid).toBe(true);
    expect(result.attester).toBe(TEST_ATTESTER);

    expect(body.data.wellKnown).toContain('/.well-known/oracle-keys.json');
    expect(body.data.verify).toContain('/api/v1/safety/attestation/verify');
  });

  it('returns 503 when the sample signer key is unconfigured', async () => {
    delete process.env.ATTESTATION_SAMPLE_SIGNER_PRIVATE_KEY;
    jest.resetModules();

    const { GET } = await import('../route');
    const response = await GET(new Request('https://www.oracleinsight.xyz'), {
      requestId: 'test',
    } as never);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('attestation_unavailable');
  });

  it('never signs a sample with the production attester key (H8)', async () => {
    // Only the PRODUCTION key is configured — the sample must still refuse
    // to sign, because a production-signed synthetic receipt is exactly the
    // H8 finding (a label beside the signature is not a property of it).
    delete process.env.ATTESTATION_SAMPLE_SIGNER_PRIVATE_KEY;
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
    jest.resetModules();

    const { GET } = await import('../route');
    const response = await GET(new Request('https://www.oracleinsight.xyz'), {
      requestId: 'test',
    } as never);

    expect(response.status).toBe(503);
  });
});
