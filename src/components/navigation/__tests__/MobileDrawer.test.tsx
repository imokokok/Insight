import { render, screen, fireEvent } from '@testing-library/react';

import { MobileDrawer } from '../MobileDrawer';
import { type NavStructure, type NavGroup } from '../types';

jest.mock('../config', () => ({
  oracleColors: {
    chainlink: '#375BD2',
    redstone: '#FB5607',
  },
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const mockNavStructure: NavStructure = [
  {
    id: 'oracles',
    label: 'Oracles',
    icon: () => <svg data-testid="oracles-icon" />,
    items: [
      {
        label: 'Chainlink',
        href: '/chainlink',
        icon: () => <svg data-testid="chainlink-icon" />,
      },
      {
        label: 'RedStone',
        href: '/redstone',
        icon: () => <svg data-testid="redstone-icon" />,
      },
    ],
  } as NavGroup,
  {
    label: 'Home',
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

    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
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

    expect(screen.getByText('Menu')).toBeInTheDocument();
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

    const closeButton = screen.getByRole('button', { name: /close/i });
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

    const closeButton = screen.getByRole('button', { name: /close/i });
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

    expect(screen.getByText('Oracles')).toBeInTheDocument();
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

    const groupButton = screen.getByRole('button', { name: /oracles/i });
    fireEvent.click(groupButton);

    expect(screen.getByText('Chainlink')).toBeInTheDocument();
    expect(screen.getByText('RedStone')).toBeInTheDocument();
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

    const groupButton = screen.getByRole('button', { name: /oracles/i });
    fireEvent.click(groupButton);
    expect(screen.getByText('Chainlink')).toBeInTheDocument();

    fireEvent.click(groupButton);
    expect(screen.queryByText('Chainlink')).not.toBeInTheDocument();
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

    const groupButton = screen.getByRole('button', { name: /oracles/i });
    fireEvent.click(groupButton);

    const chainlinkItem = screen.getByRole('link', { name: /chainlink/i });
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

    const groupButton = screen.getByRole('button', { name: /oracles/i });
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

    expect(screen.getByText('Home')).toBeInTheDocument();
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

    const homeLink = screen.getByRole('link', { name: /home/i });
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

  it('should not render Console when not an ops owner', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/"
        isOpsOwner={false}
      />
    );

    expect(screen.queryByText('Console')).not.toBeInTheDocument();
  });

  it('should render Console when an ops owner', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/"
        isOpsOwner={true}
      />
    );

    const consoleLink = screen.getByRole('link', { name: /console/i });
    expect(consoleLink).toBeInTheDocument();
    expect(consoleLink).toHaveAttribute('href', '/ops');
  });

  it('should call onClose when Console is clicked', () => {
    render(
      <MobileDrawer
        isOpen={true}
        onClose={mockOnClose}
        navStructure={mockNavStructure}
        currentPath="/"
        isOpsOwner={true}
      />
    );

    fireEvent.click(screen.getByRole('link', { name: /console/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
