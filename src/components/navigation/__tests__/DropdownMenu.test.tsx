import { render, screen, fireEvent, act } from '@testing-library/react';

import { DropdownMenu } from '../DropdownMenu';
import { type NavGroup } from '../types';

jest.mock('../config', () => ({
  oracleColors: {
    chainlink: '#375BD2',
    pyth: '#EC1C79',
  },
}));

const mockGroup: NavGroup = {
  label: 'nav.oracles',
  icon: () => <svg data-testid="group-icon" />,
  items: [
    {
      label: 'nav.chainlink',
      href: '/chainlink',
      icon: () => <svg data-testid="chainlink-icon" />,
      description: 'nav.chainlinkDesc',
    },
    {
      label: 'nav.pyth',
      href: '/pyth',
      icon: () => <svg data-testid="pyth-icon" />,
    },
  ],
};

describe('DropdownMenu', () => {
  const mockOnItemClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render dropdown button with label', () => {
    render(
      <DropdownMenu
        group={mockGroup}
        isActive={false}
        currentPath="/"
        onItemClick={mockOnItemClick}
      />
    );

    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('should show dropdown menu on click', () => {
    render(
      <DropdownMenu
        group={mockGroup}
        isActive={false}
        currentPath="/"
        onItemClick={mockOnItemClick}
      />
    );

    const button = screen.getByRole('button', { name: /nav.oracles/i });
    fireEvent.click(button);

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('should render dropdown items', () => {
    render(
      <DropdownMenu
        group={mockGroup}
        isActive={false}
        currentPath="/"
        onItemClick={mockOnItemClick}
      />
    );

    const button = screen.getByRole('button', { name: /nav.oracles/i });
    fireEvent.click(button);

    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('should close dropdown when item is clicked', () => {
    render(
      <DropdownMenu
        group={mockGroup}
        isActive={false}
        currentPath="/"
        onItemClick={mockOnItemClick}
      />
    );

    const button = screen.getByRole('button', { name: /nav.oracles/i });
    fireEvent.click(button);

    const chainlinkLink = screen.getByRole('menuitem', { name: /nav.chainlink/i });
    fireEvent.click(chainlinkLink);

    expect(mockOnItemClick).toHaveBeenCalled();
  });

  it('should highlight active group', () => {
    render(
      <DropdownMenu
        group={mockGroup}
        isActive={true}
        currentPath="/"
        onItemClick={mockOnItemClick}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-primary-600');
  });

  it('should highlight active item in dropdown', () => {
    render(
      <DropdownMenu
        group={mockGroup}
        isActive={false}
        currentPath="/chainlink"
        onItemClick={mockOnItemClick}
      />
    );

    const button = screen.getByRole('button', { name: /nav.oracles/i });
    fireEvent.click(button);

    const chainlinkItem = screen.getByRole('menuitem', { name: /nav.chainlink/i });
    expect(chainlinkItem).toHaveClass('bg-primary-50');
  });

  it('should toggle dropdown on Enter key', () => {
    render(
      <DropdownMenu
        group={mockGroup}
        isActive={false}
        currentPath="/"
        onItemClick={mockOnItemClick}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('should close dropdown on Escape key', () => {
    render(
      <DropdownMenu
        group={mockGroup}
        isActive={false}
        currentPath="/"
        onItemClick={mockOnItemClick}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('should show dropdown on hover after delay', () => {
    render(
      <DropdownMenu
        group={mockGroup}
        isActive={false}
        currentPath="/"
        onItemClick={mockOnItemClick}
      />
    );

    const container = screen.getByRole('button').parentElement!;
    fireEvent.mouseEnter(container);

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('should hide dropdown on mouse leave after delay', () => {
    render(
      <DropdownMenu
        group={mockGroup}
        isActive={false}
        currentPath="/"
        onItemClick={mockOnItemClick}
      />
    );

    const container = screen.getByRole('button').parentElement!;
    fireEvent.mouseEnter(container);

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseLeave(container);

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('should have aria-expanded attribute', () => {
    render(
      <DropdownMenu
        group={mockGroup}
        isActive={false}
        currentPath="/"
        onItemClick={mockOnItemClick}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('should render item descriptions', () => {
    render(
      <DropdownMenu
        group={mockGroup}
        isActive={false}
        currentPath="/"
        onItemClick={mockOnItemClick}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('Text')).toBeInTheDocument();
  });
});
