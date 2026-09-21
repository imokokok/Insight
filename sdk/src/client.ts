import { type SignedCoverageReport } from './coverage';
import { InsightApiError } from './errors';
import { stripTrailingSlashes } from './url';

import type { RwaInput, RwaPolicy, RwaReport } from './rwa';
import type { RwaInstrumentAdmission } from './rwa-instrument-registry';
import type { RobinhoodRwaContext } from './rwa-robinhood';
import type {
  CoverageRequest,
  CoverageResult,
  ExecutionReceiptRequest,
  ExecutionReceiptResult,
  InsightClientOptions,
  OracleWatchResult,
  OracleWatchTarget,
  PreTradeRequest,
  PreTradeResult,
  PreTradeRecheckRequest,
  PreTradeRecheckResult,
  ResponseMeta,
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
  private readonly timeoutMs: number;
  private readonly onResponseMeta?: InsightClientOptions['onResponseMeta'];

  constructor(options: InsightClientOptions) {
    if (!options.apiKey.trim()) throw new Error('InsightClient requires an API key.');
    this.apiKey = options.apiKey;
    this.onResponseMeta = options.onResponseMeta;
    this.baseUrl = stripTrailingSlashes(options.baseUrl ?? DEFAULT_BASE_URL);
    this.fetcher = options.fetch ?? globalThis.fetch;
    if (!this.fetcher)
      throw new Error('No fetch implementation is available. Node 18+ is required.');
    this.extraHeaders = options.headers ?? {};
    this.timeoutMs = options.timeoutMs ?? 15_000;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1) {
      throw new TypeError('timeoutMs must be a positive integer.');
    }
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
      workflowTag: request.workflowTag,
      baselineVerdict: request.baselineVerdict,
      baselineVersion: request.baselineVersion,
    };
    const result = await this.request<unknown>('GET', '/api/v1/safety/pre-trade', {
      query,
      signal,
    });
    return validatePreTradeResult(result);
  }

  /** Unsigned evaluation of caller-supplied data; never sufficient to authorize execution. */
  async rwaAssessment(
    input: RwaInput,
    policy: RwaPolicy,
    signal?: AbortSignal
  ): Promise<{
    mode: 'diagnostic';
    mayAuthorizeExecution: false;
    evidenceProvenance: 'caller-supplied-unverified';
    report: RwaReport;
  }> {
    return this.request('POST', '/api/v1/rwa/assessment', { body: { input, policy }, signal });
  }

  /**
   * First-party issuer context for one Robinhood Stock Token. This is not an
   * independent oracle observation and never counts toward oracle quorum.
   */
  async robinhoodRwaContext(
    symbol: string,
    options: { verifyOnchain?: boolean } = {},
    signal?: AbortSignal
  ): Promise<RobinhoodRwaContext> {
    return this.request('GET', '/api/v1/rwa/robinhood/context', {
      query: {
        symbol,
        verifyOnchain:
          options.verifyOnchain === undefined ? undefined : String(options.verifyOnchain),
      },
      signal,
    });
  }

  /**
   * Pinned MIC/FIGI identity cross-checked against the current issuer UID,
   * ISIN and token deployment. This is admission evidence, not a price vote.
   */
  async robinhoodRwaInstrument(
    symbol: string,
    options: { verifyOnchain?: boolean } = {},
    signal?: AbortSignal
  ): Promise<RwaInstrumentAdmission> {
    return this.request('GET', '/api/v1/rwa/robinhood/instrument', {
      query: {
        symbol,
        verifyOnchain:
          options.verifyOnchain === undefined ? undefined : String(options.verifyOnchain),
      },
      signal,
    });
  }

  /** Coverage is diagnostic metadata, never a signed safety decision. */
  async coverage(request: CoverageRequest = {}, signal?: AbortSignal): Promise<CoverageResult> {
    return this.request('GET', '/api/v1/coverage', {
      query: { ...request, probe: request.probe === undefined ? undefined : String(request.probe) },
      signal,
    });
  }

  /** Must be verified against independently configured policy and signer trust before use. */
  async coverageAssessment(
    request: { asset: string; chainId: number; policyId: string },
    signal?: AbortSignal
  ): Promise<SignedCoverageReport> {
    return this.request('GET', '/api/v1/coverage/assessment', { query: request, signal });
  }

  async recheck(
    request: PreTradeRecheckRequest,
    signal?: AbortSignal
  ): Promise<PreTradeRecheckResult> {
    const value = await this.request<unknown>('POST', '/api/v1/safety/pre-trade/recheck', {
      body: {
        ...request,
        targetProviders: request.targetProviders?.join(','),
        schemaVersion: request.schemaVersion ?? 3,
      },
      signal,
    });
    const data = validatePreTradeResult(value) as PreTradeRecheckResult;
    if (
      typeof data.stillValid !== 'boolean' ||
      typeof data.stillValidReason !== 'string' ||
      data.originalUid !== request.originalUid ||
      typeof data.originalRequestHash !== 'string' ||
      data.originalRequestHash.toLowerCase() !== request.originalRequestHash.toLowerCase()
    )
      return invalidApiResponse('invalid recheck continuity response');
    if (data.recheck != null) {
      const proof = record(data.recheck);
      const proofData = record(proof.data);
      if (
        typeof proof.signature !== 'string' ||
        !/^0x[0-9a-fA-F]+$/.test(proof.signature) ||
        ![2, 3].includes(Number(proof.schemaVersion))
      )
        return invalidApiResponse('recheck is not a signed v2/v3 proof');
      if (
        proofData.originalUid !== request.originalUid ||
        String(proofData.originalRequestHash).toLowerCase() !==
          request.originalRequestHash.toLowerCase() ||
        String(proofData.requestHash).toLowerCase() !== request.originalRequestHash.toLowerCase()
      )
        return invalidApiResponse('recheck proof references do not match the original');
    }
    return data;
  }

  async oracleWatch(target: OracleWatchTarget, signal?: AbortSignal): Promise<OracleWatchResult> {
    const result = await this.request<unknown>('GET', '/api/v1/oracle-watch', {
      query: { symbol: target.symbol, chain: target.chain, attest: 'true' },
      signal,
    });
    return validateOracleWatchResult(result);
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

    const controller = new AbortController();
    const onAbort = () => controller.abort(options.signal?.reason);
    if (options.signal?.aborted) controller.abort(options.signal.reason);
    else options.signal?.addEventListener('abort', onAbort, { once: true });
    const timeout = setTimeout(
      () => controller.abort(new Error('Insight request timed out')),
      this.timeoutMs
    );

    let response: Response;
    let payload: ApiEnvelope<T> | null = null;
    try {
      response = await this.fetcher(url, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'X-API-Key': this.apiKey,
          ...this.extraHeaders,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      try {
        payload = (await response.json()) as ApiEnvelope<T>;
      } catch {
        // Keep the error below structured even if an intermediary returned HTML.
      }
    } catch (error) {
      if (controller.signal.aborted) {
        const externallyAborted = options.signal?.aborted;
        throw new InsightApiError(
          externallyAborted
            ? 'Insight request was aborted'
            : `Insight did not respond within ${this.timeoutMs}ms`,
          {
            status: 0,
            code: externallyAborted ? 'REQUEST_ABORTED' : 'REQUEST_TIMEOUT',
            retryable: !externallyAborted,
          }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', onAbort);
    }

    const meta: ResponseMeta = {
      path,
      status: response.status,
      success: response.ok && payload?.success === true && payload.data !== undefined,
      requestId: payload?.meta?.requestId ?? response.headers.get('x-request-id') ?? undefined,
      creditCost: readNumberHeader(response, 'x-credit-cost'),
      creditBalance: readNumberHeader(response, 'x-credit-balance'),
      balanceBasis: 'before_request_snapshot',
      retryAfterSeconds: readRetryAfter(response.headers.get('retry-after')),
    };
    // Metrics hooks must not cause clients to repeat an already charged request.
    try {
      await this.onResponseMeta?.(meta);
    } catch {
      /* Observational callback only. */
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
          retryAfterSeconds: readRetryAfter(retryAfter),
          creditCost: readNumberHeader(response, 'x-credit-cost'),
          creditBalance: readNumberHeader(response, 'x-credit-balance'),
        }
      );
    }
    return payload.data;
  }
}

