import { type NextRequest } from 'next/server';

import {
  DEFAULT_MAX_REQUEST_BYTES,
  getMaxRequestBytes,
  rejectOversizedRequest,
} from '@/lib/api/requestLimits';

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
});
