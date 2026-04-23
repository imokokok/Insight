import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('RpcClientWithFallback');

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
          throw new Error(`RPC error: ${result.error.message}`);
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
        lastError = error instanceof Error ? error : new Error(String(error));

        const isUserAbort = signal?.aborted;
        const isTimeout = error instanceof Error && error.name === 'AbortError' && !isUserAbort;

        if (isUserAbort) {
          throw new Error(`Request aborted for ${this.contextLabel}/${key}`);
        }

        if (!isTimeout) {
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
        } else {
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
}
