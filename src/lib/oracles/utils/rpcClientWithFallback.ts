import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('RpcClientWithFallback');

/**
 * A JSON-RPC error returned in the node's response body (e.g. `execution
 * reverted`, `method not found`). The node is alive and reachable — this is a
 * deterministic, on-chain result, NOT an outage. It must NOT poison endpoint
 * health and (being deterministic) does not benefit from retrying other nodes.
 */
export class RpcApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RpcApplicationError';
  }
}

interface RPCResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * A transaction receipt as returned by `eth_getTransactionReceipt`.
 *
 * Numeric fields arrive as hex strings (`0x…`) and are deliberately NOT
 * widened here: the receipt is raw evidence, and callers that turn it into a
 * signed statement must do their own parsing so a malformed value surfaces as
 * an error rather than silently becoming 0.
 */
export interface RpcTransactionReceipt {
  transactionHash: `0x${string}` | null;
  transactionIndex: string | null;
  blockHash: `0x${string}` | null;
  /** Hex block number, null while the transaction is still pending. */
  blockNumber: string | null;
  from: `0x${string}`;
  to: `0x${string}` | null;
  cumulativeGasUsed: string;
  gasUsed: string;
  effectiveGasPrice: string;
  /** '0x1' = success, '0x0' = reverted. */
  status: string;
  type?: string;
  contractAddress: `0x${string}` | null;
  logs: Array<{
    address: `0x${string}`;
    topics: `0x${string}`[];
    data: `0x${string}`;
    blockNumber: string | null;
    transactionHash: `0x${string}` | null;
    transactionIndex?: string | null;
    logIndex: string | null;
    removed?: boolean;
  }>;
}

/** A block header subset, as returned by `eth_getBlockByNumber`. */
export interface RpcBlock {
  number: string | null;
  hash: `0x${string}` | null;
  /** Hex unix timestamp of block production. */
  timestamp: string;
}

/** A transaction as returned by `eth_getTransactionByHash`. */
export interface RpcTransaction {
  hash: `0x${string}` | null;
  blockNumber: string | null;
  from: `0x${string}`;
  to: `0x${string}` | null;
  /** Hex value transferred, in wei. */
  value: string;
  gasPrice?: string;
  input?: `0x${string}`;
}

/** Block tag accepted by the read methods. Hex strings must be 0x-prefixed. */
export type RpcBlockTag = 'latest' | 'earliest' | 'pending' | `0x${string}` | number;

export class RpcClientWithFallback {
  private requestId = 0;
  private endpointHealth: Record<string, boolean> = {};
  private currentEndpointIndex: Record<string, number> = {};
  private endpointFailureTime: Record<string, number> = {};
  private readonly requestTimeout: number;
  private readonly endpointRecoveryTime: number;
  private readonly contextLabel: string;

  constructor(options?: {
    requestTimeout?: number;
    endpointRecoveryTime?: number;
    contextLabel?: string;
  }) {
    this.requestTimeout = options?.requestTimeout ?? 10000;
    this.endpointRecoveryTime = options?.endpointRecoveryTime ?? 60000;
    this.contextLabel = options?.contextLabel ?? 'unknown';
  }

  resetHealthState(): void {
    this.endpointHealth = {};
    this.currentEndpointIndex = {};
    this.endpointFailureTime = {};
  }

  isEndpointHealthy(key: string, index: number): boolean {
    const healthKey = `${key}-${index}`;
    const health = this.endpointHealth[healthKey];

    if (health === false) {
      const lastFail = this.endpointFailureTime[healthKey];
      if (lastFail && Date.now() - lastFail > this.endpointRecoveryTime) {
        this.endpointHealth[healthKey] = true;
        delete this.endpointFailureTime[healthKey];
        logger.debug(`Endpoint ${healthKey} recovered`, { context: this.contextLabel, key, index });
        return true;
      }
      return false;
    }
    return true;
  }

