'use client';

import React, { Component, type ReactNode, type ErrorInfo } from 'react';

import {
  isAppError,
  ValidationError,
  NotFoundError,
  PriceFetchError,
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  classifyError,
} from '@/lib/errors';
import { captureException, addBreadcrumb, setUser } from '@/lib/monitoring';
import { createLogger } from '@/lib/utils/logger';
import { useAuthStore } from '@/stores/authStore';

const logger = createLogger('ErrorBoundary');

/**
 * 错误边界级别
 */
export type ErrorBoundaryLevel = 'global' | 'page' | 'section' | 'component';

/**
 * 错误边界属性
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackRender?: (props: ErrorFallbackRenderProps) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  level?: ErrorBoundaryLevel;
  resetKeys?: unknown[];
  componentName?: string;
  captureInSentry?: boolean;
  showDetails?: boolean;
}

/**
 * 错误回退渲染属性
 */
export interface ErrorFallbackRenderProps {
  error: Error;
  reset: () => void;
  level: ErrorBoundaryLevel;
  componentName?: string;
  errorInfo?: ErrorInfo;
}

/**
 * 错误边界状态
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * 增强的错误边界组件
 *
 * 功能特性：
 * 1. 多级错误边界支持（global/page/section/component）
 * 2. 自动错误分类和严重级别判断
 * 3. 集成 Sentry 错误追踪
 * 4. 支持重置和恢复
 * 5. 详细的错误日志记录
 * 6. 用户友好的错误界面
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
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

    // 当 resetKeys 变化时自动重置
    if (
      hasError &&
      resetKeys &&
      prevProps.resetKeys !== resetKeys &&
      this.hasResetKeysChanged(prevProps.resetKeys, resetKeys)
    ) {
      this.reset();
    }
  }

  private hasResetKeysChanged(prevKeys: unknown[] | undefined, nextKeys: unknown[]): boolean {
    if (!prevKeys || prevKeys.length !== nextKeys.length) {
      return true;
    }
    return prevKeys.some((key, index) => key !== nextKeys[index]);
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component', componentName, captureInSentry = true } = this.props;

    this.setState({ errorInfo });

    // 构建错误上下文
    const errorContext = this.buildErrorContext(error, level, componentName, errorInfo);

    // 记录错误日志
    this.logError(error, errorContext);

    // 发送到 Sentry
    if (captureInSentry) {
      this.captureInSentry(error, errorContext);
    }

    // 调用自定义错误处理器
    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (callbackError) {
        logger.error('Error in onError callback', callbackError as Error);
      }
    }
  }

  /**
   * 构建错误上下文
   */
  private buildErrorContext(
    error: Error,
    level: ErrorBoundaryLevel,
    componentName?: string,
    errorInfo?: ErrorInfo
  ): Record<string, unknown> {
    const classification = classifyError(error);

    const context: Record<string, unknown> = {
      level,
      componentName,
      classification,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };

    if (isAppError(error)) {
      context.errorCode = error.code;
      context.statusCode = error.statusCode;
      context.isOperational = error.isOperational;
      context.severity = error.severity;
      context.category = error.category;
      context.retryable = error.retryable;
      context.requestId = error.requestId;
    }

    if (errorInfo?.componentStack) {
      context.componentStack = errorInfo.componentStack;
    }

    return context;
  }

  /**
   * 记录错误日志
   */
  private logError(error: Error, context: Record<string, unknown>): void {
    const { level = 'component', componentName } = this.props;

    const logMessage = componentName
      ? `[${level.toUpperCase()}] Error in ${componentName}: ${error.message}`
      : `[${level.toUpperCase()}] Error caught: ${error.message}`;

    if (isAppError(error)) {
      logger.error(logMessage, error, {
        ...context,
        details: error.details,
      });
    } else {
      logger.error(logMessage, error, context);
    }
  }

  /**
   * 发送到 Sentry
   */
  private captureInSentry(error: Error, context: Record<string, unknown>): void {
    // 添加面包屑
    addBreadcrumb({
      category: 'error-boundary',
      message: `Error caught at ${context.level} level`,
      level: 'error',
      data: {
        componentName: context.componentName,
        errorCode: context.errorCode,
        category: context.category,
      },
    });

    // 捕获异常
    captureException(error, context);
  }

  /**
   * 重置错误状态
   */
  reset = () => {
    const { onReset } = this.props;

    this.setState({ hasError: false, error: undefined, errorInfo: undefined });

    if (onReset) {
      try {
        onReset();
      } catch (error) {
        logger.error('Error in onReset callback', error as Error);
      }
    }

    logger.info('Error boundary reset', {
      level: this.props.level,
      componentName: this.props.componentName,
    });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const {
      children,
      fallback,
      fallbackRender,
      level = 'component',
      componentName,
      showDetails,
    } = this.props;

    if (!hasError || !error) {
      return children;
    }

    // 使用自定义 fallbackRender
    if (fallbackRender) {
      return (
        <>
          {fallbackRender({
            error,
            reset: this.reset,
            level,
            componentName,
            errorInfo,
          })}
        </>
      );
    }

    // 使用自定义 fallback
    if (fallback) {
      return <>{fallback}</>;
    }

    // 使用默认错误回退UI
    return (
      <DefaultErrorFallback
        error={error}
        reset={this.reset}
        level={level}
        componentName={componentName}
        showDetails={showDetails}
      />
    );
  }
}

