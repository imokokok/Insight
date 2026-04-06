type RequestPriority = 'critical' | 'high' | 'normal' | 'low';

interface QueuedRequest<T> {
  id: string;
  fn: () => Promise<T>;
  priority: RequestPriority;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

const PRIORITY_WEIGHTS: Record<RequestPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

const MAX_CONCURRENT_REQUESTS = 6;

class API3RequestManager {
  private queue: QueuedRequest<unknown>[] = [];
  private pendingRequests: Map<string, Promise<unknown>> = new Map();
  private currentConcurrent = 0;
  private maxConcurrent = MAX_CONCURRENT_REQUESTS;
  private isProcessing = false;
  private requestCounts: Map<string, number> = new Map();
  private rateLimitWindow = 1000;
  private maxRequestsPerWindow = 10;
  private windowStart = Date.now();

  async execute<T>(
    id: string,
    fn: () => Promise<T>,
    priority: RequestPriority = 'normal'
  ): Promise<T> {
    const dedupedRequest = this.pendingRequests.get(id);
    if (dedupedRequest) {
      return dedupedRequest as Promise<T>;
    }

    if (this.currentConcurrent < this.maxConcurrent && this.canMakeRequest()) {
      return this.executeImmediate(id, fn);
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        id,
        fn: fn as () => Promise<unknown>,
        priority,
        resolve: resolve as (value: unknown) => void,
        reject,
        timestamp: Date.now(),
      });
      this.sortQueue();
      this.processQueue();
    });
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    if (now - this.windowStart > this.rateLimitWindow) {
      this.windowStart = now;
      this.requestCounts.clear();
    }

    const currentCount = this.requestCounts.get(this.windowStart.toString()) || 0;
    return currentCount < this.maxRequestsPerWindow;
  }

  private recordRequest(): void {
    const key = this.windowStart.toString();
    const currentCount = this.requestCounts.get(key) || 0;
    this.requestCounts.set(key, currentCount + 1);
  }

  private async executeImmediate<T>(id: string, fn: () => Promise<T>): Promise<T> {
    this.currentConcurrent++;
    this.recordRequest();

    const promise = fn();
    this.pendingRequests.set(id, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.currentConcurrent--;
      this.pendingRequests.delete(id);
      this.processQueue();
    }
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });
  }

  private processQueue(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (
      this.queue.length > 0 &&
      this.currentConcurrent < this.maxConcurrent &&
      this.canMakeRequest()
    ) {
      const request = this.queue.shift();
      if (request) {
        this.executeImmediate(request.id, request.fn as () => Promise<unknown>)
          .then(request.resolve)
          .catch(request.reject);
      }
    }

    this.isProcessing = false;
  }

  getQueueStats(): {
    queueLength: number;
    pendingCount: number;
    currentConcurrent: number;
    maxConcurrent: number;
  } {
    return {
      queueLength: this.queue.length,
      pendingCount: this.pendingRequests.size,
      currentConcurrent: this.currentConcurrent,
      maxConcurrent: this.maxConcurrent,
    };
  }

  clearQueue(): void {
    this.queue.forEach((request) => {
      request.reject(new Error('Request cancelled'));
    });
    this.queue = [];
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, Math.min(10, max));
  }
}

export const api3RequestManager = new API3RequestManager();

export const REQUEST_PRIORITIES = {
  PRICE: 'critical' as RequestPriority,
  STAKING: 'high' as RequestPriority,
  DAPI_COVERAGE: 'high' as RequestPriority,
  AIRNODE_STATS: 'normal' as RequestPriority,
  HISTORICAL: 'normal' as RequestPriority,
  LATENCY: 'normal' as RequestPriority,
  QUALITY: 'normal' as RequestPriority,
  DEVIATIONS: 'normal' as RequestPriority,
  SOURCE_TRACE: 'low' as RequestPriority,
  COVERAGE_EVENTS: 'low' as RequestPriority,
  GAS_FEES: 'low' as RequestPriority,
  OHLC: 'low' as RequestPriority,
  QUALITY_HISTORY: 'low' as RequestPriority,
  CROSS_ORACLE: 'low' as RequestPriority,
  OEV: 'low' as RequestPriority,
};

export function withPriority<T>(
  id: string,
  fn: () => Promise<T>,
  priority: RequestPriority = 'normal'
): Promise<T> {
  return api3RequestManager.execute(id, fn, priority);
}
