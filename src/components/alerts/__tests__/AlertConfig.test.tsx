import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { AlertConfig } from '../AlertConfig';

jest.mock('@/hooks', () => ({
  useCreateAlert: () => ({
    createAlert: jest.fn().mockResolvedValue({ success: true }),
    isCreating: false,
  }),
}));

jest.mock('@/i18n', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/constants', () => ({
  providerNames: { chainlink: 'Chainlink', pyth: 'Pyth' },
  chainNames: { ethereum: 'Ethereum', solana: 'Solana' },
  symbols: ['BTC', 'ETH', 'SOL'],
  oracleColors: { chainlink: '#375BD2', pyth: '#EC1C79' },
}));

jest.mock('@/components/ui', () => ({
  DropdownSelect: ({ options, value, onChange }: any) => (
    <select data-testid="dropdown-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
  SegmentedControl: ({ options, value, onChange }: any) => (
    <div data-testid="segmented-control">
      {options.map((opt: any) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          data-active={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('../AlertMutePeriod', () => ({
  AlertMutePeriod: () => <div data-testid="mute-period">Mute Period</div>,
}));

jest.mock('../AlertTemplates', () => ({
  AlertTemplates: () => <div data-testid="alert-templates">Templates</div>,
}));

describe('AlertConfig', () => {
  const mockOnAlertCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render alert config form', () => {
    render(<AlertConfig onAlertCreated={mockOnAlertCreated} />);

    expect(screen.getByText('alerts.create.title')).toBeInTheDocument();
  });

  it('should render dropdown selectors', () => {
    render(<AlertConfig onAlertCreated={mockOnAlertCreated} />);

    const dropdowns = screen.getAllByTestId('dropdown-select');
    expect(dropdowns.length).toBeGreaterThanOrEqual(2);
  });

  it('should render condition type selector', () => {
    render(<AlertConfig onAlertCreated={mockOnAlertCreated} />);

    expect(screen.getByTestId('segmented-control')).toBeInTheDocument();
  });

  it('should render target value input', () => {
    render(<AlertConfig onAlertCreated={mockOnAlertCreated} />);

    const targetInput = screen.getByPlaceholderText('alerts.placeholder.targetPrice');
    expect(targetInput).toBeInTheDocument();
  });

  it('should render create button', () => {
    render(<AlertConfig onAlertCreated={mockOnAlertCreated} />);

    const createButton = screen.getByRole('button', { name: 'alerts.create.submit' });
    expect(createButton).toBeInTheDocument();
  });

  it('should allow entering alert name', () => {
    render(<AlertConfig onAlertCreated={mockOnAlertCreated} />);

    const nameInput = screen.getByPlaceholderText('alerts.create.namePlaceholder');
    fireEvent.change(nameInput, { target: { value: 'Test Alert' } });

    expect(nameInput).toHaveValue('Test Alert');
  });

  it('should allow entering target value', () => {
    render(<AlertConfig onAlertCreated={mockOnAlertCreated} />);

    const targetInput = screen.getByPlaceholderText('alerts.placeholder.targetPrice');
    fireEvent.change(targetInput, { target: { value: '50000' } });

    expect(targetInput).toHaveValue(50000);
  });

  it('should show error when required fields are missing', async () => {
    render(<AlertConfig onAlertCreated={mockOnAlertCreated} />);

    const createButton = screen.getByRole('button', { name: 'alerts.create.submit' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('alerts.error.invalidTargetValue')).toBeInTheDocument();
    });
  });

  it('should render mute period settings', async () => {
    render(<AlertConfig onAlertCreated={mockOnAlertCreated} />);

    const muteSettingsButton = screen.getByText('alerts.mute.settings');
    fireEvent.click(muteSettingsButton);

    await waitFor(() => {
      expect(screen.getByTestId('mute-period')).toBeInTheDocument();
    });
  });

  it('should render alert templates', () => {
    render(<AlertConfig onAlertCreated={mockOnAlertCreated} />);

    expect(screen.getByTestId('alert-templates')).toBeInTheDocument();
  });
});
