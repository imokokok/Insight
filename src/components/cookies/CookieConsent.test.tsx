import { act, fireEvent, render, screen } from '@testing-library/react';

import { CONSENT_KEY } from '@/lib/cookies/consent';

import { CookieConsent } from './CookieConsent';

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows a compact first-visit choice and reports the decision', () => {
    const onDecision = jest.fn();
    render(<CookieConsent onDecision={onDecision} />);

    act(() => {
      jest.advanceTimersByTime(600);
    });

    const dialog = screen.getByRole('dialog', { name: 'Cookie Preferences' });
    expect(dialog).toHaveClass('inset-x-3', 'sm:max-w-3xl');

    fireEvent.click(screen.getByRole('button', { name: 'Reject non-essential' }));

    expect(onDecision).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CONSENT_KEY)).toContain('"analytics":false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
