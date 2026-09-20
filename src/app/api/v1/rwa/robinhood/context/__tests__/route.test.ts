/** @jest-environment node */
import { NextRequest } from 'next/server';

import { getRobinhoodRwaContext } from '@/lib/rwa/robinhoodClient';

import { GET } from '../route';

jest.mock('@/lib/rwa/robinhoodClient', () => ({
  getRobinhoodRwaContext: jest.fn(),
}));

jest.mock('@/lib/api/handler', () => ({
  createApiHandler: (
    handler: (request: NextRequest, context: unknown) => unknown,
    options: { middlewares: unknown; validation: unknown }
  ) => {
    expect(options.middlewares).toEqual(['read-api-key-and-credit']);
    return async (request: NextRequest) => {
      const { createZodValidationMiddleware } = jest.requireActual('@/lib/validation/middleware');
      const result = await createZodValidationMiddleware(options.validation)(request);
      if (!result.success) return result.response;
      return handler(request, { requestId: 'test', validated: result.data });
    };
  },
  createOptionsHandler: () => jest.fn(),
  ApiResponseBuilder: {
    success: (data: unknown, options?: { requestId?: string; meta?: Record<string, unknown> }) => ({
      success: true,
      data,
      meta: { requestId: options?.requestId, ...options?.meta },
    }),
  },
  V1_READ_ONLY_MIDDLEWARES: ['read-api-key-and-credit'],
}));

const mockedContext = jest.mocked(getRobinhoodRwaContext);

beforeEach(() => {
  mockedContext.mockReset();
  mockedContext.mockResolvedValue({
    schema: 'insight.robinhood-rwa-context.v1',
    source: {
      id: 'robinhood-rhj',
      type: 'issuer-first-party',
      independent: false,
      countsTowardOracleQuorum: false,
      issuer: 'Robinhood Assets (Jersey) Limited',
    },
  } as never);
});

it('normalizes the symbol and requests on-chain verification by default', async () => {
  const response = await GET(
    new NextRequest('https://test/api/v1/rwa/robinhood/context?symbol=aapl')
  );
  expect(response.status).toBe(200);
  expect(mockedContext).toHaveBeenCalledWith('AAPL', { verifyOnchain: true });
  const body = await response.json();
  expect(body.meta).toMatchObject({
    evidenceClass: 'issuer-first-party',
    countsTowardOracleQuorum: false,
  });
});

it('rejects malformed symbols before contacting Robinhood', async () => {
  const response = await GET(
    new NextRequest('https://test/api/v1/rwa/robinhood/context?symbol=AAPL%2FUSD')
  );
  expect(response.status).toBe(400);
  expect(mockedContext).not.toHaveBeenCalled();
});
