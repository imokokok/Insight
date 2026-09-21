/** @jest-environment node */
import { NextRequest } from 'next/server';

import { getRobinhoodInstrumentAdmission } from '@/lib/rwa/instrumentRegistry';

import { GET } from '../route';

jest.mock('@/lib/rwa/instrumentRegistry', () => ({
  getRobinhoodInstrumentAdmission: jest.fn(),
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

const mockedAdmission = jest.mocked(getRobinhoodInstrumentAdmission);

beforeEach(() => {
  mockedAdmission.mockReset();
  mockedAdmission.mockResolvedValue({
    schema: 'insight.rwa-instrument-admission.v1',
    evaluation: {
      countsTowardOracleQuorum: false,
      mayAuthorizeExecution: false,
    },
  } as never);
});

it('normalizes the symbol and labels the response as non-authorizing master data', async () => {
  const response = await GET(
    new NextRequest('https://test/api/v1/rwa/robinhood/instrument?symbol=spy&verifyOnchain=false')
  );
  expect(response.status).toBe(200);
  expect(mockedAdmission).toHaveBeenCalledWith('SPY', { verifyOnchain: false });
  const body = await response.json();
  expect(body.meta).toMatchObject({
    evidenceClass: 'reference-master-data',
    countsTowardOracleQuorum: false,
    mayAuthorizeExecution: false,
  });
});

it('rejects malformed symbols before loading registry or issuer data', async () => {
  const response = await GET(
    new NextRequest('https://test/api/v1/rwa/robinhood/instrument?symbol=SPY%2FUSD')
  );
  expect(response.status).toBe(400);
  expect(mockedAdmission).not.toHaveBeenCalled();
});
