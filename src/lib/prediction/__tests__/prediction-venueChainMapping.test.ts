/**
 * P1-4: entry-chain x settlement-chain mapping for prediction-market
 * settlement evidence. Pure offline classification + mocked guard metadata;
 * no network access anywhere in this suite.
 */

import type { GammaMarket } from '@/lib/settlementEvidence/polymarket';
import {
  assessVenueChainEvidence,
  classifyVenueChain,
  UNVERIFIED_SOLANA_NATIVE_PROJECTS,
  VENUE_CHAIN_CLASSES,
  VENUE_CHAIN_DESCRIPTORS,
} from '@/lib/settlementEvidence/venueChainMapping';

import { assessPolymarketGuard } from '../polymarketGuard';

const WINDOW_START_MS = Date.parse('2025-12-19T16:35:00.000Z');
const MID_WINDOW_NOW = new Date(WINDOW_START_MS + 60_000); // 240 s remaining

const BASE_INPUT = {
  protocolId: 'polymarket-prediction-mainnet' as const,
  action: 'buy_up' as const,
  marketSlug: 'btc-updown-5m-1766162100',
};

function gammaMarket(overrides: Partial<GammaMarket> = {}): GammaMarket {
  return {
    id: '964335',
    question: 'Bitcoin Up or Down - December 19, 11:35AM-11:40AM ET',
    slug: 'btc-updown-5m-1766162100',
    description:
      'This market will resolve to "Up" if the Bitcoin price at the end of the time ' +
      'range is higher than it was at the start.',
    resolutionSource: 'https://data.chain.link/streams/btc-usd',
    endDate: '2025-12-19T16:40:00Z',
    closed: false,
    active: true,
    outcomes: '["Up", "Down"]',
    outcomePrices: '["0.52", "0.48"]',
    ...overrides,
  } as GammaMarket;
}

function deps(
  market: GammaMarket | null = gammaMarket(),
  now: Date = MID_WINDOW_NOW,
  fetchMarket?: (slug: string) => Promise<GammaMarket | null>
) {
  return {
    fetchMarket: fetchMarket ?? (jest.fn(async () => market) as never),
    now: () => now,
  } as never;
}

