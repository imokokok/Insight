export const DIA_API_BASE_URL = process.env.DIA_API_URL || 'https://api.diadata.org/v1';

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

export async function fetchWithTimeout<T = unknown>(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<T> {
  const { timeout = 10000, signal: externalSignal, ...fetchOptions } = options;
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new RangeError('Request timeout must be a positive finite number');
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);
  const onExternalAbort = () => controller.abort(externalSignal?.reason);

  if (externalSignal) {
    if (externalSignal.aborted) {
      onExternalAbort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        Accept: 'application/json',
        ...fetchOptions.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null as T;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (timedOut) {
      throw new Error(`Request timeout after ${timeout}ms: ${url}`);
    }
    if (externalSignal?.aborted) throw new Error(`Request aborted: ${url}`);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request aborted: ${url}`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}
