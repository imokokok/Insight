/**
 * @fileoverview Built-in scenario fixtures — historical oracle failures
 * reconstructed as replayable scenarios, plus clearly-labeled synthetic ones.
 *
 * FACT DISCIPLINE (project rule: demonstrated ≠ asserted):
 *   - Scenarios marked `public_incident` reconstruct the failure MECHANISM of
 *     a publicly documented event. Prices and anchors are synthetic
 *     reconstructions, never a claim about real historical market data or the
 *     exact wall-clock time of the incident.
 *   - Scenarios marked `synthetic` have no incident behind them and exist to
 *     exercise a failure class end-to-end.
 *   - `references` only cites sources actually consulted. No placeholder URLs.
 */

import type { OracleScenario } from './schema';

export interface FixtureIncident {
  sourceType: 'public_incident' | 'synthetic';
  /** What is publicly documented about the event (mechanism level). */
  note: string;
  /** Sources actually consulted. URLs only when verified; otherwise a plain
   *  description. Never placeholder links. */
  references?: string[];
}

export interface OracleFixture {
  scenario: OracleScenario;
  incident: FixtureIncident;
}

// Anchor timestamps are arbitrary unix seconds chosen for reproducibility.
const ANCHOR = 1_770_000_000; // 2026-02-02T00:00:00Z, no historical claim implied.

const eulerRedstoneStale: OracleFixture = {
  scenario: {
    id: 'euler-redstone-stale-data',
    kind: 'stale_price',
    title: 'Euler Price Oracles: RedstoneCoreOracle accepts stale data',
    description:
      'Reconstruction of the finding ChainSecurity reported in its Euler Price Oracles audit: ' +
      'the Redstone core oracle could be updated with stale data, so a dependent protocol would ' +
      'settle against an old price while believing the feed was current. The finding was fixed ' +
      'before any exploit. Series is a mechanism reconstruction, not historical market data.',
    symbol: 'RSD-USD',
    chainId: 1,
    startedAt: ANCHOR,
    policy: { maxStalenessSeconds: 60, maxDeviationPct: 1.5, minSources: 1 },
    steps: [
      {
        t: 0,
        phase: 'baseline',
        settlementPrice: 3000.5,
        sources: [{ provider: 'redstone-core', price: 3000.5, timestamp: ANCHOR, status: 'ok' }],
      },
      {
        t: 120,
        phase: 'attack',
        settlementPrice: 3000.5,
        sources: [{ provider: 'redstone-core', price: 3000.5, timestamp: ANCHOR, status: 'ok' }],
      },
      {
        t: 240,
        phase: 'attack',
        settlementPrice: 2999.8,
        sources: [{ provider: 'redstone-core', price: 3000.5, timestamp: ANCHOR, status: 'ok' }],
      },
    ],
  },
  incident: {
    sourceType: 'public_incident',
    note: 'ChainSecurity audit of Euler Price Oracles reported and tracked a fix for a RedstoneCoreOracle stale-data update issue.',
    references: ['https://chainsecurity.com/security-audit/euler-price-oracles/'],
  },
};

const compoundFeedOutage: OracleFixture = {
  scenario: {
    id: 'compound-feed-outage',
    kind: 'feed_failure',
    title: 'Compound: upstream price data outage yields bad oracle values',
    description:
      'Reconstruction of the November 2020 Compound incident where an upstream price-data ' +
      'outage degraded the oracle value feeding the protocol, contributing to improper ' +
      'liquidations. Modeled here as a provider error plus a frozen source, which a quorum ' +
      'and staleness policy should refuse. Series is a mechanism reconstruction.',
    symbol: 'COMP-USD',
    chainId: 1,
    startedAt: ANCHOR,
    policy: { maxStalenessSeconds: 300, maxDeviationPct: 2, minSources: 2 },
    steps: [
      {
        t: 0,
        phase: 'baseline',
        settlementPrice: 120,
        sources: [
          { provider: 'primary-aggregator', price: 120, timestamp: ANCHOR, status: 'ok' },
          { provider: 'secondary-aggregator', price: 120.2, timestamp: ANCHOR, status: 'ok' },
        ],
      },
      {
        t: 600,
        phase: 'attack',
        settlementPrice: 120,
        sources: [
          { provider: 'primary-aggregator', price: 0, timestamp: 0, status: 'error' },
          { provider: 'secondary-aggregator', price: 120.2, timestamp: ANCHOR, status: 'ok' },
        ],
      },
      {
        t: 1200,
        phase: 'attack',
        settlementPrice: 120.2,
        sources: [
          { provider: 'primary-aggregator', price: 0, timestamp: 0, status: 'error' },
          { provider: 'secondary-aggregator', price: 120.2, timestamp: ANCHOR, status: 'stale' },
        ],
      },
    ],
  },
  incident: {
    sourceType: 'public_incident',
    note: 'Compound experienced an upstream price-data outage in November 2020; affected markets liquidated against degraded oracle values. Documented in public post-mortems.',
    references: ['Compound Labs public post-mortem, November 2020'],
  },
};

