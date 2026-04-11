import {
  generateTVSTrendData,
  exportWithConfig,
  downloadExport,
  type ExportDataOptions,
} from '../priceCalculations';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('@/lib/export/exportConfig', () => ({
  generateExportFileName: (config: { name: string; format: string }) =>
    `${config.name}.${config.format}`,
}));

const createMockOracleData = () => [
  {
    name: 'Chainlink',
    share: 45,
    color: '#375BD2',
    tvs: '$20B',
    tvsValue: 20000000000,
    chains: 15,
    protocols: 500,
    avgLatency: 100,
    accuracy: 99.9,
    updateFrequency: 1000,
    change24h: 2.5,
    change7d: 5.0,
    change30d: 10.0,
  },
  {
    name: 'Pyth Network',
    share: 25,
    color: '#FF8C00',
    tvs: '$10B',
    tvsValue: 10000000000,
    chains: 10,
    protocols: 200,
    avgLatency: 50,
    accuracy: 99.8,
    updateFrequency: 500,
    change24h: 3.0,
    change7d: 6.0,
    change30d: 12.0,
  },
];

const createMockAssets = () => [
  {
    symbol: 'BTC',
    price: 50000,
    change24h: 2.5,
    change7d: 5.0,
    volume24h: 1000000000,
    marketCap: 1000000000000,
    primaryOracle: 'chainlink',
    oracleCount: 5,
  },
  {
    symbol: 'ETH',
    price: 3000,
    change24h: 3.0,
    change7d: 6.0,
    volume24h: 500000000,
    marketCap: 400000000000,
    primaryOracle: 'chainlink',
    oracleCount: 4,
  },
];

const createMockTrendData = () => [
  {
    timestamp: Date.now(),
    date: 'Jan 1',
    chainlink: 42.1,
    chainlinkUpper: 44.2,
    chainlinkLower: 40.0,
    pyth: 15.2,
    pythUpper: 16.0,
    pythLower: 14.4,
    api3: 3.5,
    api3Upper: 3.68,
    api3Lower: 3.32,
    uma: 2.5,
    umaUpper: 2.62,
    umaLower: 2.38,
    redstone: 2.1,
    redstoneUpper: 2.2,
    redstoneLower: 2.0,
    dia: 1.6,
    diaUpper: 1.68,
    diaLower: 1.52,
    winklink: 0.7,
    winklinkUpper: 0.74,
    winklinkLower: 0.66,
    total: 67.7,
  },
];

const createMockExportConfig = (
  overrides?: Partial<{
    name: string;
    format: 'csv' | 'json' | 'excel';
    timeRange: string;
    dataTypes: string[];
    includeMetadata: boolean;
    fileName: string;
    fieldGroups: Array<{
      key: string;
      label: string;
      fields: Array<{ key: string; label: string; selected: boolean; dataType: string }>;
    }>;
  }>
) => ({
  name: 'Test Export',
  format: 'json' as const,
  timeRange: '24h',
  dataTypes: ['oracleMarket'],
  includeMetadata: true,
  fileName: 'test-export.json',
  fieldGroups: [
    {
      key: 'oracleMarket',
      label: 'Oracle Market Data',
      fields: [
        { key: 'name', label: 'Name', selected: true, dataType: 'string' },
        { key: 'share', label: 'Share', selected: true, dataType: 'number' },
        { key: 'tvs', label: 'TVS', selected: false, dataType: 'string' },
      ],
    },
  ],
  ...overrides,
});

