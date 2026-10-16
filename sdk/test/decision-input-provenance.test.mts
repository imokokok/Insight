import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDecisionInputQuoteProvenance,
  isDecisionInputQuoteProvenance,
  quoteProvenanceMatchesInput,
} from '../src/decision-input-provenance';

test('creates a hash-only quote-provenance envelope bound to the submitted quote', () => {
  const provenance = createDecisionInputQuoteProvenance({
    sourceId: 'customer-broker',
    rightsScope: 'customer-authorized',
    asset: 'ETH',
    chainId: 1,
    quotePriceUsd: 2000.5,
    observedAt: '2026-10-13T06:29:58.000Z',
    request: { endpoint: '/quote', authorization: 'secret-request-value' },
    response: { price: 2000.5, venueToken: 'secret-response-value' },
  });

  assert.equal(isDecisionInputQuoteProvenance(provenance), true);
  assert.equal(
    quoteProvenanceMatchesInput(provenance, {
      asset: 'eth',
      chainId: 1,
      quotePriceUsd: 2000.5,
      quoteObservedAt: '2026-10-13T06:29:58.000Z',
    }),
    true
  );
  assert.equal(
    quoteProvenanceMatchesInput(provenance, {
      asset: 'ETH',
      chainId: 1,
      quotePriceUsd: 2000.6,
      quoteObservedAt: '2026-10-13T06:29:58.000Z',
    }),
    false
  );
  const serialized = JSON.stringify(provenance);
  assert.equal(serialized.includes('secret-request-value'), false);
  assert.equal(serialized.includes('secret-response-value'), false);
});

test('rejects malformed or unbound quote provenance', () => {
  assert.equal(isDecisionInputQuoteProvenance({ schemaVersion: 1 }), false);
  assert.throws(
    () =>
      createDecisionInputQuoteProvenance({
        sourceId: 'unsafe source id',
        rightsScope: 'customer-authorized',
        asset: 'ETH',
        chainId: 1,
        quotePriceUsd: 1,
        observedAt: '2026-10-13T06:29:58.000Z',
        request: {},
        response: {},
      }),
    /sourceId/
  );
});
