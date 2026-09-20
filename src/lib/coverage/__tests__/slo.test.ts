import { summarizeCoverageSlo } from '../slo';

it('includes missing slots, errors and insufficient coverage in the denominator', () => {
  const result = summarizeCoverageSlo({
    expected: 100,
    observed: 90,
    data_ready: 80,
    signed_ready: 70,
    unavailable: 5,
    missing: 10,
    objective_bps: 9900,
  });
  expect(result.dataReadyPct).toBe(80);
  expect(result.signedReadyPct).toBe(70);
  expect(result.status).toBe('MEASUREMENT_GAP');
  expect(result.remainingErrorBudgetSlots).toBeCloseTo(-19);
  expect(result.burnRate).toBeCloseTo(20);
});
it('does not display a successful SLO without data', () => {
  expect(
    summarizeCoverageSlo({
      expected: 0,
      observed: 0,
      data_ready: 0,
      signed_ready: 0,
      unavailable: 0,
      missing: 0,
      objective_bps: 9900,
    })
  ).toMatchObject({ status: 'WARMING_UP', dataReadyPct: null, burnRate: null });
});
it('does not fail an exactly met objective due to floating-point subtraction', () => {
  expect(
    summarizeCoverageSlo({
      expected: 2000,
      observed: 2000,
      data_ready: 1999,
      signed_ready: 1999,
      unavailable: 1,
      missing: 0,
      objective_bps: 9995,
    }).status
  ).toBe('HEALTHY');
});
it('rejects corrupt counters instead of presenting them as availability', () => {
  expect(() =>
    summarizeCoverageSlo({
      expected: 10,
      observed: 11,
      data_ready: 11,
      signed_ready: 11,
      unavailable: 0,
      missing: 0,
      objective_bps: 9900,
    })
  ).toThrow();
});