/**
 * 默认错误回退UI
 */
interface DefaultErrorFallbackProps {
  error: Error;
  reset: () => void;
  level: ErrorBoundaryLevel;
  componentName?: string;
  showDetails?: boolean;
}

function DefaultErrorFallback({
  error,
  reset,
  level,
  componentName,
  showDetails = process.env.NODE_ENV === 'development',
}: DefaultErrorFallbackProps) {
  const config = getErrorConfig(error, level);
  const isDev = showDetails;

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        ${level === 'global' ? 'min-h-screen p-8' : ''}
        ${level === 'page' ? 'min-h-[60vh] p-8' : ''}
        ${level === 'section' ? 'min-h-[300px] p-6' : ''}
        ${level === 'component' ? 'min-h-[200px] p-4' : ''}
      `}
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`
          flex items-center justify-center rounded-full mb-4
          ${config.bgColor}
          ${level === 'global' || level === 'page' ? 'w-20 h-20' : ''}
          ${level === 'section' ? 'w-16 h-16' : ''}
          ${level === 'component' ? 'w-12 h-12' : ''}
        `}
      >
        <span
          className={`
            ${level === 'global' || level === 'page' ? 'text-4xl' : ''}
            ${level === 'section' ? 'text-3xl' : ''}
            ${level === 'component' ? 'text-2xl' : ''}
          `}
        >
          {config.icon}
        </span>
      </div>

      <h2
        className={`
          font-semibold text-gray-900 mb-2
          ${level === 'global' ? 'text-2xl' : ''}
          ${level === 'page' ? 'text-xl' : ''}
          ${level === 'section' ? 'text-lg' : ''}
          ${level === 'component' ? 'text-base' : ''}
        `}
      >
        {config.title}
      </h2>

      <p
        className={`
          text-gray-600 max-w-md mb-4
          ${level === 'global' || level === 'page' ? 'text-base' : 'text-sm'}
        `}
      >
        {config.message}
      </p>

      {componentName && isDev && (
        <p className="text-xs text-gray-400 mb-2">Component: {componentName}</p>
      )}

      {isDev && error.message && (
        <div className="mb-4 p-3 bg-gray-100 rounded text-left max-w-md overflow-auto">
          <p className="text-xs text-gray-500 font-mono break-all">{error.message}</p>
          {isAppError(error) && (
            <div className="mt-2 text-xs text-gray-400 space-y-1">
              <p>Code: {error.code}</p>
              <p>Category: {error.category}</p>
              <p>Severity: {error.severity}</p>
              <p>Request ID: {error.requestId}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={reset}
          className={`
            inline-flex items-center gap-2 font-medium transition-colors
            ${config.buttonClass}
            ${level === 'global' || level === 'page' ? 'px-6 py-3 rounded-md' : ''}
            ${level === 'section' ? 'px-4 py-2 rounded-md text-sm' : ''}
            ${level === 'component' ? 'px-3 py-1.5 rounded text-sm' : ''}
          `}
        >
          <span>🔄</span>
          {level === 'global' || level === 'page' ? 'Try Again' : 'Retry'}
        </button>

        {level === 'global' && (
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors rounded-md"
          >
            <span>🏠</span>
            Back to Home
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * 获取错误配置
 */
function getErrorConfig(
  error: Error,
  level: ErrorBoundaryLevel
): {
  icon: string;
  title: string;
  message: string;
  bgColor: string;
  buttonClass: string;
} {
  // 根据错误类型返回不同配置
  if (error instanceof ValidationError) {
    return {
      icon: '📝',
      title: 'Validation Error',
      message: error.message,
      bgColor: 'bg-yellow-100',
      buttonClass: 'bg-yellow-600 text-white hover:bg-yellow-700',
    };
  }

  if (error instanceof NotFoundError) {
    return {
      icon: '🔍',
      title: 'Not Found',
      message: 'The requested resource was not found.',
      bgColor: 'bg-blue-100',
      buttonClass: 'bg-blue-600 text-white hover:bg-blue-700',
    };
  }

  if (error instanceof AuthenticationError) {
    return {
      icon: '🔐',
      title: 'Authentication Required',
      message: 'Please sign in to access this feature.',
      bgColor: 'bg-orange-100',
      buttonClass: 'bg-orange-600 text-white hover:bg-orange-700',
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      icon: '🚫',
      title: 'Access Denied',
      message: "You don't have permission to access this resource.",
      bgColor: 'bg-red-100',
      buttonClass: 'bg-red-600 text-white hover:bg-red-700',
    };
  }

  if (error instanceof PriceFetchError) {
    return {
      icon: '📈',
      title: 'Price Data Unavailable',
      message: error.retryable
        ? 'Failed to fetch price data. Please try again.'
        : 'Unable to retrieve price data at this time.',
      bgColor: 'bg-purple-100',
      buttonClass: 'bg-purple-600 text-white hover:bg-purple-700',
    };
  }

  if (error instanceof RateLimitError) {
    return {
      icon: '⏱️',
      title: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.',
      bgColor: 'bg-indigo-100',
      buttonClass: 'bg-indigo-600 text-white hover:bg-indigo-700',
    };
  }

  if (error instanceof NetworkError) {
    return {
      icon: '🌐',
      title: 'Network Error',
      message: 'Connection failed. Please check your internet connection.',
      bgColor: 'bg-cyan-100',
      buttonClass: 'bg-cyan-600 text-white hover:bg-cyan-700',
    };
  }

  if (isAppError(error)) {
    return {
      icon: '⚠️',
      title: level === 'global' ? 'Something Went Wrong' : 'Error',
      message: error.isOperational ? error.message : 'An unexpected error occurred.',
      bgColor: 'bg-red-100',
      buttonClass: 'bg-primary-600 text-white hover:bg-primary-700',
    };
  }

  // 默认配置
  return {
    icon: '⚠️',
    title: level === 'global' ? 'Something Went Wrong' : 'Error',
    message:
      level === 'global'
        ? "We're sorry, but something unexpected happened. Please try again."
        : 'An error occurred while loading this component.',
    bgColor: 'bg-red-100',
    buttonClass: 'bg-primary-600 text-white hover:bg-primary-700',
  };
}

/**
 * 全局错误边界 Hook
 */
export function useSentryUserContext() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  React.useEffect(() => {
    if (user) {
      setUser({
        id: user.id,
        email: user.email,
        username: profile?.display_name || user.user_metadata?.display_name,
      });
    } else {
      setUser(null);
    }
  }, [user, profile]);
}

/**
 * 便捷的错误边界组件
 */

export function GlobalErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'level'>) {
  useSentryUserContext();
  return (
    <ErrorBoundary level="global" captureInSentry {...props}>
      {children}
    </ErrorBoundary>
  );
}

export function PageErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'level'>) {
  return (
    <ErrorBoundary level="page" captureInSentry {...props}>
      {children}
    </ErrorBoundary>
  );
}

export function SectionErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'level'>) {
  return (
    <ErrorBoundary level="section" {...props}>
      {children}
    </ErrorBoundary>
  );
}

export function ComponentErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'level'>) {
  return (
    <ErrorBoundary level="component" {...props}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
