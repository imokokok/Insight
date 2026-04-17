import type { HTMLAttributes, ButtonHTMLAttributes, PropsWithChildren } from 'react';

import { render, screen, fireEvent } from '@testing-library/react';

import { UnifiedExport } from '../UnifiedExport';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) => (
      <div {...props}>{children}</div>
    ),
    button: ({
      children,
      ...props
    }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: PropsWithChildren) => <>{children}</>,
}));

jest.mock('@/i18n', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../ExportHistoryPanel', () => ({
  ExportHistoryPanel: () => <div data-testid="export-history-panel">History Panel</div>,
}));

jest.mock('../exportUtils', () => ({
  executeExport: jest.fn(),
}));

jest.mock('../useExportHistory', () => ({
  useExportHistory: () => ({
    addHistoryItem: jest.fn(),
    history: [],
  }),
}));

const mockData = [
  { symbol: 'BTC', price: 50000, timestamp: Date.now() },
  { symbol: 'ETH', price: 3000, timestamp: Date.now() },
];

const mockFields = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'price', label: 'Price' },
  { key: 'timestamp', label: 'Timestamp' },
];

describe('UnifiedExport', () => {
  const mockProps = {
    data: mockData,
    dataSource: 'test-source',
    fields: mockFields,
    disabled: false,
    className: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render export button', () => {
    render(<UnifiedExport {...mockProps} />);

    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('should open dropdown when clicked', () => {
    render(<UnifiedExport {...mockProps} />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<UnifiedExport {...mockProps} disabled={true} />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeDisabled();
  });

  it('should apply custom className', () => {
    const { container } = render(<UnifiedExport {...mockProps} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render format options', () => {
    render(<UnifiedExport {...mockProps} />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('Excel')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('should call onExportStart when export starts', async () => {
    const onExportStart = jest.fn();
    render(<UnifiedExport {...mockProps} onExportStart={onExportStart} />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    const csvOption = screen.getByText('CSV');
    fireEvent.click(csvOption);
  });

  it('should show history panel when history button is clicked', () => {
    render(<UnifiedExport {...mockProps} />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    const historyButton = screen.getByRole('button', { name: /history/i });
    fireEvent.click(historyButton);

    expect(screen.getByTestId('export-history-panel')).toBeInTheDocument();
  });
});
