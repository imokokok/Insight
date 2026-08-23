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

  async ethCall(
    key: string,
    endpoints: string[],
    to: `0x${string}`,
    data: `0x${string}`,
    signal?: AbortSignal
  ): Promise<string> {
    const result = await this.rpcCallWithFallback<string>(
      key,
      endpoints,
      'eth_call',
      [{ to, data }, 'latest'],
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
}
