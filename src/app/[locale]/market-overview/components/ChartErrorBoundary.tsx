'use client';

import { Component, type ReactNode, useState } from 'react';

import { AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MarketOverviewErrorBoundary');

interface ErrorInfo {
  componentStack: string;
}

interface ChartErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
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
    const { componentName, onError } = this.props;

    this.setState({ errorInfo });

    logger.error(`[${componentName || 'Component'}] 组件渲染错误:`, error, {
      componentStack: errorInfo.componentStack,
      componentName,
    });

    if (onError) {
      onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <ChartErrorFallback
          error={error}
          errorInfo={errorInfo}
          componentName={componentName}
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
  componentName?: string;
  onReset: () => void;
}

function ChartErrorFallback({ error, errorInfo, componentName, onReset }: ChartErrorFallbackProps) {
  const t = useTranslations();
  const [showDetails, setShowDetails] = useState(false);

  const getSimpleErrorMessage = (err: Error | null): string => {
    if (!err) return t('marketOverview.error.chartRenderError') || '图表渲染失败';

    const message = err.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return t('marketOverview.error.networkError') || '网络连接失败';
    }
    if (message.includes('data') || message.includes('undefined')) {
      return t('marketOverview.error.dataError') || '数据加载失败';
    }
    if (message.includes('memory') || message.includes('heap')) {
      return t('marketOverview.error.memoryError') || '内存不足';
    }

    return t('marketOverview.error.chartRenderError') || '图表渲染失败';
  };

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('marketOverview.error.title') || '组件错误'}
            </h3>
            {componentName && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                {componentName}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-4">{getSimpleErrorMessage(error)}</p>

          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {t('actions.retry') || '重试'}
            </button>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
              />
              {t('marketOverview.error.viewDetails') || '查看详情'}
            </button>
          </div>

          {showDetails && (
            <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  {t('marketOverview.error.errorInfo') || '错误信息'}
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
                    {t('marketOverview.error.errorStack') || '错误堆栈'}
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
                    {t('marketOverview.error.componentStack') || '组件堆栈'}
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
        <p className="text-xs text-gray-500">
          {t('marketOverview.error.errorBoundaryTip') ||
            '此错误已被错误边界捕获，不会影响页面的其他部分。您可以尝试重试或刷新页面。'}
        </p>
      </div>
    </div>
  );
}

export function ChartErrorBoundary(props: ChartErrorBoundaryProps) {
  return <ChartErrorBoundaryClass {...props} />;
}

export type { ChartErrorBoundaryProps, ErrorInfo };
