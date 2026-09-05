import { InsightApiError } from './errors';

import type {
  ExecutionReceiptRequest,
  ExecutionReceiptResult,
  InsightClientOptions,
  OracleWatchResult,
  OracleWatchTarget,
  PreTradeRequest,
  PreTradeResult,
} from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string; retryable?: boolean };
  meta?: { requestId?: string };
}

const DEFAULT_BASE_URL = 'https://www.oracleinsight.xyz';

/** A small typed client. All calls remain server-side, authenticated and credit-metered. */
export class InsightClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof globalThis.fetch;
  private readonly extraHeaders: Record<string, string>;

  constructor(options: InsightClientOptions) {
    if (!options.apiKey.trim()) throw new Error('InsightClient requires an API key.');
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.fetcher = options.fetch ?? globalThis.fetch;
    if (!this.fetcher)
      throw new Error('No fetch implementation is available. Node 18+ is required.');
    this.extraHeaders = options.headers ?? {};
  }

  async preTrade(request: PreTradeRequest, signal?: AbortSignal): Promise<PreTradeResult> {
    const query: Record<string, string | number | undefined> = {
      asset: request.asset,
      chainId: request.chainId,
      action: request.action,
      tradeAmountUsd: request.tradeAmountUsd,
      targetProviders: request.targetProviders?.join(','),
      protocolId: request.protocolId,
      schemaVersion: request.schemaVersion ?? 3,
      destinationAsset: request.destinationAsset,
    };
    return this.request('GET', '/api/v1/safety/pre-trade', { query, signal });
  }

  async oracleWatch(target: OracleWatchTarget, signal?: AbortSignal): Promise<OracleWatchResult> {
    return this.request('GET', '/api/v1/oracle-watch', {
      query: { symbol: target.symbol, chain: target.chain, attest: 'true' },
      signal,
    });
  }

  async issueExecutionReceipt(
    request: ExecutionReceiptRequest,
    signal?: AbortSignal
  ): Promise<ExecutionReceiptResult> {
    return this.request('POST', '/api/v1/execution/attestation/issue', { body: request, signal });
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    options: {
      query?: Record<string, string | number | undefined>;
      body?: unknown;
      signal?: AbortSignal;
    }
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const response = await this.fetcher(url, {
      method,
      signal: options.signal,
      headers: {
        Accept: 'application/json',
        'X-API-Key': this.apiKey,
        ...this.extraHeaders,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    let payload: ApiEnvelope<T> | null = null;
    try {
      payload = (await response.json()) as ApiEnvelope<T>;
    } catch {
      // Keep the error below structured even if an intermediary returned HTML.
    }

    if (!response.ok || !payload?.success || payload.data === undefined) {
      const retryAfter = response.headers.get('retry-after');
      throw new InsightApiError(
        payload?.error?.message ?? `Insight API request failed (${response.status})`,
        {
          status: response.status,
          code: payload?.error?.code ?? 'API_REQUEST_FAILED',
          retryable: payload?.error?.retryable ?? response.status >= 500,
          requestId: payload?.meta?.requestId,
          retryAfterSeconds: retryAfter ? Number(retryAfter) || undefined : undefined,
          creditCost: readNumberHeader(response, 'x-credit-cost'),
          creditBalance: readNumberHeader(response, 'x-credit-balance'),
        }
      );
    }
    return payload.data;
  }
}

function readNumberHeader(response: Response, name: string): number | undefined {
  const value = response.headers.get(name);
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
