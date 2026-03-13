import {
  downsampleData,
  downsampleDataForPerformance,
  adaptiveDownsample,
} from '../src/utils/downsampling';
import type { DataPoint } from '../src/utils/downsampling';

function generateTestData(count: number): DataPoint[] {
  const data: DataPoint[] = [];
  const now = Date.now();
  const basePrice = 100;

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * 60000;
    const volatility = Math.random() * 0.02 - 0.01;
    const price = basePrice * (1 + volatility + (i / count) * 0.1);

    data.push({
      time: new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp,
      price,
      volume: Math.floor(Math.random() * 1000000),
      open: price * 0.99,
      high: price * 1.01,
      low: price * 0.98,
      close: price,
    });
  }

  return data;
}

function measureTime<T>(name: string, fn: () => T): { result: T; time: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const time = end - start;

  console.log(`[Performance] ${name}: ${time.toFixed(2)}ms`);

  return { result, time };
}

export interface PerformanceTestResult {
  testName: string;
  dataPoints: number;
  downsamplingTime: number;
  outputPoints: number;
  compressionRatio: string;
  passed: boolean;
  targetTime: number;
}

export function runDownsamplingPerformanceTest(
  dataSizes: number[] = [500, 1000, 2000, 5000, 10000]
): PerformanceTestResult[] {
  const results: PerformanceTestResult[] = [];
  const targetTime = 50;

  console.log('\n=== Downsampling Performance Test ===\n');

  for (const size of dataSizes) {
    const data = generateTestData(size);

    const { result: downsampled, time } = measureTime(`Downsampling ${size} points`, () =>
      downsampleData(data, { preservePeaks: true, preserveTrends: true })
    );

    const compressionRatio = ((1 - downsampled.length / size) * 100).toFixed(1);

    results.push({
      testName: `Downsample ${size} points`,
      dataPoints: size,
      downsamplingTime: time,
      outputPoints: downsampled.length,
      compressionRatio: `${compressionRatio}%`,
      passed: time < targetTime,
      targetTime,
    });
  }

  return results;
}

export function runPerformanceModeTest(): PerformanceTestResult[] {
  const results: PerformanceTestResult[] = [];
  const dataSizes = [5000, 10000, 20000];

  console.log('\n=== Performance Mode Test ===\n');

  for (const size of dataSizes) {
    const data = generateTestData(size);

    const { result: downsampled, time } = measureTime(`Performance mode ${size} points`, () =>
      downsampleDataForPerformance(data)
    );

    const compressionRatio = ((1 - downsampled.length / size) * 100).toFixed(1);

    results.push({
      testName: `Performance mode ${size} points`,
      dataPoints: size,
      downsamplingTime: time,
      outputPoints: downsampled.length,
      compressionRatio: `${compressionRatio}%`,
      passed: time < 30,
      targetTime: 30,
    });
  }

  return results;
}

export function runAdaptiveDownsampleTest(): PerformanceTestResult[] {
  const results: PerformanceTestResult[] = [];
  const data = generateTestData(5000);

  console.log('\n=== Adaptive Downsampling Test ===\n');

  const scenarios = [
    { name: 'Normal render', renderTime: 200, targetRenderTime: 300 },
    { name: 'Slow render', renderTime: 400, targetRenderTime: 300 },
    { name: 'Very slow render', renderTime: 600, targetRenderTime: 300 },
  ];

  for (const scenario of scenarios) {
    const { result: downsampled, time } = measureTime(`Adaptive ${scenario.name}`, () =>
      adaptiveDownsample(data, {
        renderTime: scenario.renderTime,
        targetRenderTime: scenario.targetRenderTime,
      })
    );

    const compressionRatio = ((1 - downsampled.length / data.length) * 100).toFixed(1);

    results.push({
      testName: `Adaptive ${scenario.name}`,
      dataPoints: data.length,
      downsamplingTime: time,
      outputPoints: downsampled.length,
      compressionRatio: `${compressionRatio}%`,
      passed: time < 50,
      targetTime: 50,
    });
  }

  return results;
}

export function runAllPerformanceTests(): {
  downsampling: PerformanceTestResult[];
  performanceMode: PerformanceTestResult[];
  adaptive: PerformanceTestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageTime: number;
  };
} {
  console.log('\n========================================');
  console.log('  Chart Performance Optimization Tests');
  console.log('========================================\n');

  const downsampling = runDownsamplingPerformanceTest();
  const performanceMode = runPerformanceModeTest();
  const adaptive = runAdaptiveDownsampleTest();

  const allResults = [...downsampling, ...performanceMode, ...adaptive];
  const passedTests = allResults.filter((r) => r.passed).length;
  const averageTime =
    allResults.reduce((sum, r) => sum + r.downsamplingTime, 0) / allResults.length;

  const summary = {
    totalTests: allResults.length,
    passedTests,
    failedTests: allResults.length - passedTests,
    averageTime,
  };

  console.log('\n=== Test Summary ===');
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passedTests}`);
  console.log(`Failed: ${summary.failedTests}`);
  console.log(`Average Time: ${averageTime.toFixed(2)}ms`);
  console.log('\n========================================\n');

  return {
    downsampling,
    performanceMode,
    adaptive,
    summary,
  };
}

export function testChartRenderPerformance(
  dataPoints: number,
  targetRenderTime: number = 300
): {
  dataGenerationTime: number;
  downsamplingTime: number;
  estimatedRenderTime: number;
  totalEstimatedTime: number;
  passed: boolean;
} {
  console.log(`\n=== Chart Render Performance Test (${dataPoints} points) ===\n`);

  const { result: data, time: dataGenTime } = measureTime('Data generation', () =>
    generateTestData(dataPoints)
  );

  const { result: downsampled, time: downsampleTime } = measureTime('Downsampling', () =>
    downsampleData(data, { preservePeaks: true, preserveTrends: true })
  );

  const estimatedRenderTime = downsampled.length * 0.5;
  const totalEstimatedTime = dataGenTime + downsampleTime + estimatedRenderTime;

  console.log(`\nEstimated total render time: ${totalEstimatedTime.toFixed(2)}ms`);
  console.log(`Target render time: ${targetRenderTime}ms`);
  console.log(`Status: ${totalEstimatedTime < targetRenderTime ? '✓ PASS' : '✗ FAIL'}\n`);

  return {
    dataGenerationTime: dataGenTime,
    downsamplingTime: downsampleTime,
    estimatedRenderTime,
    totalEstimatedTime,
    passed: totalEstimatedTime < targetRenderTime,
  };
}

if (typeof window !== 'undefined') {
  (window as any).runChartPerformanceTests = runAllPerformanceTests;
  (window as any).testChartRenderPerformance = testChartRenderPerformance;
}
