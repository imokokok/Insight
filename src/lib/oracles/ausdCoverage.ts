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
 * Re-check result (2026-11-06), stated plainly:
 *   - Pyth hermes carries an independent Crypto.AUSD/USD feed
 *     (id d9912df360b5b7f21a122f15bdd5e27f62ce5e72bd316c291f7c86620e07fb2a,
 *     min_channel fixed_rate@200ms), independent of any venue's own quote.
 *   - However, the Monad-side on-chain feed contract address, heartbeat and
 *     deviation threshold are still unverified, so no fully-specified source
 *     can be registered yet. A hermes feed id alone is not an RPC-readable
 *     on-chain oracle contract, and a token CONTRACT address is not a price
 *     feed — neither is registered.
 *
 * => Monad 链上 AUSD feed 合约仍未找到，需人工 review 后登记. The default
 * descriptor stays empty/UNVERIFIED and the evaluator fails closed; nothing
 * here fabricates a feed address.
 */

import { z } from 'zod';

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
  note: '2026-11-06 复核：Pyth hermes 有独立 Crypto.AUSD/USD feed（id d9912df360b5b7f21a122f15bdd5e27f62ce5e72bd316c291f7c86620e07fb2a，独立 provider），但 Monad 链上 feed 合约地址、heartbeat、deviation threshold 未核实，按 fail-closed 维持 UNVERIFIED；链上 feed 合约未找到，需人工 review 后登记，不编造 feed 地址。',
};

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
