import { privateKeyToAccount } from 'viem/accounts';

import {
  getAttesterAccount,
  getAttesterAddress,
  getSampleAttesterAddress,
} from '@/lib/attestations/attesterAccount';
import { trustedAttesterEntry } from '@/lib/attestations/keyRegistryConfig';
import { nowInSeconds } from '@/lib/utils/time';

import { assessDecisionInput, type DecisionInputRouteQuote } from '../assessment';
import { signDecisionInputAssessment, verifyDecisionInputAssessment } from '../attestation';

jest.mock('@/lib/attestations/attesterAccount', () => ({
  getAttesterAccount: jest.fn(),
  getAttesterAddress: jest.fn(),
  getSampleAttesterAddress: jest.fn(),
}));

jest.mock('@/lib/attestations/keyRegistryConfig', () => ({
  buildKeyRegistryConfig: jest.fn(() => ({})),
  trustedAttesterEntry: jest.fn(),
}));

jest.mock('@/lib/utils/time', () => ({
  nowInSeconds: jest.fn(),
}));

const mockGetAttesterAccount = getAttesterAccount as jest.MockedFunction<typeof getAttesterAccount>;
const mockGetAttesterAddress = getAttesterAddress as jest.MockedFunction<typeof getAttesterAddress>;
const mockGetSampleAttesterAddress = getSampleAttesterAddress as jest.MockedFunction<
  typeof getSampleAttesterAddress
>;
const mockTrustedAttesterEntry = trustedAttesterEntry as jest.MockedFunction<
  typeof trustedAttesterEntry
>;
const mockNowInSeconds = nowInSeconds as jest.MockedFunction<typeof nowInSeconds>;

const signer = privateKeyToAccount(`0x${'11'.repeat(32)}`);
const NOW_SECONDS = 1_800_000_000;
const PRE_TRADE_UID = `0x${'22'.repeat(32)}` as `0x${string}`;
const NOW = new Date(NOW_SECONDS * 1000).toISOString();
const ROUTE_QUOTE: DecisionInputRouteQuote = {
  price: 2000.0000000000002,
  observedAt: NOW,
  callerReported: { price: 2000, observedAt: NOW },
  onchainEvidence: {
    provider: 'uniswap-v3-quoter-v2',
    chainId: 1,
    blockNumber: '23000000',
    blockHash: `0x${'aa'.repeat(32)}`,
    quoterAddress: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    path: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    routeSymbols: ['WETH', 'USDC'],
    routeTokens: [
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    ],
    feeTiers: [500],
    amountInRaw: '500000000000000000',
    amountOutRaw: '1000000000',
    rpcWitnessCount: 2,
    rpcWitnessHosts: ['rpc-one.example', 'rpc-two.example'],
    notionalPrice: {
      provider: 'chainlink-data-feed',
      assetSymbol: 'WETH',
      priceReferenceSymbol: 'ETH',
      pricingBasis: 'chainlink-usd',
      priceUsd: 2000,
      feedAddress: `0x${'cc'.repeat(20)}`,
      roundId: '123',
      updatedAt: NOW,
      heartbeatSeconds: 3600,
    },
  },
};

function makeAssessment() {
  const now = new Date(NOW_SECONDS * 1000);
  return assessDecisionInput({
    asset: 'ETH',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd: 1000,
    request: {
      decisionPriceUsd: 2000,
      quotePriceUsd: 2000,
      quoteObservedAt: now.toISOString(),
      maxReferenceDeviationBps: 50,
      maxSlippageBps: 50,
      maxQuoteAgeSeconds: 30,
      operationRouteQuote: ROUTE_QUOTE,
    },
    chainlink: null,
    cex: null,
    dex: null,
    now,
  });
}

describe('decision-input EIP-712 attestation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAttesterAccount.mockResolvedValue(signer);
    mockGetAttesterAddress.mockResolvedValue(signer.address);
    mockGetSampleAttesterAddress.mockResolvedValue(null);
    mockTrustedAttesterEntry.mockReturnValue({ address: signer.address } as never);
    mockNowInSeconds.mockReturnValue(NOW_SECONDS);
  });

  it('signs and verifies the exact assessment and pre-trade link', async () => {
    const assessment = makeAssessment();
    const attestation = await signDecisionInputAssessment(assessment, PRE_TRADE_UID);

    expect(attestation).not.toBeNull();
    const verification = await verifyDecisionInputAssessment({ ...assessment, attestation });

    expect(verification).toMatchObject({
      valid: true,
      attester: signer.address,
      linkedPreTradeUid: PRE_TRADE_UID,
      expired: false,
      reason: 'verified',
    });
  });

  it('detects assessment edits after signing', async () => {
    const assessment = makeAssessment();
    const attestation = await signDecisionInputAssessment(assessment, PRE_TRADE_UID);
    expect(attestation).not.toBeNull();

    const verification = await verifyDecisionInputAssessment({
      ...assessment,
      caveats: [...assessment.caveats, 'edited after signing'],
      attestation,
    });

    expect(verification.valid).toBe(false);
    expect(verification.reason).toBe('assessment_digest_mismatch');
  });
});
