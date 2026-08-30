import { watchReasonCodes, type WatchReasonInputs } from '../watchReasonCodes';

/** A healthy feed: coverage, quorum and independence all satisfied. */
function inputs(overrides: Partial<WatchReasonInputs> = {}): WatchReasonInputs {
  return {
    participantCount: 4,
    sourceGroupCount: 3,
    requiredParticipantCount: 3,
    requiredSourceGroupCount: 2,
    deviationDanger: false,
    agreementDanger: false,
    outlierCount: 0,
    staleCount: 0,
    mlForwardRiskHigh: false,
    marketDivergence: false,
    ...overrides,
  };
}

describe('watchReasonCodes', () => {
  it('returns an empty set for a healthy feed', () => {
    expect(watchReasonCodes(inputs())).toEqual([]);
  });

  it('reports NO_COVERAGE alone — not every gate that happens to be unmet', () => {
    // With zero participants every other gate is trivially unsatisfied, but
    // piling them all on tells the agent four things when only one is true:
    // there was nothing to judge.
    const codes = watchReasonCodes(
      inputs({
        participantCount: 0,
        sourceGroupCount: 0,
        deviationDanger: true,
        agreementDanger: true,
        outlierCount: 2,
      })
    );
    expect(codes).toEqual(['NO_COVERAGE']);
  });

  it('separates the quorum gate from the independence gate', () => {
    // Headcount satisfied, independence not: the single-operator case.
    expect(watchReasonCodes(inputs({ participantCount: 3, sourceGroupCount: 1 }))).toEqual([
      'INSUFFICIENT_INDEPENDENCE',
    ]);

    // Independence satisfied, headcount not: enough operators, too few feeds.
    expect(watchReasonCodes(inputs({ participantCount: 2, sourceGroupCount: 2 }))).toEqual([
      'INSUFFICIENT_QUORUM',
    ]);

    // Both.
    expect(watchReasonCodes(inputs({ participantCount: 1, sourceGroupCount: 1 }))).toEqual([
      'INSUFFICIENT_INDEPENDENCE',
      'INSUFFICIENT_QUORUM',
    ]);
  });

  it('combines market, cleanliness and advisory codes', () => {
    const codes = watchReasonCodes(
      inputs({
        deviationDanger: true,
        agreementDanger: true,
        outlierCount: 1,
        staleCount: 2,
        mlForwardRiskHigh: true,
        marketDivergence: true,
      })
    );
    expect(codes).toEqual([
      'LOW_AGREEMENT',
      'MARKET_DIVERGENCE',
      'MAX_DEVIATION',
      'ML_FORWARD_RISK_HIGH',
      'OUTLIER_PRESENT',
      'STALE_DATA',
    ]);
  });

  it('emits MARKET_DIVERGENCE alone on an otherwise-healthy feed', () => {
    // The oracle-consensus gates all pass, but consensus deviates from the
    // independent CEX reference — the advisory only a market-truth layer can
    // raise. Must NOT affect the verdict gates (evidence, not a verdict input).
    expect(watchReasonCodes(inputs({ marketDivergence: true }))).toEqual(['MARKET_DIVERGENCE']);
  });

  it('emits codes the dominant reason string would otherwise hide', () => {
    // The service sets reason = 'deviation_or_agreement_breached_danger' here,
    // which says nothing about the two providers that were also stale.
    const codes = watchReasonCodes(inputs({ deviationDanger: true, staleCount: 1 }));
    expect(codes).toEqual(['MAX_DEVIATION', 'STALE_DATA']);
  });

  it('is order-independent and deduplicated', () => {
    const a = watchReasonCodes(inputs({ deviationDanger: true, outlierCount: 3 }));
    const b = watchReasonCodes(inputs({ outlierCount: 1, deviationDanger: true }));
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  it('judges each gate against the thresholds it is given', () => {
    // The floors are inputs, not constants: when the service raises them the
    // codes follow without this module changing.
    expect(
      watchReasonCodes(inputs({ participantCount: 4, requiredParticipantCount: 5 }))
    ).toContain('INSUFFICIENT_QUORUM');
    expect(
      watchReasonCodes(inputs({ sourceGroupCount: 2, requiredSourceGroupCount: 3 }))
    ).toContain('INSUFFICIENT_INDEPENDENCE');
  });
});
