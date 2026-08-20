/**
 * Unit tests for the fetchable signed sample receipt endpoint.
 *
 * The route wraps its handler in createApiHandler (auth/rate-limit/quota/CORS).
 * We unwrap that mock so the real signing logic runs: set the test attester key,
 * call GET, and assert the returned attestation is a genuine, verifiable
 * OracleSafetyCheck v2. A second case proves graceful-disable (503) when the
 * attester key is absent, matching the contract Michael asked for.
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
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
  });

  afterEach(() => {
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

  it('returns 503 when the attester key is unconfigured', async () => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
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
});
