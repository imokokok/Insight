'use client';

import React, { useState, useCallback } from 'react';

import {
  AlertTriangle,
  RefreshCw,
  Home,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  X,
  Info,
  WifiOff,
  Lock,
  Search,
  Clock,
  Server,
  ShieldAlert,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import type { AppError } from '@/lib/errors';
import {
  isAppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  NetworkError,
  PriceFetchError,
  getErrorMessage,
  classifyError,
} from '@/lib/errors';
import { cn } from '@/lib/utils';

/**
 * 错误显示类型
 */
export type ErrorDisplayType = 'inline' | 'card' | 'page' | 'toast' | 'modal';

/**
 * 错误显示变体
 */
export type ErrorDisplayVariant = 'default' | 'destructive' | 'warning' | 'info';

/**
 * 错误显示属性
 */
export interface ErrorDisplayProps {
  error?: Error | AppError | string | null;
  type?: ErrorDisplayType;
  variant?: ErrorDisplayVariant;
  title?: string;
  description?: string;
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
  onHome?: () => void;
  showDetails?: boolean;
  showReport?: boolean;
  className?: string;
  retryText?: string;
  dismissText?: string;
  homeText?: string;
  reportText?: string;
  maxRetries?: number;
  children?: React.ReactNode;
}

/**
 * 错误报告数据
 */
interface ErrorReportData {
  errorId: string | undefined;
  timestamp: string;
  userAgent: string;
  url: string;
  error: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    category?: string;
    severity?: string;
  };
}

/**
 * 错误显示组件
 *
 * 功能特性：
 * 1. 多种显示类型（inline/card/page/toast/modal）
 * 2. 智能错误类型识别和图标
 * 3. 支持重试机制（带最大重试次数）
 * 4. 错误详情展开/收起
 * 5. 错误报告生成和复制
 * 6. 响应式设计
 */
