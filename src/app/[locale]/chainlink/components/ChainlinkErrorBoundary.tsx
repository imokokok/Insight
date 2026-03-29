'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  t?: (key: string) => string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ChainlinkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Chainlink component error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { t = (key: string) => key } = this.props;

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {t('ui.error.boundary.somethingWrong')}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {this.state.error?.message || t('ui.error.boundary.global.description')}
              </p>
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                {t('ui.error.boundary.tryAgain')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ChainlinkErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ChainlinkErrorBoundary>
    );
  };
}
