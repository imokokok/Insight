/** @jest-environment node */
import { NextRequest } from 'next/server';

import { getCoverageDiagnostic } from '@/lib/api/services/coverageDiagnostics';
import { getAllActiveFeedsByProviderWithStatus } from '@/lib/oracles/utils/dynamicFeedResolver';

import { GET } from '../route';

jest.mock('@/lib/api/handler', () => ({
  createApiHandler:
    (handler: (request: NextRequest, context: unknown) => unknown, options: unknown) =>
    async (request: NextRequest, context: unknown) => {
      const { createZodValidationMiddleware } = jest.requireActual('@/lib/validation/middleware');
      const validation = createZodValidationMiddleware(
        (options as { validation: unknown }).validation
      );
      const result = await validation(request);
      if (!result.success) return result.response;
      return handler(request, { ...(context as object), validated: result.data });
    },
  createOptionsHandler: () => jest.fn(),
  ApiResponseBuilder: {
    success: (data: unknown) => ({ success: true, data }),
    error: (code: string, message: string) => ({ success: false, code, message }),
  },
  V1_PROTOCOL_TIER_MIDDLEWARES: [],
}));
jest.mock('@/lib/oracles/utils/dynamicFeedResolver', () => ({
  getAllActiveFeedsByProviderWithStatus: jest.fn(),
}));
jest.mock('@/lib/api/services/coverageDiagnostics', () => ({ getCoverageDiagnostic: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

it.each([
  ['true', true],
  ['false', false],
  ['', false],
])('accepts HTTP probe=%s through the actual query middleware', async (value, probe) => {
  jest
    .mocked(getAllActiveFeedsByProviderWithStatus)
    .mockResolvedValue({ feeds: new Map(), errored: false });
  const query = new URLSearchParams({ asset: 'USDC', chainId: '1' });
  if (value) query.set('probe', value);
  const response = await (
    GET as unknown as (request: NextRequest, context: unknown) => Promise<Response>
  )(new NextRequest(`https://test/api/v1/coverage?${query}`), { requestId: 'test' });
  expect(response.status).toBe(200);
  expect(getCoverageDiagnostic).toHaveBeenCalledWith(
    expect.objectContaining({ asset: 'USDC', chainId: 1, probe }),
    expect.any(Map)
  );
});

it('rejects an invalid HTTP probe before reading the registry', async () => {
  const response = await (
    GET as unknown as (request: NextRequest, context: unknown) => Promise<Response>
  )(new NextRequest('https://test/api/v1/coverage?asset=USDC&chainId=1&probe=yes'), {
    requestId: 'test',
  });
  expect(response.status).toBe(400);
  expect(getAllActiveFeedsByProviderWithStatus).not.toHaveBeenCalled();
});

it('makes a registry outage explicit, uncached, and does not claim zero supported feeds', async () => {
  jest
    .mocked(getAllActiveFeedsByProviderWithStatus)
    .mockResolvedValue({ feeds: new Map(), errored: true });
  const response = await (
    GET as unknown as (request: NextRequest, context: unknown) => Promise<Response>
  )(new NextRequest('https://test/api/v1/coverage'), {
    requestId: 'test',
    validated: { query: { probe: false } },
  });
  expect(response.status).toBe(503);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  const body = await response.json();
  expect(body.code).toBe('REGISTRY_UNAVAILABLE');
  expect(body.data).toBeUndefined();
  expect(getCoverageDiagnostic).not.toHaveBeenCalled();
});

it('keeps an empty successful registry distinct from an outage', async () => {
  jest
    .mocked(getAllActiveFeedsByProviderWithStatus)
    .mockResolvedValue({ feeds: new Map(), errored: false });
  const response = await (
    GET as unknown as (request: NextRequest, context: unknown) => Promise<Response>
  )(new NextRequest('https://test/api/v1/coverage'), {
    requestId: 'test',
    validated: { query: { probe: false } },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.data.registryStatus).toBe('available');
  expect(body.data.summary.totalFeeds).toBe(0);
});
