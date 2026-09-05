import type { ExecutionReceipt } from '@/lib/attestations/executionReceipt';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { recordExecutionReceipt } from '../executionReceiptAudit';

jest.mock('@/lib/supabase/server');

const mockedClient = createServiceRoleClient as jest.MockedFunction<typeof createServiceRoleClient>;

function receipt(): ExecutionReceipt {
  return {
    uid: `0x${'11'.repeat(32)}`,
    schemaVersion: 4,
    attester: '0x1111111111111111111111111111111111111111',
    attesterLabel: 'test',
    signedAt: '2026-09-06T00:00:00.000Z',
    validForSeconds: 600,
    validUntil: 1_800_000_600,
    signature: `0x${'22'.repeat(65)}`,
    verifyUrl: '',
    eip712: {} as never,
    data: {
      bindingMode: 'VERIFIED',
      destinationPreTradeUid: `0x${'33'.repeat(32)}`,
      environment: 'production',
      preTradeUid: `0x${'44'.repeat(32)}`,
      requestHash: `0x${'55'.repeat(32)}`,
      sourceAssetId: 'eip155:1/erc20:0xaaa',
      destinationAssetId: 'eip155:1/erc20:0xbbb',
      subjectChainId: 1,
      settlementChainId: 1,
      action: 'SWAP',
      quotedPrice: 100_000_000,
      executedPrice: 100_000_000,
      priceDeltaBps: 0,
      maxSlippageBps: 50,
      slippageSatisfied: true,
      quotedAmountUsd: 0,
      executedAmountUsd: 0,
      actualFeeUsd: 0,
      fillStatus: 'FULL',
      priceExecutionStatus: 'FAITHFUL',
      txHash: `0x${'66'.repeat(32)}`,
      blockNumber: 1,
      executedAt: 1_800_000_000,
      participantCount: 4,
      requiredParticipantCount: 3,
      sourceGroupCount: 3,
      requiredSourceGroupCount: 2,
      independenceSatisfied: true,
      mevRiskBps: 0,
      reasonCodesHash: `0x${'77'.repeat(32)}`,
      validUntil: 1_800_000_600,
      schemaVersion: 4,
    },
  };
}

describe('recordExecutionReceipt', () => {
  it('upserts the complete signed envelope before issuance returns', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockedClient.mockReturnValue({ from: jest.fn(() => ({ upsert })) } as never);
    const value = receipt();

    await recordExecutionReceipt(value, { source: 'rest', apiKeyId: null });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: value.uid,
        receipt_payload: value,
        destination_pre_trade_uid: value.data.destinationPreTradeUid,
        binding_mode: 'VERIFIED',
      }),
      { onConflict: 'uid' }
    );
  });

  it('throws when durable persistence fails', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: { message: 'database unavailable' } });
    mockedClient.mockReturnValue({ from: jest.fn(() => ({ upsert })) } as never);

    await expect(recordExecutionReceipt(receipt(), { source: 'mcp' })).rejects.toThrow(
      /persistence failed/
    );
  });
});
