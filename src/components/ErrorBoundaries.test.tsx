/**
 * @fileoverview Tests for ErrorBoundaries component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { BaseErrorBoundary, GlobalErrorFallback, SectionErrorFallback } from './ErrorBoundaries';
import { ValidationError, NotFoundError, PriceFetchError, RateLimitError } from '@/lib/errors';

// Mock the monitoring module
jest.mock('@/lib/monitoring', () => ({
  captureException: jest.fn(),
  setUser: jest.fn(),
}));

// Mock the logger
jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
  })),
}));

// Mock the auth store
jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn(() => ({
    user: null,
    profile: null,
  })),
}));

describe('BaseErrorBoundary', () => {
  const ThrowError = ({ error }: { error: Error }) => {
    throw error;
  };

  it('should render children when no error', () => {
    render(
      <BaseErrorBoundary>
        <div data-testid="child">Child content</div>
      </BaseErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should render error fallback when error occurs', () => {
    const error = new Error('Test error');

    render(
      <BaseErrorBoundary>
        <ThrowError error={error} />
      </BaseErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();
    const error = new Error('Test error');

    render(
      <BaseErrorBoundary onError={onError}>
        <ThrowError error={error} />
      </BaseErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(error, expect.any(Object));
  });

  it('should render custom fallback when provided', () => {
    const error = new Error('Test error');
    const CustomFallback = <div data-testid="custom-fallback">Custom error UI</div>;

    render(
      <BaseErrorBoundary fallback={CustomFallback}>
        <ThrowError error={error} />
      </BaseErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('should reset error state when reset is called', () => {
    const error = new Error('Test error');

    const { rerender } = render(
      <BaseErrorBoundary>
        <ThrowError error={error} />
      </BaseErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Reset by changing resetKeys
    rerender(
      <BaseErrorBoundary resetKeys={['new-key']}>
        <div data-testid="recovered">Recovered content</div>
      </BaseErrorBoundary>
    );

    expect(screen.getByTestId('recovered')).toBeInTheDocument();
  });

  it('should handle ValidationError correctly', () => {
    const error = new ValidationError('Invalid input', { field: 'name' });

    render(
      <BaseErrorBoundary>
        <ThrowError error={error} />
      </BaseErrorBoundary>
    );

    expect(screen.getByText(/validation error/i)).toBeInTheDocument();
  });

  it('should handle NotFoundError correctly', () => {
    const error = new NotFoundError('User', '123');

    render(
      <BaseErrorBoundary>
        <ThrowError error={error} />
      </BaseErrorBoundary>
    );

    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });

  it('should handle PriceFetchError correctly', () => {
    const error = new PriceFetchError('Failed to fetch price', { retryable: true });

    render(
      <BaseErrorBoundary>
        <ThrowError error={error} />
      </BaseErrorBoundary>
    );

    expect(screen.getByText(/price fetch error/i)).toBeInTheDocument();
  });

  it('should handle RateLimitError correctly', () => {
    const error = new RateLimitError('Too many requests');

    render(
      <BaseErrorBoundary>
        <ThrowError error={error} />
      </BaseErrorBoundary>
    );

    expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
  });
});

describe('GlobalErrorFallback', () => {
  it('should render global error fallback', () => {
    const onReset = jest.fn();

    render(<GlobalErrorFallback onReset={onReset} />);

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
  });

  it('should call onReset when try again button is clicked', () => {
    const onReset = jest.fn();

    render(<GlobalErrorFallback onReset={onReset} />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('should display error message in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Detailed error message');
    const onReset = jest.fn();

    render(<GlobalErrorFallback error={error} onReset={onReset} />);

    expect(screen.getByText('Detailed error message')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('SectionErrorFallback', () => {
  it('should render section error fallback', () => {
    const onReset = jest.fn();

    render(<SectionErrorFallback onReset={onReset} />);

    expect(screen.getByText(/section error/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should call onReset when try again button is clicked', () => {
    const onReset = jest.fn();

    render(<SectionErrorFallback onReset={onReset} />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('should display error message in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Section error details');
    const onReset = jest.fn();

    render(<SectionErrorFallback error={error} onReset={onReset} />);

    expect(screen.getByText('Section error details')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});
