/**
 * Independent oracle coverage for AUSD (Agora Dollar) — P1-1 cross-cutting.
 *
 * AUSD is the margin asset of the Perpl perp venue, a leg of Pendle markets,
 * and the K3→Galaxy credit path, so "the venue says AUSD = $1" is not
 * independent evidence. This module defines what counts as independent
 * coverage and lets callers distinguish "independently covered" from
 * "disclosed only".
 *
 * An independent source must be observable OFF the venue's own quote: a
 * Chainlink/RedStone/Pyth-style aggregator feed or an independent RPC-readable
 * oracle contract. Each registered source carries:
 *   - feed address (a real aggregator/oracle contract address),
 *   - observed update time,
 *   - heartbeat,
 *   - deviation threshold,
 *   - an explicit independence provenance note.
 * A source missing ANY of these is not covered — fail closed.
 *
 * Current reviewed source: Pyth Core on Monad, using the directly-readable
 * AUSD/USD feed and the request's live provider observation. The feed ID,
 * Pyth Core address, one-hour heartbeat, and 0.2% sponsored deviation
 * threshold come from Pyth's published Monad catalog. Coverage is still
 * fail-closed for each request: a catalog entry alone is insufficient unless
 * the existing AUSD consensus read returned a fresh, in-quorum Pyth Core
 * observation.
 */

import { z } from 'zod';

import { PYTH_MONAD_CORE_ADDRESS } from './constants/pythMonad';

export const AUSD_SYMBOL = 'AUSD' as const;
/** Monad mainnet chain id (reused from monadLendingProtocols.ts / perplPerpMarket.ts). */
export const AUSD_COVERAGE_CHAIN_ID = 143 as const;

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const ISO_DATE = z.string().datetime();

export type AusdOracleProvider =
  | 'Chainlink'
  | 'RedStone'
  | 'Pyth'
  | 'Stork'
  | 'Supra'
  | 'Chronicle'
  | 'independent-onchain-oracle'
  | 'unknown';

/**
 * Why a source is (or is not) independent of the venue's own quote.
 * - independent-aggregator: third-party aggregator feed.
 * - independent-onchain-oracle: standalone RPC-readable oracle contract.
 * - venue-quote: the venue's own price / $1 assumption (NOT independent).
 * - unverified: no verifiable source at all.
 */
export type AusdSourceIndependence =
  | 'independent-aggregator'
  | 'independent-onchain-oracle'
  | 'venue-quote'
  | 'unverified';

export const AusdOracleSourceSchema = z
  .object({
    provider: z.enum([
      'Chainlink',
      'RedStone',
      'Pyth',
      'Stork',
      'Supra',
      'Chronicle',
      'independent-onchain-oracle',
      'unknown',
    ]),
    pair: z.string().min(1),
    /** Real aggregator/oracle contract address; null while UNVERIFIED. */
    feedAddress: z.string().regex(ADDRESS).nullable(),
    chainId: z.number().int().positive(),
    /** Last observed feed update time (ISO), null while UNVERIFIED. */
    observedAt: ISO_DATE.nullable(),
    heartbeatSeconds: z.number().int().positive().nullable(),
    deviationThresholdBps: z.number().int().positive().nullable(),
    independence: z.enum([
      'independent-aggregator',
      'independent-onchain-oracle',
      'venue-quote',
      'unverified',
    ]),
    /** Explicit statement of why this source is independent of the venue. */
    independenceSource: z.string().min(1).nullable(),
    /** First-hand source reference (official docs / deployment repo). */
    sourceRef: z.string().min(1).nullable(),
    verification: z.enum(['VERIFIED', 'UNVERIFIED']),
  })
  .strict();

export type AusdOracleSource = z.infer<typeof AusdOracleSourceSchema>;

export type AusdCoverageReasonCode =
  | 'AUSD_COVERAGE_VERIFIED'
  | 'AUSD_COVERAGE_UNVERIFIED'
  | 'AUSD_COVERAGE_VENUE_ONLY'
  | 'AUSD_COVERAGE_MALFORMED';

export interface AusdCoverageResult {
  /** True only when at least one fully-specified independent source exists. */
  covered: boolean;
  /** 'independent' | 'venue-only' | 'unverified' — the disclosure distinction. */
  independence: 'independent' | 'venue-only' | 'unverified';
  observedAt: string;
  sources: AusdOracleSource[];
  reasonCode: AusdCoverageReasonCode;
}