export function ErrorDisplay({
  error,
  type = 'card',
  variant = 'default',
  title: customTitle,
  description: customDescription,
  onRetry,
  onDismiss,
  onHome,
  showDetails = process.env.NODE_ENV === 'development',
  showReport = true,
  className,
  retryText = '重试',
  dismissText = '关闭',
  homeText = '返回首页',
  reportText = '复制错误信息',
  maxRetries = 3,
  children,
}: ErrorDisplayProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const errorMessage = error ? getErrorMessage(error) : '';
  const errorConfig = error ? getErrorConfig(error, variant) : null;
  const classification = error ? classifyError(error) : null;

  const title = customTitle || errorConfig?.title || '';
  const description = customDescription || errorConfig?.description || '';

  // 如果没有错误，不显示任何内容
  if (!error || !errorConfig || !classification) {
    return null;
  }

  /**
   * 处理重试
   */
  const handleRetry = useCallback(async () => {
    if (!onRetry || retryCount >= maxRetries || isRetrying) {
      return;
    }

    setIsRetrying(true);
    try {
      await onRetry();
      setRetryCount(0);
    } catch {
      setRetryCount((prev) => prev + 1);
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, retryCount, maxRetries, isRetrying]);

  /**
   * 生成错误报告
   */
  const generateErrorReport = useCallback((): ErrorReportData => {
    const isAppErr = isAppError(error);

    return {
      errorId:
        isAppErr && error instanceof Error ? (error as AppError).requestId : `err-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      error: {
        name: error instanceof Error ? error.name : 'Error',
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        code: isAppErr && error instanceof Error ? (error as AppError).code : undefined,
        category: classification.category,
        severity: classification.severity,
      },
    };
  }, [error, errorMessage, classification]);

  /**
   * 复制错误报告到剪贴板
   */
  const handleCopyReport = useCallback(async () => {
    const report = generateErrorReport();
    const reportText = JSON.stringify(report, null, 2);

    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy error report');
    }
  }, [generateErrorReport]);

  /**
   * 渲染图标
   */
  const renderIcon = () => {
    const Icon = errorConfig.icon;
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full',
          errorConfig.bgColor,
          type === 'page' && 'w-24 h-24',
          type === 'card' && 'w-16 h-16',
          type === 'inline' && 'w-10 h-10',
          type === 'toast' && 'w-8 h-8',
          type === 'modal' && 'w-20 h-20'
        )}
      >
        <Icon
          className={cn(
            errorConfig.iconColor,
            type === 'page' && 'w-12 h-12',
            type === 'card' && 'w-8 h-8',
            type === 'inline' && 'w-5 h-5',
            type === 'toast' && 'w-4 h-4',
            type === 'modal' && 'w-10 h-10'
          )}
        />
      </div>
    );
  };

  /**
   * 渲染操作按钮
   */
  const renderActions = () => {
    const canRetry = onRetry && retryCount < maxRetries;
    const isRateLimited = error instanceof RateLimitError;

    return (
      <div className="flex flex-wrap gap-3">
        {canRetry && !isRateLimited && (
          <Button
            variant="primary"
            onClick={handleRetry}
            disabled={isRetrying}
            leftIcon={<RefreshCw className={cn('w-4 h-4', isRetrying && 'animate-spin')} />}
          >
            {isRetrying ? '重试中...' : retryText}
            {retryCount > 0 && ` (${retryCount}/${maxRetries})`}
          </Button>
        )}

        {isRateLimited && (
          <Button
            variant="primary"
            onClick={handleRetry}
            disabled={isRetrying}
            leftIcon={<Clock className="w-4 h-4" />}
          >
            {retryText}
            {error.retryAfter && ` (${error.retryAfter}s)`}
          </Button>
        )}

        {onHome && type !== 'inline' && type !== 'toast' && (
          <Button variant="secondary" onClick={onHome} leftIcon={<Home className="w-4 h-4" />}>
            {homeText}
          </Button>
        )}

        {onDismiss && type === 'toast' && (
          <Button variant="ghost" onClick={onDismiss} leftIcon={<X className="w-4 h-4" />}>
            {dismissText}
          </Button>
        )}

        {showReport && type !== 'toast' && (
          <Button
            variant="ghost"
            onClick={handleCopyReport}
            leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? '已复制' : reportText}
          </Button>
        )}
      </div>
    );
  };

  /**
   * 渲染错误详情
   */
  const renderDetails = () => {
    if (!showDetails) return null;

    const isAppErr = isAppError(error);

    return (
      <div className="mt-4 border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowErrorDetails(!showErrorDetails)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <FileText className="w-4 h-4" />
          错误详情
          {showErrorDetails ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showErrorDetails && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-left">
            <div className="space-y-2 text-sm">
              <p className="font-mono text-gray-600 break-all">{errorMessage}</p>

              {isAppErr && (
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div>
                    <span className="font-medium">错误代码:</span> {error.code}
                  </div>
                  <div>
                    <span className="font-medium">分类:</span> {error.category}
                  </div>
                  <div>
                    <span className="font-medium">严重级别:</span> {error.severity}
                  </div>
                  <div>
                    <span className="font-medium">请求ID:</span>{' '}
                    <code className="bg-gray-200 px-1 rounded">{error.requestId}</code>
                  </div>
                  {error.retryable && (
                    <div>
                      <span className="font-medium">可重试:</span> 是
                    </div>
                  )}
                </div>
              )}

              {error instanceof Error && error.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                    堆栈跟踪
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600 overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * 根据类型渲染不同样式
   */
  switch (type) {
    case 'page':
      return (
        <div
          className={cn('min-h-screen flex items-center justify-center p-8 bg-gray-50', className)}
        >
          <div className="text-center max-w-lg">
            {renderIcon()}
            <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-3">{title}</h1>
            <p className="text-gray-600 mb-6">{description}</p>
            {children}
            {renderActions()}
            {renderDetails()}
          </div>
        </div>
      );

    case 'card':
      return (
        <div
          className={cn('bg-white border border-gray-200 rounded-lg p-6 shadow-sm', className)}
          role="alert"
        >
          <div className="flex flex-col items-center text-center">
            {renderIcon()}
            <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm mb-4 max-w-sm">{description}</p>
            {children}
            {renderActions()}
            {renderDetails()}
          </div>
        </div>
      );

    case 'inline':
      return (
        <div
          className={cn('flex items-start gap-3 p-3 rounded-lg', errorConfig.bgColor, className)}
          role="alert"
        >
          <div className="flex-shrink-0 mt-0.5">
            <errorConfig.icon className={cn('w-5 h-5', errorConfig.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium', errorConfig.textColor)}>{title}</p>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
            {children}
            {(onRetry || onDismiss) && (
              <div className="flex gap-2 mt-3">
                {onRetry && (
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                  >
                    {isRetrying ? '重试中...' : retryText}
                  </button>
                )}
                {onDismiss && (
                  <button onClick={onDismiss} className="text-sm text-gray-500 hover:text-gray-700">
                    {dismissText}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      );

    case 'toast':
      return (
        <div
          className={cn(
            'flex items-start gap-3 p-4 rounded-lg shadow-lg max-w-md',
            errorConfig.bgColor,
            className
          )}
          role="alert"
        >
          <div className="flex-shrink-0">{renderIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium', errorConfig.textColor)}>{title}</p>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          {renderActions()}
          {onDismiss && (
            <button onClick={onDismiss} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      );

    case 'modal':
      return (
        <div
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50',
            className
          )}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex flex-col items-center text-center">
              {renderIcon()}
              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">{title}</h3>
              <p className="text-gray-600 mb-6">{description}</p>
              {children}
              {renderActions()}
              {renderDetails()}
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

/**
 * 获取错误配置
 */
function getErrorConfig(
  error: Error | AppError | string,
  variant: ErrorDisplayVariant
): {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  bgColor: string;
  iconColor: string;
  textColor: string;
} {
  // 根据错误类型返回配置
  if (error instanceof ValidationError) {
    return {
      icon: Info,
      title: '验证错误',
      description: getErrorMessage(error),
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-500',
      textColor: 'text-yellow-800',
    };
  }

  if (error instanceof NotFoundError) {
    return {
      icon: Search,
      title: '未找到',
      description: '请求的资源不存在或已被移除。',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-500',
      textColor: 'text-blue-800',
    };
  }

  if (error instanceof AuthenticationError) {
    return {
      icon: Lock,
      title: '需要登录',
      description: '请先登录以访问此功能。',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-500',
      textColor: 'text-orange-800',
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      icon: ShieldAlert,
      title: '访问被拒绝',
      description: '您没有权限执行此操作。',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
      textColor: 'text-red-800',
    };
  }

  if (error instanceof RateLimitError) {
    return {
      icon: Clock,
      title: '请求过于频繁',
      description: '请稍后再试。',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-500',
      textColor: 'text-indigo-800',
    };
  }

  if (error instanceof NetworkError) {
    return {
      icon: WifiOff,
      title: '网络错误',
      description: '网络连接失败，请检查您的网络设置。',
      bgColor: 'bg-cyan-50',
      iconColor: 'text-cyan-500',
      textColor: 'text-cyan-800',
    };
  }

  if (error instanceof PriceFetchError) {
    return {
      icon: Server,
      title: '价格数据不可用',
      description: error.retryable
        ? '暂时无法获取价格数据，请稍后重试。'
        : '无法获取价格数据，请稍后再试。',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-500',
      textColor: 'text-purple-800',
    };
  }

  if (isAppError(error)) {
    const isOperational = error.isOperational;
    return {
      icon: AlertTriangle,
      title: isOperational ? '操作失败' : '系统错误',
      description: isOperational ? error.message : '发生了一个意外错误，请稍后重试或联系支持团队。',
      bgColor: variant === 'destructive' ? 'bg-red-50' : 'bg-gray-50',
      iconColor: variant === 'destructive' ? 'text-red-500' : 'text-gray-500',
      textColor: variant === 'destructive' ? 'text-red-800' : 'text-gray-800',
    };
  }

  // 默认配置
  return {
    icon: AlertTriangle,
    title: '出错了',
    description: typeof error === 'string' ? error : '发生了一个错误，请稍后重试。',
    bgColor: variant === 'destructive' ? 'bg-red-50' : 'bg-gray-50',
    iconColor: variant === 'destructive' ? 'text-red-500' : 'text-gray-500',
    textColor: variant === 'destructive' ? 'text-red-800' : 'text-gray-800',
  };
}

export default ErrorDisplay;
