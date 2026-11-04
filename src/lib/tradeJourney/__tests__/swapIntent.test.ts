import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import { attachJourneyChecks, createJourney, nextActions } from '@/lib/tradeJourney/journeyService';

import {
  createSwapIntent,
  SwapIntentAttestationUnavailableError,
  SwapIntentBodySchema,
} from '../swapIntent';

jest.mock('@/lib/api/services/preTradeSafetyService', () => ({
  preTradeSafetyCheck: jest.fn(),
}));
jest.mock('@/lib/tradeJourney/journeyService', () => ({
  attachJourneyChecks: jest.fn(),
  createJourney: jest.fn(),
  nextActions: jest.fn(),
}));

const mockPreTradeSafetyCheck = preTradeSafetyCheck as jest.Mock;
const mockCreateJourney = createJourney as jest.Mock;
const mockAttachJourneyChecks = attachJourneyChecks as jest.Mock;
const mockNextActions = nextActions as jest.Mock;

const input = {
  sourceAsset: 'ETH',
  destinationAsset: 'USDC',
  subjectChainId: 1,
  settlementChainId: 1,
  declaredNotionalUsd: 1000,
};

function signedResult(uid: string, verdict = 'PASS') {
  return {
    verdict,
    attestation: { uid, data: { validUntil: 1_900_000_000 } },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateJourney.mockResolvedValue({
    journeyId: '11111111-1111-4111-8111-111111111111',
    outcomeToken: 'a'.repeat(43),
    receiptCreditState: 'pending_settlement',
  });
  mockAttachJourneyChecks.mockResolvedValue(undefined);
  mockNextActions.mockReturnValue({ executionReceipt: { method: 'POST' } });
  mockPreTradeSafetyCheck.mockResolvedValueOnce(signedResult(`0x${'11'.repeat(32)}`));
  mockPreTradeSafetyCheck.mockResolvedValueOnce(signedResult(`0x${'22'.repeat(32)}`, 'CAUTION'));
});

describe('SwapIntentBodySchema', () => {
  it('requires a two-asset same-chain swap intent', () => {
    expect(SwapIntentBodySchema.parse(input)).toMatchObject(input);
    expect(() => SwapIntentBodySchema.parse({ ...input, destinationAsset: 'ETH' })).toThrow(
      'destinationAsset must differ'
    );
    expect(() => SwapIntentBodySchema.parse({ ...input, settlementChainId: 8453 })).toThrow(
      'Cross-chain Swap Intent'
    );
  });
});

describe('createSwapIntent', () => {
  it('issues and binds two schema-v3 gates before exposing receipt next actions', async () => {
    const result = await createSwapIntent(SwapIntentBodySchema.parse(input), {
      requestId: 'req_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      receiptCreditState: 'pending_settlement',
    });

    expect(mockCreateJourney).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'swap_intent',
        sourceAsset: 'ETH',
        destinationAsset: 'USDC',
        receiptCreditState: 'pending_settlement',
      })
    );
    expect(mockPreTradeSafetyCheck).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ asset: 'ETH', destinationAsset: 'USDC', schemaVersion: 3 }),
      expect.objectContaining({ journeyId: '11111111-1111-4111-8111-111111111111' })
    );
    expect(mockPreTradeSafetyCheck).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ asset: 'USDC', destinationAsset: 'ETH', schemaVersion: 3 }),
      expect.objectContaining({ journeyId: '11111111-1111-4111-8111-111111111111' })
    );
    expect(mockAttachJourneyChecks).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      expect.objectContaining({ source: expect.anything(), destination: expect.anything() })
    );
    expect(result).toMatchObject({
      journeyId: '11111111-1111-4111-8111-111111111111',
      receiptCreditState: 'pending_settlement',
    });
  });

  it('fails closed when either signed gate is unavailable', async () => {
    mockPreTradeSafetyCheck.mockReset();
    mockPreTradeSafetyCheck.mockResolvedValueOnce(signedResult(`0x${'11'.repeat(32)}`));
    mockPreTradeSafetyCheck.mockResolvedValueOnce({ verdict: 'PASS', attestation: null });

    await expect(
      createSwapIntent(SwapIntentBodySchema.parse(input), {
        requestId: 'req_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        receiptCreditState: 'available',
      })
    ).rejects.toBeInstanceOf(SwapIntentAttestationUnavailableError);
    expect(mockAttachJourneyChecks).not.toHaveBeenCalled();
  });
});