/**
 * Injectable registry of AUSD price sources. Empty by default (UNVERIFIED);
 * a human-reviewed registration supplies real feed addresses here.
 */
export interface AusdCoverageDescriptor {
  sources: readonly AusdOracleSource[];
  note: string;
}

export const AUSD_UNVERIFIED_DESCRIPTOR: AusdCoverageDescriptor = {
  sources: [],
  note: 'Pyth Core Monad AUSD/USD is registered as a candidate source, but current-request coverage is unverified until the existing AUSD consensus read contains a fresh, in-quorum Pyth Core observation.',
};

/**
 * Provenance: this contract address is the checked-in Pyth Core Monad address
 * (PYTH_MONAD_CORE_ADDRESS in constants/pythMonad.ts), sourced from Pyth's
 * published sponsored-feed registry. Referencing that constant here keeps a
 * single source of truth. It is NOT, by itself, coverage: the guard only marks
 * this source VERIFIED when the same request produced a fresh, non-outlier,
 * quorum-eligible Pyth Core Monad:AUSD/USD observation (see
 * pythAusdSourceFromExistingRead). A stale, non-quorum, or differently-sourced
 * observation must fail closed to UNVERIFIED.
 */
export const AUSD_PYTH_MONAD_SOURCE = Object.freeze({
  provider: 'Pyth' as const,
  pair: 'AUSD/USD',
  feedAddress: PYTH_MONAD_CORE_ADDRESS,
  feedId: 'd9912df360b5b7f21a122f15bdd5e27f62ce5e72bd316c291f7c86620e07fb2a',
  chainId: AUSD_COVERAGE_CHAIN_ID,
  heartbeatSeconds: 3_600,
  deviationThresholdBps: 20,
  independence: 'independent-aggregator' as const,
  independenceSource:
    'Pyth Core publishes a third-party aggregated price independently of Perpl’s venue quote.',
  sourceRef: 'https://docs.pyth.network/pro/sponsored-feeds#monad-mainnet',
});

/** A source is covered only when every required observable field is present. */
function isIndependentlyCovered(source: AusdOracleSource): boolean {
  return (
    source.verification === 'VERIFIED' &&
    (source.independence === 'independent-aggregator' ||
      source.independence === 'independent-onchain-oracle') &&
    source.feedAddress !== null &&
    ADDRESS.test(source.feedAddress) &&
    source.observedAt !== null &&
    source.heartbeatSeconds !== null &&
    source.deviationThresholdBps !== null &&
    source.independenceSource !== null &&
    source.sourceRef !== null
  );
}

/**
 * Evaluate independent AUSD oracle coverage. Fail closed: an empty or
 * malformed descriptor yields covered=false (UNVERIFIED), never a silent pass.
 */
export function evaluateAusdCoverage(
  descriptor: AusdCoverageDescriptor = AUSD_UNVERIFIED_DESCRIPTOR,
  now: () => Date = () => new Date()
): AusdCoverageResult {
  const observedAt = now().toISOString();
  const sources: AusdOracleSource[] = [];
  for (const candidate of descriptor.sources) {
    const parsed = AusdOracleSourceSchema.safeParse(candidate);
    if (!parsed.success) {
      return {
        covered: false,
        independence: 'unverified',
        observedAt,
        sources: [],
        reasonCode: 'AUSD_COVERAGE_MALFORMED',
      };
    }
    sources.push(parsed.data);
  }
  if (sources.some(isIndependentlyCovered)) {
    return {
      covered: true,
      independence: 'independent',
      observedAt,
      sources,
      reasonCode: 'AUSD_COVERAGE_VERIFIED',
    };
  }
  if (sources.some((source) => source.independence === 'venue-quote')) {
    return {
      covered: false,
      independence: 'venue-only',
      observedAt,
      sources,
      reasonCode: 'AUSD_COVERAGE_VENUE_ONLY',
    };
  }
  return {
    covered: false,
    independence: 'unverified',
    observedAt,
    sources,
    reasonCode: 'AUSD_COVERAGE_UNVERIFIED',
  };
}
