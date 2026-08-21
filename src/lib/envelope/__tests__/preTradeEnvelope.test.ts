/**
 * Unit tests for the pre-trade envelope gate (pure conjunction evaluation).
 *
 * Every red path is exercised directly: the gate must BLOCK on any single
 * member failure (missing / tampered / expired / negative), and PASS only when
 * both members clear the whole check ladder. CAUTION must stay an allowed
 * price verdict (right-sized action), while only a signed OPEN counts as a
 * positive market state.
 */

import {
  evaluatePreTradeEnvelope,
  type MarketStateMemberInput,
  type PriceIntegrityMemberInput,
} from '@/lib/envelope/preTradeEnvelope';

const goodPrice: PriceIntegrityMemberInput = {
  present: true,
  signatureValid: true,
  expired: false,
  verdict: 'PASS',
};

const goodMarket: MarketStateMemberInput = {
  present: true,
  signatureValid: true,
  expired: false,
  status: 'OPEN',
};

function evaluate(price: PriceIntegrityMemberInput, market: MarketStateMemberInput) {
  return evaluatePreTradeEnvelope({
    priceIntegrity: price,
    marketState: market,
    evaluatedAtMs: Date.parse('2026-08-21T00:00:00Z'),
  });
}

describe('pre-trade envelope gate', () => {
  it('PASSes only when both members clear every check', () => {
    const result = evaluate(goodPrice, goodMarket);
    expect(result.verdict).toBe('PASS');
    expect(result.failClosed).toBe(true);
    expect(result.reasonCodes).toEqual([]);
    expect(result.members.priceIntegrity.reasonCode).toBeNull();
    expect(result.members.marketState.reasonCode).toBeNull();
    expect(result.evaluatedAt).toBe('2026-08-21T00:00:00.000Z');
  });

  it('treats CAUTION as an allowed price verdict', () => {
    const result = evaluate({ ...goodPrice, verdict: 'CAUTION' }, goodMarket);
    expect(result.verdict).toBe('PASS');
  });

  it.each(['DANGER', 'BLOCK'] as const)('BLOCKs on negative price verdict (%s)', (verdict) => {
    const result = evaluate({ ...goodPrice, verdict }, goodMarket);
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasonCodes).toEqual(['price_integrity_negative_verdict']);
  });

  it('BLOCKs on a missing price-integrity receipt', () => {
    const result = evaluate(
      { present: false, signatureValid: false, expired: false, verdict: null },
      goodMarket
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasonCodes).toEqual(['price_integrity_missing']);
  });

  it('BLOCKs on a tampered price-integrity receipt (signature/uid broken)', () => {
    const result = evaluate({ ...goodPrice, signatureValid: false }, goodMarket);
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasonCodes).toEqual(['price_integrity_signature_invalid']);
  });

  it('BLOCKs on an expired price-integrity receipt even though the signature is genuine', () => {
    const result = evaluate({ ...goodPrice, expired: true }, goodMarket);
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasonCodes).toEqual(['price_integrity_expired']);
    // The diagnosis must not confuse staleness with tampering.
    expect(result.members.priceIntegrity.signatureValid).toBe(true);
    expect(result.members.priceIntegrity.fresh).toBe(false);
  });

  it('BLOCKs on a missing market-state receipt', () => {
    const result = evaluate(goodPrice, {
      present: false,
      signatureValid: false,
      expired: false,
      status: null,
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasonCodes).toEqual(['market_state_missing']);
  });

  it('BLOCKs on a tampered market-state receipt', () => {
    const result = evaluate(goodPrice, { ...goodMarket, signatureValid: false });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasonCodes).toEqual(['market_state_signature_invalid']);
  });

  it('BLOCKs on an expired market-state receipt', () => {
    const result = evaluate(goodPrice, { ...goodMarket, expired: true });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasonCodes).toEqual(['market_state_expired']);
  });

  it.each(['CLOSED', 'HALTED', 'UNKNOWN'] as const)(
    'BLOCKs when the signed market status is not OPEN (%s)',
    (status) => {
      const result = evaluate(goodPrice, { ...goodMarket, status });
      expect(result.verdict).toBe('BLOCK');
      expect(result.reasonCodes).toEqual(['market_state_not_open']);
    }
  );

  it('reports both members when both fail, price first', () => {
    const result = evaluate(
      { present: false, signatureValid: false, expired: false, verdict: null },
      { present: true, signatureValid: true, expired: false, status: 'CLOSED' }
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasonCodes).toEqual(['price_integrity_missing', 'market_state_not_open']);
  });
});
