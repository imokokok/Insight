import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import {
  validatePriceData,
  validatePriceDataArray,
  OracleDataValidationError,
} from './validation/oracleDataValidation';

const logger = createLogger('OracleApiClient');

interface FetchPriceParams {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
  signal?: AbortSignal;
}

interface FetchHistoricalParams extends FetchPriceParams {
  period: number;
}

const REQUEST_TIMEOUT_MS = 15_000;

function createAbortControllerWithTimeout(signal?: AbortSignal): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (signal) {
    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      controller.abort();
    });
  }
  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  };
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function extractErrorMessage(
  errorData: unknown,
  fallbackPrefix: string,
  status: number,
  statusText: string
): string {
  if (errorData && typeof errorData === 'object' && 'message' in errorData) {
    return (
      String((errorData as { message: unknown }).message) ||
      `${fallbackPrefix}: ${status} ${statusText}`
    );
  }
  return `${fallbackPrefix}: ${status} ${statusText}`;
}

async function handleApiResponse<T>(
  response: Response,
  url: string,
  context: string,
  validateData: (data: unknown) => T
): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    let errorData: unknown = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      // Not JSON, use text as is
    }
    logger.error(`[oracleApiClient] ${context} API error:`, undefined, {
      status: response.status,
      statusText: response.statusText,
      url,
      errorData,
      errorText,
    });
    throw new Error(extractErrorMessage(errorData, context, response.status, response.statusText));
  }

  const data = await response.json();

  if (data.error) {
    const errMsg =
      data.error && typeof data.error === 'object' && 'message' in data.error
        ? String((data.error as { message: unknown }).message)
        : 'Unknown error from API';
    throw new Error(errMsg);
  }

  try {
    return validateData(data);
  } catch (validationError) {
    if (validationError instanceof OracleDataValidationError) {
      logger.error(`[oracleApiClient] ${context} data validation failed:`, undefined, {
        missingFields: validationError.missingFields,
        rawData: validationError.rawData,
      });
    }
    throw validationError;
  }
}

async function fetchPriceFromApi({
  provider,
  symbol,
  chain,
  signal: externalSignal,
}: FetchPriceParams): Promise<PriceData> {
  const url = new URL(`/api/oracles/${provider}`, getBaseUrl());
  url.searchParams.set('symbol', symbol);
  if (chain) {
    url.searchParams.set('chain', chain);
  }

  logger.info(`Fetching price from API: ${url.toString()}`);

  const { controller, cleanup } = createAbortControllerWithTimeout(externalSignal);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    return handleApiResponse(response, url.toString(), 'Price', validatePriceData);
  } finally {
    cleanup();
  }
}

async function fetchHistoricalFromApi({
  provider,
  symbol,
  chain,
  period,
  signal: externalSignal,
}: FetchHistoricalParams): Promise<PriceData[]> {
  const url = new URL(`/api/oracles/${provider}`, getBaseUrl());
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('period', period.toString());
  if (chain) {
    url.searchParams.set('chain', chain);
  }

  logger.info(`Fetching historical prices from API: ${url.toString()}`);

  const { controller, cleanup } = createAbortControllerWithTimeout(externalSignal);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    return handleApiResponse(response, url.toString(), 'Historical price', validatePriceDataArray);
  } finally {
    cleanup();
  }
}

export const oracleApiClient = {
  fetchPrice: fetchPriceFromApi,
  fetchHistorical: fetchHistoricalFromApi,
};
