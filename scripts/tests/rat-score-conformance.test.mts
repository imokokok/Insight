import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { rwaInstrumentId, type RwaInstrument } from '../../sdk/src/rwa.ts';

// Byte-exact copy of SAW72/rwa-transparency-score at the merged PR #52 commit.
// This test has no RAT package, API, network, or runtime dependency.
const RAT_COMMIT = '0e832c24a405e17cfc567ebe51cefd9046c5e10d';
const FIXTURE_SHA256 = '76316c0d6b933a111d32e0cca9c50d9c02851da61c289a80701151370b46903a';
const fixtureUrl = new URL('../rat-score-conformance/v1_score_NVDA.fixture.json', import.meta.url);
const simulationUrl = new URL(
  '../rat-score-conformance/nvda_consumer_conformance.simulation.json',
  import.meta.url
);

function record(value: unknown): Record<string, unknown> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}

test('pinned RAT NVDA fixture remains candidate context, never an Insight authorization', () => {
  const raw = readFileSync(fixtureUrl);
  assert.equal(
    createHash('sha256').update(raw).digest('hex'),
    FIXTURE_SHA256,
    `RAT commit ${RAT_COMMIT}`
  );
  const fixture = record(JSON.parse(raw.toString('utf8')) as unknown);
  assert.equal(fixture.ticker, 'NVDA');
  assert.equal(fixture.issuer, 'Backed Finance');
  assert.equal(fixture.data_source, 'fixture');
  assert.equal(fixture.verification_mode, 'offline_heuristic');
  assert.equal(fixture.live_verifiers, false);
  assert.equal(fixture.score, 90.4);
  assert.equal(fixture.band, 'GREEN');
  assert.deepEqual(record(fixture.confidence), { score: 0.4, label: 'low' });

  const verification = record(fixture.verification);
  for (const pillar of ['backing', 'reserves', 'redemption', 'price', 'disclosure', 'basis']) {
    assert.equal(record(verification[pillar]).level, 'self-reported');
  }
  for (const pillar of ['backing', 'reserves', 'redemption']) {
    assert.equal(record(verification[pillar]).source, 'heuristic_fallback');
  }

  const candidate = { ticker: fixture.ticker, issuer: fixture.issuer };
  assert.throws(() => rwaInstrumentId(candidate as unknown as RwaInstrument), /RWA_INVALID_SHAPE/);
  const tokens = record(fixture.price).tokens;
  assert.ok(Array.isArray(tokens));
  const wrappers = tokens.map(record);
  assert.deepEqual(
    wrappers.map((wrapper) => wrapper.issuer),
    ['Backed Finance', 'Ondo', 'xStocks']
  );
  assert.equal(new Set(wrappers.map((wrapper) => wrapper.issuer)).size, 3);
  for (const wrapper of wrappers) {
    assert.equal('instrumentId' in wrapper, false);
    assert.equal('observedAt' in wrapper, false);
    assert.equal('observed_at' in wrapper, false);
    assert.equal('timestamp' in wrapper, false);
  }
  // Each wrapper belongs to a different issuer, so none is an eligible
  // independent quote for a single, separately bound Insight instrument.
  assert.equal(
    wrappers.filter((wrapper) => 'instrumentId' in wrapper && 'observedAt' in wrapper).length,
    0
  );
  assert.equal('action' in fixture, false);
  assert.equal('actor' in fixture, false);
  assert.equal('policy' in fixture, false);
  assert.equal('signature' in fixture, false);
  assert.equal('mayAuthorizeExecution' in fixture, false);

  const simulation = record(JSON.parse(readFileSync(simulationUrl, 'utf8')) as unknown);
  const pin = record(simulation.fixture);
  assert.equal(pin.commit, RAT_COMMIT);
  assert.equal(pin.sha256, FIXTURE_SHA256);
  assert.equal(simulation.simulationOnly, true);
  assert.equal(simulation.mayAuthorizeExecution, false);
  assert.equal('verdict' in simulation, false);
  assert.equal('signature' in simulation, false);
  assert.deepEqual(record(simulation.ratSignals).verification, fixture.verification);
  const observations = simulation.wrapperPriceObservations;
  assert.ok(Array.isArray(observations));
  assert.equal(observations.length, 3);
  assert.equal(simulation.sameInstrumentIndependentQuoteCount, 0);
  for (const observation of observations.map(record)) {
    assert.equal(observation.exactInstrumentId, null);
    assert.equal(observation.originalObservationTime, null);
    assert.equal(observation.freshnessStatus, 'UNKNOWN');
    assert.equal(observation.countsAsSameInstrumentIndependentQuote, false);
  }
});
