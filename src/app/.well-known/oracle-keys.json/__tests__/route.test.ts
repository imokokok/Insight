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

  it('publishes the Oracle Watch schema so one URL is enough to verify a receipt', async () => {
    const { GET } = await import('../route');
    const response = await GET(
      new Request('https://www.oracleinsight.xyz/.well-known/oracle-keys.json')
    );
    const body = await response.json();

    // Watch is a separate EIP-712 domain from pre-trade. Its descriptor was the
    // missing half: a counterparty holding a Watch receipt had no published
    // types to verify it against.
    const watch = body.schemas.OracleWatchCheck;
    expect(watch.eip712.primaryType).toBe('OracleWatchCheck');
    expect(watch.eip712.domain.name).toBe('Insight Oracle Watch');
    expect(watch.schemaVersion).toBe(2);

    // v2 signs the independence gate and the reason codes — the field names must
    // be public or a holder cannot recompute the UID.
    const fields = watch.eip712.types.OracleWatchCheck.map((f: { name: string }) => f.name);
    expect(fields).toContain('sourceGroupCount');
    expect(fields).toContain('requiredSourceGroupCount');
    expect(fields).toContain('independenceSatisfied');
    expect(fields).toContain('reasonCodesHash');

    // Thresholds travel with the descriptor so a receipt is self-checking.
    expect(watch.gates.requiredParticipantCount).toBe(3);
    expect(watch.gates.requiredSourceGroupCount).toBe(2);

    // v1 stays published: receipts already in the wild must keep verifying.
    expect(body.schemas.OracleWatchCheckV1.schemaVersion).toBe(1);
    expect(body.schemas.OracleWatchCheckV1.retiredForSigning).toBe(true);

    // Separate pointers — the two surfaces must never be conflated.
    expect(body.watch_verify).toContain('/api/v1/oracle-watch/attestation/verify');
    expect(body.watch_sample).toContain('/api/v1/oracle-watch/attestation/sample');
    expect(body.verify).toContain('/api/v1/safety/attestation/verify');
  });

  it('publishes the Execution Receipt schema (the "did it fill faithfully" half)', async () => {
    const { GET } = await import('../route');
    const response = await GET(
      new Request('https://www.oracleinsight.xyz/.well-known/oracle-keys.json')
    );
    const body = await response.json();

    // The third distinct EIP-712 domain, published so a counterparty holding an
    // Execution Receipt has the types + gates to verify it without our source.
    const exec = body.schemas.ExecutionReceipt;
    expect(exec).toBeDefined();
    // v4 is the current signing layout (44 fields: v3's 43 + environment).
    expect(exec.schemaVersion).toBe(4);
    expect(exec.eip712.primaryType).toBe('ExecutionReceipt');
    expect(exec.eip712.domain.name).toBe('Insight Execution');
    expect(exec.eip712.domain.chainId).toBe(1);
    // H7: the domain is the frozen three-field one — v3's declared
    // domain-environment never entered the signature, so v4 signs the
    // deployment as the 44th message field instead.
    expect(exec.eip712.domain.environment).toBeUndefined();
    const execFields = exec.eip712.types.ExecutionReceipt.map((f: { name: string }) => f.name);
    expect(execFields).toHaveLength(44);
    expect(execFields[43]).toBe('environment');

    // Gate thresholds travel with the descriptor so a receipt is self-checking.
    expect(exec.gates.requiredParticipantCount).toBe(3);
    expect(exec.gates.requiredSourceGroupCount).toBe(2);
    expect(exec.gates.defaultMaxSlippageBps).toBe(50);

    // v3 stays published (frozen, retired for signing) under the three-field
    // domain its bytes really commit to; older layouts remain too.
    expect(body.schemas.ExecutionReceiptV3.schemaVersion).toBe(3);
    expect(body.schemas.ExecutionReceiptV3.retiredForSigning).toBe(true);
    expect(body.schemas.ExecutionReceiptV3.eip712.domain.environment).toBeUndefined();
    expect(body.schemas.ExecutionReceiptV2.retiredForSigning).toBe(true);
    expect(body.schemas.ExecutionReceiptV1.retiredForSigning).toBe(true);

    // Separate pointers — the execution domain must never be conflated with
    // pre-trade or watch.
    expect(body.execution_verify).toContain('/api/v1/execution/attestation/verify');
    expect(body.execution_sample).toContain('/api/v1/execution/attestation/sample');
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
