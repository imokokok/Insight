import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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
      error: 'Previous session failure',
      rateLimit: null,
      quota: null,
      clearError: jest.fn(),
    });

    render(<McpPlayground />);

    expect(call).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: 'Select a tool' })).toBeDisabled();
    expect(screen.getByText(/sign in or add an API key/i)).toBeInTheDocument();
    expect(screen.queryByText('Previous session failure')).not.toBeInTheDocument();
  });

  it.each([
    { tools: {} },
    { tools: [{ name: 'bad', inputSchema: { properties: { amount: null } } }] },
  ])('rejects a malformed tools/list response', async (response) => {
    const call = jest.fn(async () => response);
    (useSession as jest.Mock).mockReturnValue({ access_token: 'session-token' });
    (useMcpClient as jest.Mock).mockReturnValue({
      call,
      loading: false,
      error: null,
      rateLimit: null,
      quota: null,
      clearError: jest.fn(),
    });

    render(<McpPlayground />);

    expect(await screen.findByText('Invalid MCP tool list response')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Select a tool' })).toBeEmptyDOMElement();
    expect(screen.getByRole('button', { name: 'Call Tool' })).toBeDisabled();
  });

  it('keeps edited parameters when switching between JSON and form mode', async () => {
    const call = jest.fn(async (method: string) =>
      method === 'tools/list'
        ? {
            tools: [
              {
                name: 'get_price',
                inputSchema: {
                  properties: { symbol: { type: 'string', default: 'BTC' } },
                },
              },
            ],
          }
        : { content: [] }
    );
    (useSession as jest.Mock).mockReturnValue({ access_token: 'session-token' });
    (useMcpClient as jest.Mock).mockReturnValue({
      call,
      loading: false,
      error: null,
      rateLimit: null,
      quota: null,
      clearError: jest.fn(),
    });

    render(<McpPlayground />);
    await waitFor(() => expect(screen.getByText('get_price')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Switch to JSON mode' }));
    const editor = screen.getByRole('textbox', { name: 'Tool parameters as JSON' });
    expect(editor).toHaveValue('{\n  "symbol": "BTC"\n}');
    fireEvent.change(editor, { target: { value: '{"symbol":"ETH"}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Switch to form mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Call Tool' }));

    await waitFor(() =>
      expect(call).toHaveBeenCalledWith('tools/call', {
        name: 'get_price',
        arguments: { symbol: 'ETH' },
      })
    );
  });

  it('rejects non-object JSON without calling a tool', async () => {
    const call = jest.fn(async () => ({ tools: [{ name: 'get_price' }] }));
    (useSession as jest.Mock).mockReturnValue({ access_token: 'session-token' });
    (useMcpClient as jest.Mock).mockReturnValue({
      call,
      loading: false,
      error: null,
      rateLimit: null,
      quota: null,
      clearError: jest.fn(),
    });

    render(<McpPlayground />);
    await waitFor(() => expect(screen.getByText('get_price')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Switch to JSON mode' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Tool parameters as JSON' }), {
      target: { value: '[]' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Call Tool' }));

    expect(screen.getByText('Parameters must be a JSON object.')).toBeInTheDocument();
    expect(call).toHaveBeenCalledTimes(1);
  });
});
