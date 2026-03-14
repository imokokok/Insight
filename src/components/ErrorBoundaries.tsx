'use client';

import React, { Component, ReactNode } from 'react';
import { createLogger } from '@/lib/utils/logger';
import { useI18n } from '@/lib/i18n/provider';
import { isAppError, ValidationError, NotFoundError, PriceFetchError, RateLimitError } from '@/lib/errors';

const logger = createLogger('ErrorBoundaries');

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'global' | 'section' | 'component';
  resetKeys?: unknown[];
  translations?: {
    somethingWrong: string;
    tryAgain: string;
    globalTitle: string;
    globalDescription: string;
    sectionTitle: string;
    sectionDescription: string;
    refreshPage: string;
  };
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class BaseErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      this.reset();
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, level = 'component' } = this.props;

    if (isAppError(error)) {
      logger.error(`[${level.toUpperCase()}] Error caught an AppError: ${error.code} - ${error.message}`, error, {
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        details: error.details,
        componentStack: errorInfo.componentStack,
      });
    } else {
      logger.error(`[${level.toUpperCase()}] Error caught:`, error, {
        componentStack: errorInfo.componentStack,
      });
    }

    if (onError) {
      onError(error, errorInfo);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          onReset={this.reset}
          translations={this.props.translations}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  onReset: () => void;
  translations?: ErrorBoundaryProps['translations'];
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

function DefaultErrorFallback({ error, onReset, translations }: ErrorFallbackProps) {
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

export function GlobalErrorFallback({ error, onReset, translations }: ErrorFallbackProps) {
  const title = translations?.globalTitle || 'Something went wrong';
  const description = translations?.globalDescription || "We're sorry, but something unexpected happened. Please try refreshing the page.";
  const tryAgain = translations?.tryAgain || 'Try again';
  const refreshPage = translations?.refreshPage || 'Refresh page';

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="text-center max-w-md">
        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-red-600"
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">{description}</p>
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-xs text-gray-500 font-mono break-all">{error.message}</p>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onReset}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {tryAgain}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {refreshPage}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SectionErrorFallback({ error, onReset, translations }: ErrorFallbackProps) {
  const title = translations?.sectionTitle || 'Section Error';
  const description = translations?.sectionDescription || 'This section encountered an error. You can try again or continue with other parts of the page.';
  const tryAgain = translations?.tryAgain || 'Try again';

  return (
    <div className="min-h-[300px] flex items-center justify-center p-6 bg-white border border-gray-200 rounded-lg">
      <div className="text-center max-w-sm">
        <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-orange-600"
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
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-4 p-3 bg-gray-100 rounded text-left">
            <p className="text-xs text-gray-500 font-mono break-all">{error.message}</p>
          </div>
        )}
        <button
          onClick={onReset}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          {tryAgain}
        </button>
      </div>
    </div>
  );
}

function useErrorTranslations() {
  const { t } = useI18n();
  return {
    somethingWrong: t('error.boundary.somethingWrong'),
    tryAgain: t('error.boundary.tryAgain'),
    globalTitle: t('error.boundary.global.title'),
    globalDescription: t('error.boundary.global.description'),
    sectionTitle: t('error.boundary.section.title'),
    sectionDescription: t('error.boundary.section.description'),
    refreshPage: t('error.boundary.refreshPage'),
  };
}

export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  const translations = useErrorTranslations();
  return (
    <BaseErrorBoundary
      level="global"
      fallback={<GlobalErrorFallback error={undefined} onReset={() => {}} translations={translations} />}
    >
      {children}
    </BaseErrorBoundary>
  );
}

export function SectionErrorBoundary({ children }: { children: ReactNode }) {
  const translations = useErrorTranslations();
  return (
    <BaseErrorBoundary
      level="section"
      fallback={<SectionErrorFallback error={undefined} onReset={() => {}} translations={translations} />}
    >
      {children}
    </BaseErrorBoundary>
  );
}

export function ComponentErrorBoundary({ children }: { children: ReactNode }) {
  const translations = useErrorTranslations();
  return (
    <BaseErrorBoundary level="component" translations={translations}>
      {children}
    </BaseErrorBoundary>
  );
}

export { BaseErrorBoundary as ErrorBoundary };