describe('priceCalculations', () => {
  describe('generateTVSTrendData', () => {
    it('should generate trend data for specified hours', () => {
      const hours = 24;
      const data = generateTVSTrendData(hours);

      expect(data.length).toBe(25);
      expect(data[0]).toHaveProperty('timestamp');
      expect(data[0]).toHaveProperty('date');
      expect(data[0]).toHaveProperty('chainlink');
      expect(data[0]).toHaveProperty('pyth');
      expect(data[0]).toHaveProperty('total');
    });

    it('should generate trend data for 0 hours (365 days)', () => {
      const hours = 0;
      const data = generateTVSTrendData(hours);

      expect(data.length).toBe(366);
    });

    it('should limit data points to 365', () => {
      const hours = 500;
      const data = generateTVSTrendData(hours);

      expect(data.length).toBe(366);
    });

    it('should use oracle data for base values', () => {
      const oracleData = createMockOracleData();
      const data = generateTVSTrendData(24, oracleData);

      expect(data.length).toBe(25);
      expect(data[0]).toHaveProperty('chainlink');
    });

    it('should include confidence intervals', () => {
      const data = generateTVSTrendData(24);

      expect(data[0]).toHaveProperty('chainlinkUpper');
      expect(data[0]).toHaveProperty('chainlinkLower');
      expect(data[0].chainlinkUpper).toBeGreaterThan(data[0].chainlink);
      expect(data[0].chainlinkLower).toBeLessThan(data[0].chainlink);
    });

    it('should calculate total correctly', () => {
      const data = generateTVSTrendData(24);

      const expectedTotal =
        data[0].chainlink +
        data[0].pyth +
        data[0].api3 +
        data[0].uma +
        data[0].redstone +
        data[0].dia +
        data[0].winklink;

      expect(data[0].total).toBeCloseTo(expectedTotal, 1);
    });

    it('should use hourly interval for 24 hours or less', () => {
      const hours = 12;
      const data = generateTVSTrendData(hours);

      expect(data.length).toBe(13);
    });

    it('should use daily interval for more than 24 hours', () => {
      const hours = 48;
      const data = generateTVSTrendData(hours);

      expect(data.length).toBe(49);
    });
  });

  describe('exportWithConfig', () => {
    it('should export to JSON format', () => {
      const config = createMockExportConfig({ format: 'json' });
      const data: ExportDataOptions = {
        oracleData: createMockOracleData(),
        assets: createMockAssets(),
        trendData: createMockTrendData(),
      };

      const result = exportWithConfig(config, data);

      expect(result.mimeType).toBe('application/json');
      expect(result.fileName).toBe('test-export.json');
      expect(typeof result.content).toBe('string');

      const parsed = JSON.parse(result.content as string);
      expect(parsed).toHaveProperty('metadata');
      expect(parsed).toHaveProperty('oracleMarket');
    });

    it('should export to CSV format', () => {
      const config = createMockExportConfig({ format: 'csv', fileName: 'test-export.csv' });
      const data: ExportDataOptions = {
        oracleData: createMockOracleData(),
        assets: createMockAssets(),
        trendData: createMockTrendData(),
      };

      const result = exportWithConfig(config, data);

      expect(result.mimeType).toBe('text/csv;charset=utf-8;');
      expect(result.fileName).toBe('test-export.csv');
      expect(typeof result.content).toBe('string');
      expect(result.content).toContain('Name');
      expect(result.content).toContain('Share');
    });

    it('should export to Excel format', () => {
      const config = createMockExportConfig({ format: 'excel', fileName: 'test-export.xlsx' });
      const data: ExportDataOptions = {
        oracleData: createMockOracleData(),
        assets: createMockAssets(),
        trendData: createMockTrendData(),
      };

      const result = exportWithConfig(config, data);

      expect(result.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(result.fileName).toBe('test-export.xlsx');
      expect(result.content).toBeInstanceOf(Blob);
    });

    it('should include metadata when configured', () => {
      const config = createMockExportConfig({ includeMetadata: true });
      const data: ExportDataOptions = {
        oracleData: createMockOracleData(),
        assets: createMockAssets(),
        trendData: createMockTrendData(),
      };

      const result = exportWithConfig(config, data);
      const parsed = JSON.parse(result.content as string);

      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.exportTimestamp).toBeDefined();
      expect(parsed.metadata.timeRange).toBe('24h');
    });

    it('should not include metadata when not configured', () => {
      const config = createMockExportConfig({ includeMetadata: false });
      const data: ExportDataOptions = {
        oracleData: createMockOracleData(),
        assets: createMockAssets(),
        trendData: createMockTrendData(),
      };

      const result = exportWithConfig(config, data);
      const parsed = JSON.parse(result.content as string);

      expect(parsed.metadata).toBeUndefined();
    });

    it('should throw error for unsupported format', () => {
      const config = createMockExportConfig({
        format: 'unsupported' as 'csv' | 'json' | 'excel',
      });
      const data: ExportDataOptions = {
        oracleData: createMockOracleData(),
        assets: createMockAssets(),
        trendData: createMockTrendData(),
      };

      expect(() => exportWithConfig(config, data)).toThrow('Unsupported export format');
    });

    it('should export assets data', () => {
      const config = createMockExportConfig({
        dataTypes: ['assets'],
        fieldGroups: [
          {
            key: 'assets',
            label: 'Assets',
            fields: [
              { key: 'symbol', label: 'Symbol', selected: true, dataType: 'string' },
              { key: 'price', label: 'Price', selected: true, dataType: 'number' },
            ],
          },
        ],
      });
      const data: ExportDataOptions = {
        oracleData: createMockOracleData(),
        assets: createMockAssets(),
        trendData: createMockTrendData(),
      };

      const result = exportWithConfig(config, data);
      const parsed = JSON.parse(result.content as string);

      expect(parsed.assets).toBeDefined();
      expect(parsed.assets.length).toBe(2);
    });

    it('should export trend data', () => {
      const config = createMockExportConfig({
        dataTypes: ['trendData'],
        fieldGroups: [
          {
            key: 'trendData',
            label: 'Trend Data',
            fields: [
              { key: 'timestamp', label: 'Timestamp', selected: true, dataType: 'number' },
              { key: 'chainlink', label: 'Chainlink', selected: true, dataType: 'number' },
            ],
          },
        ],
      });
      const data: ExportDataOptions = {
        oracleData: createMockOracleData(),
        assets: createMockAssets(),
        trendData: createMockTrendData(),
      };

      const result = exportWithConfig(config, data);
      const parsed = JSON.parse(result.content as string);

      expect(parsed.trendData).toBeDefined();
    });

    it('should export risk metrics', () => {
      const config = createMockExportConfig({
        dataTypes: ['riskMetrics'],
        fieldGroups: [
          {
            key: 'riskMetrics',
            label: 'Risk Metrics',
            fields: [{ key: 'hhi.value', label: 'HHI', selected: true, dataType: 'number' }],
          },
        ],
      });
      const data: ExportDataOptions = {
        oracleData: createMockOracleData(),
        assets: createMockAssets(),
        trendData: createMockTrendData(),
        riskMetrics: {
          hhi: { value: 2500, level: 'high', description: 'test', concentrationRatio: 65 },
          diversification: {
            score: 60,
            level: 'medium',
            description: 'test',
            factors: { chainDiversity: 55, protocolDiversity: 65, assetDiversity: 60 },
          },
          volatility: {
            index: 35,
            level: 'medium',
            description: 'test',
            annualizedVolatility: 0.35,
            dailyVolatility: 0.018,
          },
          correlationRisk: {
            score: 50,
            level: 'medium',
            description: 'test',
            avgCorrelation: 0.65,
            highCorrelationPairs: [],
          },
          overallRisk: { score: 45, level: 'medium', timestamp: Date.now() },
        },
      };

      const result = exportWithConfig(config, data);
      const parsed = JSON.parse(result.content as string);

      expect(parsed.riskMetrics).toBeDefined();
    });

    it('should export anomalies', () => {
      const config = createMockExportConfig({
        dataTypes: ['anomalies'],
        fieldGroups: [
          {
            key: 'anomalies',
            label: 'Anomalies',
            fields: [
              { key: 'id', label: 'ID', selected: true, dataType: 'string' },
              { key: 'type', label: 'Type', selected: true, dataType: 'string' },
            ],
          },
        ],
      });
      const data: ExportDataOptions = {
        oracleData: createMockOracleData(),
        assets: createMockAssets(),
        trendData: createMockTrendData(),
        anomalies: [
          {
            id: 'anomaly-1',
            type: 'price_spike',
            level: 'high',
            title: 'Price Spike',
            description: 'Unusual price movement',
            timestamp: Date.now(),
            asset: 'BTC',
            oracle: 'chainlink',
            value: 55000,
            expectedValue: 50000,
            deviation: 10,
            duration: 300,
            acknowledged: false,
          },
        ],
      };

      const result = exportWithConfig(config, data);
      const parsed = JSON.parse(result.content as string);

      expect(parsed.anomalies).toBeDefined();
      expect(parsed.anomalies.length).toBe(1);
    });

    it('should handle CSV with special characters', () => {
      const config = createMockExportConfig({
        format: 'csv',
        dataTypes: ['oracleMarket'],
        fieldGroups: [
          {
            key: 'oracleMarket',
            label: 'Oracle Market',
            fields: [{ key: 'name', label: 'Name', selected: true, dataType: 'string' }],
          },
        ],
      });
      const data: ExportDataOptions = {
        oracleData: [
          {
            name: 'Test, Oracle "With Quotes"',
            share: 50,
            color: '#000',
            tvs: '$1B',
            tvsValue: 1e9,
            chains: 10,
            protocols: 100,
            avgLatency: 100,
            accuracy: 99.9,
            updateFrequency: 1000,
            change24h: 0,
            change7d: 0,
            change30d: 0,
          },
        ],
        assets: [],
        trendData: [],
      };

      const result = exportWithConfig(config, data);

      expect(result.content).toContain('"Test, Oracle ""With Quotes"""');
    });
  });

  describe('downloadExport', () => {
    let mockCreateObjectURL: jest.Mock;
    let mockRevokeObjectURL: jest.Mock;
    let mockAppendChild: jest.Mock;
    let mockRemoveChild: jest.Mock;

    beforeEach(() => {
      mockCreateObjectURL = jest.fn().mockReturnValue('blob:test-url');
      mockRevokeObjectURL = jest.fn();
      mockAppendChild = jest.fn();
      mockRemoveChild = jest.fn();

      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      document.body.appendChild = mockAppendChild;
      document.body.removeChild = mockRemoveChild;
    });

    it('should download string content', () => {
      const content = 'test content';
      const fileName = 'test.json';
      const mimeType = 'application/json';

      downloadExport(content, fileName, mimeType);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('should download Blob content', () => {
      const content = new Blob(['test'], { type: 'text/plain' });
      const fileName = 'test.txt';
      const mimeType = 'text/plain';

      downloadExport(content, fileName, mimeType);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
    });

    it('should create link with correct attributes', () => {
      const content = 'test content';
      const fileName = 'test-export.json';
      const mimeType = 'application/json';

      downloadExport(content, fileName, mimeType);

      const link = mockAppendChild.mock.calls[0][0];
      expect(link.href).toBe('blob:test-url');
      expect(link.download).toBe(fileName);
      expect(link.style.visibility).toBe('hidden');
    });
  });
});