const mangoThinLiquidity: OracleFixture = {
  scenario: {
    id: 'mango-thin-liquidity-pump',
    kind: 'flash_manipulation',
    title: 'Mango Markets: thin-liquidity price pumping of MNGO',
    description:
      'Reconstruction of the October 2022 Mango Markets exploit mechanism: an attacker ' +
      'pumped the thinly-traded MNGO spot price within minutes, and the on-chain oracle ' +
      'followed, letting them borrow against inflated collateral. Modeled as one source ' +
      'diverging violently from the other within a single step. Series is a mechanism ' +
      'reconstruction, not historical data.',
    symbol: 'MNGO-USD',
    chainId: 1,
    startedAt: ANCHOR,
    policy: { maxStalenessSeconds: 120, maxDeviationPct: 2, minSources: 2 },
    steps: [
      {
        t: 0,
        phase: 'baseline',
        settlementPrice: 0.04,
        sources: [
          { provider: 'spot-oracle', price: 0.04, timestamp: ANCHOR, status: 'ok' },
          { provider: 'cex-aggregator', price: 0.0401, timestamp: ANCHOR, status: 'ok' },
        ],
      },
      {
        t: 60,
        phase: 'attack',
        settlementPrice: 0.9,
        sources: [
          { provider: 'spot-oracle', price: 0.91, timestamp: ANCHOR + 60, status: 'ok' },
          { provider: 'cex-aggregator', price: 0.0401, timestamp: ANCHOR + 60, status: 'ok' },
        ],
      },
      {
        t: 120,
        phase: 'attack',
        settlementPrice: 1.7,
        sources: [
          { provider: 'spot-oracle', price: 1.74, timestamp: ANCHOR + 120, status: 'ok' },
          { provider: 'cex-aggregator', price: 0.0402, timestamp: ANCHOR + 120, status: 'ok' },
        ],
      },
    ],
  },
  incident: {
    sourceType: 'public_incident',
    note: 'In October 2022 an attacker inflated the thinly-traded MNGO price and borrowed against the inflated oracle value. Widely publicly documented.',
    references: ['Public reporting on the Mango Markets exploit, October 2022'],
  },
};

const creamOracleSpike: OracleFixture = {
  scenario: {
    id: 'cream-oracle-spike',
    kind: 'deviation_spike',
    title: 'Cream Finance: oracle price manipulation enables uncollateralized borrows',
    description:
      'Reconstruction of the February 2021 Cream Finance exploit mechanism: manipulated ' +
      'oracle prices let the attacker borrow far beyond collateral value. Modeled as a ' +
      'sudden multi-fold spike in the reported price versus its own recent baseline. ' +
      'Series is a mechanism reconstruction.',
    symbol: 'CREAM3CRV-USD',
    chainId: 1,
    startedAt: ANCHOR,
    policy: { maxStalenessSeconds: 300, maxDeviationPct: 2, minSources: 2 },
    steps: [
      {
        t: 0,
        phase: 'baseline',
        settlementPrice: 1.02,
        sources: [
          { provider: 'lp-oracle', price: 1.02, timestamp: ANCHOR, status: 'ok' },
          { provider: 'reference-oracle', price: 1.02, timestamp: ANCHOR, status: 'ok' },
        ],
      },
      {
        t: 60,
        phase: 'attack',
        settlementPrice: 1.4,
        sources: [
          { provider: 'lp-oracle', price: 1.4, timestamp: ANCHOR + 60, status: 'ok' },
          { provider: 'reference-oracle', price: 1.02, timestamp: ANCHOR + 60, status: 'ok' },
        ],
      },
      {
        t: 120,
        phase: 'attack',
        settlementPrice: 2.1,
        sources: [
          { provider: 'lp-oracle', price: 2.1, timestamp: ANCHOR + 120, status: 'ok' },
          { provider: 'reference-oracle', price: 1.02, timestamp: ANCHOR + 120, status: 'ok' },
        ],
      },
    ],
  },
  incident: {
    sourceType: 'public_incident',
    note: 'In February 2021 Cream Finance lost funds after oracle price manipulation enabled uncollateralized borrows. Widely publicly documented.',
    references: ['Public reporting on the Cream Finance exploit, February 2021'],
  },
};

