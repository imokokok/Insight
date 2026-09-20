import { AppError, UnsupportedSymbolError } from '@/lib/errors';

import {
  buildRobinhoodRwaContext,
  ROBINHOOD_CHAIN_ID,
  type RobinhoodCorporateAction,
  type RobinhoodDeployment,
  type RobinhoodOnchainMultiplierState,
  type RobinhoodRwaContext,
  type RobinhoodStockTokenAsset,
  type RobinhoodStockTokenQuote,
} from '../../../sdk/src/rwa-robinhood';

import {
  readRobinhoodOnchainState,
  robinhoodOnchainNotRequested,
  type RobinhoodOnchainReadOptions,
} from './robinhoodOnchain';
import {
  RobinhoodAssetsResponseSchema,
  RobinhoodCorporateActionsResponseSchema,
  RobinhoodPricesResponseSchema,
  type RobinhoodAssetsResponse,
  type RobinhoodCorporateActionsResponse,
  type RobinhoodPricesResponse,
} from './robinhoodSchema';

import type { z } from 'zod';

const ROBINHOOD_API_BASE_URL = 'https://api.robinhood.com/rhj';
const ROBINHOOD_REQUEST_TIMEOUT_MS = 10_000;
const ASSET_CACHE_MS = 60_000;
const QUOTE_CACHE_MS = 15_000;
const CORPORATE_ACTION_CACHE_MS = 60 * 60 * 1000;

interface CacheEntry {
  expiresAt: number;
  value: Promise<unknown>;
}

const fetchCaches = new WeakMap<object, Map<string, CacheEntry>>();

class RobinhoodIssuerContextError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    super({
      message,
      code: 'ROBINHOOD_ISSUER_CONTEXT_UNAVAILABLE',
      statusCode: 502,
      category: 'external_service',
      severity: 'medium',
      isOperational: true,
      retryable: true,
      details,
      cause,
    });
  }
}

export interface RobinhoodRwaContextOptions {
  verifyOnchain?: boolean;
  fetchImpl?: typeof fetch;
  now?: () => number;
  rpcUrl?: string;
  readOnchain?: (
    address: `0x${string}`,
    options?: RobinhoodOnchainReadOptions
  ) => Promise<RobinhoodOnchainMultiplierState>;
}

function getCache(fetchImpl: typeof fetch): Map<string, CacheEntry> {
  const cacheKey = fetchImpl as unknown as object;
  let cache = fetchCaches.get(cacheKey);
  if (!cache) {
    cache = new Map();
    fetchCaches.set(cacheKey, cache);
  }
  return cache;
}

async function cached<T>(
  fetchImpl: typeof fetch,
  key: string,
  ttlMs: number,
  now: () => number,
  load: () => Promise<T>
): Promise<T> {
  const cache = getCache(fetchImpl);
  const current = cache.get(key);
  const timestamp = now();
  if (current && current.expiresAt > timestamp) return current.value as Promise<T>;

  const value = load().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { expiresAt: timestamp + ttlMs, value });
  return value;
}

async function fetchJson<T>(
  url: string,
  schema: z.ZodType<T>,
  fetchImpl: typeof fetch,
  cacheSeconds: number
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error('Robinhood issuer-context request timed out')),
    ROBINHOOD_REQUEST_TIMEOUT_MS
  );
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: cacheSeconds },
    } as RequestInit & { next: { revalidate: number } });
    if (!response.ok) {
      throw new RobinhoodIssuerContextError(`Robinhood API returned HTTP ${response.status}`, {
        endpoint: new URL(url).pathname,
        status: response.status,
      });
    }
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      throw new RobinhoodIssuerContextError('Robinhood API returned an invalid response', {
        endpoint: new URL(url).pathname,
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new RobinhoodIssuerContextError(
      'Unable to retrieve Robinhood issuer context',
      { endpoint: new URL(url).pathname },
      error instanceof Error ? error : undefined
    );
  } finally {
    clearTimeout(timeout);
  }
}

function deployment(
  raw: RobinhoodAssetsResponse['assets'][number]['deployments'][number]
): RobinhoodDeployment {
  return {
    contractAddress: raw.contractAddress as `0x${string}`,
    chainId: raw.chainId,
    ...(raw.networkName ? { networkName: raw.networkName } : {}),
  };
}

function asset(raw: RobinhoodAssetsResponse['assets'][number]): RobinhoodStockTokenAsset {
  return {
    id: raw.id as `0x${string}`,
    tokenSymbol: raw.tokenSymbol,
    tokenName: raw.tokenName,
    deployments: raw.deployments.map(deployment),
    currentMultiplier: raw.currentMultiplier,
    pendingMultiplier: raw.pendingMultiplier || null,
    pendingMultiplierEffectiveTime: raw.pendingMultiplierEffectiveTime ?? null,
    tradingCapabilities: raw.tradingCapabilities,
    status: raw.status,
    ...(raw.tokenDecimals != null ? { tokenDecimals: raw.tokenDecimals } : {}),
    ...(raw.isin ? { isin: raw.isin } : {}),
    ...(raw.logoUrl ? { logoUrl: raw.logoUrl } : {}),
  };
}