function invalidApiResponse(message: string): never {
  throw new InsightApiError(`Insight API returned an invalid response: ${message}`, {
    status: 502,
    code: 'INVALID_API_RESPONSE',
    retryable: true,
  });
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return invalidApiResponse('expected an object');
  }
  return value as Record<string, unknown>;
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return invalidApiResponse(`${field} must be a finite number`);
  }
  return value;
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    return invalidApiResponse(`${field} must be a string array`);
  }
  return value;
}

function validatePreTradeResult(value: unknown): PreTradeResult {
  const data = record(value);
  if (!['PASS', 'CAUTION', 'DANGER', 'BLOCK'].includes(String(data.verdict))) {
    return invalidApiResponse('unknown pre-trade verdict');
  }
  for (const field of [
    'consensusPrice',
    'maxDeviationPct',
    'crossProviderAgreement',
    'recommendedMaxPositionUsd',
    'participantCount',
  ]) {
    finiteNumber(data[field], field);
  }
  stringArray(data.warnings, 'warnings');
  if (!Array.isArray(data.contributingFactors)) {
    return invalidApiResponse('contributingFactors must be an array');
  }
  if (typeof data.evaluatedAt !== 'string' || !Number.isFinite(Date.parse(data.evaluatedAt))) {
    return invalidApiResponse('evaluatedAt must be an ISO timestamp');
  }
  if (data.attestation !== null && data.attestation !== undefined) record(data.attestation);
  return data as unknown as PreTradeResult;
}

function validateOracleWatchResult(value: unknown): OracleWatchResult {
  const data = record(value);
  if (!['normal', 'caution', 'danger'].includes(String(data.verdict))) {
    return invalidApiResponse('unknown Oracle Watch verdict');
  }
  if (!['proceed', 'proceed_with_caution', 'halt'].includes(String(data.recommendation))) {
    return invalidApiResponse('unknown Oracle Watch recommendation');
  }
  if (typeof data.symbol !== 'string' || typeof data.reason !== 'string') {
    return invalidApiResponse('Oracle Watch symbol and reason must be strings');
  }
  stringArray(data.reasonCodes, 'reasonCodes');
  if (typeof data.evaluatedAt !== 'string' || !Number.isFinite(Date.parse(data.evaluatedAt))) {
    return invalidApiResponse('evaluatedAt must be an ISO timestamp');
  }
  return data as unknown as OracleWatchResult;
}

function readNumberHeader(response: Response, name: string): number | undefined {
  const value = response.headers.get(name);
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readRetryAfter(value: string | null): number | undefined {
  if (value == null) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, Math.ceil((at - Date.now()) / 1000)) : undefined;
}
