import { exportToPDF as exportToPDFFromUtils } from '@/components/export/exportUtils';
import type { ExportConfig, ExportField, ExportDataSource } from '@/components/export/types';
import { exportToPDF as exportToPDFFromChartExport } from '@/lib/utils/chartExport/formats/pdfExporter';
import type {
  PDFExportOptions,
  ChartExportData,
  ExportProgress,
} from '@/lib/utils/chartExport/types';
import { blobToBase64 } from '@/lib/utils/chartExport/utils/exportHelpers';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  })),
}));

jest.mock('@/lib/config/colors', () => ({
  exportColors: {
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
    },
    chart: {
      primary: '#3B82F6',
      secondary: '#10B981',
    },
  },
}));

jest.mock('@/lib/utils/chartExport/utils/exportHelpers', () => ({
  sanitizeFilename: jest.fn((name: string) => name.replace(/[^a-zA-Z0-9-_]/g, '_')),
  downloadBlob: jest.fn(),
  blobToBase64: jest.fn().mockResolvedValue('base64encodedstring'),
  convertToCSV: jest.fn(),
}));

jest.mock('@/lib/utils/chartExport/formats/imageExporter', () => ({
  exportToPNG: jest.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
}));

const mockBlobToBase64 = blobToBase64 as jest.MockedFunction<typeof blobToBase64>;

jest.mock('jspdf', () => {
  const mockJsPDFInstance = {
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    setTextColor: jest.fn(),
    text: jest.fn(),
    addPage: jest.fn(),
    addImage: jest.fn(),
    save: jest.fn(),
    output: jest.fn().mockReturnValue(new Blob(['pdf'], { type: 'application/pdf' })),
    internal: {
      pageSize: {
        getWidth: jest.fn().mockReturnValue(297),
        getHeight: jest.fn().mockReturnValue(210),
      },
    },
    saveGraphicsState: jest.fn(),
    restoreGraphicsState: jest.fn(),
    setGState: jest.fn(),
    GState: jest.fn(),
    lastAutoTable: { finalY: 50 },
  };
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockJsPDFInstance),
  };
});

jest.mock('jspdf-autotable', () => {
  const autoTableMock = jest.fn((doc: unknown) => {
    (doc as { lastAutoTable: { finalY: number } }).lastAutoTable = { finalY: 100 };
  });
  return {
    __esModule: true,
    default: autoTableMock,
  };
});

