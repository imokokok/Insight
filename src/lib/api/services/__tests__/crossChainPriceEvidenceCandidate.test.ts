import { Blockchain, OracleProvider } from '@/types/oracle';

import { getConsensusPrice, type ConsensusPriceResponse } from '../consensusPriceService';
import {
  CROSS_CHAIN_PRICE_EVIDENCE_PROVIDERS,
  getCrossChainPriceEvidenceCandidate,
} from '../crossChainPriceEvidenceCandidate';

jest.mock('../consensusPriceService', () => ({ getConsensusPrice: jest.fn() }));

const mockConsensus = jest.mocked(getConsensusPrice);

function consensusWith(overrides: Partial<Record<OracleProvider, Record<string, unknown>>> = {}) {
  return {
    symbol: 'USDC',
    consensusPrice: 1,
    providers: [
      {
        provider: OracleProvider.DIA,
        status: 'success',
        price: 1,
        timestamp: Date.now() - 10_000,
        dataAgeSeconds: 10,
        isOutlier: false,
        ...overrides[OracleProvider.DIA],
      },
      {
        provider: OracleProvider.TWAP,
        chain: Blockchain.ETHEREUM,
        verification: { chainId: 1 },
        status: 'success',
        price: 1,
        timestamp: Date.now() - 20_000,
        dataAgeSeconds: 20,
        isOutlier: false,
        ...overrides[OracleProvider.TWAP],
      },
      {
        provider: OracleProvider.FLARE,
        chain: Blockchain.FLARE,
        verification: { chainId: 14 },
        status: 'success',
        price: 0.9999,
        timestamp: Date.now() - 2_000,
        dataAgeSeconds: 2,
        isOutlier: false,
        ...overrides[OracleProvider.FLARE],
      },
    ],
  } as unknown as ConsensusPriceResponse;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConsensus.mockResolvedValue(consensusWith());
});

it('evaluates DIA, derived TWAP, and Flare globally without claiming Base coverage', async () => {
  const result = await getCrossChainPriceEvidenceCandidate({
    asset: 'USDC',
    subjectChainId: 8453,
  });

  expect(mockConsensus).toHaveBeenCalledWith(
    'USDC',
    undefined,
    undefined,
    CROSS_CHAIN_PRICE_EVIDENCE_PROVIDERS,
    { allowUnavailable: true }
  );
  expect(result.candidateFreshnessStatus).toBe('CANDIDATE_SUFFICIENT');
  expect(result.freshCount).toBe(3);
  expect(result.freshNonDerivedGroupCount).toBe(2);
  expect(result.sameChainCoverageClaimed).toBe(false);
  expect(result.subjectChain).toBe(Blockchain.BASE);
  expect(result.providers.find((provider) => provider.provider === 'flare')).toEqual(
    expect.objectContaining({
      verificationChain: Blockchain.FLARE,
      verificationChainId: 14,
      fresh: true,
    })
  );
  expect(result.activationStatus).toBe('NOT_PROMOTED');
  expect(result.partnerPathsAffected).toBe(false);
  expect(result.mayAuthorizeExecution).toBe(false);
});

it('does not relax the 300-second budget when Flare is stale', async () => {
  mockConsensus.mockResolvedValue(
    consensusWith({ [OracleProvider.FLARE]: { dataAgeSeconds: 301 } })
  );

  const result = await getCrossChainPriceEvidenceCandidate({
    asset: 'USDC',
    subjectChainId: 8453,
    maxSourceAgeSeconds: 300,
  });

  expect(result.candidateStatus).toBe('CANDIDATE_SUFFICIENT');
  expect(result.candidateFreshnessStatus).toBe('CANDIDATE_INSUFFICIENT_FRESH_EVIDENCE');
  expect(result.freshCount).toBe(2);
  expect(result.freshnessShortfall.participants).toBe(1);
  expect(result.providers.find((provider) => provider.provider === 'flare')?.reason).toBe(
    'SOURCE_TOO_OLD'
  );
});

it('makes a missing configured provider visible instead of shrinking the candidate set', async () => {
  const response = consensusWith();
  response.providers = response.providers.filter(
    (provider) => provider.provider !== OracleProvider.FLARE
  );
  mockConsensus.mockResolvedValue(response);

  const result = await getCrossChainPriceEvidenceCandidate({
    asset: 'USDC',
    subjectChainId: 8453,
  });

  expect(result.providers).toHaveLength(3);
  expect(result.providers.find((provider) => provider.provider === 'flare')).toEqual(
    expect.objectContaining({
      status: 'not_configured',
      reason: 'PROVIDER_NOT_CONFIGURED',
      fresh: false,
    })
  );
  expect(result.candidateFreshnessStatus).toBe('CANDIDATE_INSUFFICIENT_FRESH_EVIDENCE');
});
