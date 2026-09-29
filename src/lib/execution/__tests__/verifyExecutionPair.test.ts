/**
 * Tests for the execution-pair (closed-loop) verifier. The two underlying
 * verifiers (pre-trade signature + execution signature) are mocked so the test
 * pins the pairing logic itself: the cryptographic binding between the two
 * receipts and the derived closed-loop status.
 */

import type { ExecutionReceipt, ExecutionStatus } from '@/lib/attestations/executionReceipt';
import { verifyExecutionReceipt } from '@/lib/attestations/executionReceipt';
import type { KeyRegistryConfig } from '@/lib/attestations/keyRegistryConfig';
import { verifyAttestationBySchema } from '@/lib/attestations/verifyAttestationBySchema';

import { verifyExecutionPair } from '../verifyExecutionPair';

jest.mock('@/lib/attestations/verifyAttestationBySchema', () => ({
  verifyAttestationBySchema: jest.fn(),
}));
jest.mock('@/lib/attestations/executionReceipt', () => ({
  verifyExecutionReceipt: jest.fn(),
}));

// Bound to the hoisted jest.mock modules so the test can drive their mock
// implementations.
const mockVerifyAttestation = verifyAttestationBySchema as unknown as jest.Mock;
const mockVerifyExecution = verifyExecutionReceipt as unknown as jest.Mock;

const CHECKED_AT = 1_700_000_000;
const EXECUTED_AT = CHECKED_AT + 30;
const registry: KeyRegistryConfig = {
  keys: [
    {
      key_id: 'test',
      public_key: '0xattester',
      algorithm: 'EIP-712/secp256k1',
      validFrom: '2020-01-01',
      validUntil: null,
      revoked: false,
      role: 'attester',
    },
  ],
  revoked: [],
};

function fakeExecReceipt(over: Partial<ExecutionReceipt['data']> = {}): ExecutionReceipt {
  return {
    uid: '0xexec',
    schemaVersion: 2,
    attester: '0xattester',
    attesterLabel: 'Execution',
    signedAt: '',
    validForSeconds: 600,
    validUntil: 0,
    signature: '0xsig',
    verifyUrl: '',
    data: {
      preTradeUid: '0xpt',
      requestHash: '0xrh',
      sourceAssetId: 'eip155:1/erc20:0xaaa',
      destinationAssetId: 'eip155:1/erc20:0xbbb',
      subjectChainId: 1,
      settlementChainId: 1,
      action: 'SWAP',
      bindingMode: 'VERIFIED',
      quotedPrice: 0,
      executedPrice: 0,
      priceDeltaBps: 0,
      maxSlippageBps: 50,
      slippageSatisfied: true,
      quotedAmountUsd: 0,
      executedAmountUsd: 0,
      actualFeeUsd: 0,
      fillStatus: 'FULL',
      executionStatus: 'FAITHFUL',
      txHash: '0xtx',
      blockNumber: 0,
      executedAt: EXECUTED_AT,
      oracleDataAgeAtExecSeconds: 0,
      participantCount: 3,
      requiredParticipantCount: 3,
      sourceGroupCount: 2,
      requiredSourceGroupCount: 2,
      independenceSatisfied: true,
      mevRiskBps: 0,
      reasonCodesHash: '0x00',
      validUntil: EXECUTED_AT + 600,
      schemaVersion: 2,
      ...over,
    },
    eip712: { domain: {} as never, types: {} as never, primaryType: '' },
  } as ExecutionReceipt;
}

function fakePreTrade(over: Record<string, unknown> = {}) {
  return {
    uid: '0xpt',
    schemaVersion: 3,
    attester: '0xattester',
    signature: '0x',
    data: {
      requestHash: '0xrh',
      subjectChainId: 1,
      sourceAssetId: 'eip155:1/erc20:0xaaa',
      destinationAssetId: 'eip155:1/erc20:0xbbb',
      verdict: 'PASS',
      action: 'swap',
      tradeAmountUsd: 1_000_000,
      ...over,
    },
  };
}

function mockBoth(
  opts: {
    preTradeValid?: boolean;
    execValid?: boolean;
    execStatus?: ExecutionStatus;
  } = {}
) {
  mockVerifyAttestation.mockResolvedValue({
    valid: opts.preTradeValid ?? true,
    expired: false,
    uid: '0xpt',
    attester: '0xattester',
    reason: '',
    schemaVersion: 3,
    checkedAt: CHECKED_AT,
    validUntil: CHECKED_AT + 600,
    ageSeconds: 0,
  });
  mockVerifyExecution.mockResolvedValue({
    valid: opts.execValid ?? true,
    expired: false,
    executionStatus: opts.execStatus ?? 'FAITHFUL',
    reason: '',
    uid: '0xexec',
    attester: '0xattester',
    bindingMode: 'VERIFIED',
    executedAt: EXECUTED_AT,
    validUntil: EXECUTED_AT + 600,
  });
}

function verifyPair(preTrade: ReturnType<typeof fakePreTrade>, execution: ExecutionReceipt) {
  return verifyExecutionPair(preTrade, execution, null, { registry });
}

