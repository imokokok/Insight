import { privateKeyToAccount } from 'viem/accounts';

import { getConsensusPrice } from '@/lib/api/services/consensusPriceService';
import { ValidationError } from '@/lib/errors';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { getAllActiveFeedsByProviderWithStatus } from '@/lib/oracles/utils/dynamicFeedResolver';
import { extractBaseSymbol, isUsdDenominatedFeedSymbol } from '@/lib/oracles/utils/oracleDataUtils';

import {
  buildCoverageReport,
  coveragePolicyId,
  coverageReportDigest,
  coverageSigningData,
  STRICT_COVERAGE_POLICY,
  type CoverageObservation,
  type SignedCoverageReport,
} from '../../../sdk/src/coverage';

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
  const observations: CoverageObservation[] = consensus.providers.map((p) => {
    const retrievedAt =
      typeof p.retrievedAt === 'number' && Number.isFinite(p.retrievedAt)
        ? Math.floor(p.retrievedAt / 1000)
        : null;
    const ageKnown =
      typeof p.dataAgeSeconds === 'number' &&
      Number.isFinite(p.dataAgeSeconds) &&
      p.dataAgeSeconds >= 0;
    const observedAt =
      p.timestampProvenance === 'provider_age' && ageKnown && retrievedAt !== null
        ? Math.floor(retrievedAt - p.dataAgeSeconds!)
        : p.timestampProvenance === 'provider_timestamp' && Number.isFinite(p.timestamp)
          ? Math.floor(p.timestamp / 1000)
          : null;
    return {
      provider: p.provider,
      // Missing or mismatched actual chain is not proof of the requested chain.
      evidenceChainId: p.chain === chain ? input.chainId : 0,
      status:
        p.symbol &&
        extractBaseSymbol(p.symbol).toUpperCase() === input.asset &&
        isUsdDenominatedFeedSymbol(p.symbol)
          ? p.status
          : 'unsupported',
      price: Number.isFinite(p.price) ? p.price : null,
      observedAt,
      retrievedAt,
      timestampProvenance: p.timestampProvenance ?? 'unknown',
      excluded: p.isOutlier,
    };
  });
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
