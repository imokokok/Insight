/**
 * Unit tests + published test vector for reasonCodesHash, plus the
 * contributingFactors → reason-code derivation.
 */

import {
  computeReasonCodesHash,
  reasonCodesFromContributingFactors,
  RULE_TO_REASON_CODE,
} from '../reasonCodesHash';

describe('computeReasonCodesHash', () => {
  it('returns a 32-byte digest', () => {
    expect(computeReasonCodesHash(['MAX_DEVIATION'])).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it('publishes a stable test vector (3 codes)', () => {
    expect(computeReasonCodesHash(['LOW_AGREEMENT', 'STABLECOIN_DEPEG', 'MAX_DEVIATION'])).toBe(
      '0x34584fef6996af0e4efed2ae703a5d774c89f3b1acb39cd13707dde5d3c89df0'
    );
  });

  it('is order-independent and deduplicates', () => {
    // Shuffled + duplicated input MUST hash the same as the canonical sorted
    // unique set.
    expect(
      computeReasonCodesHash([
        'STABLECOIN_DEPEG',
        'MAX_DEVIATION',
        'LOW_AGREEMENT',
        'MAX_DEVIATION',
      ])
    ).toBe(computeReasonCodesHash(['LOW_AGREEMENT', 'STABLECOIN_DEPEG', 'MAX_DEVIATION']));
  });

  it('changes when the reason set changes', () => {
    const base = computeReasonCodesHash(['MAX_DEVIATION', 'STALE_DATA']);
    expect(computeReasonCodesHash(['MAX_DEVIATION'])).not.toBe(base);
    expect(computeReasonCodesHash(['MAX_DEVIATION', 'STALE_DATA', 'LOW_AGREEMENT'])).not.toBe(base);
  });

  it('hashes an empty set to a well-defined constant', () => {
    expect(computeReasonCodesHash([])).toBe(
      '0x569e75fc77c1a856f6daaf9e69d8a9566ca34aa47f9133711ce065a571af0cfd'
    );
  });
});

describe('reasonCodesFromContributingFactors', () => {
  it('maps known rule strings to reason codes, sorted + deduped', () => {
    const codes = reasonCodesFromContributingFactors([
      { rule: 'stablecoin_depeg_pct' },
      { rule: 'cross_provider_agreement' },
      { rule: 'max_provider_deviation_pct' },
      // two factors hitting the same rule → one code
      { rule: 'max_provider_deviation_pct' },
    ]);
    expect(codes).toEqual(['LOW_AGREEMENT', 'MAX_DEVIATION', 'STABLECOIN_DEPEG']);
  });

  it('maps the quorum / coverage rule to INSUFFICIENT_COVERAGE', () => {
    expect(reasonCodesFromContributingFactors([{ rule: 'oracle_coverage' }])).toEqual([
      'INSUFFICIENT_COVERAGE',
    ]);
    expect(reasonCodesFromContributingFactors([{ rule: 'quorum' }])).toEqual([
      'INSUFFICIENT_COVERAGE',
    ]);
  });

  it('skips unknown rules (forward-compatible with v2.1 additions)', () => {
    expect(
      reasonCodesFromContributingFactors([
        { rule: 'some_future_rule' },
        { rule: 'max_provider_deviation_pct' },
      ])
    ).toEqual(['MAX_DEVIATION']);
  });

  it('returns [] for empty factors', () => {
    expect(reasonCodesFromContributingFactors([])).toEqual([]);
  });
});

describe('RULE_TO_REASON_CODE coverage', () => {
  // Every rule the engine actually emits (verified against
  // preTradeSafetyService.ts) must map. Guards against silent reason gaps.
  it.each([
    'oracle_coverage',
    'max_provider_deviation_pct',
    'cross_provider_spread_pct',
    'data_stale_seconds',
    'cross_provider_agreement',
    'stablecoin_depeg_pct',
    'protocol_buffer_consumed',
    'position_to_liquidity_ratio',
  ])('maps engine rule %s to a reason code', (rule) => {
    expect(RULE_TO_REASON_CODE[rule]).toBeDefined();
  });
});
