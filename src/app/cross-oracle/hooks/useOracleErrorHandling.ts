import { useState, useCallback } from 'react';

import {
  OracleClientError,
  PriceFetchError,
  UnsupportedChainError,
  UnsupportedSymbolError,
  OracleProviderError,
} from '@/lib/errors';
import type { OracleProvider } from '@/types/oracle';

import type {
  OracleErrorType,
  OracleErrorInfo,
  OracleDataError,
  PartialSuccessState,
} from '../types';

const PROVIDER_ERROR_CLASSIFICATIONS: Record<
  string,
  Record<string, { errorType: OracleErrorType; retryable?: boolean }>
> = {
  redstone: {
    TIMEOUT_ERROR: { errorType: 'timeout', retryable: true },
    NETWORK_ERROR: { errorType: 'network', retryable: true },
    FETCH_ERROR: { errorType: 'network', retryable: true },
    RATE_LIMIT_ERROR: { errorType: 'rate_limit', retryable: true },
    PARSE_ERROR: { errorType: 'data_format', retryable: false },
    INVALID_RESPONSE: { errorType: 'data_format', retryable: false },
    DATA_STALE: { errorType: 'server_error' },
    PRICE_DEVIATION: { errorType: 'server_error' },
  },
  chainlink: {
    AGGREGATOR_OFFLINE: { errorType: 'server_error' },
    STALE_DATA: { errorType: 'server_error' },
    ROUND_INCOMPLETE: { errorType: 'server_error' },
    HEARTBEAT_VIOLATION: { errorType: 'timeout', retryable: true },
    PRICE_DEVIATION: { errorType: 'data_format', retryable: false },
    INVALID_ANSWER: { errorType: 'data_format', retryable: false },
  },
  pyth: {
    HERMES_CONNECTION_ERROR: { errorType: 'network', retryable: true },
    STALE_PRICE: { errorType: 'server_error', retryable: true },
    PRICE_FEED_NOT_FOUND: { errorType: 'data_format', retryable: false },
    INVALID_PRICE: { errorType: 'data_format', retryable: false },
    CONFIDENCE_INTERVAL_TOO_LARGE: { errorType: 'data_format', retryable: false },
  },
  api3: {
    AIRNODE_ERROR: { errorType: 'server_error' },
    BEACON_OFFLINE: { errorType: 'server_error' },
    DAPI_NOT_FOUND: { errorType: 'data_format', retryable: false },
    TEMPLATE_NOT_FOUND: { errorType: 'data_format', retryable: false },
    SPONSOR_WALLET_ERROR: { errorType: 'authorization', retryable: false },
  },
  supra: {
    DORA_CONNECTION_ERROR: { errorType: 'network', retryable: true },
    STALE_PRICE: { errorType: 'server_error', retryable: true },
    PAIR_NOT_FOUND: { errorType: 'data_format', retryable: false },
    INVALID_PRICE: { errorType: 'data_format', retryable: false },
    PRICE_DEVIATION: { errorType: 'data_format', retryable: false },
  },
  flare: {
    FTSO_RPC_ERROR: { errorType: 'network', retryable: true },
    CONTRACT_CALL_FAILED: { errorType: 'network', retryable: true },
    STALE_PRICE: { errorType: 'server_error', retryable: true },
    FEED_NOT_FOUND: { errorType: 'data_format', retryable: false },
    INVALID_FEED_ID: { errorType: 'data_format', retryable: false },
    INVALID_PRICE: { errorType: 'data_format', retryable: false },
  },
  dia: {
    NETWORK_ERROR: { errorType: 'network', retryable: true },
    FETCH_ERROR: { errorType: 'network', retryable: true },
    TIMEOUT_ERROR: { errorType: 'timeout', retryable: true },
    RATE_LIMIT_ERROR: { errorType: 'rate_limit', retryable: true },
    PARSE_ERROR: { errorType: 'data_format', retryable: false },
    INVALID_RESPONSE: { errorType: 'data_format', retryable: false },
  },
  winklink: {
    TRON_RPC_ERROR: { errorType: 'network', retryable: true },
    CONTRACT_CALL_ERROR: { errorType: 'network', retryable: true },
    STALE_DATA: { errorType: 'server_error', retryable: true },
    PAIR_NOT_FOUND: { errorType: 'data_format', retryable: false },
    GAMING_DATA_ERROR: { errorType: 'data_format', retryable: false },
    INVALID_PRICE: { errorType: 'data_format', retryable: false },
  },
};

function classifyStructuredError(
  error: unknown
): { errorType: OracleErrorType; retryable: boolean } | null {
  if (error instanceof UnsupportedChainError || error instanceof UnsupportedSymbolError) {
    return { errorType: 'data_format', retryable: false };
  }

  if (error instanceof OracleClientError) {
    return { errorType: 'network', retryable: true };
  }

  if (error instanceof PriceFetchError) {
    return { errorType: error.retryable ? 'network' : 'server_error', retryable: error.retryable };
  }

  if (error instanceof OracleProviderError) {
    const providerConfig = PROVIDER_ERROR_CLASSIFICATIONS[error.provider];
    if (providerConfig) {
      const errorConfig = providerConfig[error.errorCode];
      if (errorConfig) {
        return {
          errorType: errorConfig.errorType,
          retryable: errorConfig.retryable ?? error.retryable,
        };
      }
    }
    return { errorType: 'unknown', retryable: error.retryable };
  }

  return null;
}

function classifyByStringMatching(
  error: Error
): { errorType: OracleErrorType; retryable: boolean } | null {
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
    return { errorType: 'authorization', retryable: false };
  }

  return null;
}

function classifyError(error: unknown): { errorType: OracleErrorType; retryable: boolean } {
  const structuredResult = classifyStructuredError(error);
  if (structuredResult) {
    return structuredResult;
  }

  if (error instanceof Error) {
    const stringResult = classifyByStringMatching(error);
    if (stringResult) {
      return stringResult;
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
    setOracleDataError({ ...INITIAL_ORACLE_DATA_ERROR });
  }, []);

  return {
    oracleDataError,
    setOracleDataError,
    handleProviderSuccess,
    handleProviderError,
    resetErrors,
  };
}
