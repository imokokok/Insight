import {
  exportChart,
  exportMultipleCharts,
  getSupportedExportFormats,
} from '../chartExport';
import { exportToCSV } from '../chartExport/formats/csvExporter';
import { exportToPNG, exportToSVG } from '../chartExport/formats/imageExporter';
import { exportToJSON } from '../chartExport/formats/jsonExporter';
import { exportToPDF } from '../chartExport/formats/pdfExporter';

import type { ChartExportData, ExportProgress } from '../chartExport/types';

jest.mock('../chartExport/formats/csvExporter');
jest.mock('../chartExport/formats/imageExporter');
jest.mock('../chartExport/formats/jsonExporter');
jest.mock('../chartExport/formats/pdfExporter');
jest.mock('../chartExport/utils/exportHelpers', () => ({
  sanitizeFilename: jest.fn((name: string) => name.replace(/[^a-zA-Z0-9-_]/g, '_')),
  downloadBlob: jest.fn(),
}));
jest.mock('../logger', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockExportToCSV = exportToCSV as jest.MockedFunction<typeof exportToCSV>;
const mockExportToJSON = exportToJSON as jest.MockedFunction<typeof exportToJSON>;
const mockExportToPNG = exportToPNG as jest.MockedFunction<typeof exportToPNG>;
const mockExportToSVG = exportToSVG as jest.MockedFunction<typeof exportToSVG>;
const mockExportToPDF = exportToPDF as jest.MockedFunction<typeof exportToPDF>;

describe('chartExport', () => {
  const mockData: ChartExportData[] = [
    { time: '2024-01-01', price: 100, volume: 1000 },
    { time: '2024-01-02', price: 101, volume: 1100 },
  ];

  const mockChartRef = document.createElement('div');

  beforeEach(() => {
    jest.clearAllMocks();
    mockExportToCSV.mockResolvedValue();
    mockExportToJSON.mockResolvedValue();
    mockExportToPNG.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    mockExportToSVG.mockResolvedValue(new Blob(['svg'], { type: 'image/svg+xml' }));
    mockExportToPDF.mockResolvedValue();
  });

  describe('exportChart', () => {
    describe('CSV export', () => {
      it('should export data to CSV format', async () => {
        await exportChart(null, mockData, { format: 'csv', filename: 'test-export' });

        expect(mockExportToCSV).toHaveBeenCalledWith(
          mockData,
          'test-export',
          expect.objectContaining({
            exportedAt: expect.any(String),
            totalRecords: 2,
          }),
          undefined
        );
      });

      it('should call progress callback during CSV export', async () => {
        const onProgress = jest.fn();

        await exportChart(null, mockData, { format: 'csv' }, onProgress);

        expect(mockExportToCSV).toHaveBeenCalledWith(
          mockData,
          'chart-export',
          expect.any(Object),
          onProgress
        );
      });

      it('should not include metadata when includeMetadata is false', async () => {
        await exportChart(null, mockData, {
          format: 'csv',
          includeMetadata: false,
        });

        expect(mockExportToCSV).toHaveBeenCalledWith(
          mockData,
          'chart-export',
          undefined,
          undefined
        );
      });
    });

    describe('JSON export', () => {
      it('should export data to JSON format', async () => {
        await exportChart(null, mockData, { format: 'json', filename: 'json-export' });

        expect(mockExportToJSON).toHaveBeenCalledWith(
          mockData,
          'json-export',
          expect.objectContaining({
            exportedAt: expect.any(String),
            totalRecords: 2,
          }),
          undefined
        );
      });
    });

    describe('Excel export', () => {
      it('should export data to Excel format (uses CSV exporter)', async () => {
        await exportChart(null, mockData, { format: 'excel', filename: 'excel-export' });

        expect(mockExportToCSV).toHaveBeenCalled();
      });
    });

    describe('PNG export', () => {
      it('should export chart to PNG format', async () => {
        await exportChart(mockChartRef, mockData, {
          format: 'png',
          filename: 'png-export',
        });

        expect(mockExportToPNG).toHaveBeenCalledWith(
          mockChartRef,
          'png-export',
          expect.objectContaining({
            resolution: 'standard',
          }),
          undefined
        );
      });

      it('should throw error when chartRef is null for PNG export', async () => {
        await expect(
          exportChart(null, mockData, { format: 'png' })
        ).rejects.toThrow('Chart element reference is required for PNG export');
      });

      it('should pass chart title and data source to PNG export', async () => {
        await exportChart(mockChartRef, mockData, {
          format: 'png',
          filename: 'test',
          chartTitle: 'Test Chart',
          dataSource: 'Test Source',
        });

        expect(mockExportToPNG).toHaveBeenCalledWith(
          mockChartRef,
          'test',
          expect.objectContaining({
            chartTitle: 'Test Chart',
            dataSource: 'Test Source',
          }),
          undefined
        );
      });

      it('should use high resolution when specified', async () => {
        await exportChart(mockChartRef, mockData, {
          format: 'png',
          resolution: 'high',
        });

        expect(mockExportToPNG).toHaveBeenCalledWith(
          mockChartRef,
          'chart-export',
          expect.objectContaining({
            resolution: 'high',
          }),
          undefined
        );
      });
    });

    describe('SVG export', () => {
      it('should export chart to SVG format', async () => {
        await exportChart(mockChartRef, mockData, {
          format: 'svg',
          filename: 'svg-export',
        });

        expect(mockExportToSVG).toHaveBeenCalledWith(
          mockChartRef,
          'svg-export',
          expect.objectContaining({
            chartTitle: undefined,
            dataSource: undefined,
          }),
          undefined
        );
      });

      it('should throw error when chartRef is null for SVG export', async () => {
        await expect(
          exportChart(null, mockData, { format: 'svg' })
        ).rejects.toThrow('Chart element reference is required for SVG export');
      });
    });

    describe('PDF export', () => {
      it('should export chart to PDF format', async () => {
        await exportChart(mockChartRef, mockData, {
          format: 'pdf',
          filename: 'pdf-export',
        });

        expect(mockExportToPDF).toHaveBeenCalledWith(
          expect.objectContaining({
            filename: 'pdf-export',
            charts: expect.arrayContaining([
              expect.objectContaining({
                chartRef: mockChartRef,
                data: mockData,
              }),
            ]),
          }),
          undefined
        );
      });

      it('should use chart title in PDF export', async () => {
        await exportChart(mockChartRef, mockData, {
          format: 'pdf',
          chartTitle: 'My Chart',
        });

        expect(mockExportToPDF).toHaveBeenCalledWith(
          expect.objectContaining({
            charts: expect.arrayContaining([
              expect.objectContaining({
                title: 'My Chart',
              }),
            ]),
          }),
          undefined
        );
      });
    });

    describe('Error handling', () => {
      it('should throw error for unsupported format', async () => {
        await expect(
          exportChart(null, mockData, { format: 'unsupported' as 'csv' })
        ).rejects.toThrow('Unsupported export format: unsupported');
      });

      it('should propagate export errors', async () => {
        mockExportToCSV.mockRejectedValue(new Error('Export failed'));

        await expect(
          exportChart(null, mockData, { format: 'csv' })
        ).rejects.toThrow('Export failed');
      });
    });

    describe('Default options', () => {
      it('should use default filename when not provided', async () => {
        await exportChart(null, mockData, { format: 'csv' });

        expect(mockExportToCSV).toHaveBeenCalledWith(
          mockData,
          'chart-export',
          expect.any(Object),
          undefined
        );
      });

      it('should include timestamp in metadata by default', async () => {
        await exportChart(null, mockData, {
          format: 'csv',
          includeMetadata: true,
          showTimestamp: true,
        });

        expect(mockExportToCSV).toHaveBeenCalledWith(
          mockData,
          'chart-export',
          expect.objectContaining({
            exportedAt: expect.any(String),
          }),
          undefined
        );
      });
    });
  });

  describe('exportMultipleCharts', () => {
    it('should export multiple charts sequentially', async () => {
      const charts = [
        { chartRef: mockChartRef, data: mockData, name: 'chart1' },
        { chartRef: mockChartRef, data: mockData, name: 'chart2' },
      ];

      await exportMultipleCharts(charts, { format: 'csv' });

      expect(mockExportToCSV).toHaveBeenCalledTimes(2);
    });

    it('should call progress callback for each chart', async () => {
      const charts = [
        { chartRef: mockChartRef, data: mockData, name: 'chart1' },
        { chartRef: mockChartRef, data: mockData, name: 'chart2' },
      ];
      const onProgress = jest.fn();

      await exportMultipleCharts(charts, { format: 'csv' }, onProgress);

      expect(onProgress).toHaveBeenCalled();
    });

    it('should report completion after all charts exported', async () => {
      const charts = [
        { chartRef: mockChartRef, data: mockData, name: 'chart1' },
      ];
      const onProgress = jest.fn();

      await exportMultipleCharts(charts, { format: 'csv' }, onProgress);

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          progress: 100,
        })
      );
    });

    it('should handle empty charts array', async () => {
      const onProgress = jest.fn();

      await exportMultipleCharts([], { format: 'csv' }, onProgress);

      expect(mockExportToCSV).not.toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          progress: 100,
        })
      );
    });
  });

  describe('getSupportedExportFormats', () => {
    it('should return array of supported formats', () => {
      const formats = getSupportedExportFormats();

      expect(formats).toBeInstanceOf(Array);
      expect(formats.length).toBeGreaterThan(0);
    });

    it('should include all expected formats', () => {
      const formats = getSupportedExportFormats();
      const formatNames = formats.map((f) => f.format);

      expect(formatNames).toContain('csv');
      expect(formatNames).toContain('json');
      expect(formatNames).toContain('excel');
      expect(formatNames).toContain('png');
      expect(formatNames).toContain('svg');
      expect(formatNames).toContain('pdf');
    });

    it('should indicate which formats require chart reference', () => {
      const formats = getSupportedExportFormats();

      const csvFormat = formats.find((f) => f.format === 'csv');
      const pngFormat = formats.find((f) => f.format === 'png');

      expect(csvFormat?.requiresChartRef).toBe(false);
      expect(pngFormat?.requiresChartRef).toBe(true);
    });

    it('should have label and description for each format', () => {
      const formats = getSupportedExportFormats();

      formats.forEach((format) => {
        expect(format.label).toBeDefined();
        expect(format.descriptionKey).toBeDefined();
        expect(typeof format.label).toBe('string');
        expect(typeof format.descriptionKey).toBe('string');
      });
    });
  });
});
