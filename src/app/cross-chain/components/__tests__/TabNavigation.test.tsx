import { render, screen, fireEvent } from '@testing-library/react';

import { TabNavigation } from '../TabNavigation';

describe('TabNavigation', () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render both tabs', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);

    const overviewTabs = screen.getAllByRole('button', { name: 'Overview' });
    const chartsTabs = screen.getAllByRole('button', { name: 'Charts' });
    expect(overviewTabs.length).toBeGreaterThan(0);
    expect(chartsTabs.length).toBeGreaterThan(0);
  });

  it('should highlight active tab', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);

    const overviewTab = screen.getAllByRole('button', { name: 'Overview' })[0];
    expect(overviewTab).toBeInTheDocument();
    expect(overviewTab).toHaveAttribute('title', 'Summary and key metrics');
  });

  it('should call onTabChange when tab is clicked', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);

    const chartsTabs = screen.getAllByRole('button', { name: 'Charts' });
    fireEvent.click(chartsTabs[0]);

    expect(mockOnTabChange).toHaveBeenCalledWith('charts');
  });

  it('should render tab descriptions as title', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);

    const overviewTab = screen.getAllByRole('button', { name: 'Overview' })[0];
    expect(overviewTab).toHaveAttribute('title', 'Summary and key metrics');
  });

  it('should switch active tab correctly', () => {
    const { rerender } = render(
      <TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />
    );

    const overviewTabs = screen.getAllByRole('button', { name: 'Overview' });
    fireEvent.click(overviewTabs[0]);

    expect(mockOnTabChange).toHaveBeenCalledWith('overview');

    rerender(<TabNavigation activeTab="charts" onTabChange={mockOnTabChange} />);

    const chartsTabs = screen.getAllByRole('button', { name: 'Charts' });
    expect(chartsTabs.length).toBeGreaterThan(0);
  });

  it('should render mobile version on small screens', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);

    const tabs = screen.getAllByRole('button');
    expect(tabs.length).toBeGreaterThan(0);
  });

  it('should show correct active tab styling for overview', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);

    const overviewTabs = screen.getAllByRole('button', { name: 'Overview' });
    const chartsTabs = screen.getAllByRole('button', { name: 'Charts' });

    expect(overviewTabs[0]).toHaveClass('shadow-sm');
    expect(chartsTabs[0]).not.toHaveClass('shadow-sm');
  });

  it('should show correct active tab styling for charts', () => {
    render(<TabNavigation activeTab="charts" onTabChange={mockOnTabChange} />);

    const overviewTabs = screen.getAllByRole('button', { name: 'Overview' });
    const chartsTabs = screen.getAllByRole('button', { name: 'Charts' });

    expect(chartsTabs[0]).toHaveClass('shadow-sm');
    expect(overviewTabs[0]).not.toHaveClass('shadow-sm');
  });
});
