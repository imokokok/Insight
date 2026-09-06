import { render, screen } from '@testing-library/react';

import { useSession } from '@/stores/authStore';

import { useMcpClient } from '../hooks/useMcpClient';

import { McpPlayground } from './McpPlayground';

jest.mock('@/stores/authStore', () => ({
  useSession: jest.fn(),
}));

jest.mock('../hooks/useMcpClient', () => ({
  useMcpClient: jest.fn(),
}));

describe('McpPlayground', () => {
  it('does not request tools before the visitor authenticates', () => {
    const call = jest.fn();
    (useSession as jest.Mock).mockReturnValue(null);
    (useMcpClient as jest.Mock).mockReturnValue({
      call,
      loading: false,
      error: null,
      rateLimit: null,
      quota: null,
      clearError: jest.fn(),
    });

    render(<McpPlayground />);

    expect(call).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: 'Select a tool' })).toBeDisabled();
    expect(screen.getByText(/sign in or add an API key/i)).toBeInTheDocument();
  });
});
