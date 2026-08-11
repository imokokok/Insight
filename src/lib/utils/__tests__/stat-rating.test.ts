import { getStatRating } from '../stat-rating';

describe('getStatRating', () => {
  describe('confidence (0-1 fraction)', () => {
    it('rates confidence bands on the 0-1 scale', () => {
      expect(getStatRating('confidence', 0.995)?.rating).toBe('excellent');
      expect(getStatRating('confidence', 0.97)?.rating).toBe('good');
      expect(getStatRating('confidence', 0.92)?.rating).toBe('attention');
      expect(getStatRating('confidence', 0.5)?.rating).toBe('danger');
    });

    it('returns a rating (not null) for the confidence metric', () => {
      // Regression: 'confidence' was missing from the switch and silently
      // returned null, so the rating badge never rendered.
      expect(getStatRating('confidence', 0.99)).not.toBeNull();
      expect(getStatRating('confidence', 0.99)?.rating).toBe('excellent');
    });
  });

  describe('deviation (percent)', () => {
    it('maps magnitude bands', () => {
      expect(getStatRating('deviation', 0.3)?.rating).toBe('excellent');
      expect(getStatRating('deviation', 1)?.rating).toBe('good');
      expect(getStatRating('deviation', 3)?.rating).toBe('attention');
      expect(getStatRating('deviation', 9)?.rating).toBe('danger');
    });
  });

  describe('latency (ms)', () => {
    it('maps magnitude bands', () => {
      expect(getStatRating('latency', 50)?.rating).toBe('excellent');
      expect(getStatRating('latency', 300)?.rating).toBe('good');
      expect(getStatRating('latency', 600)?.rating).toBe('attention');
    });
  });

  describe('unknown metric type', () => {
    it('returns null', () => {
      expect(getStatRating('does-not-exist', 1)).toBeNull();
    });
  });
});
