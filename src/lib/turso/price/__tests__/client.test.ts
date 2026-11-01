import { readTursoPriceProjectionMaxLagSeconds } from '../projectionConfig';

describe('Turso price client configuration', () => {
  it('uses the documented projection-lag default', () => {
    expect(readTursoPriceProjectionMaxLagSeconds({})).toBe(1_800);
  });

  it('accepts a bounded explicit projection-lag SLO', () => {
    expect(
      readTursoPriceProjectionMaxLagSeconds({ TURSO_PRICE_PROJECTION_MAX_LAG_SECONDS: '90' })
    ).toBe(90);
  });

  it.each(['0', '-1', '1.5', '86401', 'not-a-number'])('rejects invalid SLO %s', (value) => {
    expect(() =>
      readTursoPriceProjectionMaxLagSeconds({ TURSO_PRICE_PROJECTION_MAX_LAG_SECONDS: value })
    ).toThrow('Invalid TURSO_PRICE_PROJECTION_MAX_LAG_SECONDS');
  });
});
