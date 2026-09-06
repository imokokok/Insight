import { render, screen } from '@testing-library/react';
import { Menu } from 'lucide-react';

import { Button } from './Button';

describe('Button', () => {
  it('renders children for icon-sized buttons', () => {
    render(
      <Button size="icon" aria-label="Open menu">
        <Menu data-testid="menu-icon" />
      </Button>
    );

    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
    expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
  });
});