  async rpcCallWithFallback<T>(
    key: string,
    endpoints: string[],
    method: string,
    params: unknown[],
    signal?: AbortSignal
  ): Promise<T> {
    if (!endpoints || endpoints.length === 0) {
      throw new Error(`No RPC endpoints for ${this.contextLabel}/${key}`);
    }

    if (signal?.aborted) {
      throw new Error(`Request aborted for ${this.contextLabel}/${key}`);
    }

    const startIndex = this.currentEndpointIndex[key] || 0;
    let lastError: Error | null = null;

    for (let i = 0; i < endpoints.length; i++) {
      if (signal?.aborted) {
        throw new Error(`Request aborted for ${this.contextLabel}/${key}`);
      }

      const endpointIndex = (startIndex + i) % endpoints.length;
      const endpoint = endpoints[endpointIndex];

      if (!this.isEndpointHealthy(key, endpointIndex)) {
        continue;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      const onExternalAbort = () => controller.abort();
      if (signal) {
        signal.addEventListener('abort', onExternalAbort, { once: true });
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: ++this.requestId,
            method,
            params,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (signal) {
          signal.removeEventListener('abort', onExternalAbort);
        }

        if (!response.ok) {
          throw new Error(`RPC call failed: ${response.status}`);
        }

        const result: RPCResponse<T> = await response.json();

        if (result.error) {
          // The node responded with a JSON-RPC error. It is alive, so we must
          // NOT mark it unhealthy (that would wrongly poison the shared pool
          // for every other caller on this chain). Surface it as an
          // application error so the caller can decide how to handle it.
          throw new RpcApplicationError(`RPC error: ${result.error.message}`);
        }

        this.currentEndpointIndex[key] = endpointIndex;
        this.endpointHealth[`${key}-${endpointIndex}`] = true;
        delete this.endpointFailureTime[`${key}-${endpointIndex}`];

        return result.result as T;
      } catch (error) {
        clearTimeout(timeoutId);
        if (signal) {
          signal.removeEventListener('abort', onExternalAbort);
        }
        lastError = normalizeError(error);

        const isUserAbort = signal?.aborted;
        const isTimeout = error instanceof Error && error.name === 'AbortError' && !isUserAbort;
        const isApplicationError = error instanceof RpcApplicationError;

        if (isUserAbort) {
          throw new Error(`Request aborted for ${this.contextLabel}/${key}`);
        }

        // A contract revert / JSON-RPC application error means the node answered
        // and is healthy — do NOT mark it down. (Timeouts are also transient and
        // excluded.) Only real transport failures (connection refused, 5xx,
        // DNS, module/network errors) poison the endpoint so the pool routes
        // around a dead node.
        if (!isTimeout && !isApplicationError) {
          const healthKey = `${key}-${endpointIndex}`;
          this.endpointHealth[healthKey] = false;
          this.endpointFailureTime[healthKey] = Date.now();
        }

        if (isTimeout) {
          logger.warn(`RPC endpoint ${endpoint} timed out after ${this.requestTimeout}ms`, {
            context: this.contextLabel,
            key,
            endpoint,
            method,
          });
        } else if (!isApplicationError) {
          logger.warn(`RPC endpoint ${endpoint} failed, trying next`, {
            context: this.contextLabel,
            key,
            endpoint,
            error: lastError.message,
          });
        }
      }
    }

    throw lastError || new Error(`All RPC endpoints failed for ${this.contextLabel}/${key}`);
  }

  /**
   * `eth_call` with an optional block tag.
   *
   * The block parameter was originally hardcoded to 'latest'. Historical reads
   * need a real block parameter, so it is now accepted — but the default stays
   * 'latest' and every pre-existing caller is unaffected. Note that reading at
   * an old block requires an archival endpoint; a non-archival node typically
   * answers with an error or a misleading 'latest' value, so callers that need
   * historical state should treat a failure here as "unavailable", not as a
   * zero.
   */
  async ethCall(
    key: string,
    endpoints: string[],
    to: `0x${string}`,
    data: `0x${string}`,
    signal?: AbortSignal,
    blockTag: RpcBlockTag = 'latest'
  ): Promise<string> {
    const result = await this.rpcCallWithFallback<string>(
      key,
      endpoints,
      'eth_call',
      [{ to, data }, this.blockParam(blockTag)],
      signal
    );

    if (!result || result === '0x') {
      throw new Error('Contract call returned empty data');
    }

    if (result.startsWith('0x08c379a0')) {
      throw new Error(`Contract revert: ${result}`);
    }

    return result;
  }

  async getBlockNumber(key: string, endpoints: string[]): Promise<bigint> {
    const result = await this.rpcCallWithFallback<string>(key, endpoints, 'eth_blockNumber', []);
    return BigInt(result);
  }

  async getLogs(
    key: string,
    endpoints: string[],
    params: {
      address?: `0x${string}`;
      fromBlock?: `0x${string}` | number | 'earliest' | 'latest' | 'pending';
      toBlock?: `0x${string}` | number | 'earliest' | 'latest' | 'pending';
      topics?: (string | string[] | null)[];
    },
    signal?: AbortSignal
  ): Promise<unknown[]> {
    const result = await this.rpcCallWithFallback<unknown[]>(
      key,
      endpoints,
      'eth_getLogs',
      [params],
      signal
    );
    return result ?? [];
  }

  /** Normalise a block tag for the JSON-RPC params array. Numeric block
   *  numbers are converted to the 0x-prefixed hex the spec requires; the
   *  named tags pass through unchanged. */
  private blockParam(tag: RpcBlockTag): `0x${string}` | 'latest' | 'earliest' | 'pending' {
    if (typeof tag === 'number') {
      return `0x${tag.toString(16)}` as `0x${string}`;
    }
    return tag;
  }

  /**
   * `eth_getTransactionReceipt`. Returns null for a transaction the node does
   * not know about yet (pending or unknown hash) — this is a legitimate answer,
   * not an error, so it must not be conflated with a node failure.
   */
  async getTransactionReceipt(
    key: string,
    endpoints: string[],
    txHash: `0x${string}`,
    signal?: AbortSignal
  ): Promise<RpcTransactionReceipt | null> {
    const result = await this.rpcCallWithFallback<RpcTransactionReceipt | null>(
      key,
      endpoints,
      'eth_getTransactionReceipt',
      [txHash],
      signal
    );
    return result ?? null;
  }

  /** `eth_getTransactionByHash`. Null when the node has never seen the hash. */
  async getTransactionByHash(
    key: string,
    endpoints: string[],
    txHash: `0x${string}`,
    signal?: AbortSignal
  ): Promise<RpcTransaction | null> {
    const result = await this.rpcCallWithFallback<RpcTransaction | null>(
      key,
      endpoints,
      'eth_getTransactionByHash',
      [txHash],
      signal
    );
    return result ?? null;
  }

  /**
   * `eth_getBlockByNumber` with the transaction hashes omitted — only the
   * header fields this codebase needs (number, hash, timestamp). Returns null
   * for blocks outside the node's retained range.
   */
  async getBlockByNumber(
    key: string,
    endpoints: string[],
    blockTag: RpcBlockTag,
    signal?: AbortSignal
  ): Promise<RpcBlock | null> {
    const result = await this.rpcCallWithFallback<RpcBlock | null>(
      key,
      endpoints,
      'eth_getBlockByNumber',
      [this.blockParam(blockTag), false],
      signal
    );
    return result ?? null;
  }
}
