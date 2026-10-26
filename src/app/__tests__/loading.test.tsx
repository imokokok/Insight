import { render, screen } from '@testing-library/react';

import RootLoading from '../loading';

describe('RootLoading', () => {
  it('renders a neutral loading state instead of the homepage hero', () => {
    render(<RootLoading />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading page');
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});
