import { exportToCSV } from '@/lib/utils/chartExport/formats/csvExporter';
import type {
 ChartExportData,
 ExportMetadata,
 ExportProgress,
} from '@/lib/utils/chartExport/types';

// Store captured blob content for testing
let capturedBlobContent: string | null = null;

// Mock the export helpers module
const mockDownloadBlob = jest.fn((blob: Blob) => {
 // Read blob content for testing
 const reader = new FileReader;
 reader.onload =  => {
 capturedBlobContent = reader.result as string;
 };
 reader.readAsText(blob);
});

const mockSanitizeFilename = jest.fn((name: string) => name);

jest.mock('@/lib/utils/chartExport/utils/exportHelpers',  => ({
 downloadBlob: (blob: Blob, filename: string) => mockDownloadBlob(blob, filename),
 sanitizeFilename: (name: string) => mockSanitizeFilename(name),
 blobToBase64: jest.fn,
 convertToCSV: jest.fn,
}));

jest.mock('@/lib/utils/logger',  => ({
 createLogger: jest.fn( => ({
 error: jest.fn,
 info: jest.fn,
 debug: jest.fn,
 })),
}));

// Helper to get blob content
async function getBlobContent: Promise<string> {
 // Wait a bit for FileReader to complete
 await new Promise((resolve) => setTimeout(resolve, 10));
 return capturedBlobContent || '';
}

// Test data helpers
function createMockData: ChartExportData[] {
 return [
 { time: '2024-01-01', price: 100, volume: 1000 },
 { time: '2024-01-02', price: 101, volume: 1100 },
 { time: '2024-01-03', price: 102, volume: 1200 },
 ];
}

function createLargeData(count: number): ChartExportData[] {
 return Array.from({ length: count }, (_, i) => ({
 id: i,
 value: Math.random * 1000,
 timestamp: new Date(Date.now + i * 1000).toISOString,
 }));
}

describe('CSV Export - Basic functionality',  => {
 beforeEach( => {
 jest.clearAllMocks;
 capturedBlobContent = null;
 mockDownloadBlob.mockImplementation( => {});
 mockSanitizeFilename.mockImplementation((name: string) => name);
 });

 it('should export data to CSV format successfully', async  => {
 await exportToCSV(createMockData, 'test-export');

 expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
 const [blob, filename] = mockDownloadBlob.mock.calls[0];
 expect(filename).toBe('test-export.csv');
 expect(blob).toBeInstanceOf(Blob);
 expect(blob.type).toBe('text/csv;charset=utf-8;');
 });

 it('should throw error when data is empty', async  => {
 await expect(exportToCSV([], 'test-export')).rejects.toThrow('No data to export');
 });

 it('should generate correct CSV headers from data keys', async  => {
 await exportToCSV(createMockData, 'test-export');

 const content = await getBlobContent;
 const lines = content.split('\n');

 expect(lines.some((line: string) => line.includes('time,price,volume'))).toBe(true);
 });

 it('should include all data rows', async  => {
 const mockData = createMockData;
 await exportToCSV(mockData, 'test-export');

 const content = await getBlobContent;
 const lines = content
 .split('\n')
 .filter((line: string) => line.trim && !line.startsWith('#'));

 expect(lines.length).toBe(mockData.length + 1);
 });
});

describe('CSV Export - Special characters',  => {
 beforeEach( => {
 jest.clearAllMocks;
 capturedBlobContent = null;
 mockDownloadBlob.mockImplementation( => {});
 });

 it('should handle values containing commas', async  => {
 const data: ChartExportData[] = [
 { name: 'Product A, Special', price: 100, description: 'Item, with comma' },
 ];

 await exportToCSV(data, 'test-export');

 const content = await getBlobContent;
 expect(content).toContain('"Product A, Special"');
 expect(content).toContain('"Item, with comma"');
 });

 it('should handle values containing quotes', async  => {
 const data: ChartExportData[] = [{ name: 'Product "A"', description: 'Say "hello"' }];

 await exportToCSV(data, 'test-export');

 const content = await getBlobContent;
 expect(content).toContain('""A""');
 expect(content).toContain('""hello""');
 });

 it('should handle values containing newlines', async  => {
 const data: ChartExportData[] = [{ name: 'Product\nA', description: 'Line1\nLine2' }];

 await exportToCSV(data, 'test-export');

 const content = await getBlobContent;
 expect(content).toContain('Product\nA');
 });

 it('should escape double quotes correctly', async  => {
 const data: ChartExportData[] = [{ text: 'He said ""hello""' }];

 await exportToCSV(data, 'test-export');

 const content = await getBlobContent;
 expect(content).toContain('""""hello""""');
 });
});

