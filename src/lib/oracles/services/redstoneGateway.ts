import {
  aggregateValues,
  extractSignedDataPackagesForFeedId,
  getDataPackagesTimestamp,
  getResponseFeedIds,
  getSignersForDataServiceId,
  requestDataPackages,
  type DataPackagesResponse,
} from '@redstone-finance/sdk';

import type { SignedDataPackage } from '@redstone-finance/protocol';

export const REDSTONE_DATA_SERVICE_ID = 'redstone-primary-prod';
export const REDSTONE_AUTHENTICATED_GATEWAY_URL = 'https://oracle-gateway.a.redstone.finance';
export const REDSTONE_MAX_PACKAGE_AGE_MS = 5 * 60 * 1000;
const REDSTONE_GATEWAY_TIMEOUT_MS = 10_000;
const REDSTONE_MINIMUM_SIGNERS = 3;
const REDSTONE_DISCOVERY_MAX_ATTEMPTS = 3;

export interface RedStoneFeedSnapshot {
  dataFeedId: string;
  value: number;
  timestampMilliseconds: number;
}

function getGatewayApiKey(environmentVariable: string): string {
  const apiKey = process.env[environmentVariable]?.trim();
  if (!apiKey) {
    throw new Error(`${environmentVariable} is required for the authenticated RedStone gateway`);
  }
  return apiKey;
}

function getAuthorizedSigners(): string[] {
  const signers = getSignersForDataServiceId(REDSTONE_DATA_SERVICE_ID);
  if (signers.length < REDSTONE_MINIMUM_SIGNERS) {
    throw new Error(
      `RedStone service ${REDSTONE_DATA_SERVICE_ID} has only ${signers.length} configured signers`
    );
  }
  return signers;
}

function createRequestParams(apiKey: string, enforceFreshness: boolean) {
  return {
    dataServiceId: REDSTONE_DATA_SERVICE_ID,
    uniqueSignersCount: REDSTONE_MINIMUM_SIGNERS,
    authorizedSigners: getAuthorizedSigners(),
    ...(enforceFreshness ? { maxTimestampDeviationMS: REDSTONE_MAX_PACKAGE_AGE_MS } : {}),
    singleGatewayTimeoutMs: REDSTONE_GATEWAY_TIMEOUT_MS,
    authenticatedGateways: [{ url: REDSTONE_AUTHENTICATED_GATEWAY_URL, apiKey }],
  };
}

function extractSnapshot(
  dataFeedId: string,
  response: DataPackagesResponse
): RedStoneFeedSnapshot | null {
  const signedPackages = extractSignedDataPackagesForFeedId(response, dataFeedId);
  if (!signedPackages?.length) return null;

  const values = signedPackages.flatMap((signedPackage: SignedDataPackage) =>
    signedPackage.dataPackage.dataPoints
      .filter((dataPoint) => dataPoint.dataFeedId === dataFeedId)
      .map((dataPoint) => dataPoint.toObj().value)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  );

  if (!values.length || values.some((value) => value <= 0)) return null;

  let timestampMilliseconds: number;
  try {
    timestampMilliseconds = getDataPackagesTimestamp(response, dataFeedId);
  } catch {
    return null;
  }

  if (
    !Number.isSafeInteger(timestampMilliseconds) ||
    timestampMilliseconds <= 0 ||
    Date.now() - timestampMilliseconds > REDSTONE_MAX_PACKAGE_AGE_MS ||
    timestampMilliseconds - Date.now() > 30_000
  ) {
    return null;
  }

  return {
    dataFeedId,
    value: aggregateValues(values, 'median'),
    timestampMilliseconds,
  };
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error instanceof AggregateError) return error.errors.some(isRetryable);

  const status = (error as Error & { response?: { status?: unknown } }).response?.status;
  if (typeof status === 'number') return status === 429 || status >= 500;

  const code = (error as Error & { code?: unknown }).code;
  if (
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN'
  ) {
    return true;
  }

  const message = error.message.toLowerCase();
  if (
    message.includes('fetch failed') ||
    message.includes('timeout') ||
    message.includes('network')
  ) {
    return true;
  }

  const cause = (error as Error & { cause?: unknown }).cause;
  return cause !== undefined && cause !== error ? isRetryable(cause) : false;
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = (error as Error & { code?: unknown }).code;
  const codeText = typeof code === 'string' ? ` (${code})` : '';
  if (error instanceof AggregateError) {
    return `${error.name}: ${error.message}; ${error.errors.map(describeError).join(' | ')}`;
  }
  const cause = (error as Error & { cause?: unknown }).cause;
  return `${error.name}${codeText}: ${error.message}${
    cause !== undefined && cause !== error ? `; cause=${describeError(cause)}` : ''
  }`;
}

async function requestCatalogueWithRetry(apiKey: string): Promise<DataPackagesResponse> {
  const requestParams = {
    ...createRequestParams(apiKey, false),
    returnAllPackages: true as const,
  };
  let lastError: unknown;

  for (let attempt = 1; attempt <= REDSTONE_DISCOVERY_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await requestDataPackages(requestParams);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === REDSTONE_DISCOVERY_MAX_ATTEMPTS) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
    }
  }

  throw new Error(
    `RedStone authenticated catalogue request failed after ${REDSTONE_DISCOVERY_MAX_ATTEMPTS} attempts: ${describeError(lastError)}`,
    { cause: lastError }
  );
}

/** Fetch one feed from the authenticated production gateway and require 3 verified signers. */
export async function fetchRedStoneFeedSnapshot(
  dataFeedId: string
): Promise<RedStoneFeedSnapshot | null> {
  const apiKey = getGatewayApiKey('REDSTONE_GATEWAY_API_KEY');
  const response = await requestDataPackages({
    ...createRequestParams(apiKey, true),
    dataPackagesIds: [dataFeedId],
  });
  return extractSnapshot(dataFeedId, response);
}

/** Fetch the full catalogue; RedStone requires an admin API key for this operation. */
export async function fetchRedStoneFeedCatalogue(): Promise<RedStoneFeedSnapshot[]> {
  const apiKey = getGatewayApiKey('REDSTONE_GATEWAY_ADMIN_API_KEY');
  const response = await requestCatalogueWithRetry(apiKey);
  return getResponseFeedIds(response)
    .map((dataFeedId) => extractSnapshot(dataFeedId, response))
    .filter((snapshot): snapshot is RedStoneFeedSnapshot => snapshot !== null);
}
