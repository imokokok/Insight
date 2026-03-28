'use client';

import { Component, type ReactNode } from 'react';
import { useTranslations } from '@/i18n';

interface ErrorInfo {
  componentStack: string;
}

interface OracleErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  themeColor?: string;
}

interface OracleErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class OracleErrorBoundaryClass extends Component<
  OracleErrorBoundaryProps,
  OracleErrorBoundaryState
> {
  constructor(props: OracleErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<OracleErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    if (process.env.NODE_ENV === 'development') {
      console.error('[OracleErrorBoundary] 捕获到错误:', error);
      console.error('[OracleErrorBoundary] 组件堆栈:', errorInfo.componentStack);
    }

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    const { onReset } = this.props;

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (onReset) {
      onReset();
    }
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, themeColor = 'blue' } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <DefaultErrorFallback error={error} onReset={this.handleReset} themeColor={themeColor} />
      );
    }

    return children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
  themeColor: string;
}

function DefaultErrorFallback({ error, onReset, themeColor }: DefaultErrorFallbackProps) {
  const t = useTranslations();

  const themeStyles: Record<string, { bg: string; text: string; button: string; hover: string }> = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      button: 'bg-blue-600',
      hover: 'hover:bg-blue-700',
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-600',
      button: 'bg-green-600',
      hover: 'hover:bg-green-700',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      button: 'bg-purple-600',
      hover: 'hover:bg-purple-700',
    },
    red: { bg: 'bg-red-50', text: 'text-red-600', button: 'bg-red-600', hover: 'hover:bg-red-700' },
    orange: {
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      button: 'bg-orange-600',
      hover: 'hover:bg-orange-700',
    },
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      button: 'bg-indigo-600',
      hover: 'hover:bg-indigo-700',
    },
    pink: {
      bg: 'bg-pink-50',
      text: 'text-pink-600',
      button: 'bg-pink-600',
      hover: 'hover:bg-pink-700',
    },
    cyan: {
      bg: 'bg-cyan-50',
      text: 'text-cyan-600',
      button: 'bg-cyan-600',
      hover: 'hover:bg-cyan-700',
    },
    yellow: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-600',
      button: 'bg-yellow-600',
      hover: 'hover:bg-yellow-700',
    },
  };

  const style = themeStyles[themeColor] || themeStyles.blue;

  return (
    <div className="min-h-[200px] flex items-center justify-center p-4">
      <div className={`${style.bg} rounded-lg p-6 max-w-md w-full text-center`}>
        <div className={`flex items-center justify-center w-12 h-12 ${style.bg} mx-auto mb-4`}>
          <svg
            className={`w-6 h-6 ${style.text}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('common.error.loadingFailed')}
        </h3>

        <p className="text-sm text-gray-500 mb-4">
          {error?.message || t('common.error.loadingFailed')}
        </p>

        <button
          onClick={onReset}
          className={`px-4 py-2 ${style.button} text-white text-sm rounded-md ${style.hover} transition-colors`}
        >
          {t('actions.retry')}
        </button>
      </div>
    </div>
  );
}

export function OracleErrorBoundary(props: OracleErrorBoundaryProps) {
  return <OracleErrorBoundaryClass {...props} />;
}

export type { OracleErrorBoundaryProps, ErrorInfo };