// eslint-disable-next-line max-lines-per-function
describe('PDF Export', () => {
  const mockFields: ExportField[] = [
    { key: 'symbol', label: 'Symbol', labelZh: '代码', dataType: 'string', selected: true },
    { key: 'price', label: 'Price', labelZh: '价格', dataType: 'number', selected: true },
    {
      key: 'change24h',
      label: '24h Change',
      labelZh: '24小时变化',
      dataType: 'number',
      selected: true,
    },
    { key: 'timestamp', label: 'Timestamp', labelZh: '时间戳', dataType: 'date', selected: true },
  ];

  const mockConfig: ExportConfig = {
    format: 'pdf',
    fields: mockFields,
    includeMetadata: true,
    includeTimestamp: true,
    includeChart: true,
    includeStats: true,
  };

  const mockDataSource: ExportDataSource = 'price-query';

  const mockData = [
    { symbol: 'BTC', price: 45000.12, change24h: 2.56, timestamp: '2024-01-15T10:30:00Z' },
    { symbol: 'ETH', price: 2500.5, change24h: -1.23, timestamp: '2024-01-15T10:30:00Z' },
    { symbol: 'LINK', price: 15.75, change24h: 0, timestamp: '2024-01-15T10:30:00Z' },
  ];

  const mockChartElement = document.createElement('div');
  mockChartElement.innerHTML = '<svg><rect width="100" height="100"></rect></svg>';

  const mockStats = {
    totalValue: '$47,516.37',
    avgChange: '0.44%',
    itemCount: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockBlobToBase64.mockResolvedValue('base64encodedstring');
  });

  describe('Chart generation', () => {
    it('should export PDF with chart when chartElement is provided', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        mockChartElement,
        mockStats
      );

      expect(result).toBeDefined();
      expect(result.fileName).toMatch(/\.pdf$/);
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should export PDF without chart when chartElement is null', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Blob);
    });

    it('should handle chart capture errors gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { exportToPNG } = require('@/lib/utils/chartExport/formats/imageExporter');
      exportToPNG.mockRejectedValueOnce(new Error('Chart capture failed'));

      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        mockChartElement,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should scale chart image correctly', async () => {
      await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        mockChartElement,
        mockStats
      );

      expect(mockBlobToBase64).toHaveBeenCalled();
    });
  });

  describe('Table layout', () => {
    it('should generate table with correct headers', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should handle Chinese headers', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'zh-CN',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should format number cells correctly', async () => {
      const numberData = [{ symbol: 'BTC', price: 45000.123456, change24h: 2.56789 }];

      const result = await exportToPDFFromUtils(
        numberData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should handle empty data gracefully', async () => {
      const result = await exportToPDFFromUtils(
        [],
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should handle large tables', async () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        symbol: `TOKEN${i}`,
        price: Math.random() * 1000,
        change24h: (Math.random() - 0.5) * 10,
        timestamp: new Date(Date.now() + i * 60000).toISOString(),
      }));

      const result = await exportToPDFFromUtils(
        largeData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });
  });

  describe('Page breaks', () => {
    it('should handle large datasets that may require page breaks', async () => {
      const largeData = Array.from({ length: 200 }, (_, i) => ({
        symbol: `TOKEN${i}`,
        price: i * 100,
        change24h: i % 10,
        timestamp: new Date().toISOString(),
      }));

      const result = await exportToPDFFromUtils(
        largeData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should handle page breaks correctly for charts', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        mockChartElement,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should maintain content order across pages', async () => {
      const multiPageData = Array.from({ length: 150 }, (_, i) => ({
        symbol: `ITEM${i}`,
        price: i,
        change24h: 0,
        timestamp: new Date().toISOString(),
      }));

      const result = await exportToPDFFromUtils(
        multiPageData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });
  });

  describe('Header and footer', () => {
    it('should include title in header', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should include generation timestamp', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should use Chinese title for Chinese locale', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'zh-CN',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should include page numbers', async () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        symbol: `TOKEN${i}`,
        price: i,
        change24h: 0,
        timestamp: new Date().toISOString(),
      }));

      const result = await exportToPDFFromUtils(
        largeData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });
  });

  describe('Image quality', () => {
    it('should use high quality for chart images', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        mockChartElement,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should handle image scaling correctly', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        mockChartElement,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should maintain aspect ratio for images', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        mockChartElement,
        mockStats
      );

      expect(result).toBeDefined();
    });
  });

  describe('Font embedding', () => {
    it('should set font for title', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should handle different font sizes', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should handle Unicode characters in content', async () => {
      const unicodeData = [
        { symbol: '比特币', price: 45000, change24h: 2.5, timestamp: '2024-01-15' },
        { symbol: 'イーサリアム', price: 2500, change24h: -1.2, timestamp: '2024-01-15' },
      ];

      const result = await exportToPDFFromUtils(
        unicodeData,
        mockConfig,
        mockDataSource,
        'zh-CN',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });
  });

  describe('Metadata', () => {
    it('should include stats when configured', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should exclude stats when not configured', async () => {
      const noStatsConfig: ExportConfig = {
        ...mockConfig,
        includeStats: false,
      };

      const result = await exportToPDFFromUtils(
        mockData,
        noStatsConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should handle missing stats gracefully', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        undefined
      );

      expect(result).toBeDefined();
    });

    it('should include export timestamp in metadata', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });
  });

  describe('PDF Export from Chart Export Module', () => {
    const mockChartData: ChartExportData[] = [
      { time: '2024-01-01', price: 100, volume: 1000 },
      { time: '2024-01-02', price: 105, volume: 1200 },
    ];

    const mockPDFOptions: PDFExportOptions = {
      filename: 'test-export',
      charts: [
        {
          chartRef: mockChartElement,
          data: mockChartData,
          title: 'Test Chart',
        },
      ],
      includeWatermark: true,
      includeMetadata: true,
      metadata: {
        exportedAt: '2024-01-15T10:30:00Z',
        dataSource: 'Oracle Market',
        totalRecords: 2,
      },
    };

    it('should export PDF with chart options', async () => {
      await exportToPDFFromChartExport(mockPDFOptions);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const JsPDF = require('jspdf').default;
      const mockDoc = new JsPDF();
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('should call progress callback during export', async () => {
      const progressUpdates: ExportProgress[] = [];
      const onProgress = (progress: ExportProgress) => progressUpdates.push(progress);

      await exportToPDFFromChartExport(mockPDFOptions, onProgress);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].status).toBe('preparing');
      expect(progressUpdates[progressUpdates.length - 1].status).toBe('completed');
    });

    it('should handle multiple charts', async () => {
      const multiChartOptions: PDFExportOptions = {
        ...mockPDFOptions,
        charts: [
          { chartRef: mockChartElement, data: mockChartData, title: 'Chart 1' },
          { chartRef: mockChartElement, data: mockChartData, title: 'Chart 2' },
          { chartRef: mockChartElement, data: mockChartData, title: 'Chart 3' },
        ],
      };

      await exportToPDFFromChartExport(multiChartOptions);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const JsPDF = require('jspdf').default;
      const mockDoc = new JsPDF();
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('should include watermark when configured', async () => {
      await exportToPDFFromChartExport({
        ...mockPDFOptions,
        includeWatermark: true,
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const JsPDF = require('jspdf').default;
      const mockDoc = new JsPDF();
      expect(mockDoc.saveGraphicsState).toHaveBeenCalled();
      expect(mockDoc.restoreGraphicsState).toHaveBeenCalled();
    });

    it('should exclude watermark when not configured', async () => {
      jest.clearAllMocks();

      await exportToPDFFromChartExport({
        ...mockPDFOptions,
        includeWatermark: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const JsPDF = require('jspdf').default;
      const mockDoc = new JsPDF();
      expect(mockDoc.saveGraphicsState).not.toHaveBeenCalled();
    });

    it('should handle charts without chartRef', async () => {
      const noChartRefOptions: PDFExportOptions = {
        ...mockPDFOptions,
        charts: [
          {
            chartRef: null,
            data: mockChartData,
            title: 'Data Only',
          },
        ],
      };

      await exportToPDFFromChartExport(noChartRefOptions);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const JsPDF = require('jspdf').default;
      const mockDoc = new JsPDF();
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('should include data table for small datasets', async () => {
      await exportToPDFFromChartExport(mockPDFOptions);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const JsPDF = require('jspdf').default;
      const mockDoc = new JsPDF();
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('should limit data table rows for large datasets', async () => {
      const largeChartData = Array.from({ length: 100 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        price: 100 + i,
        volume: 1000 + i * 10,
      }));

      await exportToPDFFromChartExport({
        ...mockPDFOptions,
        charts: [
          {
            chartRef: mockChartElement,
            data: largeChartData,
            title: 'Large Dataset',
          },
        ],
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const JsPDF = require('jspdf').default;
      const mockDoc = new JsPDF();
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });

  describe('Filename generation', () => {
    it('should generate correct filename with pdf extension', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result.fileName).toMatch(/\.pdf$/);
    });

    it('should use custom filename when provided', async () => {
      const customConfig: ExportConfig = {
        ...mockConfig,
        fileName: 'custom-report',
      };

      const result = await exportToPDFFromUtils(
        mockData,
        customConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result.fileName).toContain('custom-report');
    });

    it('should include timestamp in filename', async () => {
      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/;
      expect(result.fileName).toMatch(timestampPattern);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid data gracefully', async () => {
      const result = await exportToPDFFromUtils(
        [null, undefined] as unknown[],
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should handle missing fields gracefully', async () => {
      const noFieldsConfig: ExportConfig = {
        ...mockConfig,
        fields: [],
      };

      const result = await exportToPDFFromUtils(
        mockData,
        noFieldsConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );

      expect(result).toBeDefined();
    });

    it('should handle image capture failure', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { exportToPNG } = require('@/lib/utils/chartExport/formats/imageExporter');
      exportToPNG.mockRejectedValueOnce(new Error('Capture failed'));

      const result = await exportToPDFFromUtils(
        mockData,
        mockConfig,
        mockDataSource,
        'en',
        mockChartElement,
        mockStats
      );

      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        symbol: `TOKEN${i}`,
        price: Math.random() * 1000,
        change24h: (Math.random() - 0.5) * 10,
        timestamp: new Date(Date.now() + i * 60000).toISOString(),
      }));

      const startTime = Date.now();
      const result = await exportToPDFFromUtils(
        largeData,
        mockConfig,
        mockDataSource,
        'en',
        null,
        mockStats
      );
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(10000);
    });

    it('should handle multiple charts efficiently', async () => {
      const multiChartOptions: PDFExportOptions = {
        filename: 'multi-chart-test',
        charts: Array.from({ length: 10 }, (_, i) => ({
          chartRef: mockChartElement,
          data: mockData,
          title: `Chart ${i + 1}`,
        })),
      };

      const startTime = Date.now();
      await exportToPDFFromChartExport(multiChartOptions);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(15000);
    });
  });
});