describe('verifyExecutionPair', () => {
  it('closes the loop as FAITHFUL when both receipts verify and bind', async () => {
    mockBoth();
    const result = await verifyPair(fakePreTrade(), fakeExecReceipt());

    expect(result.pairedValid).toBe(true);
    expect(result.closedLoopStatus).toBe('CLOSED_FAITHFUL');
    expect(result.binding).toEqual({
      preTradeUidMatch: true,
      requestHashMatch: true,
      destinationPreTradeUidMatch: true,
      preTradeUidsHashMatch: true,
      chainMatch: true,
      assetMatch: true,
      actionMatch: true,
      destinationGateMatch: true,
      trustedSigners: true,
      preTradeAuthorized: true,
      executionWithinGateWindow: true,
      verifiedBinding: true,
    });
  });

  it('is PAIR_INVALID when the requestHash does not match', async () => {
    mockBoth();
    const result = await verifyPair(fakePreTrade({ requestHash: '0xother' }), fakeExecReceipt());

    expect(result.pairedValid).toBe(false);
    expect(result.closedLoopStatus).toBe('PAIR_INVALID');
    expect(result.binding.requestHashMatch).toBe(false);
    expect(result.binding.preTradeUidMatch).toBe(true);
  });

  it('is PAIR_INVALID when the pre-trade uid does not match', async () => {
    mockBoth();
    mockVerifyAttestation.mockResolvedValue({
      valid: true,
      expired: false,
      uid: '0xother',
      attester: '0xattester',
      reason: '',
      schemaVersion: 3,
      checkedAt: CHECKED_AT,
      validUntil: CHECKED_AT + 600,
      ageSeconds: 0,
    });
    const result = await verifyPair(fakePreTrade(), fakeExecReceipt());

    expect(result.pairedValid).toBe(false);
    expect(result.closedLoopStatus).toBe('PAIR_INVALID');
    expect(result.binding.preTradeUidMatch).toBe(false);
  });

  it('is PAIR_INVALID when the execution receipt signature is invalid', async () => {
    mockBoth({ execValid: false });
    const result = await verifyPair(fakePreTrade(), fakeExecReceipt());

    expect(result.pairedValid).toBe(false);
    expect(result.closedLoopStatus).toBe('PAIR_INVALID');
    expect(result.execution.valid).toBe(false);
  });

  it('is PAIR_INVALID when the pre-trade attestation is invalid', async () => {
    mockBoth({ preTradeValid: false });
    const result = await verifyPair(fakePreTrade(), fakeExecReceipt());

    expect(result.pairedValid).toBe(false);
    expect(result.closedLoopStatus).toBe('PAIR_INVALID');
    expect(result.preTrade.valid).toBe(false);
  });

  it('derives CLOSED_DEVIATED from a DEVIATED execution status', async () => {
    mockBoth({ execStatus: 'DEVIATED' });
    const result = await verifyPair(fakePreTrade(), fakeExecReceipt());

    expect(result.pairedValid).toBe(true);
    expect(result.closedLoopStatus).toBe('CLOSED_DEVIATED');
  });

  it('derives CLOSED_NOT_EXECUTED from a NOT_EXECUTED execution status', async () => {
    mockBoth({ execStatus: 'NOT_EXECUTED' });
    const result = await verifyPair(fakePreTrade(), fakeExecReceipt());

    expect(result.pairedValid).toBe(true);
    expect(result.closedLoopStatus).toBe('CLOSED_NOT_EXECUTED');
  });

  it('derives CLOSED_UNDETERMINED when the fill price was unreadable', async () => {
    mockBoth({ execStatus: 'UNDETERMINED' });
    const result = await verifyPair(fakePreTrade(), fakeExecReceipt());

    expect(result.pairedValid).toBe(true);
    expect(result.closedLoopStatus).toBe('CLOSED_UNDETERMINED');
  });

  it('rejects the pair when chain or asset ids disagree', async () => {
    mockBoth();
    const result = await verifyPair(
      fakePreTrade({ subjectChainId: 42161, sourceAssetId: 'eip155:1/erc20:0xccc' }),
      fakeExecReceipt()
    );

    expect(result.pairedValid).toBe(false);
    expect(result.closedLoopStatus).toBe('PAIR_INVALID');
    expect(result.binding.chainMatch).toBe(false);
    expect(result.binding.assetMatch).toBe(false);
  });

  it('accepts a historically expired proof when execution occurred inside the signed gate window', async () => {
    mockBoth();
    mockVerifyAttestation.mockResolvedValue({
      valid: false,
      expired: true,
      uid: '0xpt',
      attester: '0xattester',
      reason: 'expired',
      schemaVersion: 3,
      checkedAt: CHECKED_AT,
      validUntil: CHECKED_AT + 600,
      ageSeconds: null,
    });
    mockVerifyExecution.mockResolvedValue({
      valid: false,
      expired: true,
      executionStatus: 'FAITHFUL',
      bindingMode: 'VERIFIED',
      reason: 'receipt_expired',
      uid: '0xexec',
      attester: '0xattester',
      executedAt: EXECUTED_AT,
      validUntil: EXECUTED_AT + 600,
    });
    const result = await verifyPair(fakePreTrade(), fakeExecReceipt());
    expect(result.pairedValid).toBe(true);
    expect(result.closedLoopStatus).toBe('CLOSED_FAITHFUL');
  });

  it('rejects a BLOCK gate and a self-reported execution binding', async () => {
    mockBoth();
    const blocked = await verifyPair(fakePreTrade({ verdict: 'BLOCK' }), fakeExecReceipt());
    expect(blocked.pairedValid).toBe(false);
    expect(blocked.binding.preTradeAuthorized).toBe(false);

    mockBoth();
    const selfReported = await verifyPair(
      fakePreTrade(),
      fakeExecReceipt({ bindingMode: 'SELF_REPORTED' })
    );
    expect(selfReported.pairedValid).toBe(false);
    expect(selfReported.binding.verifiedBinding).toBe(false);
  });
});
