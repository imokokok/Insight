import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FavoriteButton } from '../FavoriteButton';

jest.mock('@/hooks', () => ({
  useToggleFavorite: () => ({
    toggleFavorite: jest.fn().mockResolvedValue({ action: 'added' }),
    isToggling: false,
  }),
  useIsFavorited: () => ({
    isFavorited: false,
    favorite: null,
  }),
}));

jest.mock('@/stores/authStore', () => ({
  useUser: () => ({
    id: 'test-user-id',
    email: 'test@example.com',
  }),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  }),
}));

describe('FavoriteButton', () => {
  const defaultProps = {
    configType: 'price_query' as const,
    configData: { symbol: 'BTC', provider: 'chainlink' },
    name: 'BTC/USD',
  };

  it('should render favorite button', () => {
    render(<FavoriteButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should render heart icon', () => {
    render(<FavoriteButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should have correct title attribute', () => {
    render(<FavoriteButton {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', '添加收藏');
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<FavoriteButton {...defaultProps} size="sm" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    
    rerender(<FavoriteButton {...defaultProps} size="md" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    
    rerender(<FavoriteButton {...defaultProps} size="lg" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render text variant with label', () => {
    render(<FavoriteButton {...defaultProps} variant="text" showLabel />);
    
    expect(screen.getByText('收藏')).toBeInTheDocument();
  });

  it('should render button variant', () => {
    render(<FavoriteButton {...defaultProps} variant="button" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border');
  });

  it('should apply custom className', () => {
    render(<FavoriteButton {...defaultProps} className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('should handle click event', async () => {
    const mockOnFavoriteChange = jest.fn();
    render(<FavoriteButton {...defaultProps} onFavoriteChange={mockOnFavoriteChange} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockOnFavoriteChange).toHaveBeenCalled();
    });
  });

  it('should prevent event propagation on click', () => {
    const parentClickHandler = jest.fn();
    render(
      <div onClick={parentClickHandler}>
        <FavoriteButton {...defaultProps} />
      </div>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(parentClickHandler).not.toHaveBeenCalled();
  });
});

describe('FavoriteButton - Unauthenticated', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('@/stores/authStore', () => ({
      useUser: () => null,
    }));
  });

  it('should not render when user is not authenticated', () => {
    jest.resetModules();
    jest.doMock('@/stores/authStore', () => ({
      useUser: () => null,
    }));
    
    const { FavoriteButton: FavoriteButtonUnauth } = require('../FavoriteButton');
    const { container } = render(<FavoriteButtonUnauth configType="price_query" configData={{}} name="Test" />);
    
    expect(container.firstChild).toBeNull();
  });
});
