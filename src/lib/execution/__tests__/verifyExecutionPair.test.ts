/**
 * Tests for the execution-pair (closed-loop) verifier. The two underlying
 * verifiers (pre-trade signature + execution signature) are mocked so the test
 * pins the pairing logic itself: the cryptographic binding between the two
 * receipts and the derived closed-loop status.
 */

import type { ExecutionReceipt, ExecutionStatus } from '@/lib/attestations/executionReceipt';
import { verifyExecutionReceipt } from '@/lib/attestations/executionReceipt';
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

function fakeExecReceipt(over: Partial<ExecutionReceipt['data']> = {}): ExecutionReceipt {
  return {
    uid: '0xexec',
    schemaVersion: 1,
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
      executedAt: 0,
      oracleDataAgeAtExecSeconds: 0,
      participantCount: 3,
      requiredParticipantCount: 3,
      sourceGroupCount: 2,
      requiredSourceGroupCount: 2,
      independenceSatisfied: true,
      mevRiskBps: 0,
      reasonCodesHash: '0x00',
      validUntil: 0,
      schemaVersion: 1,
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
    checkedAt: 0,
    validUntil: 0,
    ageSeconds: 0,
  });
  mockVerifyExecution.mockResolvedValue({
    valid: opts.execValid ?? true,
    expired: false,
    executionStatus: opts.execStatus ?? 'FAITHFUL',
    reason: '',
    uid: '0xexec',
    attester: '0xattester',
    executedAt: 0,
    validUntil: 0,
  });
}

describe('verifyExecutionPair', () => {
  it('closes the loop as FAITHFUL when both receipts verify and bind', async () => {
    mockBoth();
    const result = await verifyExecutionPair(fakePreTrade(), fakeExecReceipt());

    expect(result.pairedValid).toBe(true);
    expect(result.closedLoopStatus).toBe('CLOSED_FAITHFUL');
    expect(result.binding).toEqual({
      preTradeUidMatch: true,
      requestHashMatch: true,
      chainMatch: true,
      assetMatch: true,
    });
  });

  it('is PAIR_INVALID when the requestHash does not match', async () => {
    mockBoth();
    const result = await verifyExecutionPair(
      fakePreTrade({ requestHash: '0xother' }),
      fakeExecReceipt()
    );

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
      checkedAt: 0,
      validUntil: 0,
      ageSeconds: 0,
    });
    const result = await verifyExecutionPair(fakePreTrade(), fakeExecReceipt());

    expect(result.pairedValid).toBe(false);
    expect(result.closedLoopStatus).toBe('PAIR_INVALID');
    expect(result.binding.preTradeUidMatch).toBe(false);
  });

  it('is PAIR_INVALID when the execution receipt signature is invalid', async () => {
    mockBoth({ execValid: false });
    const result = await verifyExecutionPair(fakePreTrade(), fakeExecReceipt());

    expect(result.pairedValid).toBe(false);
    expect(result.closedLoopStatus).toBe('PAIR_INVALID');
    expect(result.execution.valid).toBe(false);
  });

  it('is PAIR_INVALID when the pre-trade attestation is invalid', async () => {
    mockBoth({ preTradeValid: false });
    const result = await verifyExecutionPair(fakePreTrade(), fakeExecReceipt());

    expect(result.pairedValid).toBe(false);
    expect(result.closedLoopStatus).toBe('PAIR_INVALID');
    expect(result.preTrade.valid).toBe(false);
  });

  it('derives CLOSED_DEVIATED from a DEVIATED execution status', async () => {
    mockBoth({ execStatus: 'DEVIATED' });
    const result = await verifyExecutionPair(fakePreTrade(), fakeExecReceipt());

    expect(result.pairedValid).toBe(true);
    expect(result.closedLoopStatus).toBe('CLOSED_DEVIATED');
  });

  it('derives CLOSED_NOT_EXECUTED from a NOT_EXECUTED execution status', async () => {
    mockBoth({ execStatus: 'NOT_EXECUTED' });
    const result = await verifyExecutionPair(fakePreTrade(), fakeExecReceipt());

    expect(result.pairedValid).toBe(true);
    expect(result.closedLoopStatus).toBe('CLOSED_NOT_EXECUTED');
  });

  it('derives CLOSED_UNDETERMINED when the fill price was unreadable', async () => {
    mockBoth({ execStatus: 'UNDETERMINED' });
    const result = await verifyExecutionPair(fakePreTrade(), fakeExecReceipt());

    expect(result.pairedValid).toBe(true);
    expect(result.closedLoopStatus).toBe('CLOSED_UNDETERMINED');
  });

  it('still closes the loop when chain/asset ids disagree but the signed bindings match', async () => {
    mockBoth();
    const result = await verifyExecutionPair(
      fakePreTrade({ subjectChainId: 42161, sourceAssetId: 'eip155:1/erc20:0xccc' }),
      fakeExecReceipt()
    );

    // The cryptographic binding (uid + requestHash) is what gates pairing, so the
    // loop still closes; the corroborating chain/asset fields are surfaced for a
    // human to notice the mismatch.
    expect(result.pairedValid).toBe(true);
    expect(result.closedLoopStatus).toBe('CLOSED_FAITHFUL');
    expect(result.binding.chainMatch).toBe(false);
    expect(result.binding.assetMatch).toBe(false);
  });
});
