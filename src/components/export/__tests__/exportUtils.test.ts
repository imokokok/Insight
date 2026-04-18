import {
  generateId,
  generateFileName,
  formatFileSize,
  getFieldLabel,
  getSelectedFields,
} from '../exportUtils';
import { type ExportField, type ExportDataSource, type ExportFormat } from '../types';

describe('exportUtils', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^export-/);
    });
  });

  describe('generateFileName', () => {
    it('should generate filename with timestamp', () => {
      const fileName = generateFileName('price-query', 'csv');

      expect(fileName).toMatch(/^price-query-/);
      expect(fileName).toMatch(/\.csv$/);
    });

    it('should generate excel filename with xlsx extension', () => {
      const fileName = generateFileName('cross-oracle', 'excel');

      expect(fileName).toMatch(/\.xlsx$/);
    });

    it('should use custom name when provided', () => {
      const fileName = generateFileName('custom', 'json', 'my-export');

      expect(fileName).toMatch(/^my-export-/);
      expect(fileName).toMatch(/\.json$/);
    });

    it('should handle all data sources', () => {
      const sources: ExportDataSource[] = [
        'price-query',
        'cross-oracle',
        'oracle-detail',
        'custom',
      ];

      sources.forEach((source) => {
        const fileName = generateFileName(source, 'csv');
        expect(fileName).toMatch(/\.csv$/);
      });
    });

    it('should handle all formats', () => {
      const formats: ExportFormat[] = ['csv', 'json', 'excel', 'pdf'];

      formats.forEach((format) => {
        const fileName = generateFileName('price-query', format);
        if (format === 'excel') {
          expect(fileName).toMatch(/\.xlsx$/);
        } else {
          expect(fileName).toMatch(new RegExp(`\\.${format}$`));
        }
      });
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(2560)).toBe('2.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(2621440)).toBe('2.5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });
  });

  describe('getFieldLabel', () => {
    const mockField: ExportField = {
      key: 'price',
      label: 'Price',
      dataType: 'number',
      selected: true,
    };

    it('should return label', () => {
      expect(getFieldLabel(mockField)).toBe('Price');
    });
  });

  describe('getSelectedFields', () => {
    const mockFields: ExportField[] = [
      { key: 'symbol', label: 'Symbol', dataType: 'string', selected: true },
      { key: 'price', label: 'Price', dataType: 'number', selected: false },
      { key: 'timestamp', label: 'Timestamp', dataType: 'date', selected: true },
    ];

    it('should filter selected fields', () => {
      const selected = getSelectedFields(mockFields);

      expect(selected).toHaveLength(2);
      expect(selected[0].key).toBe('symbol');
      expect(selected[1].key).toBe('timestamp');
    });

    it('should return empty array when no fields selected', () => {
      const fields: ExportField[] = [
        { key: 'symbol', label: 'Symbol', dataType: 'string', selected: false },
      ];

      expect(getSelectedFields(fields)).toHaveLength(0);
    });

    it('should return all fields when all selected', () => {
      const fields: ExportField[] = [
        { key: 'symbol', label: 'Symbol', dataType: 'string', selected: true },
        { key: 'price', label: 'Price', dataType: 'number', selected: true },
      ];

      expect(getSelectedFields(fields)).toHaveLength(2);
    });
  });
});
