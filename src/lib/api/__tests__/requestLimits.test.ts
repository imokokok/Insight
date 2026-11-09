import { type NextRequest } from 'next/server';

import {
  DEFAULT_MAX_REQUEST_BYTES,
  getMaxRequestBytes,
  parseLimitedJson,
  rejectOversizedRequest,
  rejectStreamedOversizedRequest,
} from '@/lib/api/requestLimits';

function streamRequest(chunks: string[]): Pick<Request, 'body'> {
  const encoded = chunks.map((chunk) => new TextEncoder().encode(chunk));
  let index = 0;
  return {
    body: {
      getReader: () => ({
        read: async () => {
          if (index >= encoded.length) return { done: true, value: undefined };
          return { done: false, value: encoded[index++] };
        },
        cancel: async () => undefined,
        releaseLock: () => undefined,
      }),
    } as ReadableStream<Uint8Array>,
  };
}

describe('request size limits', () => {
  const original = process.env.MAX_REQUEST_SIZE;

  afterEach(() => {
    if (original === undefined) delete process.env.MAX_REQUEST_SIZE;
    else process.env.MAX_REQUEST_SIZE = original;
  });

  it('uses a safe default when the environment value is absent', () => {
    delete process.env.MAX_REQUEST_SIZE;
    expect(getMaxRequestBytes()).toBe(DEFAULT_MAX_REQUEST_BYTES);
  });

  it('rejects a declared body above the limit', async () => {
    const request = {
      method: 'POST',
      headers: new Headers({ 'content-length': '11' }),
    } as unknown as NextRequest;
    const response = rejectOversizedRequest(request, 10);

    expect(response?.status).toBe(413);
    expect((await response?.json()).error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('allows bodies at or below the limit', () => {
    const request = {
      method: 'POST',
      headers: new Headers({ 'content-length': '10' }),
    } as unknown as NextRequest;
    expect(rejectOversizedRequest(request, 10)).toBeNull();
  });

  it('rejects a chunked body that omits Content-Length once streamed bytes exceed the limit', async () => {
    const request = {
      body: streamRequest(['12345', '678901']).body,
      clone: () => streamRequest(['12345', '678901']),
    } as unknown as Request;

    const response = await rejectStreamedOversizedRequest(request, 10);

    expect(response?.status).toBe(413);
    expect((await response?.json()).error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('parses JSON only after the stream stays within the configured limit', async () => {
    const request = streamRequest(['{', '"symbol":"ETH"', '}']);

    await expect(parseLimitedJson(request, 64)).resolves.toEqual({ symbol: 'ETH' });
  });
});
