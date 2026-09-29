import { act, render, screen, waitFor } from '@testing-library/react';

import { ApiKeyManager } from './ApiKeyManager';

const key = (id: string, name: string) => ({
  id,
  name,
  prefix: 'insight_',
  plan: 'developer',
  rateLimit: 60,
  lastUsedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const listResponse = (keys: ReturnType<typeof key>[]) => ({
  ok: true,
  json: async () => ({ success: true, data: { keys } }),
});

describe('ApiKeyManager', () => {
  const originalFetch = global.fetch;

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('does not show a late response from the previous credential', async () => {
    let resolvePrevious!: (value: ReturnType<typeof listResponse>) => void;
    const previousResponse = new Promise<ReturnType<typeof listResponse>>((resolve) => {
      resolvePrevious = resolve;
    });
    global.fetch = jest
      .fn()
      .mockReturnValueOnce(previousResponse)
      .mockResolvedValueOnce(listResponse([key('new', 'Current account key')]));

    const { rerender } = render(<ApiKeyManager accessToken="old-token" />);
    rerender(<ApiKeyManager accessToken="new-token" />);

    await waitFor(() => expect(screen.getByText('Current account key')).toBeInTheDocument());
    await act(async () => {
      resolvePrevious(listResponse([key('old', 'Previous account key')]));
    });

    expect(screen.queryByText('Previous account key')).not.toBeInTheDocument();
    expect(screen.getByText('Current account key')).toBeInTheDocument();
  });
});
