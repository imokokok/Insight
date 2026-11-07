import React from 'react';

import { renderToStaticMarkup } from 'react-dom/server';

import PricingPage from '../page';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/stores/authStore', () => ({ useSession: () => null }));
jest.mock('@/components/editorial', () => ({
  EditorialWorkspaceHeader: ({
    action,
    description,
    title,
  }: {
    action?: React.ReactNode;
    description?: React.ReactNode;
    title?: React.ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      {action}
    </header>
  ),
  EvidenceProcessRail: () => null,
}));

it('renders the one-time 400-credit trial copy', () => {
  const html = renderToStaticMarkup(<PricingPage />);
  expect(html).toContain('Start with 400 credits');
  expect(html).toContain('One-time grant after email verification, never resets');
  expect(html).not.toMatch(/Start with 100\b/);
  expect(html).not.toMatch(/100 (free )?(trial )?credits/i);
});
