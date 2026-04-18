'use client';

import { memo, useCallback } from 'react';

import {
  AlertCircle,
  RefreshCw,
  Wifi,
  Clock,
  FileWarning,
  AlertTriangle,
  Server,
  Shield,
} from 'lucide-react';

import { Button } from '@/components/ui';
import type { OracleProvider } from '@/types/oracle';

import type { OracleDataError, OracleErrorInfo, OracleErrorType } from '../types';

const ERROR_TYPE_LABELS: Record<OracleErrorType, string> = {
  network: 'Network Error',
  timeout: 'Timeout',
  data_format: 'Data Format Error',
  rate_limit: 'Rate Limited',
  server_error: 'Server Error',
  cors: 'CORS Error',
  authorization: 'Authorization Error',
  unknown: 'Unknown Error',
};

function getErrorTypeInfo(errorType: OracleErrorType): {
  icon: typeof AlertCircle;
  color: string;
  bgColor: string;
  label: string;
} {
  switch (errorType) {
    case 'network':
      return {
        icon: Wifi,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        label: ERROR_TYPE_LABELS[errorType],
      };
    case 'timeout':
      return {
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        label: ERROR_TYPE_LABELS[errorType],
      };
    case 'data_format':
      return {
        icon: FileWarning,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        label: ERROR_TYPE_LABELS[errorType],
      };
    case 'rate_limit':
      return {
        icon: AlertTriangle,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        label: ERROR_TYPE_LABELS[errorType],
      };
    case 'server_error':
      return {
        icon: Server,
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        label: ERROR_TYPE_LABELS[errorType],
      };
    case 'cors':
      return {
        icon: Shield,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        label: ERROR_TYPE_LABELS[errorType],
      };
    case 'authorization':
      return {
        icon: Shield,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
        label: ERROR_TYPE_LABELS[errorType],
      };
    default:
      return {
        icon: AlertCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        label: ERROR_TYPE_LABELS[errorType],
      };
  }
}

interface OracleErrorItemProps {
  error: OracleErrorInfo;
  onRetry?: () => void;
  isRetrying?: boolean;
}

const OracleErrorItem = memo(function OracleErrorItem({
  error,
  onRetry,
  isRetrying,
}: OracleErrorItemProps) {
  const typeInfo = getErrorTypeInfo(error.errorType);
  const Icon = typeInfo.icon;

  const handleRetry = useCallback(() => {
    if (onRetry && !isRetrying) {
      onRetry();
    }
  }, [onRetry, isRetrying]);

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg ${typeInfo.bgColor} border border-gray-200`}
    >
      <Icon className={`w-5 h-5 mt-0.5 ${typeInfo.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{error.provider}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color} ${typeInfo.bgColor}`}
          >
            {typeInfo.label}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1 truncate" title={error.message}>
          {error.message}
        </p>
        <div className="flex items-center gap-2 mt-2">
          {error.retryable && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          )}
          <span className="text-xs text-gray-400">
            {new Date(error.timestamp).toLocaleTimeString('en-US')}
          </span>
        </div>
      </div>
    </div>
  );
});

interface PartialSuccessBannerProps {
  successCount: number;
  failedCount: number;
  totalCount: number;
  onRetryAll?: () => void;
  isRetrying?: boolean;
}

const PartialSuccessBanner = memo(function PartialSuccessBanner({
  successCount,
  failedCount,
  totalCount,
  onRetryAll,
  isRetrying,
}: PartialSuccessBannerProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600" />
        <div>
          <p className="font-medium text-amber-800">
            Partial success: {successCount} of {totalCount} succeeded, {failedCount} failed
          </p>
          <p className="text-sm text-amber-600">Some oracles failed to respond</p>
        </div>
      </div>
      {onRetryAll && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetryAll}
          disabled={isRetrying}
          className="border-amber-300 text-amber-700 hover:bg-amber-100"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
          Retry All
        </Button>
      )}
    </div>
  );
});

interface GlobalErrorBannerProps {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

const GlobalErrorBanner = memo(function GlobalErrorBanner({
  message,
  onRetry,
  isRetrying,
}: GlobalErrorBannerProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <div>
          <p className="font-medium text-red-800">Global Error</p>
          <p className="text-sm text-red-600">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="border-red-300 text-red-700 hover:bg-red-100"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      )}
    </div>
  );
});

interface OracleErrorPanelProps {
  oracleDataError: OracleDataError;
  retryOracle?: (provider: OracleProvider) => Promise<void>;
  retryAllFailed?: () => Promise<void>;
  isRetrying?: boolean;
  retryingOracles?: OracleProvider[];
  onRefresh?: () => void;
}

export const OracleErrorPanel = memo(function OracleErrorPanel({
  oracleDataError,
  retryOracle,
  retryAllFailed,
  isRetrying = false,
  retryingOracles = [],
  onRefresh,
}: OracleErrorPanelProps) {
  if (!oracleDataError.hasError) {
    return null;
  }

  const { isPartialSuccess, partialSuccess, errors, globalError } = oracleDataError;

  return (
    <div className="space-y-4">
      {globalError && !isPartialSuccess && (
        <GlobalErrorBanner
          message={globalError.message}
          onRetry={onRefresh}
          isRetrying={isRetrying}
        />
      )}

      {isPartialSuccess && partialSuccess && (
        <PartialSuccessBanner
          successCount={partialSuccess.successCount}
          failedCount={partialSuccess.failedCount}
          totalCount={partialSuccess.totalCount}
          onRetryAll={retryAllFailed}
          isRetrying={isRetrying}
        />
      )}

      {errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Failed Oracles
          </h4>
          <div className="grid gap-2">
            {errors.map((error, index) => (
              <OracleErrorItem
                key={`${error.provider}-${index}`}
                error={error}
                onRetry={
                  error.retryable && retryOracle ? () => retryOracle(error.provider) : undefined
                }
                isRetrying={retryingOracles.includes(error.provider)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
