import { privateKeyToAccount } from 'viem/accounts';

import { getConsensusPrice } from '@/lib/api/services/consensusPriceService';
import { ValidationError } from '@/lib/errors';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { getAllActiveFeedsByProviderWithStatus } from '@/lib/oracles/utils/dynamicFeedResolver';
import { throwIfAborted } from '@/lib/utils/requestDeadline';

import strict300sV2 from '../../../protocol/coverage/policies/strict-300s.v2.json';
import strict300sV3 from '../../../protocol/coverage/policies/strict-300s.v3.json';
import {
  buildCoverageReport,
  coveragePolicyId,
  coverageReportDigest,
  coverageSigningData,
  STRICT_COVERAGE_POLICY,
  type CoveragePolicy,
  type SignedCoverageReport,
} from '../../../sdk/src/coverage';

import { toCoverageObservation } from './observations';

export const COVERAGE_POLICY_ID = coveragePolicyId(STRICT_COVERAGE_POLICY);
const COVERAGE_POLICIES = new Map<string, CoveragePolicy>([
  [COVERAGE_POLICY_ID, STRICT_COVERAGE_POLICY],
  [coveragePolicyId(strict300sV3.policy as CoveragePolicy), strict300sV3.policy as CoveragePolicy],
  [coveragePolicyId(strict300sV2.policy as CoveragePolicy), strict300sV2.policy as CoveragePolicy],
]);

export function getCoveragePolicy(policyId: string): CoveragePolicy | null {
  return COVERAGE_POLICIES.get(policyId) ?? null;
}

export async function assessCoverage(
  input: {
    asset: string;
    chainId: number;
    policyId: string;
  },
  options: { signal?: AbortSignal } = {}
): Promise<SignedCoverageReport> {
  throwIfAborted(options.signal);
  const policy = getCoveragePolicy(input.policyId);
  if (!policy) throw new ValidationError('Unknown coverage policyId');
  const chain = getBlockchainByChainId(input.chainId);
  if (!chain || input.chainId <= 0) throw new ValidationError('Unsupported evidence chainId');
  const registry = await getAllActiveFeedsByProviderWithStatus();
  throwIfAborted(options.signal);
  if (registry.errored) throw new Error('COVERAGE_REGISTRY_UNAVAILABLE');
  const consensus = await getConsensusPrice(input.asset, chain, undefined, undefined, {
    allowUnavailable: true,
    signal: options.signal,
  });
  throwIfAborted(options.signal);
  const now = Math.floor(Date.now() / 1000);
  const observations = consensus.providers.map((p) => toCoverageObservation(p, input, chain));
  const report = buildCoverageReport(
    { asset: input.asset, evidenceChainId: input.chainId, observations, evaluatedAt: now },
    policy
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
