import type { ExecutionReceiptInput } from '@/lib/attestations/executionReceipt';

const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const NOW_S = 1_700_000_000;

function receiptInput(): ExecutionReceiptInput {
  return {
    preTradeUid: `0x${'1'.repeat(64)}`,
    requestHash: `0x${'2'.repeat(64)}`,
    preTradeSignedAt: NOW_S - 3,
    preTradeValidUntil: NOW_S + 597,
    bindingMode: 'VERIFIED',
    sourceAssetId: 'eip155:1/slip44:60',
    destinationAssetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    subjectChainId: 1,
    settlementChainId: 1,
    action: 'swap',
    quotedPrice: 3000.05,
    executedPrice: 3003,
    quotedAmountUsd: 50000,
    executedAmountUsd: 50000,
    actualFeeUsd: 12.5,
    fillStatus: 'FULL',
    txHash: `0x${'a'.repeat(64)}`,
    blockNumber: 21_000_000,
    executedAt: NOW_S,
    oracleDataAgeAtExecSeconds: 3,
    participantCount: 4,
    sourceGroupCount: 2,
    mevRiskScore: 0.05,
    reasonCodes: [],
  };
}

describe('policy-bound execution verification API service', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
    process.env.ATTESTATION_KEY_VALID_FROM = '2020-01-01';
    jest.spyOn(Date, 'now').mockReturnValue(NOW_S * 1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    delete process.env.ATTESTATION_KEY_VALID_FROM;
  });

  it('accepts the active Headless policy and rejects a cross-partner policy', async () => {
    const { signExecutionReceipt } = await import('@/lib/attestations/executionReceipt');
    const receipt = await signExecutionReceipt(receiptInput());
    const { verifyExecutionReceiptForApi } = await import('../executionVerificationApi');
    const { activePartnerIntegrationPolicy } =
      await import('@/lib/protocol/partnerIntegrationRegistry');
    const headless = activePartnerIntegrationPolicy('headless')!;
    const veritas = activePartnerIntegrationPolicy('veritas')!;

    const accepted = await verifyExecutionReceiptForApi(receipt!, {
      mode: 'partner',
      partnerId: 'headless',
      policyId: headless.policyId,
    });
    expect(accepted).toEqual(
      expect.objectContaining({
        valid: true,
        policyEnforcement: 'active-partner-policy-required',
        consumerPolicy: expect.objectContaining({ valid: true, partnerId: 'headless' }),
      })
    );

    const rejected = await verifyExecutionReceiptForApi(receipt!, {
      mode: 'partner',
      partnerId: 'headless',
      policyId: veritas.policyId,
    });
    expect(rejected).toEqual(
      expect.objectContaining({
        valid: false,
        reason: 'policy_not_active_for_partner',
      })
    );
  });
});
