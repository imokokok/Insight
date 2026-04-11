import { calculateTotalSubmissions, calculateAverageLatency } from '../calculations';

import type { PublisherData } from '../types';

describe('calculations', () => {
  describe('calculateTotalSubmissions', () => {
    it('should calculate total submissions from publishers', () => {
      const publishers: PublisherData[] = [
        { totalSubmissions: 100 } as PublisherData,
        { totalSubmissions: 200 } as PublisherData,
        { totalSubmissions: 300 } as PublisherData,
      ];

      const result = calculateTotalSubmissions(publishers);

      expect(result).toBe(600);
    });

    it('should return 0 for empty array', () => {
      expect(calculateTotalSubmissions([])).toBe(0);
    });

    it('should handle publishers without totalSubmissions', () => {
      const publishers: PublisherData[] = [
        { totalSubmissions: 100 } as PublisherData,
        {} as PublisherData,
        { totalSubmissions: 200 } as PublisherData,
      ];

      const result = calculateTotalSubmissions(publishers);

      expect(result).toBe(300);
    });

    it('should handle all publishers without totalSubmissions', () => {
      const publishers: PublisherData[] = [{} as PublisherData, {} as PublisherData];

      const result = calculateTotalSubmissions(publishers);

      expect(result).toBe(0);
    });

    it('should handle zero submissions', () => {
      const publishers: PublisherData[] = [
        { totalSubmissions: 0 } as PublisherData,
        { totalSubmissions: 0 } as PublisherData,
      ];

      const result = calculateTotalSubmissions(publishers);

      expect(result).toBe(0);
    });

    it('should handle large numbers', () => {
      const publishers: PublisherData[] = [
        { totalSubmissions: 1000000 } as PublisherData,
        { totalSubmissions: 2000000 } as PublisherData,
      ];

      const result = calculateTotalSubmissions(publishers);

      expect(result).toBe(3000000);
    });
  });

  describe('calculateAverageLatency', () => {
    it('should calculate average latency from publishers', () => {
      const publishers: PublisherData[] = [
        { averageLatency: 100 } as PublisherData,
        { averageLatency: 200 } as PublisherData,
        { averageLatency: 300 } as PublisherData,
      ];

      const result = calculateAverageLatency(publishers);

      expect(result).toBe(200);
    });

    it('should return 0 for empty array', () => {
      expect(calculateAverageLatency([])).toBe(0);
    });

    it('should handle publishers without averageLatency', () => {
      const publishers: PublisherData[] = [
        { averageLatency: 100 } as PublisherData,
        {} as PublisherData,
        { averageLatency: 200 } as PublisherData,
      ];

      const result = calculateAverageLatency(publishers);

      expect(result).toBe(100);
    });

    it('should handle all publishers without averageLatency', () => {
      const publishers: PublisherData[] = [{} as PublisherData, {} as PublisherData];

      const result = calculateAverageLatency(publishers);

      expect(result).toBe(0);
    });

    it('should round result to nearest integer', () => {
      const publishers: PublisherData[] = [
        { averageLatency: 100 } as PublisherData,
        { averageLatency: 101 } as PublisherData,
      ];

      const result = calculateAverageLatency(publishers);

      expect(result).toBe(101);
    });

    it('should handle single publisher', () => {
      const publishers: PublisherData[] = [{ averageLatency: 150 } as PublisherData];

      const result = calculateAverageLatency(publishers);

      expect(result).toBe(150);
    });

    it('should handle zero latency', () => {
      const publishers: PublisherData[] = [
        { averageLatency: 0 } as PublisherData,
        { averageLatency: 0 } as PublisherData,
      ];

      const result = calculateAverageLatency(publishers);

      expect(result).toBe(0);
    });

    it('should handle decimal latencies', () => {
      const publishers: PublisherData[] = [
        { averageLatency: 100.4 } as PublisherData,
        { averageLatency: 100.6 } as PublisherData,
      ];

      const result = calculateAverageLatency(publishers);

      expect(result).toBe(101);
    });
  });
});
