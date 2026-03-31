'use client';

import { Component, type ReactNode, useState } from 'react';

import { useTranslations } from '@/i18n';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ChartErrorBoundary');

interface ErrorInfo {
  componentStack: string;
}

interface ChartErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  chartName?: string;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ChartErrorBoundaryClass extends Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ChartErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { chartName, onError } = this.props;

    this.setState({ errorInfo });

    logger.error(`[${chartName || 'Chart'}] 图表渲染错误:`, error, {
      componentStack: errorInfo.componentStack,
      chartName,
    });

    if (onError) {
      onError(error, errorInfo);
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
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, chartName } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <ChartErrorFallback
          error={error}
          errorInfo={errorInfo}
          chartName={chartName}
          onReset={this.handleReset}
        />
      );
    }

    return children;
  }
}

interface ChartErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  chartName?: string;
  onReset: () => void;
}

function ChartErrorFallback({ error, errorInfo, chartName, onReset }: ChartErrorFallbackProps) {
  const t = useTranslations();
  const [showDetails, setShowDetails] = useState(false);

  const getSimpleErrorMessage = (err: Error | null): string => {
    if (!err) return t('crossChain.chartRenderError');

    const message = err.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return t('crossChain.networkError');
    }
    if (message.includes('data') || message.includes('undefined')) {
      return t('crossChain.dataError');
    }
    if (message.includes('memory') || message.includes('heap')) {
      return t('crossChain.memoryError');
    }

    return t('crossChain.chartRenderError');
  };

  return (
    <div className="mb-6 pb-6 border-b border-gray-200">
      <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{t('crossChain.chartError')}</h3>
              {chartName && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                  {chartName}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-4">{getSimpleErrorMessage(error)}</p>

            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={onReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {t('actions.retry')}
              </button>

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                {t('crossChain.viewDetails')}
              </button>
            </div>

            {showDetails && (
              <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    {t('crossChain.errorInfo')}
                  </h4>
                  <div className="bg-red-50 border border-red-100 rounded p-3">
                    <p className="text-sm text-red-800 font-mono break-all">
                      {error?.message || 'Unknown error'}
                    </p>
                  </div>
                </div>

                {error?.stack && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      {t('crossChain.errorStack')}
                    </h4>
                    <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-40 overflow-y-auto">
                      <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap break-all">
                        {error.stack}
                      </pre>
                    </div>
                  </div>
                )}

                {errorInfo?.componentStack && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      {t('crossChain.componentStack')}
                    </h4>
                    <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-40 overflow-y-auto">
                      <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap break-all">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-red-200">
          <p className="text-xs text-gray-500">{t('crossChain.errorBoundaryTip')}</p>
        </div>
      </div>
    </div>
  );
}

export function ChartErrorBoundary(props: ChartErrorBoundaryProps) {
  return <ChartErrorBoundaryClass {...props} />;
}

export type { ChartErrorBoundaryProps, ErrorInfo };
