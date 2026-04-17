import { render, screen, fireEvent } from '@testing-library/react';

import { MobileDrawer } from '../MobileDrawer';
import { type NavStructure, type NavGroup } from '../types';

jest.mock('../config', () => ({
  oracleColors: {
    chainlink: '#375BD2',
    pyth: '#EC1C79',
  },
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const mockNavStructure: NavStructure = [
  {
    id: 'oracles',
    label: 'nav.oracles',
    icon: () => <svg data-testid="oracles-icon" />,
    items: [
      {
        label: 'nav.chainlink',
        href: '/chainlink',
        icon: () => <svg data-testid="chainlink-icon" />,
      },
      {
        label: 'nav.pyth',
        href: '/pyth',
        icon: () => <svg data-testid="pyth-icon" />,
      },
    ],
  } as NavGroup,
  {
    label: 'nav.home',
    href: '/',
    icon: () => <svg data-testid="home-icon" />,
  },
];

describe('MobileDrawer', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(
      <MobileDrawer
        isOpen={false}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/"
      />
    );

    expect(screen.queryByText('Text')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/"
      />
    );

    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('should render close button', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/"
      />
    );

    const closeButton = screen.getByRole('button', { name: /actions.close/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/"
      />
    );

    const closeButton = screen.getByRole('button', { name: /actions.close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/"
      />
    );

    const backdrop = document.querySelector('.bg-black\\/30');
    fireEvent.click(backdrop!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should render navigation groups', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/"
      />
    );

    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('should expand group when clicked', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/"
      />
    );

    const groupButton = screen.getByRole('button', { name: /nav.oracles/i });
    fireEvent.click(groupButton);

    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('should collapse group when clicked again', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/"
      />
    );

    const groupButton = screen.getByRole('button', { name: /nav.oracles/i });
    fireEvent.click(groupButton);
    expect(screen.getByText('Text')).toBeInTheDocument();

    fireEvent.click(groupButton);
    expect(screen.queryByText('Text')).not.toBeInTheDocument();
  });

  it('should highlight active item', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/chainlink"
      />
    );

    const groupButton = screen.getByRole('button', { name: /nav.oracles/i });
    fireEvent.click(groupButton);

    const chainlinkItem = screen.getByRole('link', { name: /nav.chainlink/i });
    expect(chainlinkItem).toHaveClass('bg-primary-50');
  });

  it('should highlight active group', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/chainlink"
      />
    );

    const groupButton = screen.getByRole('button', { name: /nav.oracles/i });
    expect(groupButton).toHaveClass('bg-primary-50');
  });

  it('should render single navigation items', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/"
      />
    );

    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('should call onClose when navigation item is clicked', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/"
      />
    );

    const homeLink = screen.getByRole('link', { name: /nav.home/i });
    fireEvent.click(homeLink);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should render logo', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/"
      />
    );

    const logo = screen.getByAltText('Insight Logo');
    expect(logo).toBeInTheDocument();
  });
});
