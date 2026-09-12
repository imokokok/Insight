import { calculateFlareDynamicConfidence } from '../clients/flare';

describe('Flare confidence freshness', () => {
  it('uses age in seconds and lowers confidence for stale observations', () => {
    expect(calculateFlareDynamicConfidence(0)).toBeCloseTo(0.99, 8);
    expect(calculateFlareDynamicConfidence(90)).toBeCloseTo(0.945, 8);
    expect(calculateFlareDynamicConfidence(3600)).toBeCloseTo(0.9, 8);
  });

  it('normalizes negative ages and penalizes non-finite ages', () => {
    expect(calculateFlareDynamicConfidence(Number.NaN)).toBeCloseTo(0.9, 8);
    expect(calculateFlareDynamicConfidence(-10)).toBeCloseTo(0.99, 8);
  });
});