function quote(raw: RobinhoodPricesResponse['quotes'][number]): RobinhoodStockTokenQuote {
  return {
    tokenSymbol: raw.tokenSymbol,
    deployments: raw.deployments.map(deployment),
    bid: raw.bid,
    ask: raw.ask,
    currency: raw.currency,
    dailyTradingVolume: raw.dailyTradingVolume,
    isTradingHalt: raw.isTradingHalt,
    generatedAt: raw.generatedAt,
  };
}

function corporateAction(
  raw: RobinhoodCorporateActionsResponse['corpActions'][number]
): RobinhoodCorporateAction {
  return {
    id: raw.id as `0x${string}`,
    type: raw.type,
    status: raw.status,
    processDate: raw.processDate,
    tokenSymbol: raw.tokenSymbol,
    deployments: raw.deployments.map(deployment),
    details: raw.details,
  };
}

/**
 * Fetch first-party Robinhood issuer context and cross-check its multiplier
 * against the Stock Token contract. This result never enters oracle quorum.
 */
export async function getRobinhoodRwaContext(
  requestedSymbol: string,
  options: RobinhoodRwaContextOptions = {}
): Promise<RobinhoodRwaContext> {
  const symbol = requestedSymbol.trim().toUpperCase();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) throw new RobinhoodIssuerContextError('No fetch implementation is available');
  const now = options.now ?? Date.now;

  const assetsResponse = await cached<RobinhoodAssetsResponse>(
    fetchImpl,
    'assets',
    ASSET_CACHE_MS,
    now,
    () =>
      fetchJson(
        `${ROBINHOOD_API_BASE_URL}/assets`,
        RobinhoodAssetsResponseSchema,
        fetchImpl,
        ASSET_CACHE_MS / 1000
      )
  );
  const rawAsset = assetsResponse.assets.find(
    (candidate) => candidate.tokenSymbol.toUpperCase() === symbol
  );
  if (!rawAsset) throw UnsupportedSymbolError.create(symbol, [], 'robinhood-rhj');

  const mappedAsset = asset(rawAsset);
  const mainnetDeployment = mappedAsset.deployments.find(
    (candidate) => candidate.chainId === ROBINHOOD_CHAIN_ID
  );
  if (!mainnetDeployment) {
    throw new RobinhoodIssuerContextError('Robinhood Stock Token has no mainnet deployment', {
      symbol,
      expectedChainId: ROBINHOOD_CHAIN_ID,
    });
  }

  const onchainPromise: Promise<RobinhoodOnchainMultiplierState> =
    options.verifyOnchain === false
      ? Promise.resolve(robinhoodOnchainNotRequested())
      : (async () => {
          const readOnchain = options.readOnchain ?? readRobinhoodOnchainState;
          try {
            return await readOnchain(mainnetDeployment.contractAddress, {
              rpcUrl: options.rpcUrl,
              now,
            });
          } catch {
            return {
              ...robinhoodOnchainNotRequested(),
              attempted: true,
              rpcMode:
                options.rpcUrl || process.env.ROBINHOOD_RPC_URL
                  ? 'configured'
                  : 'public-rate-limited',
              errorCode: 'ROBINHOOD_ONCHAIN_READ_FAILED',
            };
          }
        })();

  const [pricesResponse, actionsResponse, onchain] = await Promise.all([
    cached<RobinhoodPricesResponse>(fetchImpl, `prices:${symbol}`, QUOTE_CACHE_MS, now, () =>
      fetchJson(
        `${ROBINHOOD_API_BASE_URL}/prices/${encodeURIComponent(symbol)}`,
        RobinhoodPricesResponseSchema,
        fetchImpl,
        QUOTE_CACHE_MS / 1000
      )
    ),
    cached<RobinhoodCorporateActionsResponse>(
      fetchImpl,
      'corporate-actions',
      CORPORATE_ACTION_CACHE_MS,
      now,
      () =>
        fetchJson(
          `${ROBINHOOD_API_BASE_URL}/corporate-actions`,
          RobinhoodCorporateActionsResponseSchema,
          fetchImpl,
          CORPORATE_ACTION_CACHE_MS / 1000
        )
    ),
    onchainPromise,
  ]);

  const rawQuote = pricesResponse.quotes.find(
    (candidate) => candidate.tokenSymbol.toUpperCase() === symbol
  );
  if (!rawQuote) throw UnsupportedSymbolError.create(symbol, [], 'robinhood-rhj');

  const retrievedAt = Math.floor(now() / 1000);
  try {
    return buildRobinhoodRwaContext({
      asset: mappedAsset,
      deployment: mainnetDeployment,
      quote: quote(rawQuote),
      corporateActions: actionsResponse.corpActions
        .filter((action) => action.tokenSymbol.toUpperCase() === symbol)
        .map(corporateAction),
      onchain,
      retrievedAt,
    });
  } catch (error) {
    throw new RobinhoodIssuerContextError(
      'Robinhood issuer context could not be normalized safely',
      { symbol },
      error instanceof Error ? error : undefined
    );
  }
}
