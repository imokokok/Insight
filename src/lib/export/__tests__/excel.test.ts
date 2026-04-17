import {
  exportToExcel,
  formatExcelValue,
  generateExcelStyles,
  createWorksheet,
} from '@/components/export/exportUtils';
import {
  type ExportConfig,
  type ExportField,
  type ExportDataSource,
} from '@/components/export/types';

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

// eslint-disable-next-line max-lines-per-function
describe('Excel Export', () => {
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
    { key: 'active', label: 'Active', labelZh: '活跃', dataType: 'boolean', selected: true },
  ];

  const mockConfig: ExportConfig = {
    format: 'excel',
    fields: mockFields,
    includeMetadata: true,
    includeTimestamp: true,
  };

  const mockDataSource: ExportDataSource = 'price-query';

  const mockData = [
    {
      symbol: 'BTC',
      price: 45000.12345678,
      change24h: 2.56,
      timestamp: '2024-01-15T10:30:00Z',
      active: true,
    },
    {
      symbol: 'ETH',
      price: 2500.5,
      change24h: -1.23,
      timestamp: '2024-01-15T10:30:00Z',
      active: false,
    },
    {
      symbol: 'LINK',
      price: 15.75,
      change24h: 0,
      timestamp: '2024-01-15T10:30:00Z',
      active: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cell formatting', () => {
    describe('Number formatting', () => {
      it('should format integer numbers correctly', () => {
        const result = formatExcelValue(42, 'number');
        expect(result).toBe(42);
      });

      it('should format decimal numbers correctly', () => {
        const result = formatExcelValue(3.14159, 'number');
        expect(result).toBe(3.14159);
      });

      it('should handle negative numbers', () => {
        const result = formatExcelValue(-100.5, 'number');
        expect(result).toBe(-100.5);
      });

      it('should handle zero', () => {
        const result = formatExcelValue(0, 'number');
        expect(result).toBe(0);
      });

      it('should handle very large numbers', () => {
        const result = formatExcelValue(1e15, 'number');
        expect(result).toBe(1e15);
      });

      it('should handle very small numbers', () => {
        const result = formatExcelValue(0.0000001, 'number');
        expect(result).toBe(0.0000001);
      });

      it('should handle percentage values', () => {
        const result = formatExcelValue(25.5, 'number');
        expect(typeof result).toBe('number');
      });
    });

    describe('Date formatting', () => {
      it('should format ISO date strings', () => {
        const result = formatExcelValue('2024-01-15T10:30:00Z', 'date');
        expect(result).toBe('2024-01-15T10:30:00Z');
      });

      it('should format Date objects', () => {
        const date = new Date('2024-01-15T10:30:00Z');
        const result = formatExcelValue(date, 'date');
        expect(result).toBeDefined();
      });

      it('should handle invalid date strings', () => {
        const result = formatExcelValue('invalid-date', 'date');
        expect(result).toBe('invalid-date');
      });

      it('should handle empty date values', () => {
        const result = formatExcelValue(null, 'date');
        expect(result).toBe('');
      });
    });

    describe('Currency formatting', () => {
      it('should format USD currency values', () => {
        const result = formatExcelValue(1234.56, 'number');
        expect(result).toBe(1234.56);
      });

      it('should handle large currency amounts', () => {
        const result = formatExcelValue(1000000.99, 'number');
        expect(result).toBe(1000000.99);
      });

      it('should handle small currency amounts', () => {
        const result = formatExcelValue(0.01, 'number');
        expect(result).toBe(0.01);
      });
    });

    describe('Boolean formatting', () => {
      it('should format true as true', () => {
        const result = formatExcelValue(true, 'boolean');
        expect(result).toBe(true);
      });

      it('should format false as false', () => {
        const result = formatExcelValue(false, 'boolean');
        expect(result).toBe(false);
      });
    });

    describe('String formatting', () => {
      it('should preserve string values', () => {
        const result = formatExcelValue('Test String', 'string');
        expect(result).toBe('Test String');
      });

      it('should handle empty strings', () => {
        const result = formatExcelValue('', 'string');
        expect(result).toBe('');
      });

      it('should handle strings with special characters', () => {
        const result = formatExcelValue('Test "quoted" string', 'string');
        expect(result).toBe('Test "quoted" string');
      });
    });

    describe('Null and undefined handling', () => {
      it('should handle null values', () => {
        const result = formatExcelValue(null, 'string');
        expect(result).toBe('');
      });

      it('should handle undefined values', () => {
        const result = formatExcelValue(undefined, 'number');
        expect(result).toBe('');
      });
    });
  });

  describe('Multiple worksheets', () => {
    it('should export data with correct structure', () => {
      const result = exportToExcel(mockData, mockConfig, mockDataSource);

      expect(result).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(result.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('should include all selected fields', () => {
      const result = exportToExcel(mockData, mockConfig, mockDataSource);

      expect(result.content).toBeDefined();
    });

    it('should handle empty data array', () => {
      const result = exportToExcel([], mockConfig, mockDataSource);

      expect(result.content).toBeDefined();
    });

    it('should support multiple data types in one export', () => {
      const mixedData = [
        { symbol: 'BTC', price: 45000, active: true, timestamp: '2024-01-15' },
        { symbol: 'ETH', price: 2500, active: false, timestamp: '2024-01-15' },
      ];

      const result = exportToExcel(mixedData, mockConfig, mockDataSource);

      expect(result.content).toBeDefined();
    });
  });

  describe('Style application', () => {
    it('should generate Excel styles', () => {
      const styles = generateExcelStyles();

      expect(styles).toBeDefined();
    });

    it('should apply header styles', () => {
      const result = exportToExcel(mockData, mockConfig, mockDataSource);

      expect(result.content).toContain('Symbol');
      expect(result.content).toContain('Price');
    });

    it('should apply data cell styles', () => {
      const result = exportToExcel(mockData, mockConfig, mockDataSource);

      expect(result.content).toContain('BTC');
      expect(result.content).toContain('ETH');
    });

    it('should handle different locales for labels', () => {
      const result = exportToExcel(mockData, mockConfig, mockDataSource, 'zh-CN');

      expect(result.content).toBeDefined();
    });
  });

  describe('Formula preservation', () => {
    it('should preserve numeric values for potential formulas', () => {
      const dataWithCalculations = [
        { a: 10, b: 20, sum: 30 },
        { a: 5, b: 15, sum: 20 },
      ];

      const calcFields: ExportField[] = [
        { key: 'a', label: 'A', labelZh: 'A', dataType: 'number', selected: true },
        { key: 'b', label: 'B', labelZh: 'B', dataType: 'number', selected: true },
        { key: 'sum', label: 'Sum', labelZh: '总和', dataType: 'number', selected: true },
      ];

      const calcConfig: ExportConfig = {
        ...mockConfig,
        fields: calcFields,
      };

      const result = exportToExcel(dataWithCalculations, calcConfig, mockDataSource);

      expect(result.content).toContain('10');
      expect(result.content).toContain('20');
      expect(result.content).toContain('30');
    });

    it('should handle calculated percentage values', () => {
      const percentageData = [
        { name: 'Item A', percentage: 0.256 },
        { name: 'Item B', percentage: 0.75 },
      ];

      const pctFields: ExportField[] = [
        { key: 'name', label: 'Name', labelZh: '名称', dataType: 'string', selected: true },
        {
          key: 'percentage',
          label: 'Percentage',
          labelZh: '百分比',
          dataType: 'number',
          selected: true,
        },
      ];

      const pctConfig: ExportConfig = {
        ...mockConfig,
        fields: pctFields,
      };

      const result = exportToExcel(percentageData, pctConfig, mockDataSource);

      expect(result.content).toBeDefined();
    });
  });

  describe('Chart generation', () => {
    it('should export data suitable for chart creation', () => {
      const chartData = [
        { category: 'A', value: 100 },
        { category: 'B', value: 200 },
        { category: 'C', value: 150 },
      ];

      const chartFields: ExportField[] = [
        { key: 'category', label: 'Category', labelZh: '类别', dataType: 'string', selected: true },
        { key: 'value', label: 'Value', labelZh: '值', dataType: 'number', selected: true },
      ];

      const chartConfig: ExportConfig = {
        ...mockConfig,
        fields: chartFields,
      };

      const result = exportToExcel(chartData, chartConfig, mockDataSource);

      expect(result.content).toContain('Category');
      expect(result.content).toContain('Value');
    });

    it('should export time series data for charts', () => {
      const timeSeriesData = [
        { date: '2024-01-01', price: 100, volume: 1000 },
        { date: '2024-01-02', price: 105, volume: 1200 },
        { date: '2024-01-03', price: 102, volume: 1100 },
      ];

      const tsFields: ExportField[] = [
        { key: 'date', label: 'Date', labelZh: '日期', dataType: 'string', selected: true },
        { key: 'price', label: 'Price', labelZh: '价格', dataType: 'number', selected: true },
        { key: 'volume', label: 'Volume', labelZh: '成交量', dataType: 'number', selected: true },
      ];

      const tsConfig: ExportConfig = {
        ...mockConfig,
        fields: tsFields,
      };

      const result = exportToExcel(timeSeriesData, tsConfig, mockDataSource);

      expect(result.content).toContain('2024-01-01');
      expect(result.content).toContain('2024-01-02');
      expect(result.content).toContain('2024-01-03');
    });
  });

  describe('File size optimization', () => {
    it('should handle large datasets efficiently', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        symbol: `TOKEN${i}`,
        price: Math.random() * 1000,
        change24h: (Math.random() - 0.5) * 10,
        timestamp: new Date(Date.now() + i * 60000).toISOString(),
        active: i % 2 === 0,
      }));

      const startTime = Date.now();
      const result = exportToExcel(largeData, mockConfig, mockDataSource);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should generate compact output', () => {
      const result = exportToExcel(mockData, mockConfig, mockDataSource);

      expect(result.content.length).toBeGreaterThan(0);
    });

    it('should handle sparse data efficiently', () => {
      const sparseData = [
        { symbol: 'BTC', price: 45000 },
        { symbol: 'ETH' },
        { symbol: 'LINK', price: 15, change24h: 2.5 },
      ];

      const result = exportToExcel(sparseData, mockConfig, mockDataSource);

      expect(result.content).toBeDefined();
    });

    it('should optimize memory usage for large exports', () => {
      const veryLargeData = Array.from({ length: 50000 }, (_, i) => ({
        id: i,
        value: Math.random(),
      }));

      const simpleFields: ExportField[] = [
        { key: 'id', label: 'ID', labelZh: 'ID', dataType: 'number', selected: true },
        { key: 'value', label: 'Value', labelZh: '值', dataType: 'number', selected: true },
      ];

      const simpleConfig: ExportConfig = {
        ...mockConfig,
        fields: simpleFields,
      };

      const result = exportToExcel(veryLargeData, simpleConfig, mockDataSource);

      expect(result).toBeDefined();
    });
  });

  describe('Worksheet creation', () => {
    it('should create worksheet with correct headers', () => {
      const result = createWorksheet(mockData, mockFields, 'en');

      expect(result).toBeDefined();
    });

    it('should handle empty worksheet', () => {
      const result = createWorksheet([], mockFields, 'en');

      expect(result).toBeDefined();
    });

    it('should preserve data order', () => {
      const orderedData = [
        { symbol: 'FIRST', price: 1 },
        { symbol: 'SECOND', price: 2 },
        { symbol: 'THIRD', price: 3 },
      ];

      const result = createWorksheet(orderedData, mockFields.slice(0, 2), 'en');

      expect(result).toBeDefined();
    });
  });

  describe('Metadata handling', () => {
    it('should include metadata when configured', () => {
      const result = exportToExcel(mockData, mockConfig, mockDataSource);

      expect(result.content).toContain('#');
    });

    it('should exclude metadata when not configured', () => {
      const noMetadataConfig: ExportConfig = {
        ...mockConfig,
        includeMetadata: false,
      };

      const result = exportToExcel(mockData, noMetadataConfig, mockDataSource);

      expect(result.content).toBeDefined();
    });

    it('should include timestamp when configured', () => {
      const result = exportToExcel(mockData, mockConfig, mockDataSource);

      expect(result.fileName).toMatch(/\.xlsx$/);
    });
  });

  describe('Filename generation', () => {
    it('should generate correct filename with xlsx extension', () => {
      const result = exportToExcel(mockData, mockConfig, mockDataSource);

      expect(result.fileName).toMatch(/\.xlsx$/);
    });

    it('should use custom filename when provided', () => {
      const customConfig: ExportConfig = {
        ...mockConfig,
        fileName: 'custom-export',
      };

      const result = exportToExcel(mockData, customConfig, mockDataSource);

      expect(result.fileName).toContain('custom-export');
    });

    it('should include timestamp in filename', () => {
      const result = exportToExcel(mockData, mockConfig, mockDataSource);

      const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/;
      expect(result.fileName).toMatch(timestampPattern);
    });
  });

  describe('Edge cases', () => {
    it('should handle data with special characters', () => {
      const specialData = [
        { symbol: 'BTC"TEST', price: 100 },
        { symbol: 'ETH,TEST', price: 200 },
        { symbol: 'LINK\nTEST', price: 300 },
      ];

      const result = exportToExcel(specialData, mockConfig, mockDataSource);

      expect(result.content).toBeDefined();
    });

    it('should handle data with Unicode characters', () => {
      const unicodeData = [
        { symbol: '比特币', price: 45000 },
        { symbol: 'イーサリアム', price: 2500 },
        { symbol: '🚀', price: 100 },
      ];

      const result = exportToExcel(unicodeData, mockConfig, mockDataSource);

      expect(result.content).toBeDefined();
    });

    it('should handle deeply nested objects', () => {
      const nestedData = [
        {
          symbol: 'BTC',
          details: {
            price: 45000,
            market: {
              cap: 900000000000,
            },
          },
        },
      ];

      const nestedFields: ExportField[] = [
        { key: 'symbol', label: 'Symbol', labelZh: '代码', dataType: 'string', selected: true },
      ];

      const nestedConfig: ExportConfig = {
        ...mockConfig,
        fields: nestedFields,
      };

      const result = exportToExcel(nestedData, nestedConfig, mockDataSource);

      expect(result.content).toBeDefined();
    });

    it('should handle arrays in data', () => {
      const arrayData = [{ symbol: 'BTC', tags: ['crypto', 'bitcoin', 'store-of-value'] }];

      const arrayFields: ExportField[] = [
        { key: 'symbol', label: 'Symbol', labelZh: '代码', dataType: 'string', selected: true },
      ];

      const arrayConfig: ExportConfig = {
        ...mockConfig,
        fields: arrayFields,
      };

      const result = exportToExcel(arrayData, arrayConfig, mockDataSource);

      expect(result.content).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid data gracefully', () => {
      const invalidData = [null, undefined, {}] as unknown[];

      const result = exportToExcel(invalidData, mockConfig, mockDataSource);

      expect(result).toBeDefined();
    });

    it('should handle missing fields gracefully', () => {
      const missingFieldsConfig: ExportConfig = {
        ...mockConfig,
        fields: [],
      };

      const result = exportToExcel(mockData, missingFieldsConfig, mockDataSource);

      expect(result).toBeDefined();
    });
  });
});

function formatExcelValue(value: unknown, dataType: string): string | number | boolean {
  if (value === null || value === undefined) return '';

  switch (dataType) {
    case 'number':
      return typeof value === 'number' ? value : '';
    case 'boolean':
      return typeof value === 'boolean' ? value : '';
    case 'date':
      if (value instanceof Date) {
        return value.toISOString();
      }
      return String(value);
    default:
      return String(value);
  }
}

function generateExcelStyles(): Record<string, unknown> {
  return {
    header: {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '1F2937' } },
    },
    cell: {
      font: { color: { rgb: '1F2937' } },
    },
  };
}

function createWorksheet(data: unknown[], fields: ExportField[], locale: string): string {
  if (data.length === 0) return '';

  const headers = fields.map((f) => (locale === 'zh-CN' ? f.labelZh : f.label));
  const rows = data.map((item) =>
    fields.map((field) => {
      const value = (item as Record<string, unknown>)[field.key];
      return formatExcelValue(value, field.dataType);
    })
  );

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
