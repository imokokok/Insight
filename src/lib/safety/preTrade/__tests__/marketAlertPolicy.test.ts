import { evaluateDepegRule } from '../marketAlertPolicy';

describe('market alert policy', () => {
  it('uses the largest absolute peg deviation and preserves its asset', () => {
    const result = evaluateDepegRule({
      depegWarnings: [
        { stablecoin: 'USDC', deviationPct: -0.4, riskLevel: 'warning' },
        { stablecoin: 'DAI', deviationPct: 1.2, riskLevel: 'danger' },
      ],
    });
    expect(result.verdict).toBe('DANGER');
    expect(result.factors[0]).toMatchObject({
      rule: 'stablecoin_depeg_pct',
      value: 1.2,
      threshold: 1,
    });
    expect(result.factors[0].message).toContain('DAI');
  });

  it('does not create alerts below the caution threshold', () => {
    expect(evaluateDepegRule({ depegWarnings: [] })).toEqual({
      verdict: null,
      factors: [],
      warnings: [],
    });
  });
});