describe('VENUE_CHAIN_DESCRIPTORS - four registered venue classes', () => {
  it('registers the four venue classes plus an unknown fail-closed bucket', () => {
    expect(VENUE_CHAIN_CLASSES).toEqual([
      'polymarket-direct',
      'jupiter-polymarket-embedded',
      'solana-native',
      'offchain-regulated',
      'unknown',
    ]);
    expect(Object.keys(VENUE_CHAIN_DESCRIPTORS).sort()).toEqual([...VENUE_CHAIN_CLASSES].sort());
  });

  it('gives every class the full descriptor shape', () => {
    for (const venueClass of VENUE_CHAIN_CLASSES) {
      const d = VENUE_CHAIN_DESCRIPTORS[venueClass];
      expect(d.venueClass).toBe(venueClass);
      expect(typeof d.label).toBe('string');
      expect(typeof d.entryChain).toBe('string');
      expect(typeof d.settlementChain).toBe('string');
      expect(typeof d.entryIsSettlement).toBe('boolean');
      expect(typeof d.settlementMechanism).toBe('string');
      expect(typeof d.evidenceKind).toBe('string');
      expect(Array.isArray(d.observableEvidence)).toBe(true);
      expect(d.observableEvidence.length).toBeGreaterThan(0);
      expect(typeof d.independentlyRecomputable).toBe('boolean');
      expect(typeof d.independentlyVerifiable).toBe('boolean');
      expect(typeof d.evidenceStrength).toBe('string');
      expect(['DECLARED', 'UNVERIFIED']).toContain(d.verificationStatus);
      expect(d.failClosedPolicy.verdict).toBe('CAUTION');
      expect(typeof d.failClosedPolicy.reasonCode).toBe('string');
      expect(typeof d.failClosedPolicy.conclusion).toBe('string');
      expect(typeof d.notes).toBe('string');
    }
  });

  it('grades evidence strength per class and never marks weak/unverified as verifiable', () => {
    expect(VENUE_CHAIN_DESCRIPTORS['polymarket-direct'].evidenceStrength).toBe('strong');
    expect(VENUE_CHAIN_DESCRIPTORS['polymarket-direct'].independentlyVerifiable).toBe(true);
    expect(VENUE_CHAIN_DESCRIPTORS['jupiter-polymarket-embedded'].evidenceStrength).toBe('strong');
    expect(VENUE_CHAIN_DESCRIPTORS['solana-native'].evidenceStrength).toBe('unverified');
    expect(VENUE_CHAIN_DESCRIPTORS['offchain-regulated'].evidenceStrength).toBe('weak');
    expect(VENUE_CHAIN_DESCRIPTORS.unknown.evidenceStrength).toBe('none');

    for (const venueClass of ['solana-native', 'offchain-regulated', 'unknown'] as const) {
      expect(VENUE_CHAIN_DESCRIPTORS[venueClass].independentlyVerifiable).toBe(false);
      expect(VENUE_CHAIN_DESCRIPTORS[venueClass].independentlyRecomputable).toBe(false);
    }
  });

  it('registers Solana-native projects as UNVERIFIED names only, with no program ids', () => {
    const d = VENUE_CHAIN_DESCRIPTORS['solana-native'];
    expect(d.verificationStatus).toBe('UNVERIFIED');
    expect(d.evidenceKind).toBe('unverified');
    expect(d.notes).toContain('No program ids or settlement addresses are registered');
    for (const name of UNVERIFIED_SOLANA_NATIVE_PROJECTS) {
      expect(d.notes).toContain(name);
    }
    // No base58 program-id-shaped token (32-44 chars) anywhere in the descriptor.
    expect(JSON.stringify(d)).not.toMatch(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    expect(d.observableEvidence.join(' ')).toContain('UNVERIFIED');
  });
});

describe('classifyVenueChain - four-way classification', () => {
  it('classifies Polymarket direct (Polygon / UMA / CLOB)', () => {
    const result = classifyVenueChain({
      description: 'Polymarket binary market resolved by UMA on Polygon through the CLOB',
    });
    expect(result.venueClass).toBe('polymarket-direct');
    expect(result.reasonCode).toBe('POLYGON_ONCHAIN_RESOLUTION_AVAILABLE');
  });

  it('classifies the embedded Jupiter Polymarket tab', () => {
    const result = classifyVenueChain({
      description: 'Polymarket market surfaced inside the Jupiter Prediction tab on Solana',
    });
    expect(result.venueClass).toBe('jupiter-polymarket-embedded');
    expect(result.reasonCode).toBe('ENTRY_SOLANA_SETTLEMENT_POLYGON');
  });

  it('classifies Solana-native venues from the Feb 2026 report names', () => {
    for (const text of [
      'Inframarkets energy prediction market',
      'Epoch built on Arcium privacy',
      'WAVE zero-fee predictions',
      'TBD prediction market',
      'a solana-native prediction venue',
    ]) {
      expect(classifyVenueChain({ description: text }).venueClass).toBe('solana-native');
    }
  });

  it('classifies Kalshi / Coinbase distribution as off-chain regulated', () => {
    expect(
      classifyVenueChain({ description: 'Kalshi market distributed by Coinbase' }).venueClass
    ).toBe('offchain-regulated');
  });

  it('honours an explicit class-name venueHint', () => {
    expect(classifyVenueChain({ venueHint: 'offchain-regulated' }).venueClass).toBe(
      'offchain-regulated'
    );
  });

  it('returns unknown when nothing can be classified (no default verifiable)', () => {
    const result = classifyVenueChain({});
    expect(result.venueClass).toBe('unknown');
    expect(result.reasonCode).toBe('VENUE_CHAIN_UNCLASSIFIED');
  });

  it('does not let a verified fallback paper over an unrecognized explicit hint', () => {
    const result = classifyVenueChain({
      venueHint: 'some-unregistered-venue',
      fallbackVenueClass: 'polymarket-direct',
    });
    expect(result.venueClass).toBe('unknown');
  });

  it('applies a verified fallback only when no explicit hint is given', () => {
    expect(
      classifyVenueChain({ description: 'plain metadata', fallbackVenueClass: 'polymarket-direct' })
        .venueClass
    ).toBe('polymarket-direct');
  });
});

describe('assessVenueChainEvidence - entry chain is NOT settlement chain', () => {
  it('keeps Jupiter / Polymarket settlement on Polygon, not Solana', () => {
    const a = assessVenueChainEvidence({
      description: 'Polymarket market surfaced inside the Jupiter Prediction tab on Solana',
      resolutionSource: 'https://gamma-api.polymarket.com/markets',
      entryChainHint: 'solana',
    });
    expect(a.venueClass).toBe('jupiter-polymarket-embedded');
    expect(a.entryChain).toBe('solana');
    expect(a.settlementChain).toBe('polygon');
    expect(a.settlementChain).not.toBe('solana');
    expect(a.entryIsSettlement).toBe(false);
    expect(a.evidenceKind).toBe('oracle_resolution');
    expect(a.reasonCode).toBe('ENTRY_SOLANA_SETTLEMENT_POLYGON');
    expect(a.conclusion).toContain('NOT the settlement chain');
    expect(
      VENUE_CHAIN_DESCRIPTORS['jupiter-polymarket-embedded'].entryIsNotSettlementNote
    ).toContain('ENTRY != SETTLEMENT');
  });

  it('never collapses a Solana entry + Polygon settlement into solana-native', () => {
    const a = assessVenueChainEvidence({
      description: 'Solana entry point via Jupiter to a Polymarket Polygon-settled market',
    });
    expect(a.venueClass).not.toBe('solana-native');
    expect(a.settlementChain).toBe('polygon');
  });

  it('marks a genuine Solana-native venue as entry AND settlement on Solana', () => {
    const a = assessVenueChainEvidence({ description: 'Inframarkets Solana-native market' });
    expect(a.venueClass).toBe('solana-native');
    expect(a.entryChain).toBe('solana');
    expect(a.settlementChain).toBe('solana');
    expect(a.entryIsSettlement).toBe(true);
  });

  it('reports Polymarket direct as Polygon/Polygon with strong evidence', () => {
    const a = assessVenueChainEvidence({
      description: 'Polymarket UMA resolution on Polygon',
    });
    expect(a.entryChain).toBe('polygon');
    expect(a.settlementChain).toBe('polygon');
    expect(a.evidenceStrength).toBe('strong');
    expect(a.independentlyVerifiable).toBe(true);
    expect(a.independentlyRecomputable).toBe(true);
    expect(a.verdict).toBe('ALLOW');
    expect(a.failClosed).toBe(false);
  });
});

describe('assessVenueChainEvidence - fail-closed when unclassifiable or evidence is thin', () => {
  it('fails closed on an unknown venue', () => {
    const a = assessVenueChainEvidence({});
    expect(a.venueClass).toBe('unknown');
    expect(a.verdict).toBe('CAUTION');
    expect(a.failClosed).toBe(true);
    expect(a.independentlyVerifiable).toBe(false);
    expect(a.evidenceKind).toBe('none');
    expect(a.reasonCode).toBe('VENUE_CHAIN_UNCLASSIFIED');
  });

  it('fails closed on an unverified Solana-native venue', () => {
    const a = assessVenueChainEvidence({ venueHint: 'solana-native' });
    expect(a.verdict).toBe('CAUTION');
    expect(a.failClosed).toBe(true);
    expect(a.independentlyVerifiable).toBe(false);
    expect(a.evidenceStrength).toBe('unverified');
    expect(a.reasonCode).toBe('SOLANA_NATIVE_VENUE_UNVERIFIED');
  });

  it('fails closed on off-chain regulated settlement', () => {
    const a = assessVenueChainEvidence({ description: 'Kalshi via Coinbase, 50 states' });
    expect(a.settlementChain).toBe('offchain');
    expect(a.evidenceKind).toBe('official_api');
    expect(a.verdict).toBe('CAUTION');
    expect(a.failClosed).toBe(true);
    expect(a.independentlyRecomputable).toBe(false);
    expect(a.reasonCode).toBe('OFFCHAIN_SETTLEMENT_NOT_INDEPENDENTLY_VERIFIABLE');
  });

  it('fails closed when the resolution was not observed, even for on-chain classes', () => {
    const a = assessVenueChainEvidence({
      description: 'Polymarket UMA resolution on Polygon',
      resolutionObserved: false,
    });
    expect(a.venueClass).toBe('polymarket-direct');
    expect(a.verdict).toBe('CAUTION');
    expect(a.failClosed).toBe(true);
    expect(a.independentlyVerifiable).toBe(false);
    expect(a.evidenceStrength).toBe('none');
    expect(a.reasonCode).toBe('POLYMARKET_RESOLUTION_NOT_OBSERVABLE');
  });

  it('never defaults to verifiable across every non-strong class', () => {
    for (const hint of ['solana-native', 'offchain-regulated', 'unknown', 'mystery-venue']) {
      const a = assessVenueChainEvidence({ venueHint: hint });
      expect(a.independentlyVerifiable).toBe(false);
      expect(a.verdict).toBe('CAUTION');
      expect(a.failClosed).toBe(true);
    }
  });
});

describe('prediction guard integration - structured assessment + zero regression', () => {
  it('exposes a Polygon/Polygon assessment for a healthy regular market and keeps ALLOW', async () => {
    const result = await assessPolymarketGuard(BASE_INPUT, deps());
    // Existing verdict semantics unchanged.
    expect(result.verdict).toBe('ALLOW');
    expect(result.schema).toBe('insight.polymarket-guard.v1');
    expect(result.market.settlementVenue).toBe('chainlink-stream');
    expect(result.disclosure.oracleConsensus).toBe('not_applicable_to_event_markets');
    // New structured field.
    expect(result.settlementChain).toBeDefined();
    expect(result.settlementChain?.venueClass).toBe('polymarket-direct');
    expect(result.settlementChain?.entryChain).toBe('polygon');
    expect(result.settlementChain?.settlementChain).toBe('polygon');
    expect(result.settlementChain?.evidenceKind).toBe('oracle_resolution');
    expect(result.settlementChain?.independentlyVerifiable).toBe(true);
    expect(result.settlementChain?.verdict).toBe('ALLOW');
    expect(typeof result.settlementChain?.reasonCode).toBe('string');
  });

  it('does not misread a Jupiter-embedded market as Solana settlement', async () => {
    const market = gammaMarket({
      description:
        'Polymarket market surfaced inside the Jupiter Prediction tab on Solana; ' +
        'settlement remains on Polygon.',
    });
    const result = await assessPolymarketGuard(BASE_INPUT, deps(market));
    expect(result.settlementChain?.venueClass).toBe('jupiter-polymarket-embedded');
    expect(result.settlementChain?.entryChain).toBe('solana');
    expect(result.settlementChain?.settlementChain).toBe('polygon');
    expect(result.settlementChain?.entryIsSettlement).toBe(false);
    expect(result.settlementChain?.settlementChain).not.toBe('solana');
  });

  it('fails closed in the assessment for an off-chain regulated venue', async () => {
    const market = gammaMarket({
      description: 'Kalshi market distributed by Coinbase across all 50 states.',
    });
    const result = await assessPolymarketGuard(BASE_INPUT, deps(market));
    expect(result.settlementChain?.venueClass).toBe('offchain-regulated');
    expect(result.settlementChain?.verdict).toBe('CAUTION');
    expect(result.settlementChain?.failClosed).toBe(true);
    expect(result.settlementChain?.independentlyVerifiable).toBe(false);
  });

  it('fails closed in the assessment for an unverified Solana-native venue', async () => {
    const market = gammaMarket({ description: 'Inframarkets energy prediction market on Solana' });
    const result = await assessPolymarketGuard(BASE_INPUT, deps(market));
    expect(result.settlementChain?.venueClass).toBe('solana-native');
    expect(result.settlementChain?.verdict).toBe('CAUTION');
    expect(result.settlementChain?.failClosed).toBe(true);
    expect(result.settlementChain?.evidenceKind).toBe('unverified');
  });

  it('omits the new field on the early fail-closed path (no shape regression)', async () => {
    const fetchMarket = jest.fn(async () => {
      throw new Error('Gamma API 503 for slug lookup');
    }) as never;
    const result = await assessPolymarketGuard(BASE_INPUT, deps(null, MID_WINDOW_NOW, fetchMarket));
    expect(result.verdict).toBe('BLOCK');
    expect(result.settlementChain).toBeUndefined();
  });

  it('keeps the original guard verdict semantics for closed / unknown-venue / out-of-scope', async () => {
    const closed = await assessPolymarketGuard(BASE_INPUT, deps(gammaMarket({ closed: true })));
    expect(closed.verdict).toBe('BLOCK');
    expect(closed.reasons).toContain('market closed');

    const unknownVenue = await assessPolymarketGuard(
      BASE_INPUT,
      deps(gammaMarket({ resolutionSource: null, description: 'Some local feed.' }))
    );
    expect(unknownVenue.verdict).toBe('CAUTION');
    expect(unknownVenue.reasons).toContain('settlement venue unverifiable');

    const outOfScope = await assessPolymarketGuard(
      { ...BASE_INPUT, marketSlug: 'will-something-happen-in-2026' },
      deps(gammaMarket({ slug: 'will-something-happen-in-2026' }))
    );
    expect(outOfScope.verdict).toBe('BLOCK');
    expect(outOfScope.reasons).toContain('outside reviewed market scope');
  });
});
