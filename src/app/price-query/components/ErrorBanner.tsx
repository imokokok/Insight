'use client';

import { useState, useCallback, useMemo } from 'react';

import {
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Wifi,
  Database,
  Clock,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui';
import { type OracleProvider, type Blockchain } from '@/types/oracle/enums';

type ErrorType = 'network' | 'data' | 'timeout' | 'unknown';

interface ErrorItem {
  provider: OracleProvider;
  chain: Blockchain;
  error: string;
}

interface ErrorBannerProps {
  errors: ErrorItem[];
  onRetry: (provider: OracleProvider, chain: Blockchain) => void;
  onRetryAll: () => void;
  onDismiss?: () => void;
}

function detectErrorType(error: string): ErrorType {
  const lowerError = error.toLowerCase();
  if (
    lowerError.includes('network') ||
    lowerError.includes('fetch') ||
    lowerError.includes('connection') ||
    lowerError.includes('ECONNREFUSED') ||
    lowerError.includes('ENOTFOUND')
  ) {
    return 'network';
  }
  if (
    lowerError.includes('timeout') ||
    lowerError.includes('timed out') ||
    lowerError.includes('ETIMEDOUT')
  ) {
    return 'timeout';
  }
  if (
    lowerError.includes('data') ||
    lowerError.includes('parse') ||
    lowerError.includes('invalid') ||
    lowerError.includes('format')
  ) {
    return 'data';
  }
  return 'unknown';
}

function getErrorTypeInfo(errorType: ErrorType): {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
} {
  switch (errorType) {
    case 'network':
      return {
        icon: <Wifi className="w-4 h-4" />,
        label: 'Network Error',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
      };
    case 'timeout':
      return {
        icon: <Clock className="w-4 h-4" />,
        label: 'Timeout Error',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
      };
    case 'data':
      return {
        icon: <Database className="w-4 h-4" />,
        label: 'Data Error',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      };
    default:
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        label: 'Unknown Error',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
      };
  }
}

interface ErrorItemRowProps {
  error: ErrorItem;
  onRetry: (provider: OracleProvider, chain: Blockchain) => void;
  isRetrying: boolean;
}

function ErrorItemRow({ error, onRetry, isRetrying }: ErrorItemRowProps) {
  const errorType = detectErrorType(error.error);
  const errorInfo = getErrorTypeInfo(errorType);

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`p-2 rounded-lg ${errorInfo.bgColor}`}>
          <span className={errorInfo.color}>{errorInfo.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm">{error.provider}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">{error.chain}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium ${errorInfo.color}`}>{errorInfo.label}</span>
            <span className="text-xs text-gray-400 truncate max-w-[200px]" title={error.error}>
              {error.error}
            </span>
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRetry(error.provider, error.chain)}
        disabled={isRetrying}
        className="ml-3 flex-shrink-0"
      >
        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
        <span className="ml-1.5">Retry</span>
      </Button>
    </div>
  );
}

function deduplicateErrors(errors: ErrorItem[]): ErrorItem[] {
  const seen = new Map<string, ErrorItem>();
  for (const error of errors) {
    const key = `${error.provider}-${error.chain}`;
    seen.set(key, error);
  }
  return Array.from(seen.values());
}

export function ErrorBanner({ errors, onRetry, onRetryAll, onDismiss }: ErrorBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [retryingItems, setRetryingItems] = useState<Set<string>>(new Set());

  const uniqueErrors = useMemo(() => deduplicateErrors(errors), [errors]);

  const handleRetry = useCallback(
    async (provider: OracleProvider, chain: Blockchain) => {
      const key = `${provider}-${chain}`;
      setRetryingItems((prev) => new Set(prev).add(key));
      try {
        await onRetry(provider, chain);
      } finally {
        setTimeout(() => {
          setRetryingItems((prev) => {
            const newSet = new Set(prev);
            newSet.delete(key);
            return newSet;
          });
        }, 1000);
      }
    },
    [onRetry]
  );

  const handleRetryAll = useCallback(() => {
    onRetryAll();
  }, [onRetryAll]);

  if (uniqueErrors.length === 0) {
    return null;
  }

  const displayedErrors = isExpanded ? uniqueErrors : uniqueErrors.slice(0, 3);
  const hasMoreErrors = uniqueErrors.length > 3;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-red-100 border-b border-red-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="font-semibold text-red-800">{uniqueErrors.length} Errors</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleRetryAll}>
            <RefreshCw className="w-4 h-4" />
            <span className="ml-1.5">Retry All</span>
          </Button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 hover:bg-red-200 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {displayedErrors.map((error, index) => (
          <ErrorItemRow
            key={`${error.provider}-${error.chain}-${error.error.length}-${index}`}
            error={error}
            onRetry={handleRetry}
            isRetrying={retryingItems.has(`${error.provider}-${error.chain}`)}
          />
        ))}
      </div>

      {hasMoreErrors && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-200"
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Show Less</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>Show {errors.length - 3} more</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
