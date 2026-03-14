'use client';

import React, { Component, ReactNode } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { createLogger } from '@/lib/utils/logger';
import { isAppError, AppError, ValidationError, NotFoundError, PriceFetchError, RateLimitError } from '@/lib/errors';

const logger = createLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function getErrorConfig(error?: Error): {
  icon: string;
  title: string;
  message: string;
  color: string;
} {
  if (!error) {
    return {
      icon: '⚠️',
      title: 'error.somethingWrong',
      message: 'error.description',
      color: 'red',
    };
  }

  if (error instanceof ValidationError) {
    return {
      icon: '📝',
      title: 'error.validation.title',
      message: error.message,
      color: 'yellow',
    };
  }

  if (error instanceof NotFoundError) {
    return {
      icon: '🔍',
      title: 'error.notFound.title',
      message: 'error.notFound.description',
      color: 'blue',
    };
  }

  if (error instanceof PriceFetchError) {
    return {
      icon: '💹',
      title: 'error.priceFetch.title',
      message: error.retryable ? 'error.priceFetch.retryable' : 'error.priceFetch.description',
      color: 'orange',
    };
  }

  if (error instanceof RateLimitError) {
    return {
      icon: '⏱️',
      title: 'error.rateLimit.title',
      message: 'error.rateLimit.description',
      color: 'purple',
    };
  }

  if (isAppError(error)) {
    return {
      icon: '⚠️',
      title: 'error.somethingWrong',
      message: error.message,
      color: 'red',
    };
  }

  return {
    icon: '⚠️',
    title: 'error.somethingWrong',
    message: 'error.description',
    color: 'red',
  };
}

function ErrorFallback({ error, onReset }: { error?: Error; onReset: () => void }) {
  const { t } = useI18n();
  const config = getErrorConfig(error);

  const colorMap: Record<string, { bg: string; text: string; button: string }> = {
    red: { bg: 'bg-red-100', text: 'text-red-600', button: 'bg-blue-600 hover:bg-blue-700' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', button: 'bg-blue-600 hover:bg-blue-700' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', button: 'bg-blue-600 hover:bg-blue-700' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', button: 'bg-blue-600 hover:bg-blue-700' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', button: 'bg-blue-600 hover:bg-blue-700' },
  };

  const colors = colorMap[config.color] || colorMap.red;

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className={`mx-auto w-16 h-16 ${colors.bg} rounded-full flex items-center justify-center mb-4`}>
          <span className="text-3xl">{config.icon}</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t(config.title)}</h2>
        <p className="text-gray-600 mb-6">{t(config.message)}</p>
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-4 p-3 bg-gray-100 rounded-lg text-left">
            <p className="text-xs text-gray-500 font-mono break-all">{error.message}</p>
            {isAppError(error) && (
              <p className="text-xs text-gray-400 mt-1">Code: {error.code}</p>
            )}
          </div>
        )}
        <button
          onClick={onReset}
          className={`inline-flex items-center px-4 py-2 text-white rounded-lg transition-colors ${colors.button}`}
        >
          {t('error.tryAgain')}
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (isAppError(error)) {
      logger.error(`ErrorBoundary caught an AppError: ${error.code} - ${error.message}`, error, {
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        details: error.details,
        componentStack: errorInfo.componentStack,
      });
    } else {
      logger.error('ErrorBoundary caught an error', error, {
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
