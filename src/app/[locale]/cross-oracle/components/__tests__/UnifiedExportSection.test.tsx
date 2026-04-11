import { render, screen, fireEvent } from '@testing-library/react';

import { UnifiedExportSection } from '../UnifiedExportSection';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('UnifiedExportSection', () => {
  const mockProps = {
    onExportCSV: jest.fn(),
    onExportJSON: jest.fn(),
    onExportPDF: jest.fn(),
    isExporting: false,
    exportFormat: 'csv' as const,
    onFormatChange: jest.fn(),
    includeTimestamps: true,
    onIncludeTimestampsChange: jest.fn(),
    includeMetadata: false,
    onIncludeMetadataChange: jest.fn(),
    t: (key: string) => key,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render export section', () => {
    render(<UnifiedExportSection {...mockProps} />);

    expect(screen.getByText(/export/i)).toBeInTheDocument();
  });

  it('should render format selector', () => {
    render(<UnifiedExportSection {...mockProps} />);

    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('should call onFormatChange when format is changed', () => {
    const onFormatChange = jest.fn();
    render(<UnifiedExportSection {...mockProps} onFormatChange={onFormatChange} />);

    const jsonButton = screen.getByRole('button', { name: /json/i });
    fireEvent.click(jsonButton);

    expect(onFormatChange).toHaveBeenCalledWith('json');
  });

  it('should call onExportCSV when export button is clicked with CSV format', () => {
    const onExportCSV = jest.fn();
    render(<UnifiedExportSection {...mockProps} onExportCSV={onExportCSV} exportFormat="csv" />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    expect(onExportCSV).toHaveBeenCalled();
  });

  it('should call onExportJSON when export button is clicked with JSON format', () => {
    const onExportJSON = jest.fn();
    render(<UnifiedExportSection {...mockProps} onExportJSON={onExportJSON} exportFormat="json" />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    expect(onExportJSON).toHaveBeenCalled();
  });

  it('should call onExportPDF when export button is clicked with PDF format', () => {
    const onExportPDF = jest.fn();
    render(<UnifiedExportSection {...mockProps} onExportPDF={onExportPDF} exportFormat="pdf" />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    expect(onExportPDF).toHaveBeenCalled();
  });

  it('should show loading state when exporting', () => {
    render(<UnifiedExportSection {...mockProps} isExporting={true} />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeDisabled();
  });

  it('should render timestamp toggle', () => {
    render(<UnifiedExportSection {...mockProps} />);

    const timestampToggle = screen.getByRole('checkbox', { name: /timestamp/i });
    expect(timestampToggle).toBeChecked();
  });

  it('should call onIncludeTimestampsChange when toggle is clicked', () => {
    const onIncludeTimestampsChange = jest.fn();
    render(
      <UnifiedExportSection {...mockProps} onIncludeTimestampsChange={onIncludeTimestampsChange} />
    );

    const timestampToggle = screen.getByRole('checkbox', { name: /timestamp/i });
    fireEvent.click(timestampToggle);

    expect(onIncludeTimestampsChange).toHaveBeenCalledWith(false);
  });

  it('should render metadata toggle', () => {
    render(<UnifiedExportSection {...mockProps} />);

    const metadataToggle = screen.getByRole('checkbox', { name: /metadata/i });
    expect(metadataToggle).not.toBeChecked();
  });

  it('should call onIncludeMetadataChange when toggle is clicked', () => {
    const onIncludeMetadataChange = jest.fn();
    render(
      <UnifiedExportSection {...mockProps} onIncludeMetadataChange={onIncludeMetadataChange} />
    );

    const metadataToggle = screen.getByRole('checkbox', { name: /metadata/i });
    fireEvent.click(metadataToggle);

    expect(onIncludeMetadataChange).toHaveBeenCalledWith(true);
  });
});
