/**
 * Create an abort signal with a local deadline while preserving caller cancellation.
 *
 * Route handlers use this to stop external I/O before the platform terminates the
 * function. The returned `dispose` must run once the request has completed so a
 * completed request never leaves a live timer or request listener behind.
 */
export class RequestDeadlineExceededError extends Error {
  readonly code = 'REQUEST_DEADLINE_EXCEEDED';

  constructor(message = 'Request deadline exceeded') {
    super(message);
    this.name = 'RequestDeadlineExceededError';
  }
}

export interface RequestDeadline {
  signal: AbortSignal;
  didExpire: () => boolean;
  dispose: () => void;
}

export function createRequestDeadline(
  parentSignal: AbortSignal | undefined,
  timeoutMs: number,
  message?: string
): RequestDeadline {
  const controller = new AbortController();
  let expired = false;
  const abortFromParent = () => controller.abort(parentSignal?.reason);

  if (parentSignal?.aborted) {
    abortFromParent();
  } else {
    parentSignal?.addEventListener('abort', abortFromParent, { once: true });
  }

  const timer = setTimeout(() => {
    expired = true;
    controller.abort(new RequestDeadlineExceededError(message));
  }, timeoutMs);

  return {
    signal: controller.signal,
    didExpire: () => expired,
    dispose: () => {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', abortFromParent);
    },
  };
}

export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new Error('Request aborted');
}
