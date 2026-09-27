import { privateKeyToAccount } from 'viem/accounts';

import { getConsensusPrice } from '@/lib/api/services/consensusPriceService';
import { ValidationError } from '@/lib/errors';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { getAllActiveFeedsByProviderWithStatus } from '@/lib/oracles/utils/dynamicFeedResolver';

import {
  buildCoverageReport,
  coveragePolicyId,
  coverageReportDigest,
  coverageSigningData,
  STRICT_COVERAGE_POLICY,
  type SignedCoverageReport,
} from '../../../sdk/src/coverage';

import { toCoverageObservation } from './observations';

export const COVERAGE_POLICY_ID = coveragePolicyId(STRICT_COVERAGE_POLICY);

export async function assessCoverage(input: {
  asset: string;
  chainId: number;
  policyId: string;
}): Promise<SignedCoverageReport> {
  if (input.policyId !== COVERAGE_POLICY_ID) throw new ValidationError('Unknown coverage policyId');
  const chain = getBlockchainByChainId(input.chainId);
  if (!chain || input.chainId <= 0) throw new ValidationError('Unsupported evidence chainId');
  const registry = await getAllActiveFeedsByProviderWithStatus();
  if (registry.errored) throw new Error('COVERAGE_REGISTRY_UNAVAILABLE');
  const consensus = await getConsensusPrice(input.asset, chain, undefined, undefined, {
    allowUnavailable: true,
  });
  const now = Math.floor(Date.now() / 1000);
  const observations = consensus.providers.map((p) => toCoverageObservation(p, input, chain));
  const report = buildCoverageReport(
    { asset: input.asset, evidenceChainId: input.chainId, observations, evaluatedAt: now },
    STRICT_COVERAGE_POLICY
  );
  const digest = coverageReportDigest(report);
  // A dedicated key must be distributed/pinned by consumers. No legacy/sample-key fallback.
  const secret = process.env.COVERAGE_SIGNER_PRIVATE_KEY;
  if (!secret) return { report, digest, signer: null, signature: null };
  try {
    const account = privateKeyToAccount(secret as `0x${string}`);
    return {
      report,
      digest,
      signer: account.address,
      signature: await account.signTypedData(coverageSigningData(report)),
    };
  } catch {
    // Signing readiness is measured separately from data readiness. No key/error text escapes.
    return { report, digest, signer: null, signature: null };
  }
}
