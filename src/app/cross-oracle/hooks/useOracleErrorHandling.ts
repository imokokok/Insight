import { useState, useCallback } from 'react';

import type { OracleProvider } from '@/types/oracle';

import type {
  OracleErrorType,
  OracleErrorInfo,
  OracleDataError,
  PartialSuccessState,
} from '../types';

export function classifyError(error: unknown): { errorType: OracleErrorType; retryable: boolean } {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (name.includes('timeout') || message.includes('timeout') || message.includes('timed out')) {
      return { errorType: 'timeout', retryable: true };
    }

    if (
      message.includes('cors') ||
      message.includes('cross-origin') ||
      message.includes('blocked by cors') ||
      message.includes('access-control')
    ) {
      return { errorType: 'cors', retryable: false };
    }

    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('internal server error') ||
      message.includes('bad gateway') ||
      message.includes('service unavailable') ||
      message.includes('gateway timeout')
    ) {
      return { errorType: 'server_error', retryable: true };
    }

    if (
      name.includes('network') ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('enotfound') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('networkerror') ||
      message.includes('failed to fetch')
    ) {
      return { errorType: 'network', retryable: true };
    }

    if (
      message.includes('rate limit') ||
      message.includes('too many') ||
      message.includes('429') ||
      message.includes('throttl') ||
      message.includes('quota exceeded')
    ) {
      return { errorType: 'rate_limit', retryable: true };
    }

    if (
      message.includes('parse') ||
      message.includes('json') ||
      message.includes('format') ||
      message.includes('invalid') ||
      message.includes('unexpected token') ||
      message.includes('syntaxerror')
    ) {
      return { errorType: 'data_format', retryable: false };
    }

    if (
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('401') ||
      message.includes('403')
    ) {
      return { errorType: 'network', retryable: false };
    }
  }

  return { errorType: 'unknown', retryable: true };
}

export function createOracleErrorInfo(provider: OracleProvider, error: unknown): OracleErrorInfo {
  const { errorType, retryable } = classifyError(error);
  const message = error instanceof Error ? error.message : String(error);

  return {
    provider,
    errorType,
    message,
    originalError: error instanceof Error ? error : undefined,
    retryable,
    timestamp: Date.now(),
  };
}

const INITIAL_ORACLE_DATA_ERROR: OracleDataError = {
  hasError: false,
  isPartialSuccess: false,
  partialSuccess: null,
  errors: [],
  globalError: null,
};

export interface UseOracleErrorHandlingReturn {
  oracleDataError: OracleDataError;
  setOracleDataError: React.Dispatch<React.SetStateAction<OracleDataError>>;
  handleProviderSuccess: (provider: OracleProvider, totalOracles: number) => void;
  handleProviderError: (provider: OracleProvider, errorInfo: OracleErrorInfo | null) => void;
  resetErrors: () => void;
}

export function useOracleErrorHandling(): UseOracleErrorHandlingReturn {
  const [oracleDataError, setOracleDataError] =
    useState<OracleDataError>(INITIAL_ORACLE_DATA_ERROR);

  const handleProviderSuccess = useCallback((provider: OracleProvider, totalOracles: number) => {
    setOracleDataError((prev) => {
      const newErrors = prev.errors.filter((e) => e.provider !== provider);
      const newFailedOracles =
        prev.partialSuccess?.failedOracles.filter((o) => o !== provider) || [];
      const newSuccessOracles = [...(prev.partialSuccess?.successOracles || []), provider];

      const newPartialSuccess: PartialSuccessState | null =
        newFailedOracles.length > 0
          ? {
              isSuccess: true,
              successCount: newSuccessOracles.length,
              failedCount: newFailedOracles.length,
              totalCount: totalOracles,
              failedOracles: newFailedOracles,
              successOracles: newSuccessOracles,
            }
          : null;

      return {
        hasError: newErrors.length > 0,
        isPartialSuccess: newPartialSuccess !== null,
        partialSuccess: newPartialSuccess,
        errors: newErrors,
        globalError: null,
      };
    });
  }, []);

  const handleProviderError = useCallback(
    (provider: OracleProvider, errorInfo: OracleErrorInfo | null) => {
      setOracleDataError((prev) => {
        if (errorInfo === null) {
          const newErrors = prev.errors.filter((e) => e.provider !== provider);
          return {
            ...prev,
            errors: newErrors,
          };
        }
        const existingIndex = prev.errors.findIndex((e) => e.provider === provider);
        let newErrors: OracleErrorInfo[];
        if (existingIndex >= 0) {
          newErrors = prev.errors.map((e) => (e.provider === provider ? errorInfo : e));
        } else {
          newErrors = [...prev.errors, errorInfo];
        }
        return {
          ...prev,
          errors: newErrors,
        };
      });
    },
    []
  );

  const resetErrors = useCallback(() => {
    setOracleDataError(INITIAL_ORACLE_DATA_ERROR);
  }, []);

  return {
    oracleDataError,
    setOracleDataError,
    handleProviderSuccess,
    handleProviderError,
    resetErrors,
  };
}
