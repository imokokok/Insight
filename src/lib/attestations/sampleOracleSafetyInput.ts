/**
 * Representative ETH/USDC swap input for the OracleSafetyCheck v2 demo surface.
 *
 * Shared by the fetchable sample endpoint and the pre-trade envelope prototype
 * so both issue the same representative receipt. This is deliberate: the XCOI
 * prototype instruction from Headless Oracle was "start where your sample
 * already lives" — the envelope gate consumes the identical ETH/USDC check the
 * sample endpoint publishes, keeping one demo input as the single source of
 * truth instead of two drifting copies.
 */

import type { AttestationInputV2 } from '@/lib/attestations/oracleSafetyAttestationV2';
import type { ProviderObservationEntry } from '@/lib/attestations/providerObservationsHash';

const ETH_NATIVE = 'eip155:1/slip44:60';
const USDC_ETH = 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

/** Seven production oracle providers, each its own distinct non-derived
 *  operator group, so the v2.1 independence gate reports ASSESSED (>=2). */
export const SAMPLE_PROVIDERS: Array<{ provider: string; feedId: string }> = [
  { provider: 'chainlink', feedId: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419' },
  { provider: 'api3', feedId: 'ETH/USD' },
  { provider: 'redstone', feedId: 'ETH' },
  { provider: 'dia', feedId: 'ETH/USD' },
  { provider: 'supra', feedId: 'eth_usd' },
  { provider: 'winklink', feedId: 'ETH/USD' },
  { provider: 'switchboard', feedId: 'ETH/USD' },
];

/** Representative ETH/USDC swap observation set (price ~3000 USD). */
function buildSampleObservations(nowSec: number): ProviderObservationEntry[] {
  const value = 300_012_000_000n; // 3000.12 USD × 1e8
  return SAMPLE_PROVIDERS.map((p, i) => ({
    provider: p.provider,
    feedId: p.feedId,
    value,
    timestamp: BigInt(nowSec - i),
    dataAgeSeconds: BigInt(2 + i),
    included: true,
    exclusionReason: '',
  }));
}

/**
 * Build a representative ETH/USDC swap attestation input. `nowMs` is a
 * parameter (not Date.now()) so callers can deliberately backdate the check —
 * the envelope prototype uses this to demo an expired-but-validly-signed
 * receipt without touching clocks.
 */
export function buildSampleAttestationInput(nowMs: number): AttestationInputV2 {
  const nowSec = Math.floor(nowMs / 1000);
  return {
    verdict: 'PASS',
    sourceAssetId: ETH_NATIVE,
    destinationAssetId: USDC_ETH,
    subjectChainId: 1,
    action: 'swap',
    tradeAmountUsd: 10_000,
    consensusPrice: 3000.12,
    maxDeviationPct: 0.8,
    manipulationRiskScore: 0.05,
    participantCount: SAMPLE_PROVIDERS.length,
    crossProviderAgreement: 0.992,
    maxStablecoinDepegPct: 0,
    maxDataAgeSeconds: 9,
    recommendedMaxPositionUsd: 10_000,
    contributingFactors: [],
    providerObservations: buildSampleObservations(nowSec),
    checkedAtMs: nowMs,
  };
}
