/**
 * Unit tests for the public `.well-known/oracle-keys.json` document.
 *
 * This is the "verification key at a well-known path" half of the published
 * attestation surface. It must expose the attester address(es) verifiers trust
 * plus the EIP-712 schema descriptors, with no auth. Verified against the test
 * attester key so the published address matches what signs the sample receipt.
 */

const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ATTESTER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

describe('.well-known/oracle-keys.json route', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
  });

  afterEach(() => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  });

  it('publishes the attester verification address and v2 schemas', async () => {
    const { GET } = await import('../route');
    const response = await GET(
      new Request('https://www.oracleinsight.xyz/.well-known/oracle-keys.json')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    // Trusted signer address is published.
    expect(body.public_keys).toEqual([
      expect.objectContaining({
        key_id: 'insight-oracle-safety-v2',
        public_key: TEST_ATTESTER,
        algorithm: 'EIP-712/secp256k1',
      }),
    ]);
    expect(body.attestation_enabled).toBe(true);

    // Both signed schema families are described.
    expect(body.schemas.OracleSafetyCheck.eip712.primaryType).toBe('OracleSafetyCheck');
    expect(body.schemas.OracleSafetyRecheck.eip712.primaryType).toBe('OracleSafetyRecheck');
    expect(body.schemas.CanonicalPreTradeRequest).toBeDefined();

    // Pointers to verify + sample so one URL is enough to integrate.
    expect(body.verify).toContain('/api/v1/safety/attestation/verify');
    expect(body.sample).toContain('/api/v1/safety/attestation/sample');
  });

  it('reports empty public_keys when the attester key is unconfigured', async () => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    jest.resetModules();

    const { GET } = await import('../route');
    const response = await GET(
      new Request('https://www.oracleinsight.xyz/.well-known/oracle-keys.json')
    );
    const body = await response.json();

    expect(body.public_keys).toEqual([]);
    expect(body.attestation_enabled).toBe(false);
  });
});
