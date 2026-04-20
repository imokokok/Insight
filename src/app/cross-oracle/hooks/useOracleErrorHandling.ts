import { useState, useCallback } from 'react';

import {
  OracleClientError,
  PriceFetchError,
  UnsupportedChainError,
  UnsupportedSymbolError,
  RedStoneApiError,
  ChainlinkError,
  PythError,
  API3Error,
  SupraError,
  FlareError,
  DIAError,
  WINkLinkError,
} from '@/lib/errors';
import type { OracleProvider } from '@/types/oracle';

import type {
  OracleErrorType,
  OracleErrorInfo,
  OracleDataError,
  PartialSuccessState,
} from '../types';

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

  if (error instanceof RedStoneApiError) {
    return classifyRedStoneError(error);
  }

  if (error instanceof ChainlinkError) {
    return classifyChainlinkError(error);
  }

  if (error instanceof PythError) {
    return classifyPythError(error);
  }

  if (error instanceof API3Error) {
    return classifyAPI3Error(error);
  }

  if (error instanceof SupraError) {
    return classifySupraError(error);
  }

  if (error instanceof FlareError) {
    return classifyFlareError(error);
  }

  if (error instanceof DIAError) {
    return classifyDIAError(error);
  }

  if (error instanceof WINkLinkError) {
    return classifyWINkLinkError(error);
  }

  return null;
}

function classifyRedStoneError(error: RedStoneApiError): {
  errorType: OracleErrorType;
  retryable: boolean;
} {
  switch (error.errorCode) {
    case 'TIMEOUT_ERROR':
      return { errorType: 'timeout', retryable: true };
    case 'NETWORK_ERROR':
    case 'FETCH_ERROR':
      return { errorType: 'network', retryable: true };
    case 'RATE_LIMIT_ERROR':
      return { errorType: 'rate_limit', retryable: true };
    case 'PARSE_ERROR':
    case 'INVALID_RESPONSE':
      return { errorType: 'data_format', retryable: false };
    case 'DATA_STALE':
    case 'PRICE_DEVIATION':
      return { errorType: 'server_error', retryable: error.retryable };
    default:
      return { errorType: 'unknown', retryable: error.retryable };
  }
}

function classifyChainlinkError(error: ChainlinkError): {
  errorType: OracleErrorType;
  retryable: boolean;
} {
  switch (error.errorCode) {
    case 'AGGREGATOR_OFFLINE':
    case 'STALE_DATA':
    case 'ROUND_INCOMPLETE':
      return { errorType: 'server_error', retryable: error.retryable };
    case 'HEARTBEAT_VIOLATION':
      return { errorType: 'timeout', retryable: true };
    case 'PRICE_DEVIATION':
    case 'INVALID_ANSWER':
      return { errorType: 'data_format', retryable: false };
    default:
      return { errorType: 'unknown', retryable: error.retryable };
  }
}

function classifyPythError(error: PythError): { errorType: OracleErrorType; retryable: boolean } {
  switch (error.errorCode) {
    case 'HERMES_CONNECTION_ERROR':
      return { errorType: 'network', retryable: true };
    case 'STALE_PRICE':
      return { errorType: 'server_error', retryable: true };
    case 'PRICE_FEED_NOT_FOUND':
      return { errorType: 'data_format', retryable: false };
    case 'INVALID_PRICE':
    case 'CONFIDENCE_INTERVAL_TOO_LARGE':
      return { errorType: 'data_format', retryable: false };
    default:
      return { errorType: 'unknown', retryable: error.retryable };
  }
}

function classifyAPI3Error(error: API3Error): { errorType: OracleErrorType; retryable: boolean } {
  switch (error.errorCode) {
    case 'AIRNODE_ERROR':
    case 'BEACON_OFFLINE':
      return { errorType: 'server_error', retryable: error.retryable };
    case 'DAPI_NOT_FOUND':
    case 'TEMPLATE_NOT_FOUND':
      return { errorType: 'data_format', retryable: false };
    case 'SPONSOR_WALLET_ERROR':
      return { errorType: 'authorization', retryable: false };
    default:
      return { errorType: 'unknown', retryable: error.retryable };
  }
}

function classifySupraError(error: SupraError): { errorType: OracleErrorType; retryable: boolean } {
  switch (error.errorCode) {
    case 'DORA_CONNECTION_ERROR':
      return { errorType: 'network', retryable: true };
    case 'STALE_PRICE':
      return { errorType: 'server_error', retryable: true };
    case 'PAIR_NOT_FOUND':
      return { errorType: 'data_format', retryable: false };
    case 'INVALID_PRICE':
    case 'PRICE_DEVIATION':
      return { errorType: 'data_format', retryable: false };
    default:
      return { errorType: 'unknown', retryable: error.retryable };
  }
}

function classifyFlareError(error: FlareError): { errorType: OracleErrorType; retryable: boolean } {
  switch (error.errorCode) {
    case 'FTSO_RPC_ERROR':
    case 'CONTRACT_CALL_FAILED':
      return { errorType: 'network', retryable: true };
    case 'STALE_PRICE':
      return { errorType: 'server_error', retryable: true };
    case 'FEED_NOT_FOUND':
    case 'INVALID_FEED_ID':
      return { errorType: 'data_format', retryable: false };
    case 'INVALID_PRICE':
      return { errorType: 'data_format', retryable: false };
    default:
      return { errorType: 'unknown', retryable: error.retryable };
  }
}

function classifyDIAError(error: DIAError): { errorType: OracleErrorType; retryable: boolean } {
  switch (error.errorCode) {
    case 'NETWORK_ERROR':
    case 'FETCH_ERROR':
      return { errorType: 'network', retryable: true };
    case 'TIMEOUT_ERROR':
      return { errorType: 'timeout', retryable: true };
    case 'RATE_LIMIT_ERROR':
      return { errorType: 'rate_limit', retryable: true };
    case 'PARSE_ERROR':
    case 'INVALID_RESPONSE':
    case 'NFT_DATA_ERROR':
      return { errorType: 'data_format', retryable: false };
    default:
      return { errorType: 'unknown', retryable: error.retryable };
  }
}

function classifyWINkLinkError(error: WINkLinkError): {
  errorType: OracleErrorType;
  retryable: boolean;
} {
  switch (error.errorCode) {
    case 'TRON_RPC_ERROR':
    case 'CONTRACT_CALL_ERROR':
      return { errorType: 'network', retryable: true };
    case 'STALE_DATA':
      return { errorType: 'server_error', retryable: true };
    case 'PAIR_NOT_FOUND':
    case 'GAMING_DATA_ERROR':
      return { errorType: 'data_format', retryable: false };
    case 'INVALID_PRICE':
      return { errorType: 'data_format', retryable: false };
    default:
      return { errorType: 'unknown', retryable: error.retryable };
  }
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