describe('CSV Export - Large datasets',  => {
 beforeEach( => {
 jest.clearAllMocks;
 capturedBlobContent = null;
 mockDownloadBlob.mockImplementation( => {});
 });

 it('should handle large datasets efficiently', async  => {
 const startTime = Date.now;
 await exportToCSV(createLargeData(50000), 'large-export');
 const endTime = Date.now;

 expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
 expect(endTime - startTime).toBeLessThan(10000);
 });

 it('should process data in batches with progress callback', async  => {
 const progressUpdates: ExportProgress[] = [];
 const onProgress = (progress: ExportProgress) => progressUpdates.push(progress);

 await exportToCSV(createLargeData(25000), 'batch-export', undefined, onProgress);

 expect(progressUpdates.length).toBeGreaterThan(0);
 expect(progressUpdates[0].status).toBe('preparing');
 expect(progressUpdates[progressUpdates.length - 1].status).toBe('completed');
 expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
 });

 it('should maintain data integrity for large datasets', async  => {
 const largeData = createLargeData(10000);
 await exportToCSV(largeData, 'integrity-test');

 const content = await getBlobContent;
 const lines = content
 .split('\n')
 .filter((line: string) => line.trim && !line.startsWith('#'));

 expect(lines.length).toBe(largeData.length + 1);
 });
});

describe('CSV Export - Encoding',  => {
 beforeEach( => {
 jest.clearAllMocks;
 capturedBlobContent = null;
 mockDownloadBlob.mockImplementation( => {});
 });

 it('should include UTF-8 BOM for proper encoding', async  => {
 await exportToCSV(createMockData, 'encoding-test');

 const content = await getBlobContent;
 expect(content.startsWith('\uFEFF')).toBe(true);
 });

 it('should handle Chinese characters correctly', async  => {
 const data: ChartExportData[] = [{ name: 'Chinese test', price: 100, description: 'isinDescription' }];

 await exportToCSV(data, 'chinese-test');

 const content = await getBlobContent;
 expect(content).toContain('Chinese test');
 expect(content).toContain('isinDescription');
 });

 it('should handle Japanese characters correctly', async  => {
 const data: ChartExportData[] = [{ name: 'Test data', description: 'Japanese description' }];

 await exportToCSV(data, 'japanese-test');

 const content = await getBlobContent;
 expect(content).toContain('テストデータ');
 expect(content).toContain('Japanese description');
 });

 it('should handle emoji characters', async  => {
 const data: ChartExportData[] = [{ name: 'Test 🚀 Data', description: 'Emoji 📊 Export 📈' }];

 await exportToCSV(data, 'emoji-test');

 const content = await getBlobContent;
 expect(content).toContain('🚀');
 expect(content).toContain('📊');
 expect(content).toContain('📈');
 });
});

describe('CSV Export - Headers and formatting',  => {
 beforeEach( => {
 jest.clearAllMocks;
 capturedBlobContent = null;
 mockDownloadBlob.mockImplementation( => {});
 });

 it('should generate headers from data keys', async  => {
 const data: ChartExportData[] = [{ firstName: 'John', lastName: 'Doe', age: 30 }];

 await exportToCSV(data, 'header-test');

 const content = await getBlobContent;
 const lines = content.split('\n');
 const headerLine = lines.find((line: string) => line.includes('firstName'));

 expect(headerLine).toContain('firstName,lastName,age');
 });

 it('should preserve header order from first data row', async  => {
 const data: ChartExportData[] = [{ z: 'last', a: 'first', m: 'middle' }];

 await exportToCSV(data, 'order-test');

 const content = await getBlobContent;
 const lines = content.split('\n');
 const headerLine = lines.find((line: string) => line.includes('z'));

 expect(headerLine).toBe('z,a,m');
 });

 it('should format numbers correctly', async  => {
 const data: ChartExportData[] = [{ integer: 42, float: 3.14159, negative: -100, zero: 0 }];

 await exportToCSV(data, 'number-test');

 const content = await getBlobContent;
 expect(content).toContain('42');
 expect(content).toContain('3.14159');
 expect(content).toContain('-100');
 expect(content).toContain('0');
 });

 it('should handle boolean values', async  => {
 const data: ChartExportData[] = [{ active: true, inactive: false }];

 await exportToCSV(data, 'boolean-test');

 const content = await getBlobContent;
 expect(content).toContain('true');
 expect(content).toContain('false');
 });
});

