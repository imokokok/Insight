import { getConsensusPrice } from '@/lib/api/services/consensusPriceService';
import { getAllActiveFeedsByProviderWithStatus } from '@/lib/oracles/utils/dynamicFeedResolver';
import { Blockchain, OracleProvider } from '@/types/oracle';

import { STRICT_COVERAGE_POLICY, verifyCoverageReport } from '../../../../sdk/src/coverage';
import { assessCoverage, COVERAGE_POLICY_ID } from '../service';

jest.mock('@/lib/api/services/consensusPriceService', () => ({ getConsensusPrice: jest.fn() }));
jest.mock('@/lib/oracles/utils/dynamicFeedResolver', () => ({
  getAllActiveFeedsByProviderWithStatus: jest.fn(),
}));
const consensus = jest.mocked(getConsensusPrice);
const now = 1800000000;
const original = process.env.COVERAGE_SIGNER_PRIVATE_KEY;
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(now * 1000);
  process.env.COVERAGE_SIGNER_PRIVATE_KEY = `0x${'12'.repeat(32)}`;
  jest
    .mocked(getAllActiveFeedsByProviderWithStatus)
    .mockResolvedValue({ errored: false, feeds: new Map() });
  consensus.mockResolvedValue({
    providers: [OracleProvider.CHAINLINK, OracleProvider.API3, OracleProvider.TWAP].map(
      (provider) => ({
        provider,
        symbol: 'USDC/USD',
        chain: Blockchain.ETHEREUM,
        status: 'success',
        price: 1,
        timestamp: (now - 10) * 1000,
        retrievedAt: now * 1000,
        dataAgeSeconds: 10,
        timestampProvenance: 'provider_timestamp',
        countsTowardOracleQuorum: true,
        isOutlier: false,
      })
    ),
  } as Awaited<ReturnType<typeof getConsensusPrice>>);
});
afterEach(() => {
  jest.useRealTimers();
  if (original === undefined) delete process.env.COVERAGE_SIGNER_PRIVATE_KEY;
  else process.env.COVERAGE_SIGNER_PRIVATE_KEY = original;
});
it('issues a real signature for strict live observations', async () => {
  const proof = await assessCoverage({ asset: 'USDC', chainId: 1, policyId: COVERAGE_POLICY_ID });
  expect(proof.report.evaluation.status).toBe('PASS');
  const verified = await verifyCoverageReport(
    proof,
    {
      policy: STRICT_COVERAGE_POLICY,
      policyId: COVERAGE_POLICY_ID,
      asset: 'USDC',
      evidenceChainId: 1,
      keys: [
        { address: proof.signer!, validFrom: now - 100, validUntil: now + 1000, revoked: false },
      ],
    },
    now
  );
  expect(verified.valid).toBe(true);
});
it('does not silently sign with a legacy key', async () => {
  delete process.env.COVERAGE_SIGNER_PRIVATE_KEY;
  expect(
    (await assessCoverage({ asset: 'USDC', chainId: 1, policyId: COVERAGE_POLICY_ID })).signature
  ).toBeNull();
});
it('keeps signer failures separate from data readiness', async () => {
  process.env.COVERAGE_SIGNER_PRIVATE_KEY = 'invalid';
  const proof = await assessCoverage({ asset: 'USDC', chainId: 1, policyId: COVERAGE_POLICY_ID });
  expect(proof.signature).toBeNull();
  expect(proof.report.evaluation.status).toBe('PASS');
});

it('does not count an unsigned simulation toward coverage quorum', async () => {
  const value = await consensus();
  value.providers[0].countsTowardOracleQuorum = false;
  consensus.mockResolvedValue(value);

  const proof = await assessCoverage({ asset: 'USDC', chainId: 1, policyId: COVERAGE_POLICY_ID });

  expect(proof.report.evaluation.status).toBe('INSUFFICIENT_COVERAGE');
  expect(proof.report.evaluation.eligibleProviders).toBe(2);
  expect(
    proof.report.evaluation.providers.find(
      (provider) => provider.provider === OracleProvider.CHAINLINK
    )?.reasons
  ).toContain('PROVIDER_UNAVAILABLE');
});

it.each(['wrong-chain', 'unknown-chain', 'wrong-symbol', 'wrong-quote', 'future-time'])(
  'rejects actual provider scope/provenance: %s',
  async (mode) => {
    const value = await consensus();
    if (mode === 'wrong-chain') value.providers[0].chain = Blockchain.BASE;
    if (mode === 'unknown-chain') value.providers[0].chain = undefined;
    if (mode === 'wrong-symbol') value.providers[0].symbol = 'ETH/USD';
    if (mode === 'wrong-quote') value.providers[0].symbol = 'USDC/ETH';
    if (mode === 'future-time') value.providers[0].timestamp = (now + 10) * 1000;
    consensus.mockResolvedValue(value);
    const proof = await assessCoverage({ asset: 'USDC', chainId: 1, policyId: COVERAGE_POLICY_ID });
    expect(proof.report.evaluation.status).toBe('INSUFFICIENT_COVERAGE');
  }
);
it('rejects an unavailable registry instead of reporting zero support', async () => {
  jest
    .mocked(getAllActiveFeedsByProviderWithStatus)
    .mockResolvedValue({ errored: true, feeds: new Map() });
  await expect(
    assessCoverage({ asset: 'USDC', chainId: 1, policyId: COVERAGE_POLICY_ID })
  ).rejects.toThrow('REGISTRY_UNAVAILABLE');
});
it('rejects unknown policies and unsupported evidence chains', async () => {
  await expect(
    assessCoverage({ asset: 'USDC', chainId: 1, policyId: 'unknown' })
  ).rejects.toThrow();
  await expect(
    assessCoverage({ asset: 'USDC', chainId: 84532, policyId: COVERAGE_POLICY_ID })
  ).rejects.toThrow();
});