const centrifugeRounding: OracleFixture = {
  scenario: {
    id: 'centrifuge-rounding-accumulation',
    kind: 'precision_error',
    title: 'Centrifuge ERC-7540: rounding accumulation bypasses deposit caps',
    description:
      'Reconstruction of the medium-severity finding from Recon\u2019s invariant testing of ' +
      'Centrifuge\u2019s ERC-7540 implementation: per-operation share rounding errors of at most ' +
      'one wei, repeated thousands of times, incrementally exceeded deposit caps. The scenario ' +
      'abstracts the accumulation as precision drift on the reported price: each step sits below ' +
      'the deviation threshold until the accumulated drift crosses it. Series is a mechanism ' +
      'reconstruction.',
    symbol: 'CFG-SHARE',
    chainId: 1,
    startedAt: ANCHOR,
    policy: { maxStalenessSeconds: 3600, maxDeviationPct: 1, minSources: 1 },
    steps: [
      {
        t: 0,
        phase: 'baseline',
        settlementPrice: 100,
        sources: [{ provider: 'share-converter', price: 100, timestamp: ANCHOR, status: 'ok' }],
      },
      {
        t: 600,
        phase: 'baseline',
        settlementPrice: 100.3,
        sources: [
          { provider: 'share-converter', price: 100.3, timestamp: ANCHOR + 600, status: 'ok' },
        ],
      },
      {
        t: 1200,
        phase: 'baseline',
        settlementPrice: 100.7,
        sources: [
          { provider: 'share-converter', price: 100.7, timestamp: ANCHOR + 1200, status: 'ok' },
        ],
      },
      {
        t: 1800,
        phase: 'attack',
        settlementPrice: 101.4,
        sources: [
          { provider: 'share-converter', price: 101.4, timestamp: ANCHOR + 1800, status: 'ok' },
        ],
      },
      {
        t: 2400,
        phase: 'attack',
        settlementPrice: 102.2,
        sources: [
          { provider: 'share-converter', price: 102.2, timestamp: ANCHOR + 2400, status: 'ok' },
        ],
      },
    ],
  },
  incident: {
    sourceType: 'public_incident',
    note: 'Recon\u2019s public case study documents invariant testing that found rounding errors in share/asset conversions allowing deposit-cap bypass (medium severity), fixed by rounding in favor of the protocol.',
    references: ['https://getrecon.xyz/case-studies/centrifuge'],
  },
};

const syntheticDivergence: OracleFixture = {
  scenario: {
    id: 'synthetic-source-divergence',
    kind: 'multi_source_divergence',
    title: 'Synthetic: two providers diverge persistently',
    description:
      'Synthetic scenario (no incident behind it): a secondary provider drifts away from the ' +
      'consensus and stays there. Exercises the divergence detection class end-to-end, ' +
      'including the boundary between tolerated baseline noise and a reportable divergence.',
    symbol: 'SYN-USD',
    chainId: 1,
    startedAt: ANCHOR,
    policy: { maxStalenessSeconds: 300, maxDeviationPct: 1, minSources: 2 },
    steps: [
      {
        t: 0,
        phase: 'baseline',
        settlementPrice: 50,
        sources: [
          { provider: 'provider-a', price: 50, timestamp: ANCHOR, status: 'ok' },
          { provider: 'provider-b', price: 50.2, timestamp: ANCHOR, status: 'ok' },
        ],
      },
      {
        t: 300,
        phase: 'attack',
        settlementPrice: 50,
        sources: [
          { provider: 'provider-a', price: 50, timestamp: ANCHOR + 300, status: 'ok' },
          { provider: 'provider-b', price: 52, timestamp: ANCHOR + 300, status: 'ok' },
        ],
      },
      {
        t: 600,
        phase: 'attack',
        settlementPrice: 50,
        sources: [
          { provider: 'provider-a', price: 50, timestamp: ANCHOR + 600, status: 'ok' },
          { provider: 'provider-b', price: 53.5, timestamp: ANCHOR + 600, status: 'ok' },
        ],
      },
    ],
  },
  incident: {
    sourceType: 'synthetic',
    note: 'No real incident. Exercises multi_source_divergence detection end-to-end.',
  },
};

/** All built-in fixtures, in stable order. */
export function getFixtures(): OracleFixture[] {
  return [
    eulerRedstoneStale,
    compoundFeedOutage,
    mangoThinLiquidity,
    creamOracleSpike,
    centrifugeRounding,
    syntheticDivergence,
  ];
}

/** Look up a built-in fixture by scenario id. */
export function getFixtureById(id: string): OracleFixture | undefined {
  return getFixtures().find((f) => f.scenario.id === id);
}
