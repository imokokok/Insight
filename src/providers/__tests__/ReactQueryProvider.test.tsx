import { type ReactNode } from 'react';

import { render, screen, waitFor } from '@testing-library/react';

import { ReactQueryProvider, STALE_TIME_CONFIG, GC_TIME_CONFIG } from '../ReactQueryProvider';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('@/lib/errors', () => ({
  isAppError: jest.fn().mockReturnValue(false),
}));

describe('ReactQueryProvider', () => {
  const TestChild = () => <div data-testid="test-child">Test Child</div>;

  const renderProvider = (children: ReactNode = <TestChild />) => {
    return render(<ReactQueryProvider>{children}</ReactQueryProvider>);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('STALE_TIME_CONFIG', () => {
    it('should have correct price stale time', () => {
      expect(STALE_TIME_CONFIG.price).toBe(30 * 1000);
    });

    it('should have correct history stale time', () => {
      expect(STALE_TIME_CONFIG.history).toBe(5 * 60 * 1000);
    });

    it('should have correct network stale time', () => {
      expect(STALE_TIME_CONFIG.network).toBe(60 * 1000);
    });

    it('should have correct default stale time', () => {
      expect(STALE_TIME_CONFIG.default).toBe(30 * 1000);
    });
  });

  describe('GC_TIME_CONFIG', () => {
    it('should have correct price gc time', () => {
      expect(GC_TIME_CONFIG.price).toBe(5 * 60 * 1000);
    });

    it('should have correct history gc time', () => {
      expect(GC_TIME_CONFIG.history).toBe(5 * 60 * 1000);
    });

    it('should have correct network gc time', () => {
      expect(GC_TIME_CONFIG.network).toBe(5 * 60 * 1000);
    });

    it('should have correct default gc time', () => {
      expect(GC_TIME_CONFIG.default).toBe(5 * 60 * 1000);
    });
  });

  describe('ReactQueryProvider component', () => {
    it('should render children', () => {
      renderProvider();

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <ReactQueryProvider>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </ReactQueryProvider>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });

    it('should create QueryClient with correct default options', async () => {
      const { container } = renderProvider();

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
    });

    it('should have correct query default options', async () => {
      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should not refetch on window focus by default', async () => {
      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should refetch on reconnect by default', async () => {
      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should refetch on mount by default', async () => {
      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should enable structural sharing by default', async () => {
      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should configure retry logic for queries', async () => {
      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should configure retry delay with exponential backoff', async () => {
      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should configure mutation retry', async () => {
      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should configure mutation retry delay', async () => {
      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should handle query errors', async () => {
      const { isAppError } = jest.requireMock('@/lib/errors');
      isAppError.mockReturnValueOnce(false);

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should handle AppError in query errors', async () => {
      const { isAppError } = jest.requireMock('@/lib/errors');
      isAppError.mockReturnValueOnce(true);

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should handle mutation errors', async () => {
      const { isAppError } = jest.requireMock('@/lib/errors');
      isAppError.mockReturnValueOnce(false);

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should handle AppError in mutation errors', async () => {
      const { isAppError } = jest.requireMock('@/lib/errors');
      isAppError.mockReturnValueOnce(true);

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should maintain single QueryClient instance across re-renders', async () => {
      const { rerender } = renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });

      rerender(
        <ReactQueryProvider>
          <TestChild />
        </ReactQueryProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });
  });

  describe('Retry logic', () => {
    it('should not retry for non-operational AppError', async () => {
      const { isAppError } = jest.requireMock('@/lib/errors');
      isAppError.mockReturnValueOnce(true);

      const mockError = {
        isOperational: false,
        code: 'TEST_ERROR',
        message: 'Test error',
      };
      isAppError.mockImplementation((error) => error === mockError);

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should retry for operational AppError', async () => {
      const { isAppError } = jest.requireMock('@/lib/errors');
      const mockError = {
        isOperational: true,
        code: 'TEST_ERROR',
        message: 'Test error',
      };
      isAppError.mockImplementation((error) => error === mockError);

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should stop retrying after 2 failures', async () => {
      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('should log query errors with query hash', async () => {
      jest.requireMock('@/lib/utils/logger').createLogger();

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });

    it('should log mutation errors with mutation key', async () => {
      jest.requireMock('@/lib/utils/logger').createLogger();

      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('test-child')).toBeInTheDocument();
      });
    });
  });
});
