import { createLogger } from './logger';

const logger = createLogger('RequestQueue');

const DEFAULT_MAX_CONCURRENCY = 6;
const DEFAULT_TIMEOUT = 30000;

export type RequestPriority = 'high' | 'normal' | 'low';

const PRIORITY_VALUES: Record<RequestPriority, number> = {
  high: 3,
  normal: 2,
  low: 1,
};

interface QueuedRequest {
  id: string;
  execute: () => Promise<unknown>;
  priority: RequestPriority;
  timestamp: number;
  timeout: number;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  abortSignal?: AbortSignal;
  timeoutId?: NodeJS.Timeout;
}

interface RequestQueueConfig {
  maxConcurrency?: number;
  defaultTimeout?: number;
}

interface RequestQueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

export class RequestQueue {
  private queue: QueuedRequest[] = [];
  private running = 0;
  private completed = 0;
  private failed = 0;
  private maxConcurrency: number;
  private defaultTimeout: number;
  private requestIdCounter = 0;
  private runningRequests = new Map<string, QueuedRequest>();

  constructor(config: RequestQueueConfig = {}) {
    this.maxConcurrency = config.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
    this.defaultTimeout = config.defaultTimeout ?? DEFAULT_TIMEOUT;
    logger.info('RequestQueue initialized', {
      maxConcurrency: this.maxConcurrency,
      defaultTimeout: this.defaultTimeout,
    });
  }

  private generateId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  private comparePriority(a: QueuedRequest, b: QueuedRequest): number {
    const priorityDiff = PRIORITY_VALUES[b.priority] - PRIORITY_VALUES[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.timestamp - b.timestamp;
  }

  private insertSorted(request: QueuedRequest): void {
    let low = 0;
    let high = this.queue.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.comparePriority(this.queue[mid], request) < 0) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    this.queue.splice(low, 0, request);
  }

  async add<T>(
    execute: () => Promise<T>,
    options: {
      priority?: RequestPriority;
      timeout?: number;
      abortSignal?: AbortSignal;
    } = {}
  ): Promise<T> {
    const { priority = 'normal', timeout = this.defaultTimeout, abortSignal } = options;

    if (abortSignal?.aborted) {
      throw new DOMException('Request aborted', 'AbortError');
    }

    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest = {
        id: this.generateId(),
        execute: execute as () => Promise<unknown>,
        priority,
        timestamp: Date.now(),
        timeout,
        resolve: resolve as (value: unknown) => void,
        reject,
        abortSignal,
      };

      this.insertSorted(request);

      if (abortSignal) {
        const onAbort = () => {
          const index = this.queue.findIndex((r) => r.id === request.id);
          if (index !== -1) {
            this.queue.splice(index, 1);
            reject(new DOMException('Request aborted', 'AbortError'));
          }
        };
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }

      logger.debug('Request added to queue', {
        id: request.id,
        priority,
        queueLength: this.queue.length,
        running: this.running,
      });

      this.processQueue();
    });
  }

  private processQueue(): void {
    while (this.running < this.maxConcurrency && this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) break;

      if (request.abortSignal?.aborted) {
        continue;
      }

      this.executeRequest(request);
    }
  }

  private async executeRequest(request: QueuedRequest): Promise<void> {
    this.running++;
    this.runningRequests.set(request.id, request);

    const timeoutId = setTimeout(() => {
      this.handleTimeout(request);
    }, request.timeout);

    request.timeoutId = timeoutId;

    try {
      logger.debug('Executing request', {
        id: request.id,
        running: this.running,
        queueLength: this.queue.length,
      });

      const result = await request.execute();

      clearTimeout(timeoutId);
      this.runningRequests.delete(request.id);
      this.completed++;
      this.running--;

      request.resolve(result);

      logger.debug('Request completed', {
        id: request.id,
        running: this.running,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      this.runningRequests.delete(request.id);
      this.failed++;
      this.running--;

      const err = error instanceof Error ? error : new Error(String(error));
      request.reject(err);

      logger.error('Request failed', err, {
        id: request.id,
        running: this.running,
      });
    } finally {
      this.processQueue();
    }
  }

  private handleTimeout(request: QueuedRequest): void {
    const queueIndex = this.queue.findIndex((r) => r.id === request.id);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      this.failed++;

      const error = new DOMException('Request timeout', 'TimeoutError');
      request.reject(error);

      logger.warn('Request timed out in queue', {
        id: request.id,
        timeout: request.timeout,
      });
      return;
    }

    if (this.runningRequests.has(request.id)) {
      this.runningRequests.delete(request.id);
      this.failed++;
      this.running--;

      const error = new DOMException('Request timeout', 'TimeoutError');
      request.reject(error);

      logger.warn('Request timed out while running', {
        id: request.id,
        timeout: request.timeout,
      });

      this.processQueue();
    }
  }

  getStats(): RequestQueueStats {
    return {
      pending: this.queue.length,
      running: this.running,
      completed: this.completed,
      failed: this.failed,
    };
  }

  clear(): void {
    const pendingCount = this.queue.length;
    this.queue.forEach((request) => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    logger.info('Queue cleared', { clearedCount: pendingCount });
  }

  setMaxConcurrency(max: number): void {
    this.maxConcurrency = Math.max(1, max);
    logger.info('Max concurrency updated', { maxConcurrency: this.maxConcurrency });
    this.processQueue();
  }
}

let globalQueue: RequestQueue | null = null;

export function getRequestQueue(config?: RequestQueueConfig): RequestQueue {
  if (!globalQueue) {
    globalQueue = new RequestQueue(config);
  }
  return globalQueue;
}