describe('CSV Export - Metadata',  => {
 beforeEach( => {
 jest.clearAllMocks;
 capturedBlobContent = null;
 mockDownloadBlob.mockImplementation( => {});
 });

 it('should include metadata when provided', async  => {
 const metadata: ExportMetadata = {
 exportedAt: '2024-01-15T10:30:00Z',
 dataSource: 'Oracle Market',
 timeRange: '30D',
 totalRecords: 100,
 };

 await exportToCSV(createMockData, 'metadata-test', metadata);

 const content = await getBlobContent;
 expect(content).toContain('# Exported At: 2024-01-15T10:30:00Z');
 expect(content).toContain('# Data Source: Oracle Market');
 expect(content).toContain('# Time Range: 30D');
 expect(content).toContain('# Total Records: 100');
 });

 it('should not include metadata when not provided', async  => {
 await exportToCSV(createMockData, 'no-metadata-test');

 const content = await getBlobContent;
 expect(content).not.toContain('# Exported At:');
 expect(content).not.toContain('# Data Source:');
 });
});

describe('CSV Export - Progress and filename',  => {
 beforeEach( => {
 jest.clearAllMocks;
 capturedBlobContent = null;
 mockDownloadBlob.mockImplementation( => {});
 mockSanitizeFilename.mockImplementation((name: string) => name);
 });

 it('should call progress callback with correct status sequence', async  => {
 const progressUpdates: ExportProgress[] = [];
 const onProgress = (progress: ExportProgress) => progressUpdates.push(progress);

 await exportToCSV(createMockData, 'progress-test', undefined, onProgress);

 const statuses = progressUpdates.map((p) => p.status);
 expect(statuses[0]).toBe('preparing');
 expect(statuses[statuses.length - 1]).toBe('completed');
 });

 it('should report progress from 0 to 100', async  => {
 const progressUpdates: ExportProgress[] = [];
 const onProgress = (progress: ExportProgress) => progressUpdates.push(progress);

 await exportToCSV(createMockData, 'progress-range-test', undefined, onProgress);

 const firstProgress = progressUpdates[0].progress;
 const lastProgress = progressUpdates[progressUpdates.length - 1].progress;

 expect(firstProgress).toBeGreaterThanOrEqual(0);
 expect(lastProgress).toBe(100);
 });

 it('should call sanitizeFilename', async  => {
 await exportToCSV(createMockData, 'test-file');

 expect(mockSanitizeFilename).toHaveBeenCalledWith('test-file');
 });

 it('should append .csv extension', async  => {
 await exportToCSV(createMockData, 'my-export');

 const [, filename] = mockDownloadBlob.mock.calls[0];
 expect(filename.endsWith('.csv')).toBe(true);
 });
});

describe('CSV Export - Error handling',  => {
 beforeEach( => {
 jest.clearAllMocks;
 capturedBlobContent = null;
 mockDownloadBlob.mockImplementation( => {});
 });

 it('should throw error for null data', async  => {
 await expect(exportToCSV(null as unknown as ChartExportData[], 'test')).rejects.toThrow;
 });

 it('should throw error for undefined data', async  => {
 await expect(exportToCSV(undefined as unknown as ChartExportData[], 'test')).rejects.toThrow;
 });

 it('should handle malformed data gracefully', async  => {
 const malformedData: ChartExportData[] = [
 { valid: 'data' },
 {} as ChartExportData,
 { another: 'valid' },
 ];

 await expect(exportToCSV(malformedData, 'malformed-test')).resolves.not.toThrow;
 });
});
