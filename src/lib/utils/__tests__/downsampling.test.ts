import {
  downsampleData,
  downsampleDataForPerformance,
  adaptiveDownsample,
  shouldDownsample,
  calculateOptimalPoints,
  getDownsamplingMetrics,
  type DataPoint,
} from '../downsampling';

function generateTestData(length: number): DataPoint[] {
  return Array.from({ length }, (_, i) => ({
    time: new Date(i * 3600000).toISOString(),
    timestamp: i * 3600000,
    price: 100 + Math.sin(i * 0.1) * 10 + Math.random() * 5,
    volume: 1000 + Math.random() * 500,
  }));
}

function generateDataWithPeaks(length: number): DataPoint[] {
  return Array.from({ length }, (_, i) => {
    let price = 100;
    if (i === Math.floor(length * 0.25)) price = 150;
    else if (i === Math.floor(length * 0.5)) price = 50;
    else if (i === Math.floor(length * 0.75)) price = 180;

    return {
      time: new Date(i * 3600000).toISOString(),
      timestamp: i * 3600000,
      price,
      volume: 1000,
    };
  });
}

describe('downsampling', () => {
  describe('downsampleData', () => {
    describe('small data handling', () => {
      it('should return data as-is when length <= 200', () => {
        const data = generateTestData(150);

        const result = downsampleData(data);

        expect(result.length).toBe(150);
        expect(result).toEqual(data);
      });

      it('should return data as-is when length is exactly 200', () => {
        const data = generateTestData(200);

        const result = downsampleData(data);

        expect(result.length).toBe(200);
      });

      it('should return empty array when input is empty', () => {
        const result = downsampleData([]);

        expect(result).toEqual([]);
      });
    });

    describe('target points configuration', () => {
      it('should respect custom targetPoints config', () => {
        const data = generateTestData(1000);

        const result = downsampleData(data, { targetPoints: 100 });

        expect(result.length).toBeGreaterThan(0);
        expect(result.length).toBeLessThan(data.length);
      });

      it('should use default target points when not specified', () => {
        const data = generateTestData(1000);

        const result = downsampleData(data);

        expect(result.length).toBeGreaterThan(0);
        expect(result.length).toBeLessThan(data.length);
      });
    });

    describe('preservePeaks option', () => {
      it('should preserve peak values when preservePeaks is true', () => {
        const data = generateDataWithPeaks(500);
        const maxPrice = Math.max(...data.map((d) => d.price));
        const minPrice = Math.min(...data.map((d) => d.price));

        const result = downsampleData(data, { preservePeaks: true, targetPoints: 100 });

        const resultMaxPrice = Math.max(...result.map((d) => d.price));
        const resultMinPrice = Math.min(...result.map((d) => d.price));

        expect(resultMaxPrice).toBe(maxPrice);
        expect(resultMinPrice).toBe(minPrice);
      });
    });

    describe('maxDataPoints option', () => {
      it('should pre-sample data when exceeding maxDataPoints', () => {
        const data = generateTestData(15000);

        const result = downsampleData(data, { maxDataPoints: 5000 });

        expect(result.length).toBeLessThan(data.length);
      });
    });

    describe('performanceMode option', () => {
      it('should use fewer target points in performance mode', () => {
        const data = generateTestData(1000);

        const normalResult = downsampleData(data, { performanceMode: false });
        const perfResult = downsampleData(data, { performanceMode: true });

        expect(perfResult.length).toBeLessThanOrEqual(normalResult.length);
      });
    });

    describe('data integrity', () => {
      it('should always include first and last data points', () => {
        const data = generateTestData(500);

        const result = downsampleData(data, { targetPoints: 50 });

        expect(result[0]).toEqual(data[0]);
        expect(result[result.length - 1]).toEqual(data[data.length - 1]);
      });

      it('should preserve data point structure', () => {
        const data = generateTestData(300);

        const result = downsampleData(data);

        result.forEach((point) => {
          expect(point).toHaveProperty('time');
          expect(point).toHaveProperty('timestamp');
          expect(point).toHaveProperty('price');
          expect(point).toHaveProperty('volume');
        });
      });

      it('should not mutate original data', () => {
        const data = generateTestData(300);
        const originalData = JSON.parse(JSON.stringify(data));

        downsampleData(data);

        expect(data).toEqual(originalData);
      });
    });
  });

  describe('downsampleDataForPerformance', () => {
    it('should use performance-optimized settings', () => {
      const data = generateTestData(1000);

      const result = downsampleDataForPerformance(data);

      expect(result.length).toBeLessThan(data.length);
    });

    it('should return small data as-is', () => {
      const data = generateTestData(100);

      const result = downsampleDataForPerformance(data);

      expect(result.length).toBe(100);
    });
  });

  describe('adaptiveDownsample', () => {
    describe('render time based adjustment', () => {
      it('should use more points when render time is fast', () => {
        const data = generateTestData(1000);

        const fastResult = adaptiveDownsample(data, { renderTime: 50, targetRenderTime: 300 });
        const slowResult = adaptiveDownsample(data, { renderTime: 500, targetRenderTime: 300 });

        expect(fastResult.length).toBeGreaterThanOrEqual(slowResult.length);
      });

      it('should use fewer points when render time is slow', () => {
        const data = generateTestData(2000);

        const result = adaptiveDownsample(data, { renderTime: 600, targetRenderTime: 300 });

        expect(result.length).toBeLessThan(data.length);
      });
    });

    describe('min/max points constraints', () => {
      it('should respect minPoints constraint', () => {
        const data = generateTestData(1000);

        const result = adaptiveDownsample(data, {
          renderTime: 1000,
          targetRenderTime: 300,
          minPoints: 200,
        });

        expect(result.length).toBeGreaterThanOrEqual(200);
      });

      it('should return data as-is when length <= minPoints', () => {
        const data = generateTestData(150);

        const result = adaptiveDownsample(data, { minPoints: 200 });

        expect(result.length).toBe(150);
      });
    });

    describe('zero render time handling', () => {
      it('should handle zero render time gracefully', () => {
        const data = generateTestData(1000);

        const result = adaptiveDownsample(data, { renderTime: 0 });

        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('default configuration', () => {
      it('should work with empty config', () => {
        const data = generateTestData(1000);

        const result = adaptiveDownsample(data);

        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('shouldDownsample', () => {
    it('should return true when data length exceeds threshold', () => {
      expect(shouldDownsample(600, 500)).toBe(true);
    });

    it('should return false when data length is below threshold', () => {
      expect(shouldDownsample(400, 500)).toBe(false);
    });

    it('should return false when data length equals threshold', () => {
      expect(shouldDownsample(500, 500)).toBe(false);
    });

    it('should use default threshold of 500', () => {
      expect(shouldDownsample(501)).toBe(true);
      expect(shouldDownsample(499)).toBe(false);
    });
  });

  describe('calculateOptimalPoints', () => {
    it('should return data length for small datasets', () => {
      const result = calculateOptimalPoints(150);

      expect(result).toBe(150);
    });

    it('should calculate based on device performance', () => {
      const lowPerf = calculateOptimalPoints(1000, 'low');
      const mediumPerf = calculateOptimalPoints(1000, 'medium');
      const highPerf = calculateOptimalPoints(1000, 'high');

      expect(lowPerf).toBeLessThan(mediumPerf);
      expect(mediumPerf).toBeLessThan(highPerf);
    });

    it('should return reasonable values for large datasets', () => {
      const result = calculateOptimalPoints(10000);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(10000);
    });
  });

  describe('getDownsamplingMetrics', () => {
    it('should calculate compression ratio correctly', () => {
      const metrics = getDownsamplingMetrics(1000, 250, 15);

      expect(metrics.compressionRatio).toBe(75);
      expect(metrics.pointsRemoved).toBe(750);
      expect(metrics.processingTimeMs).toBe(15);
    });

    describe('efficiency rating', () => {
      it('should return excellent for fast processing', () => {
        const metrics = getDownsamplingMetrics(1000, 500, 5);

        expect(metrics.efficiency).toBe('excellent');
      });

      it('should return good for reasonable processing', () => {
        const metrics = getDownsamplingMetrics(1000, 500, 20);

        expect(metrics.efficiency).toBe('good');
      });

      it('should return acceptable for moderate processing', () => {
        const metrics = getDownsamplingMetrics(1000, 500, 40);

        expect(metrics.efficiency).toBe('acceptable');
      });

      it('should return poor for slow processing', () => {
        const metrics = getDownsamplingMetrics(1000, 500, 60);

        expect(metrics.efficiency).toBe('poor');
      });
    });

    it('should handle zero compression', () => {
      const metrics = getDownsamplingMetrics(500, 500, 10);

      expect(metrics.compressionRatio).toBe(0);
      expect(metrics.pointsRemoved).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle data with identical prices', () => {
      const data: DataPoint[] = Array.from({ length: 300 }, (_, i) => ({
        time: new Date(i * 3600000).toISOString(),
        timestamp: i * 3600000,
        price: 100,
        volume: 1000,
      }));

      const result = downsampleData(data);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle data with extreme price variations', () => {
      const data: DataPoint[] = Array.from({ length: 300 }, (_, i) => ({
        time: new Date(i * 3600000).toISOString(),
        timestamp: i * 3600000,
        price: i % 2 === 0 ? 0.001 : 1000000,
        volume: 1000,
      }));

      const result = downsampleData(data);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle data with optional fields', () => {
      const data: DataPoint[] = Array.from({ length: 300 }, (_, i) => ({
        time: new Date(i * 3600000).toISOString(),
        timestamp: i * 3600000,
        price: 100 + i,
        volume: 1000,
        open: 99 + i,
        high: 101 + i,
        low: 98 + i,
        close: 100 + i,
        ma7: 99.5 + i,
      }));

      const result = downsampleData(data);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((point) => {
        expect(point.open).toBeDefined();
        expect(point.high).toBeDefined();
        expect(point.low).toBeDefined();
        expect(point.close).toBeDefined();
      });
    });
  });
});
