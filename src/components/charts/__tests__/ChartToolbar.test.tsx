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

    expect(screen.getByRole('button', { name: '1H' })).toBeInTheDocument();
    // '24H' is also rendered by the mobile dropdown toggle, so disambiguate.
    expect(screen.getAllByRole('button', { name: '24H' })[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7D' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30D' })).toBeInTheDocument();
  });

  it('should highlight selected time range', () => {
    render(<ChartToolbar {...defaultProps} selectedRange="24H" />);

    // '24H' is rendered by both the desktop group and the mobile dropdown toggle.
    const selectedButton = screen.getAllByRole('button', { name: '24H' })[0];
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

    // Each chart type renders in both the desktop and mobile switcher groups.
    expect(screen.getAllByRole('button', { name: 'Line' })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Area' })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Candle' })[0]).toBeInTheDocument();
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

    // 'area' is rendered by both the desktop and mobile chart type switchers.
    const button = screen.getAllByRole('button', { name: /area/i })[0];
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

  it('should apply custom className', () => {
    const { container } = render(<ChartToolbar {...defaultProps} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
