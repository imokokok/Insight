const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

describe('ExecutionReceipt production schema retirement', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
  });

  afterEach(() => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  });

  it('keeps production issuance on v5 when a retired layout is requested', async () => {
    const mod = await import('../executionReceipt');
    const receipt = await mod.signExecutionReceipt({
      schemaVersion: 4,
      preTradeUid: `0x${'1'.repeat(64)}`,
      requestHash: `0x${'2'.repeat(64)}`,
      preTradeSignedAt: 1_700_000_000,
      preTradeValidUntil: 1_700_000_600,
      bindingMode: 'VERIFIED',
      sourceAssetId: 'eip155:1/slip44:60',
      destinationAssetId: 'eip155:1/slip44:0',
      subjectChainId: 1,
      settlementChainId: 1,
      action: 'swap',
      quotedPrice: 3000,
      executedPrice: 3001,
      quotedAmountUsd: 1000,
      executedAmountUsd: 1000,
      actualFeeUsd: 1,
      fillStatus: 'FULL',
      txHash: `0x${'a'.repeat(64)}`,
      blockNumber: 21_000_000,
      executedAt: 1_700_000_010,
      oracleDataAgeAtExecSeconds: 10,
      participantCount: 4,
      sourceGroupCount: 2,
      mevRiskScore: 0.01,
      reasonCodes: [],
    });

    expect(receipt).not.toBeNull();
    expect(receipt!.schemaVersion).toBe(5);
    expect(receipt!.data.profileId).toBe(mod.CURRENT_EXECUTION_PROFILE_ID);
    expect(receipt!.eip712.types).toEqual(mod.EXECUTION_TYPES_V5);
  });
});
