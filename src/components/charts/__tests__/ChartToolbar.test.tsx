import { render, screen, fireEvent } from '@testing-library/react';
import { ChartToolbar, type ChartToolbarProps, type TimeRange } from '../ChartToolbar';

describe('ChartToolbar', () => {
  const defaultProps: ChartToolbarProps = {
    timeRanges: ['1H', '24H', '7D', '30D'] as TimeRange[],
    selectedRange: '24H',
    onRangeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render time range buttons', () => {
    render(<ChartToolbar {...defaultProps} />);
    
    expect(screen.getByText('1H')).toBeInTheDocument();
    expect(screen.getByText('24H')).toBeInTheDocument();
    expect(screen.getByText('7D')).toBeInTheDocument();
    expect(screen.getByText('30D')).toBeInTheDocument();
  });

  it('should highlight selected time range', () => {
    render(<ChartToolbar {...defaultProps} selectedRange="24H" />);
    
    const selectedButton = screen.getByRole('button', { name: '24H' });
    expect(selectedButton).toBeInTheDocument();
  });

  it('should call onRangeChange when time range is clicked', () => {
    const onRangeChange = jest.fn();
    render(<ChartToolbar {...defaultProps} onRangeChange={onRangeChange} />);
    
    const button = screen.getByRole('button', { name: '7D' });
    fireEvent.click(button);
    
    expect(onRangeChange).toHaveBeenCalledWith('7D');
  });

  it('should render chart type buttons when provided', () => {
    render(
      <ChartToolbar
        {...defaultProps}
        chartTypes={['line', 'area', 'candle']}
        selectedType="line"
        onTypeChange={jest.fn()}
      />
    );
    
    expect(screen.getByText('Line')).toBeInTheDocument();
    expect(screen.getByText('Area')).toBeInTheDocument();
    expect(screen.getByText('Candle')).toBeInTheDocument();
  });

  it('should call onTypeChange when chart type is clicked', () => {
    const onTypeChange = jest.fn();
    render(
      <ChartToolbar
        {...defaultProps}
        chartTypes={['line', 'area']}
        selectedType="line"
        onTypeChange={onTypeChange}
      />
    );
    
    const button = screen.getByRole('button', { name: /area/i });
    fireEvent.click(button);
    
    expect(onTypeChange).toHaveBeenCalledWith('area');
  });

  it('should render export button when onExport is provided', () => {
    render(<ChartToolbar {...defaultProps} onExport={jest.fn()} />);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeInTheDocument();
  });

  it('should call onExport when export button is clicked', () => {
    const onExport = jest.fn();
    render(<ChartToolbar {...defaultProps} onExport={onExport} />);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);
    
    expect(onExport).toHaveBeenCalled();
  });

  it('should render indicator dropdown when onAddIndicator is provided', () => {
    render(<ChartToolbar {...defaultProps} onAddIndicator={jest.fn()} />);
    
    const indicatorButton = screen.getByRole('button', { name: /indicator/i });
    expect(indicatorButton).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ChartToolbar {...defaultProps} className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render with default indicators', () => {
    render(<ChartToolbar {...defaultProps} onAddIndicator={jest.fn()} />);
    
    const indicatorButton = screen.getByRole('button', { name: /indicator/i });
    fireEvent.click(indicatorButton);
    
    expect(screen.getByText('MA')).toBeInTheDocument();
    expect(screen.getByText('EMA')).toBeInTheDocument();
    expect(screen.getByText('RSI')).toBeInTheDocument();
  });

  it('should call onAddIndicator when indicator is selected', () => {
    const onAddIndicator = jest.fn();
    render(<ChartToolbar {...defaultProps} onAddIndicator={onAddIndicator} />);
    
    const indicatorButton = screen.getByRole('button', { name: /indicator/i });
    fireEvent.click(indicatorButton);
    
    const maOption = screen.getByText('MA');
    fireEvent.click(maOption);
    
    expect(onAddIndicator).toHaveBeenCalledWith('MA');
  });
});
