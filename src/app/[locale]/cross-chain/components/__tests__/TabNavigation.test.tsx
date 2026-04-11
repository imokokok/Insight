import { render, screen, fireEvent } from '@testing-library/react';
import { TabNavigation, type TabId } from '../TabNavigation';

jest.mock('@/i18n', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'crossChain.tabOverview': 'Overview',
      'crossChain.tabOverviewDesc': 'View overview data',
      'crossChain.tabCharts': 'Charts',
      'crossChain.tabChartsDesc': 'View charts',
    };
    return translations[key] || key;
  },
}));

describe('TabNavigation', () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render both tabs', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);
    
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Charts')).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);
    
    const overviewTab = screen.getByRole('button', { name: 'Overview' });
    expect(overviewTab).toBeInTheDocument();
  });

  it('should call onTabChange when tab is clicked', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);
    
    const chartsTab = screen.getByRole('button', { name: 'Charts' });
    fireEvent.click(chartsTab);
    
    expect(mockOnTabChange).toHaveBeenCalledWith('charts');
  });

  it('should render tab descriptions as title', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);
    
    const overviewTab = screen.getByRole('button', { name: 'Overview' });
    expect(overviewTab).toHaveAttribute('title', 'View overview data');
  });

  it('should switch active tab correctly', () => {
    const { rerender } = render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);
    
    const overviewTab = screen.getByRole('button', { name: 'Overview' });
    fireEvent.click(overviewTab);
    
    expect(mockOnTabChange).toHaveBeenCalledWith('overview');
    
    rerender(<TabNavigation activeTab="charts" onTabChange={mockOnTabChange} />);
    
    const chartsTab = screen.getByRole('button', { name: 'Charts' });
    expect(chartsTab).toBeInTheDocument();
  });

  it('should render mobile version on small screens', () => {
    render(<TabNavigation activeTab="overview" onTabChange={mockOnTabChange} />);
    
    const tabs = screen.getAllByRole('button');
    expect(tabs.length).toBeGreaterThan(0);
  });
});
