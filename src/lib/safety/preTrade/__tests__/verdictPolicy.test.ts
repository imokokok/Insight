import {
  clamp01,
  evaluateHighIsBad,
  evaluateLowIsBad,
  normalize,
  pickWorst,
  PRE_TRADE_THRESHOLDS,
} from '../verdictPolicy';

describe('pre-trade verdict policy', () => {
  it('uses a monotonic verdict ladder', () => {
    expect(pickWorst('PASS', 'CAUTION')).toBe('CAUTION');
    expect(pickWorst('DANGER', 'CAUTION')).toBe('DANGER');
    expect(pickWorst('DANGER', 'BLOCK')).toBe('BLOCK');
  });

  it('applies high-is-bad thresholds at inclusive boundaries', () => {
    const thresholds = PRE_TRADE_THRESHOLDS.maxProviderDeviationPct;
    expect(evaluateHighIsBad(thresholds.caution, thresholds)).toBe('CAUTION');
    expect(evaluateHighIsBad(thresholds.danger, thresholds)).toBe('DANGER');
    expect(evaluateHighIsBad(thresholds.block, thresholds)).toBe('BLOCK');
    expect(evaluateHighIsBad(thresholds.caution - Number.EPSILON, thresholds)).toBeNull();
  });

  it('applies low-is-bad thresholds at inclusive boundaries', () => {
    const thresholds = PRE_TRADE_THRESHOLDS.crossProviderAgreement;
    expect(evaluateLowIsBad(thresholds.caution, thresholds)).toBe('CAUTION');
    expect(evaluateLowIsBad(thresholds.danger, thresholds)).toBe('DANGER');
    expect(evaluateLowIsBad(thresholds.block, thresholds)).toBe('BLOCK');
    expect(evaluateLowIsBad(thresholds.caution + Number.EPSILON, thresholds)).toBeNull();
  });

  it('normalizes bounded values without producing NaN', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(normalize(5, 10)).toBe(0.5);
    expect(normalize(5, 0)).toBe(0);
  });
});
