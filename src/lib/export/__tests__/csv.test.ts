import { exportToCSV } from '@/lib/utils/chartExport/formats/csvExporter';
import * as exportHelpers from '@/lib/utils/chartExport/utils/exportHelpers';

import type { ChartExportData, ExportMetadata, ExportProgress } from '@/lib/utils/chartExport/types';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('CSV Export', () => {
  const mockData: ChartExportData[] = [
    { time: '2024-01-01', price: 100, volume: 1000 },
    { time: '2024-01-02', price: 101, volume: 1100 },
    { time: '2024-01-03', price: 102, volume: 1200 },
  ];

  let downloadBlobSpy: jest.SpyInstance;
  let sanitizeFilenameSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    downloadBlobSpy = jest.spyOn(exportHelpers, 'downloadBlob').mockImplementation(() => {});
    sanitizeFilenameSpy = jest.spyOn(exportHelpers, 'sanitizeFilename').mockImplementation((name) => name);
  });

  afterEach(() => {
    downloadBlobSpy.mockRestore();
    sanitizeFilenameSpy.mockRestore();
  });

  describe('Basic export functionality', () => {
    it('should export data to CSV format successfully', async () => {
      await exportToCSV(mockData, 'test-export');

      expect(downloadBlobSpy).toHaveBeenCalledTimes(1);
      const [blob, filename] = downloadBlobSpy.mock.calls[0];
      expect(filename).toBe('test-export.csv');
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv;charset=utf-8;');
    });

    it('should throw error when data is empty', async () => {
      await expect(exportToCSV([], 'test-export')).rejects.toThrow('No data to export');
    });

    it('should generate correct CSV headers from data keys', async () => {
      await exportToCSV(mockData, 'test-export');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();
      const lines = content.split('\n');

      expect(lines.some((line: string) => line.includes('time,price,volume'))).toBe(true);
    });

    it('should include all data rows', async () => {
      await exportToCSV(mockData, 'test-export');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();
      const lines = content.split('\n').filter((line: string) => line.trim() && !line.startsWith('#'));

      expect(lines.length).toBe(mockData.length + 1);
    });
  });

  describe('Special character handling', () => {
    it('should handle values containing commas', async () => {
      const dataWithCommas: ChartExportData[] = [
        { name: 'Product A, Special', price: 100, description: 'Item, with comma' },
      ];

      await exportToCSV(dataWithCommas, 'test-export');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('"Product A, Special"');
      expect(content).toContain('"Item, with comma"');
    });

    it('should handle values containing quotes', async () => {
      const dataWithQuotes: ChartExportData[] = [
        { name: 'Product "A"', description: 'Say "hello"' },
      ];

      await exportToCSV(dataWithQuotes, 'test-export');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('""A""');
      expect(content).toContain('""hello""');
    });

    it('should handle values containing newlines', async () => {
      const dataWithNewlines: ChartExportData[] = [
        { name: 'Product\nA', description: 'Line1\nLine2' },
      ];

      await exportToCSV(dataWithNewlines, 'test-export');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('Product\nA');
    });

    it('should handle mixed special characters', async () => {
      const dataWithMixed: ChartExportData[] = [
        { text: 'Value with "quotes", commas, and\nnewlines' },
      ];

      await exportToCSV(dataWithMixed, 'test-export');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
    });

    it('should escape double quotes correctly', async () => {
      const dataWithEscapes: ChartExportData[] = [
        { text: 'He said ""hello""' },
      ];

      await exportToCSV(dataWithEscapes, 'test-export');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('""""hello""""');
    });
  });

  describe('Large dataset export', () => {
    it('should handle large datasets efficiently', async () => {
      const largeData: ChartExportData[] = Array.from({ length: 50000 }, (_, i) => ({
        id: i,
        value: Math.random() * 1000,
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
      }));

      const startTime = Date.now();
      await exportToCSV(largeData, 'large-export');
      const endTime = Date.now();

      expect(downloadBlobSpy).toHaveBeenCalledTimes(1);
      expect(endTime - startTime).toBeLessThan(10000);
    });

    it('should process data in batches with progress callback', async () => {
      const progressUpdates: ExportProgress[] = [];
      const onProgress = (progress: ExportProgress) => progressUpdates.push(progress);

      const largeData: ChartExportData[] = Array.from({ length: 25000 }, (_, i) => ({
        id: i,
        value: i * 10,
      }));

      await exportToCSV(largeData, 'batch-export', undefined, onProgress);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].status).toBe('preparing');
      expect(progressUpdates[progressUpdates.length - 1].status).toBe('completed');
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
    });

    it('should maintain data integrity for large datasets', async () => {
      const largeData: ChartExportData[] = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        value: `item-${i}`,
      }));

      await exportToCSV(largeData, 'integrity-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();
      const lines = content.split('\n').filter((line: string) => line.trim() && !line.startsWith('#'));

      expect(lines.length).toBe(largeData.length + 1);
    });
  });

  describe('Encoding issues (UTF-8, BOM)', () => {
    it('should include UTF-8 BOM for proper encoding', async () => {
      await exportToCSV(mockData, 'encoding-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content.startsWith('\uFEFF')).toBe(true);
    });

    it('should handle Chinese characters correctly', async () => {
      const chineseData: ChartExportData[] = [
        { name: '中文测试', price: 100, description: '这是中文描述' },
        { name: '预言机数据', price: 200, description: '市场数据导出' },
      ];

      await exportToCSV(chineseData, 'chinese-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('中文测试');
      expect(content).toContain('预言机数据');
      expect(content).toContain('这是中文描述');
    });

    it('should handle Japanese characters correctly', async () => {
      const japaneseData: ChartExportData[] = [
        { name: 'テストデータ', description: '日本語の説明' },
      ];

      await exportToCSV(japaneseData, 'japanese-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('テストデータ');
      expect(content).toContain('日本語の説明');
    });

    it('should handle emoji characters', async () => {
      const emojiData: ChartExportData[] = [
        { name: 'Test 🚀 Data', description: 'Emoji 📊 Export 📈' },
      ];

      await exportToCSV(emojiData, 'emoji-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('🚀');
      expect(content).toContain('📊');
      expect(content).toContain('📈');
    });

    it('should handle special Unicode characters', async () => {
      const unicodeData: ChartExportData[] = [
        { symbol: '€', name: 'Euro', price: 1.08 },
        { symbol: '£', name: 'Pound', price: 1.27 },
        { symbol: '¥', name: 'Yen', price: 0.0067 },
      ];

      await exportToCSV(unicodeData, 'unicode-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('€');
      expect(content).toContain('£');
      expect(content).toContain('¥');
    });
  });

  describe('Header row generation', () => {
    it('should generate headers from data keys', async () => {
      const data: ChartExportData[] = [
        { firstName: 'John', lastName: 'Doe', age: 30 },
      ];

      await exportToCSV(data, 'header-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();
      const lines = content.split('\n');
      const headerLine = lines.find((line: string) => line.includes('firstName'));

      expect(headerLine).toContain('firstName,lastName,age');
    });

    it('should preserve header order from first data row', async () => {
      const data: ChartExportData[] = [
        { z: 'last', a: 'first', m: 'middle' },
      ];

      await exportToCSV(data, 'order-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();
      const lines = content.split('\n');
      const headerLine = lines.find((line: string) => line.includes('z'));

      expect(headerLine).toBe('z,a,m');
    });

    it('should handle numeric keys', async () => {
      const data: ChartExportData[] = [
        { '1': 'one', '2': 'two', '3': 'three' },
      ];

      await exportToCSV(data, 'numeric-keys-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('1,2,3');
    });

    it('should handle empty string keys', async () => {
      const data: ChartExportData[] = [
        { '': 'empty key', valid: 'valid key' },
      ];

      await exportToCSV(data, 'empty-key-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toBeDefined();
    });
  });

  describe('Data type formatting', () => {
    it('should format numbers correctly', async () => {
      const numberData: ChartExportData[] = [
        { integer: 42, float: 3.14159, negative: -100, zero: 0 },
      ];

      await exportToCSV(numberData, 'number-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('42');
      expect(content).toContain('3.14159');
      expect(content).toContain('-100');
      expect(content).toContain('0');
    });

    it('should handle very large numbers', async () => {
      const largeNumberData: ChartExportData[] = [
        { large: 1e15, veryLarge: Number.MAX_SAFE_INTEGER },
      ];

      await exportToCSV(largeNumberData, 'large-number-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('1e+15');
      expect(content).toBeDefined();
    });

    it('should handle very small numbers', async () => {
      const smallNumberData: ChartExportData[] = [
        { small: 0.0000001, verySmall: 1e-10 },
      ];

      await exportToCSV(smallNumberData, 'small-number-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toBeDefined();
    });

    it('should handle null and undefined values', async () => {
      const nullData: ChartExportData[] = [
        { a: null, b: undefined, c: 'valid' } as unknown as ChartExportData,
      ];

      await exportToCSV(nullData, 'null-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();
      const lines = content.split('\n');
      const dataLine = lines.find((line: string) => line.includes('valid'));

      expect(dataLine).toBeDefined();
    });

    it('should handle boolean values', async () => {
      const booleanData: ChartExportData[] = [
        { active: true, inactive: false },
      ];

      await exportToCSV(booleanData, 'boolean-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('true');
      expect(content).toContain('false');
    });

    it('should handle date strings', async () => {
      const dateData: ChartExportData[] = [
        { date: '2024-01-15T10:30:00Z', formatted: '2024-01-15' },
      ];

      await exportToCSV(dateData, 'date-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('2024-01-15T10:30:00Z');
      expect(content).toContain('2024-01-15');
    });

    it('should handle nested objects by stringifying', async () => {
      const nestedData: ChartExportData[] = [
        { nested: { inner: 'value' } } as unknown as ChartExportData,
      ];

      await exportToCSV(nestedData, 'nested-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toBeDefined();
    });
  });

  describe('Metadata handling', () => {
    it('should include metadata when provided', async () => {
      const metadata: ExportMetadata = {
        exportedAt: '2024-01-15T10:30:00Z',
        dataSource: 'Oracle Market',
        timeRange: '30D',
        totalRecords: 100,
      };

      await exportToCSV(mockData, 'metadata-test', metadata);

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('# Exported At: 2024-01-15T10:30:00Z');
      expect(content).toContain('# Data Source: Oracle Market');
      expect(content).toContain('# Time Range: 30D');
      expect(content).toContain('# Total Records: 100');
    });

    it('should not include metadata when not provided', async () => {
      await exportToCSV(mockData, 'no-metadata-test');

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).not.toContain('# Exported At:');
      expect(content).not.toContain('# Data Source:');
    });

    it('should handle partial metadata', async () => {
      const partialMetadata: ExportMetadata = {
        exportedAt: '2024-01-15T10:30:00Z',
        totalRecords: 50,
      };

      await exportToCSV(mockData, 'partial-metadata-test', partialMetadata);

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('# Exported At:');
      expect(content).toContain('# Total Records: 50');
      expect(content).not.toContain('# Data Source:');
    });

    it('should handle custom metadata fields', async () => {
      const customMetadata: ExportMetadata = {
        exportedAt: '2024-01-15T10:30:00Z',
        customField: 'Custom Value',
        anotherField: 12345,
      };

      await exportToCSV(mockData, 'custom-metadata-test', customMetadata);

      const [blob] = downloadBlobSpy.mock.calls[0];
      const content = await blob.text();

      expect(content).toContain('# Exported At:');
    });
  });

  describe('Progress callback', () => {
    it('should call progress callback with correct status sequence', async () => {
      const progressUpdates: ExportProgress[] = [];
      const onProgress = (progress: ExportProgress) => progressUpdates.push(progress);

      await exportToCSV(mockData, 'progress-test', undefined, onProgress);

      const statuses = progressUpdates.map((p) => p.status);
      expect(statuses[0]).toBe('preparing');
      expect(statuses[statuses.length - 1]).toBe('completed');
    });

    it('should report progress from 0 to 100', async () => {
      const progressUpdates: ExportProgress[] = [];
      const onProgress = (progress: ExportProgress) => progressUpdates.push(progress);

      await exportToCSV(mockData, 'progress-range-test', undefined, onProgress);

      const firstProgress = progressUpdates[0].progress;
      const lastProgress = progressUpdates[progressUpdates.length - 1].progress;

      expect(firstProgress).toBeGreaterThanOrEqual(0);
      expect(lastProgress).toBe(100);
    });

    it('should include message key in progress updates', async () => {
      const progressUpdates: ExportProgress[] = [];
      const onProgress = (progress: ExportProgress) => progressUpdates.push(progress);

      await exportToCSV(mockData, 'message-test', undefined, onProgress);

      progressUpdates.forEach((update) => {
        expect(update.messageKey).toBeDefined();
        expect(typeof update.messageKey).toBe('string');
      });
    });

    it('should work without progress callback', async () => {
      await expect(exportToCSV(mockData, 'no-callback-test')).resolves.not.toThrow();

      expect(downloadBlobSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Filename handling', () => {
    it('should call sanitizeFilename', async () => {
      await exportToCSV(mockData, 'test-file');

      expect(sanitizeFilenameSpy).toHaveBeenCalledWith('test-file');
    });

    it('should append .csv extension', async () => {
      await exportToCSV(mockData, 'my-export');

      const [, filename] = downloadBlobSpy.mock.calls[0];
      expect(filename.endsWith('.csv')).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should throw error for null data', async () => {
      await expect(exportToCSV(null as unknown as ChartExportData[], 'test')).rejects.toThrow();
    });

    it('should throw error for undefined data', async () => {
      await expect(exportToCSV(undefined as unknown as ChartExportData[], 'test')).rejects.toThrow();
    });

    it('should handle malformed data gracefully', async () => {
      const malformedData: ChartExportData[] = [
        { valid: 'data' },
        {} as ChartExportData,
        { another: 'valid' },
      ];

      await expect(exportToCSV(malformedData, 'malformed-test')).resolves.not.toThrow();
    });
  });
});
