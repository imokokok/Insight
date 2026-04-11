import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertList } from '../AlertList';
import { type PriceAlert } from '@/lib/supabase/database.types';

jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
  }),
}));

jest.mock('@/hooks', () => ({
  useUpdateAlert: () => ({
    updateAlert: jest.fn(),
    isUpdating: false,
  }),
  useDeleteAlert: () => ({
    deleteAlert: jest.fn(),
    isDeleting: false,
  }),
  useBatchAlerts: () => ({
    batchOperation: jest.fn(),
    isProcessing: false,
  }),
}));

jest.mock('@/i18n', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/constants', () => ({
  providerNames: { chainlink: 'Chainlink', pyth: 'Pyth' },
  chainNames: { ethereum: 'Ethereum', solana: 'Solana' },
  oracleColors: { chainlink: '#375BD2', pyth: '#EC1C79' },
  chainColors: { ethereum: '#627EEA', solana: '#14F195' },
}));

const mockAlerts: PriceAlert[] = [
  {
    id: 'alert-1',
    user_id: 'user-1',
    name: 'BTC Price Alert',
    symbol: 'BTC',
    provider: 'chainlink',
    chain: 'ethereum',
    condition_type: 'above',
    target_value: 50000,
    is_active: true,
    last_triggered_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'alert-2',
    user_id: 'user-1',
    name: 'ETH Price Alert',
    symbol: 'ETH',
    provider: 'pyth',
    chain: 'ethereum',
    condition_type: 'below',
    target_value: 3000,
    is_active: true,
    last_triggered_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('AlertList', () => {
  const mockProps = {
    alerts: mockAlerts,
    isLoading: false,
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render alert list', () => {
    render(<AlertList {...mockProps} />);
    
    expect(screen.getByText('alerts.list.title')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(<AlertList {...mockProps} isLoading={true} />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render empty state when no alerts', () => {
    render(<AlertList {...mockProps} alerts={[]} />);
    
    expect(screen.getByText(/no alerts/i)).toBeInTheDocument();
  });

  it('should call onRefresh when refresh button is clicked', () => {
    const onRefresh = jest.fn();
    render(<AlertList {...mockProps} onRefresh={onRefresh} />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    expect(onRefresh).toHaveBeenCalled();
  });

  it('should display alert count', () => {
    render(<AlertList {...mockProps} />);
    
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should render batch operations component', () => {
    render(<AlertList {...mockProps} />);
    
    expect(screen.getByText(/batch/i)).toBeInTheDocument();
  });
});
